import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.entities import Review, ReviewEvent, Contradiction
from backend.app.schemas.api_schemas import ReviewActionRequest, ReviewNoteRequest
from backend.app.api.deps import get_current_user_and_org
from backend.app.services.audit_service import AuditService

router = APIRouter(prefix="/reviews", tags=["reviews"])

@router.get("")
def list_reviews(
    state: Optional[str] = None,
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    items = db.query(Review).filter(Review.org_id == org.id).all()
    return {"items": items, "counts_by_state": {"open": len(items)}}

@router.post("")
def create_or_update_review(
    req: dict,
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    target_id = req.get("target_id")
    action = req.get("action", "review")

    contra = db.query(Contradiction).filter(Contradiction.id == target_id, Contradiction.org_id == org.id).first()
    if contra:
        if action == "review":
            contra.status = "reviewed"
        elif action == "dismiss":
            contra.status = "dismissed"
        elif action == "restore":
            contra.status = "open"
        db.commit()

        AuditService.record(
            db, org_id=org.id, action=f"review.{action}",
            title=f"Finding {action}ed", actor_id=user.id,
            object_label=contra.topic, ui_type="review"
        )
        return {"status": contra.status}

    return {"status": "ok"}

@router.post("/{id}/actions")
def review_action(
    id: str,
    req: ReviewActionRequest,
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    contra = db.query(Contradiction).filter(Contradiction.id == id, Contradiction.org_id == org.id).first()
    if contra:
        if req.action == "approve":
            contra.status = "reviewed"
        elif req.action == "reject":
            contra.status = "dismissed"
        elif req.action == "reopen":
            contra.status = "open"
        db.commit()
        return {"status": contra.status}
    return {"status": "ok"}

@router.post("/{id}/notes")
def add_review_note(
    id: str,
    req: ReviewNoteRequest,
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    note_obj = {
        "t": req.text.strip(),
        "at": datetime.datetime.utcnow().isoformat(),
        "author": user.name
    }
    contra = db.query(Contradiction).filter(Contradiction.id == id, Contradiction.org_id == org.id).first()
    if contra:
        notes = list(contra.notes or [])
        notes.append(note_obj)
        contra.notes = notes
        db.commit()

        AuditService.record(
            db, org_id=org.id, action="review.note",
            title="Note added to finding", actor_id=user.id,
            object_label=contra.topic, meta=req.text[:60], ui_type="review"
        )
    return {"note": note_obj}
