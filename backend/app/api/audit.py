from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.entities import AuditEvent, Notification
from backend.app.api.deps import get_current_user_and_org
from backend.app.services.audit_service import AuditService

router = APIRouter(prefix="", tags=["audit"])

@router.get("/audit/events")
def get_audit_events(
    group: Optional[str] = "all",
    q: Optional[str] = "",
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    all_events = db.query(AuditEvent).filter(AuditEvent.org_id == org.id).order_by(AuditEvent.id.desc()).all()

    group_map = {
        "security": ["upload", "scan", "verify", "block"],
        "analysis": ["analysis", "contradiction", "review"],
        "research": ["legal", "research"],
        "reports": ["report"]
    }

    counts = {
        "all": len(all_events),
        "security": len([e for e in all_events if e.ui_type in group_map["security"]]),
        "analysis": len([e for e in all_events if e.ui_type in group_map["analysis"]]),
        "research": len([e for e in all_events if e.ui_type in group_map["research"]]),
        "reports": len([e for e in all_events if e.ui_type in group_map["reports"]])
    }

    filtered = all_events
    if group and group != "all" and group in group_map:
        filtered = [e for e in filtered if e.ui_type in group_map[group]]

    if q and q.strip():
        q_low = q.strip().lower()
        filtered = [e for e in filtered if q_low in (e.title + " " + e.object_label + " " + (e.meta or "") + " " + e.actor_name).lower()]

    items = [{
        "id": e.id,
        "t": e.created_at.isoformat(),
        "type": e.ui_type,
        "title": e.title,
        "obj": e.object_label,
        "doc": e.document_id,
        "who": e.actor_name,
        "meta": e.meta,
        "go": e.go or "activity"
    } for e in filtered]

    integrity = AuditService.verify_chain(db, org.id)
    integrity_data = {
        "count": len(all_events),
        "retention_months": 12,
        "chain_ok": integrity.get("ok", True)
    }

    return {
        "items": items,
        "total": len(items),
        "counts_by_group": counts,
        "integrity": integrity_data
    }

@router.get("/audit/export")
def export_audit_log(
    format: str = Query("csv"),
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    events = db.query(AuditEvent).filter(AuditEvent.org_id == org.id).order_by(AuditEvent.id.desc()).all()

    lines = ['"timestamp","event","object","actor","detail"']
    for e in events:
        t_str = e.created_at.isoformat()
        lines.append(f'"{t_str}","{e.title}","{e.object_label}","{e.actor_name}","{e.meta}"')

    AuditService.record(
        db, org_id=org.id, action="audit.export",
        title="Audit log exported", actor_id=user.id,
        object_label="jurisai_audit_log.csv", ui_type="report"
    )

    return PlainTextResponse(
        "\n".join(lines),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="jurisai_audit_log.csv"'}
    )

@router.get("/audit/verify")
def verify_audit_log(principal=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    user, org = principal
    res = AuditService.verify_chain(db, org.id)
    is_ok = res.get("ok", True)
    return {"valid": is_ok, "ok": is_ok, **res}

@router.get("/notifications")
def get_notifications(principal=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    user, org = principal
    notifs = db.query(Notification).filter(Notification.user_id == user.id).order_by(Notification.id.desc()).all()
    return [{
        "id": n.id,
        "kind": n.kind,
        "icon": n.icon,
        "title": n.title,
        "text": n.text,
        "at": n.created_at.isoformat(),
        "read": n.read_at is not None,
        "go": n.route_hint
    } for n in notifs]

@router.post("/notifications/read")
def mark_notifications_read(principal=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    import datetime
    user, org = principal
    db.query(Notification).filter(Notification.user_id == user.id).update({"read_at": datetime.datetime.utcnow()})
    db.commit()
    return Response(status_code=204)
