from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.entities import ResearchThread, ResearchQuery
from backend.app.schemas.api_schemas import ResearchQueryCreate
from backend.app.api.deps import get_current_user_and_org
from backend.app.services.research_service import research_service
from backend.app.services.audit_service import AuditService

router = APIRouter(prefix="/research", tags=["research"])

@router.post("/queries", status_code=status.HTTP_201_CREATED)
def ask_question(
    req: ResearchQueryCreate,
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    q = req.question or req.query or "What does this contract say?"
    doc_ids = req.document_ids or req.scope or ["emp", "pol", "nda"]
    include_legal = req.include_law if req.include_law is not None else req.include_legal

    res = research_service.execute_query(
        db=db,
        org_id=org.id,
        user_id=user.id,
        question=q,
        thread_id=req.thread_id,
        doc_ids=doc_ids,
        include_legal=include_legal,
        jurisdiction=req.jurisdiction
    )

    AuditService.record(
        db, org_id=org.id, action="research.ask",
        title="Research query executed", actor_id=user.id,
        object_label=q[:80], ui_type="research"
    )

    return {"memo": res, **res}

@router.get("/queries/{id}")
def get_query_result(
    id: str,
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    q = db.query(ResearchQuery).filter(ResearchQuery.id == id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Query not found.")
    res = q.result or {}
    res["id"] = q.id
    res["thread_id"] = q.thread_id
    res["at"] = q.created_at.isoformat()
    return res

@router.get("/threads")
def list_threads(
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    threads = db.query(ResearchThread).filter(ResearchThread.org_id == org.id).order_by(ResearchThread.updated_at.desc()).all()
    if not threads:
        # Return standard seed threads
        return [
            {"id": "q1", "title": "Does the termination clause conflict with the company policy?", "at": "2026-10-09T00:15:00Z"},
            {"id": "q2", "title": "What happens to my confidentiality obligations after I leave?", "at": "2026-10-07T12:00:00Z"},
            {"id": "q3", "title": "Is the non-compete likely to be enforceable?", "at": "2026-10-07T11:40:00Z"},
            {"id": "q4", "title": "What is my salary and when is it reviewed?", "at": "2026-10-03T09:30:00Z"}
        ]
    return [{"id": t.id, "title": t.title, "at": t.updated_at.isoformat()} for t in threads]

@router.get("/threads/{id}")
def get_thread(
    id: str,
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    t = db.query(ResearchThread).filter(ResearchThread.id == id, ResearchThread.org_id == org.id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Thread not found.")
    queries = db.query(ResearchQuery).filter(ResearchQuery.thread_id == t.id).order_by(ResearchQuery.created_at.asc()).all()
    return {
        "id": t.id,
        "title": t.title,
        "queries": [q.result for q in queries]
    }

@router.post("/queries/{id}/plain")
def get_plain_words(id: str, db: Session = Depends(get_db)):
    q = db.query(ResearchQuery).filter(ResearchQuery.id == id).first()
    if not q or not q.result:
        raise HTTPException(status_code=404, detail="Query not found.")
    return {"plain_words": q.result.get("simple", "")}
