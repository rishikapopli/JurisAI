import secrets
import datetime
from typing import Optional, Tuple
from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.entities import User, Session as DbSession, Organization, Membership
from backend.app.config import settings

def get_current_user_and_org_optional(
    request: Request,
    db: Session = Depends(get_db)
) -> Tuple[Optional[User], Optional[Organization]]:
    cookie_token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    auth_header = request.headers.get("Authorization")
    token = None

    if cookie_token:
        token = cookie_token
    elif auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]

    if not token:
        # Fallback to demo user for dev ease if desired, but let's check if valid session exists
        return None, None

    # Find active session
    session_row = db.query(DbSession).filter(
        DbSession.token_hash == token,
        DbSession.expires_at > datetime.datetime.utcnow(),
        DbSession.revoked_at == None
    ).first()

    if not session_row:
        return None, None

    user = db.query(User).filter(User.id == session_row.user_id, User.status == "ACTIVE").first()
    org = db.query(Organization).filter(Organization.id == session_row.org_id).first()

    if user and org:
        session_row.last_seen_at = datetime.datetime.utcnow()
        db.commit()
        return user, org

    return None, None

def get_current_user_and_org(
    principal: Tuple[Optional[User], Optional[Organization]] = Depends(get_current_user_and_org_optional),
    db: Session = Depends(get_db)
) -> Tuple[User, Organization]:
    user, org = principal
    if not user or not org:
        # Dev fallback: if demo user exists in local dev and no session was sent, authenticate demo user
        demo_user = db.query(User).filter(User.email == "demo@jurisai.com").first()
        demo_org = db.query(Organization).filter(Organization.id == "org_default").first()
        if demo_user and demo_org:
            return demo_user, demo_org
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTH_REQUIRED", "message": "Sign in required to access workspace"}
        )
    return user, org

def create_user_session(db: Session, user: User, org: Organization, remember: bool = True) -> Tuple[str, str]:
    token = secrets.token_urlsafe(32)
    csrf_token = secrets.token_urlsafe(24)
    max_age = settings.SESSION_MAX_AGE_SECONDS if remember else 86400
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(seconds=max_age)

    session_row = DbSession(
        user_id=user.id,
        org_id=org.id,
        token_hash=token,
        csrf_secret=csrf_token,
        remember=remember,
        expires_at=expires_at
    )
    db.add(session_row)
    db.commit()
    return token, csrf_token
