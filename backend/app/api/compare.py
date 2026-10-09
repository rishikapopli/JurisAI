from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.entities import Comparison, Contradiction, Document
from backend.app.schemas.api_schemas import CompareRequest
from backend.app.api.deps import get_current_user_and_org
from backend.app.services.contradiction_engine import contradiction_engine

router = APIRouter(prefix="", tags=["compare"])

@router.post("/compare")
def run_compare(
    req: CompareRequest,
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    doc_ids = [d for d in req.document_ids if d]
    if len(doc_ids) < 2:
        raise HTTPException(status_code=422, detail="At least two documents required to compare.")

    res = contradiction_engine.compare_documents(db, org.id, doc_ids)
    comp = Comparison(
        org_id=org.id,
        doc_ids=doc_ids,
        state="COMPLETED",
        summary=res["by_kind"],
        findings=res["findings"],
        diffs=res["diffs"]
    )
    db.add(comp)
    db.commit()
    db.refresh(comp)

    return {
        "id": comp.id,
        "mode": req.mode,
        "doc_ids": doc_ids,
        "summary": {
            "total": res["total"],
            "by_kind": res["by_kind"]
        },
        "findings": res["findings"],
        "diffs": res["diffs"]
    }

@router.get("/compare")
def get_compare_by_params(
    a: str = Query(...),
    b: str = Query(...),
    c: Optional[str] = None,
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    doc_ids = [a, b]
    if c:
        doc_ids.append(c)

    res = contradiction_engine.compare_documents(db, org.id, doc_ids)
    return {
        "id": f"cmp_{a}_{b}",
        "doc_ids": doc_ids,
        "summary": {
            "total": res["total"],
            "by_kind": res["by_kind"]
        },
        "findings": res["findings"],
        "diffs": res["diffs"]
    }

@router.get("/contradictions")
def list_contradictions(
    document_id: Optional[str] = None,
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    query = db.query(Contradiction).filter(Contradiction.org_id == org.id)
    contras = query.all()

    if document_id:
        contras = [c for c in contras if document_id in (c.pair or [])]

    return {"items": [contradiction_engine._format_finding(c) for c in contras]}

@router.get("/contradictions/{id}")
def get_contradiction(
    id: str,
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    c = db.query(Contradiction).filter(Contradiction.id == id, Contradiction.org_id == org.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Finding not found.")
    return contradiction_engine._format_finding(c)

@router.get("/contradictions/{id}/graph")
def get_contradiction_graph(
    id: str,
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    c = db.query(Contradiction).filter(Contradiction.id == id, Contradiction.org_id == org.id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Finding not found.")
    res = dict(c.graph or {})
    res["svg"] = f'<svg class="graph" viewBox="0 0 760 196"><text x="10" y="20">{res.get("clauseA", "Source A")}</text><text x="200" y="20">{res.get("clauseB", "Source B")}</text></svg>'
    return res
