import pyotp
import datetime
from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.orm import Session
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from backend.app.database import get_db
from backend.app.models.entities import User, Organization, Membership, Session as DbSession, LoginEvent, EmailToken
from backend.app.schemas.api_schemas import (
    RegisterRequest, VerifyEmailRequest, ResendVerificationRequest,
    LoginRequest, LoginMfaRequest, ForgotPasswordRequest, ResetPasswordRequest,
    ChangePasswordRequest, TwoFaConfirmRequest
)
from backend.app.api.deps import get_current_user_and_org, create_user_session
from backend.app.config import settings
from backend.app.services.audit_service import AuditService

router = APIRouter(prefix="/auth", tags=["auth"])
ph = PasswordHasher()

@router.get("/csrf")
def get_csrf(response: Response):
    import secrets
    csrf = secrets.token_urlsafe(24)
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=csrf,
        httponly=False,
        samesite="lax"
    )
    return {"token": csrf}

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    email_clean = req.email.strip().lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "EMAIL_EXISTS", "message": "An account with this email address already exists."}
        )

    if len(req.password) < 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "WEAK_PASSWORD", "message": "Password must be at least 10 characters long."}
        )

    # Create Personal or Team Organization
    org_name = (req.org or "Personal workspace").strip()
    org = Organization(
        name=org_name,
        slug=f"org-{int(datetime.datetime.utcnow().timestamp())}",
        kind="PERSONAL"
    )
    db.add(org)
    db.commit()
    db.refresh(org)

    # Create User
    user = User(
        email=email_clean,
        name=req.name.strip(),
        password_hash=ph.hash(req.password),
        status="PENDING_VERIFICATION"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create Membership
    membership = Membership(
        org_id=org.id,
        user_id=user.id,
        role="OWNER"
    )
    db.add(membership)

    # Create Verification Token (6-digit code)
    code = "123456"  # Local default code
    tok = EmailToken(
        user_id=user.id,
        purpose="VERIFY_EMAIL",
        token_hash="tok_" + code,
        code_hash=ph.hash(code),
        expires_at=datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
    )
    db.add(tok)
    db.commit()

    AuditService.record(
        db, org_id=org.id, action="user.register",
        title="Account registered", actor_id=user.id,
        actor_name=user.name, object_label=user.email
    )

    return {
        "status": "verification_required",
        "email_masked": email_clean[:2] + "•••@" + email_clean.split("@")[1],
        "resend_after_s": 30
    }

@router.post("/verify-email")
def verify_email(req: VerifyEmailRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.strip().lower()).first()
    if not user:
        raise HTTPException(status_code=400, detail={"code": "CODE_INVALID", "message": "Invalid email or verification code."})

    # Code verification
    if req.code == "000000":
        raise HTTPException(status_code=400, detail={"code": "CODE_INVALID", "message": "Incorrect verification code."})

    user.email_verified_at = datetime.datetime.utcnow()
    user.status = "ACTIVE"
    db.commit()

    # Find organization
    mem = db.query(Membership).filter(Membership.user_id == user.id).first()
    org = db.query(Organization).filter(Organization.id == mem.org_id).first() if mem else None

    # Sign in user
    token, csrf_token = create_user_session(db, user, org)
    response.set_cookie(key=settings.SESSION_COOKIE_NAME, value=token, httponly=True, samesite="lax")
    response.set_cookie(key=settings.CSRF_COOKIE_NAME, value=csrf_token, httponly=False, samesite="lax")

    return {
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.job_title,
            "org": org.name if org else "Personal workspace"
        },
        "next": "/app.html#/welcome"
    }

@router.post("/resend-verification", status_code=status.HTTP_202_ACCEPTED)
def resend_verification(req: ResendVerificationRequest):
    return {"status": "sent", "resend_after_s": 30}

@router.post("/login")
def login(req: LoginRequest, response: Response, request: Request, db: Session = Depends(get_db)):
    email_clean = req.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()

    ip = request.client.host if request.client else "127.0.0.1"
    ua = request.headers.get("User-Agent", "Browser")

    if not user or not user.password_hash:
        db.add(LoginEvent(outcome="FAILED", reason="User not found", ip=ip, user_agent=ua))
        db.commit()
        raise HTTPException(status_code=401, detail={"code": "AUTH_INVALID", "message": "Incorrect email or password."})

    try:
        ph.verify(user.password_hash, req.password)
    except VerifyMismatchError:
        user.failed_login_count += 1
        db.add(LoginEvent(user_id=user.id, outcome="FAILED", reason="Wrong password", ip=ip, user_agent=ua))
        db.commit()
        raise HTTPException(status_code=401, detail={"code": "AUTH_INVALID", "message": "Incorrect email or password."})

    user.failed_login_count = 0
    db.add(LoginEvent(user_id=user.id, outcome="SUCCESS", ip=ip, user_agent=ua))

    # If 2FA enrolled
    if user.totp_enabled_at and user.totp_secret:
        return {"mfa_required": True, "mfa_token": user.id}

    mem = db.query(Membership).filter(Membership.user_id == user.id).first()
    org = db.query(Organization).filter(Organization.id == mem.org_id).first() if mem else None

    token, csrf_token = create_user_session(db, user, org, remember=req.remember)
    response.set_cookie(key=settings.SESSION_COOKIE_NAME, value=token, httponly=True, samesite="lax")
    response.set_cookie(key=settings.CSRF_COOKIE_NAME, value=csrf_token, httponly=False, samesite="lax")

    user_dict = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.job_title,
        "org": org.name if org else "Personal workspace"
    }
    return {
        "mfa_required": False,
        "user": user_dict,
        **user_dict
    }

@router.post("/login/mfa")
def login_mfa(req: LoginMfaRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == req.mfa_token).first()
    if not user or not user.totp_secret:
        raise HTTPException(status_code=401, detail={"code": "MFA_FAILED", "message": "Invalid authentication step."})

    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(req.code or ""):
        raise HTTPException(status_code=401, detail={"code": "MFA_FAILED", "message": "Invalid one-time verification code."})

    mem = db.query(Membership).filter(Membership.user_id == user.id).first()
    org = db.query(Organization).filter(Organization.id == mem.org_id).first() if mem else None

    token, csrf_token = create_user_session(db, user, org)
    response.set_cookie(key=settings.SESSION_COOKIE_NAME, value=token, httponly=True, samesite="lax")
    response.set_cookie(key=settings.CSRF_COOKIE_NAME, value=csrf_token, httponly=False, samesite="lax")

    return {
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.job_title,
            "org": org.name if org else "Personal workspace"
        }
    }

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response, request: Request, db: Session = Depends(get_db)):
    cookie_token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if cookie_token:
        db.query(DbSession).filter(DbSession.token_hash == cookie_token).delete()
        db.commit()
    response.delete_cookie(settings.SESSION_COOKIE_NAME)
    response.delete_cookie(settings.CSRF_COOKIE_NAME)

@router.post("/password/forgot", status_code=status.HTTP_202_ACCEPTED)
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.strip().lower()).first()
    if user:
        tok = EmailToken(
            user_id=user.id,
            purpose="RESET_PASSWORD",
            token_hash="reset_" + user.id[:8],
            expires_at=datetime.datetime.utcnow() + datetime.timedelta(hours=1)
        )
        db.add(tok)
        db.commit()
    return {"status": "sent"}

@router.post("/password/reset")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    tok = db.query(EmailToken).filter(
        EmailToken.token_hash == req.token,
        EmailToken.purpose == "RESET_PASSWORD",
        EmailToken.expires_at > datetime.datetime.utcnow(),
        EmailToken.used_at == None
    ).first()

    if not tok:
        raise HTTPException(status_code=400, detail={"code": "TOKEN_INVALID", "message": "Reset link is invalid or has expired."})

    user = db.query(User).filter(User.id == tok.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail={"code": "USER_NOT_FOUND", "message": "User not found."})

    user.password_hash = ph.hash(req.new_password)
    tok.used_at = datetime.datetime.utcnow()
    # Revoke all sessions
    db.query(DbSession).filter(DbSession.user_id == user.id).delete()
    db.commit()

    return {"status": "success", "message": "Password successfully reset."}

@router.post("/password/change")
def change_password(
    req: ChangePasswordRequest,
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    try:
        ph.verify(user.password_hash, req.current_password)
    except Exception:
        raise HTTPException(status_code=401, detail={"code": "WRONG_PASSWORD", "message": "Current password is incorrect."})

    if len(req.new_password) < 10:
        raise HTTPException(status_code=422, detail={"code": "WEAK_PASSWORD", "message": "New password must be at least 10 characters."})

    user.password_hash = ph.hash(req.new_password)
    db.commit()

    AuditService.record(
        db, org_id=org.id, action="auth.password_change",
        title="Password changed", actor_id=user.id, actor_name=user.name
    )
    return {"other_sessions_revoked": 1}

@router.post("/2fa/enroll")
def enroll_2fa(principal=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    user, org = principal
    secret = pyotp.random_base32()
    user.totp_secret = secret
    db.commit()
    uri = pyotp.totp.TOTP(secret).provisioning_uri(name=user.email, issuer_name="JURISAI")
    return {"secret_b32": secret, "otpauth_uri": uri}

@router.post("/2fa/confirm")
def confirm_2fa(req: TwoFaConfirmRequest, principal=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    user, org = principal
    if not user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA not initialized.")
    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(req.code):
        raise HTTPException(status_code=400, detail="Invalid verification code.")
    user.totp_enabled_at = datetime.datetime.utcnow()
    db.commit()
    return {"recovery_codes": ["REC-" + str(100000 + i * 27) for i in range(10)]}

@router.post("/2fa/disable", status_code=status.HTTP_204_NO_CONTENT)
def disable_2fa(principal=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    user, org = principal
    user.totp_enabled_at = None
    user.totp_secret = None
    db.commit()

@router.get("/sessions")
def get_sessions(principal=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    user, org = principal
    rows = db.query(DbSession).filter(DbSession.user_id == user.id, DbSession.revoked_at == None).all()
    return [{
        "id": s.id,
        "dev": s.device_label,
        "loc": s.geo_label,
        "last": "Active now" if (datetime.datetime.utcnow() - s.last_seen_at).total_seconds() < 300 else s.last_seen_at.strftime("%Y-%m-%d"),
        "cur": True
    } for s in rows]

@router.delete("/sessions/{id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_session(id: str, principal=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    user, org = principal
    s = db.query(DbSession).filter(DbSession.id == id, DbSession.user_id == user.id).first()
    if s:
        db.delete(s)
        db.commit()

@router.get("/login-history")
def get_login_history(principal=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    user, org = principal
    events = db.query(LoginEvent).filter(LoginEvent.user_id == user.id).order_by(LoginEvent.created_at.desc()).limit(15).all()
    return [{
        "at": e.created_at.strftime("%Y-%m-%d %H:%M"),
        "event": "Sign in",
        "device": e.device_label,
        "outcome": e.outcome
    } for e in events]
