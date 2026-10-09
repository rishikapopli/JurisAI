from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.entities import User, UserSetting, Organization, Membership
from backend.app.schemas.api_schemas import UserProfileUpdate, UserSettingsSchema
from backend.app.api.deps import get_current_user_and_org
from backend.app.services.audit_service import AuditService

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me")
def get_me(principal=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    user, org = principal
    mem = db.query(Membership).filter(Membership.org_id == org.id, Membership.user_id == user.id).first()
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.job_title,
        "org": org.name,
        "org_id": org.id,
        "membership_role": mem.role if mem else "OWNER",
        "permissions": ["all"],
        "onboarded": user.onboarded_at is not None,
        "twofa": user.totp_enabled_at is not None,
        "email_verified": user.email_verified_at is not None
    }

@router.patch("/me")
def update_me(
    patch: UserProfileUpdate,
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    if patch.name is not None and patch.name.strip():
        user.name = patch.name.strip()
    if patch.email is not None and patch.email.strip():
        new_email = patch.email.strip().lower()
        if new_email != user.email:
            existing = db.query(User).filter(User.email == new_email, User.id != user.id).first()
            if existing:
                raise HTTPException(status_code=409, detail={"code": "EMAIL_TAKEN", "message": "Email already in use."})
            user.email = new_email
    if patch.role is not None:
        user.job_title = patch.role
    if patch.job_title is not None:
        user.job_title = patch.job_title
    if patch.org is not None and patch.org.strip():
        org.name = patch.org.strip()

    db.commit()
    AuditService.record(
        db, org_id=org.id, action="user.profile_update",
        title="Profile updated", actor_id=user.id, actor_name=user.name
    )
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.job_title,
        "org": org.name
    }

@router.get("/me/settings")
def get_settings(principal=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    user, org = principal
    s = db.query(UserSetting).filter(UserSetting.user_id == user.id).first()
    if not s or not s.data:
        return UserSettingsSchema().model_dump()
    return s.data

@router.patch("/me/settings")
def update_settings(
    patch: dict,
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    s = db.query(UserSetting).filter(UserSetting.user_id == user.id).first()
    if not s:
        s = UserSetting(user_id=user.id, data=UserSettingsSchema().model_dump())
        db.add(s)

    current_data = dict(s.data or {})
    current_data.update(patch)
    s.data = current_data
    db.commit()
    return s.data

@router.post("/me/onboarded", status_code=status.HTTP_204_NO_CONTENT)
def complete_onboarding(principal=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    import datetime
    user, org = principal
    user.onboarded_at = datetime.datetime.utcnow()
    db.commit()

@router.delete("/me", status_code=status.HTTP_202_ACCEPTED)
def delete_account(principal=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    user, org = principal
    user.status = "DELETING"
    db.commit()
    return {"status": "scheduled_deletion"}
