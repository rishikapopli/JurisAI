from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.entities import Jurisdiction, ClauseLegalMapping, JurisdictionRequest, LegalSource, Clause, Document
from backend.app.schemas.api_schemas import LegalContextRequest, JurisdictionRequestCreate
from backend.app.api.deps import get_current_user_and_org
from backend.app.services.legal_service import legal_service

router = APIRouter(prefix="", tags=["legal"])

@router.get("/jurisdictions")
def get_jurisdictions(db: Session = Depends(get_db)):
    return legal_service.get_jurisdictions(db)

@router.post("/jurisdictions/requests", status_code=status.HTTP_201_CREATED)
def request_jurisdiction(
    req: JurisdictionRequestCreate,
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    jr = JurisdictionRequest(
        org_id=org.id,
        user_id=user.id,
        text=req.text.strip(),
        status="OPEN"
    )
    db.add(jr)
    db.commit()
    return {"status": "created", "id": jr.id}

@router.get("/legal/clauses")
def get_legal_clauses(
    document_id: str = Query(...),
    jurisdiction: str = Query("uk"),
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    mappings = db.query(ClauseLegalMapping).filter(
        ClauseLegalMapping.document_id == document_id,
        ClauseLegalMapping.jurisdiction_id == jurisdiction
    ).all()

    items = []
    for m in mappings:
        cl = db.query(Clause).filter(Clause.document_id == document_id, Clause.clause_number == m.clause_ref).first()
        items.append({
            "ref": m.clause_ref,
            "title": cl.title if cl else f"Clause {m.clause_ref}",
            "concept": m.concept,
            "covered": not m.unavailable
        })

    # If no mappings in DB, check standard clauses for doc
    if not items:
        clauses = db.query(Clause).filter(Clause.document_id == document_id).all()
        for c in clauses:
            items.append({
                "ref": c.clause_number,
                "title": c.title or f"Clause {c.clause_number}",
                "concept": c.topic or "Contractual provision",
                "covered": False
            })

    return {"items": items}

@router.post("/legal/context")
def get_legal_context(
    req: LegalContextRequest,
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    res = legal_service.get_legal_context(db, req.document_id, req.clause_ref, req.jurisdiction)
    return res

@router.get("/legal/sources/{id}")
def get_legal_source(id: str, db: Session = Depends(get_db)):
    src = db.query(LegalSource).filter(LegalSource.id == id).first()
    if not src:
        raise HTTPException(status_code=404, detail="Legal source not found.")
    return {
        "id": src.id,
        "name": src.name,
        "cite": src.cite,
        "type": src.type,
        "rel": src.rel,
        "url": src.url
    }
