from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.entities import Jurisdiction
from backend.app.config import settings

router = APIRouter(prefix="", tags=["meta"])

@router.get("/meta")
def get_metadata(db: Session = Depends(get_db)):
    jurs = db.query(Jurisdiction).filter(Jurisdiction.enabled == True).all()
    j_list = [{"id": j.id, "name": j.name, "sys": j.sys, "coverage": j.coverage_status} for j in jurs]
    return {
        "jurisdictions": j_list,
        "languages": [
            {"id": "en", "label": "English"},
            {"id": "hi", "label": "हिन्दी"},
            {"id": "es", "label": "Español"}
        ],
        "limits": {
            "max_upload_bytes": 50 * 1024 * 1024,
            "accepted_types": ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]
        },
        "version": settings.VERSION
    }

@router.get("/organizations/current")
def get_current_org(db: Session = Depends(get_db)):
    return {
        "id": "org_default",
        "name": "Northwind Analytics Ltd",
        "members": 1,
        "role": "OWNER"
    }

@router.get("/organizations/current/members")
def get_org_members():
    return [{"user": {"name": "Daniel Okafor", "email": "demo@jurisai.com"}, "role": "OWNER", "status": "ACTIVE"}]

@router.post("/organizations/current/invitations", status_code=201)
def invite_member(req: dict):
    return {"id": "inv_123", "status": "sent"}
