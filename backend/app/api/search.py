from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.entities import Document, Clause, HelpArticle, Analysis
from backend.app.api.deps import get_current_user_and_org

router = APIRouter(prefix="", tags=["search"])

@router.get("/search")
def search(
    q: Optional[str] = "",
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    q_str = (q or "").strip()
    if not q_str:
        return {
            "groups": [
                {
                    "g": "Jump to",
                    "items": [
                        {"icon": "upload", "t": "Upload a document", "s": "Secure intake", "go": "documents/intake"},
                        {"icon": "compare", "t": "Compare documents", "s": "Detect contradictions", "go": "compare"},
                        {"icon": "scales", "t": "Legal Context", "s": "United Kingdom", "go": "law"},
                        {"icon": "sparkle", "t": "Ask JURISAI", "s": "Grounded research", "go": "research"}
                    ]
                }
            ]
        }

    q_low = q_str.lower()
    doc_items = []
    docs = db.query(Document).filter(Document.org_id == org.id, Document.archived_at == None).all()
    for d in docs:
        if q_low in (d.name + " " + (d.doc_type or "")).lower():
            go_path = f"analyze/{d.id}" if d.security_state == "verified" else f"documents?q={d.name}"
            doc_items.append({
                "icon": "file",
                "t": d.name,
                "s": f"{d.doc_type} · {d.jurisdiction_id.upper()}",
                "go": go_path
            })

    clause_items = []
    clauses = db.query(Clause).all()
    for c in clauses:
        if q_low in (c.title + " " + c.text).lower():
            clause_items.append({
                "icon": "quote",
                "t": f"§{c.clause_number} {c.title}",
                "s": f"Document ID: {c.document_id}",
                "go": f"analyze/{c.document_id}?ref={c.clause_number}"
            })
            if len(clause_items) >= 4:
                break

    help_items = []
    articles = db.query(HelpArticle).all()
    for a in articles:
        combined = a.title + " " + " ".join(a.paras or [])
        if q_low in combined.lower():
            help_items.append({
                "icon": "help",
                "t": a.title,
                "s": "Help article",
                "go": f"help/{a.id}"
            })
            if len(help_items) >= 2:
                break

    groups = []
    if doc_items:
        groups.append({"g": "Documents", "items": doc_items[:4]})
    if clause_items:
        groups.append({"g": "Clauses", "items": clause_items})
    if help_items:
        groups.append({"g": "Help", "items": help_items})

    groups.append({
        "g": "Ask JURISAI",
        "items": [
            {
                "icon": "sparkle",
                "t": f"Ask: “{q_str}”",
                "s": "Grounded research across your verified documents",
                "go": f"research?q={q_str}"
            }
        ]
    })

    return {
        "groups": groups,
        "results": [item for g in groups for item in g.get("items", [])]
    }

@router.get("/search/suggest")
def search_suggest(q: Optional[str] = "", db: Session = Depends(get_db)):
    return []
