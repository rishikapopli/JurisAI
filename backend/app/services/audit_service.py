import hashlib
import json
import datetime
from typing import Optional
from sqlalchemy.orm import Session
from backend.app.models.entities import AuditEvent

class AuditService:
    @staticmethod
    def get_last_hash(db: Session, org_id: str) -> str:
        last_event = db.query(AuditEvent).filter(AuditEvent.org_id == org_id).order_by(AuditEvent.id.desc()).first()
        if last_event and last_event.event_hash:
            return last_event.event_hash
        return "0" * 64

    @classmethod
    def record(
        cls,
        db: Session,
        org_id: str,
        action: str,
        title: str,
        category: str = "security",
        ui_type: str = "upload",
        actor_type: str = "USER",
        actor_id: Optional[str] = None,
        actor_name: str = "You",
        object_type: Optional[str] = None,
        object_id: Optional[str] = None,
        object_label: str = "",
        document_id: Optional[str] = None,
        outcome: str = "SUCCESS",
        meta: str = "",
        go: str = ""
    ) -> AuditEvent:
        prev_hash = cls.get_last_hash(db, org_id)
        payload = f"{prev_hash}|{org_id}|{action}|{title}|{object_label}|{datetime.datetime.utcnow().isoformat()}"
        event_hash = hashlib.sha256(payload.encode("utf-8")).hexdigest()

        event = AuditEvent(
            org_id=org_id,
            actor_type=actor_type,
            actor_id=actor_id,
            actor_name=actor_name,
            action=action,
            category=category,
            ui_type=ui_type,
            title=title,
            object_type=object_type,
            object_id=object_id,
            object_label=object_label,
            document_id=document_id,
            outcome=outcome,
            meta=meta,
            go=go,
            prev_hash=prev_hash,
            event_hash=event_hash
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    @staticmethod
    def verify_chain(db: Session, org_id: str) -> dict:
        events = db.query(AuditEvent).filter(AuditEvent.org_id == org_id).order_by(AuditEvent.id.asc()).all()
        prev_h = "0" * 64
        for ev in events:
            if ev.prev_hash != prev_h:
                return {"ok": False, "checked": len(events), "first_bad_id": ev.id}
            prev_h = ev.event_hash
        return {"ok": True, "checked": len(events), "chain_ok": True}
