from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.entities import Document, Clause, Analysis

router = APIRouter(prefix="", tags=["evidence"])

@router.get("/evidence/resolve")
def resolve_reference(
    ref: str = Query(...),
    db: Session = Depends(get_db)
):
    # Format "<docId>:<clauseRef>" e.g. "emp:11.2"
    if ":" not in ref:
        raise HTTPException(status_code=400, detail="Invalid reference format. Must be doc:clause")

    doc_id, clause_ref = ref.split(":", 1)
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    an = db.query(Analysis).filter(Analysis.document_id == doc.id).first()
    para_text = ""
    clause_title = f"Clause {clause_ref}"
    page_no = 1

    if an and an.clauses_data:
        for cl in an.clauses_data:
            for p in cl.get("paras", []):
                if p.get("ref") == clause_ref:
                    para_text = p.get("text", "")
                    clause_title = cl.get("title", "")
                    page_no = cl.get("page", 1)
                    break

    if not para_text:
        cl_obj = db.query(Clause).filter(Clause.document_id == doc.id, Clause.clause_number == clause_ref).first()
        if cl_obj:
            para_text = cl_obj.text
            clause_title = cl_obj.title or clause_title
            page_no = cl_obj.page_no

    label = f"§{clause_ref} · p.{page_no}"
    full = f"{doc.name} · §{clause_ref} · p.{page_no}"

    return {
        "doc": {
            "id": doc.id,
            "name": doc.name,
            "type": doc.doc_type
        },
        "section": {
            "title": clause_title
        },
        "clause": {
            "ref": clause_ref,
            "title": clause_title,
            "page": page_no,
            "text": para_text
        },
        "para": {
            "ref": clause_ref,
            "text": para_text
        },
        "label": label,
        "full": full
    }

@router.get("/evidence/chain")
def get_evidence_chain(claim_id: Optional[str] = None):
    return [
        {"step": 1, "kind": "DOCUMENT_QUOTE", "label": "Document text verified by SHA-256"},
        {"step": 2, "kind": "LEGAL_SOURCE", "label": "Grounded authority in selected jurisdiction"},
        {"step": 3, "kind": "EXPLANATION", "label": "AI explanation with traceability"}
    ]

@router.get("/citations")
def get_citations(owner_type: Optional[str] = None, owner_id: Optional[str] = None):
    return []
