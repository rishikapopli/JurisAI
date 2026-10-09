from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import PlainTextResponse, JSONResponse
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.entities import Report, Share
from backend.app.schemas.api_schemas import ReportCreateRequest, ShareCreateRequest
from backend.app.api.deps import get_current_user_and_org
from backend.app.services.report_service import report_service
from backend.app.services.audit_service import AuditService

router = APIRouter(prefix="", tags=["reports"])

@router.post("/reports")
def create_report(
    req: ReportCreateRequest,
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    r_type = req.report_type or req.type or "summary"
    report = report_service.generate_report(
        db=db,
        org_id=org.id,
        user_id=user.id,
        report_type=r_type,
        doc_ids=req.document_ids,
        comparison_id=req.comparison_id,
        jurisdiction=req.jurisdiction or "uk",
        language=req.language or "en",
        include_sources=req.include_sources
    )

    AuditService.record(
        db, org_id=org.id, action="report.generate",
        title="Report generated", actor_id=user.id,
        object_label=f"{report.title} · {report.public_id}", ui_type="report"
    )

    res = dict(report.content or {})
    res["id"] = report.id
    res["public_id"] = report.public_id
    res["title"] = report.title
    return res

@router.get("/reports/{id}")
def get_report(
    id: str,
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    rep = db.query(Report).filter(
        (Report.id == id) | (Report.public_id == id),
        Report.org_id == org.id
    ).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Report not found.")
    return rep.content

@router.get("/reports/{id}/download")
def download_report(
    id: str,
    format: str = Query("md"),
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    rep = db.query(Report).filter(
        (Report.id == id) | (Report.public_id == id),
        Report.org_id == org.id
    ).first()
    if not rep:
        raise HTTPException(status_code=404, detail="Report not found.")

    AuditService.record(
        db, org_id=org.id, action="report.export",
        title="Report downloaded", actor_id=user.id,
        object_label=f"{rep.title} ({format.upper()})", ui_type="report"
    )

    if format == "json":
        return JSONResponse(rep.content)
    elif format == "md":
        md_text = report_service.to_markdown(rep)
        return PlainTextResponse(
            md_text,
            headers={"Content-Disposition": f'attachment; filename="{rep.public_id}.md"'}
        )
    else: # pdf or fallback
        md_text = report_service.to_markdown(rep)
        return Response(
            content=md_text.encode("utf-8"),
            media_type="text/plain",
            headers={"Content-Disposition": f'attachment; filename="{rep.public_id}.txt"'}
        )

@router.post("/shares")
def create_share(
    req: ShareCreateRequest,
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    import secrets
    import datetime
    user, org = principal
    token = secrets.token_urlsafe(16)
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=req.expires_in_days)

    share = Share(
        token_hash=token,
        org_id=org.id,
        created_by=user.id,
        resource_type=req.resource_type,
        resource_id=req.resource_id,
        expires_at=expires_at
    )
    db.add(share)
    db.commit()

    return {
        "url": f"/app.html#/{req.resource_type}/{req.resource_id}?share={token}",
        "token": token,
        "expires_at": expires_at.isoformat(),
        "scope": "WORKSPACE"
    }

@router.get("/shares/{token}")
def resolve_share(token: str, db: Session = Depends(get_db)):
    share = db.query(Share).filter(Share.token_hash == token).first()
    if not share or share.expires_at < datetime.datetime.utcnow():
        raise HTTPException(status_code=404, detail="Share link is invalid or expired.")
    return {"resource_type": share.resource_type, "resource_id": share.resource_id}
