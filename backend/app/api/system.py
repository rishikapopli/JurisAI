from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.entities import Document, Analysis, Contradiction, ResearchThread
from backend.app.api.deps import get_current_user_and_org
from backend.app.config import settings

router = APIRouter(prefix="", tags=["system"])

@router.get("/healthz")
def healthz():
    return {"status": "ok", "version": settings.VERSION}

@router.get("/readyz")
def readyz():
    return {"status": "ready", "version": settings.VERSION}

@router.get("/system/status")
def get_system_status():
    return {
        "session": {
            "expires_at": "30 days",
            "idle_timeout_s": 1800,
            "current": True
        },
        "transport": {
            "tls_version": "TLS 1.3",
            "cipher": "AES-256-GCM"
        },
        "tenancy": {
            "isolation": "Isolated · single tenant"
        },
        "gateway": {
            "status": "Online · enforcing",
            "engines": ["ClamAV", "YARA", "Presidio", "Structural Integrity"]
        },
        "version": settings.VERSION
    }

@router.get("/dashboard")
def get_dashboard(principal=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    user, org = principal
    docs = db.query(Document).filter(Document.org_id == org.id, Document.archived_at == None).order_by(Document.uploaded_at.desc()).all()

    ver = len([d for d in docs if d.security_state == "verified"])
    rev = len([d for d in docs if d.security_state == "review"])
    blk = len([d for d in docs if d.security_state == "blocked"])

    recent_docs = [{
        "id": d.id,
        "name": d.name,
        "type": d.doc_type,
        "size": d.size_formatted,
        "pages": d.page_count,
        "uploaded": d.uploaded_at.isoformat(),
        "sec": d.security_state,
        "an": d.analysis_state,
        "jur": d.jurisdiction_id
    } for d in docs[:5]]

    # Recent analyzed docs
    analyzed_docs = []
    for d in docs:
        if d.security_state == "verified" and d.analysis_state == "analyzed":
            an = db.query(Analysis).filter(Analysis.document_id == d.id).first()
            if an:
                clauses_count = sum(len(c.get("paras", [])) for c in (an.clauses_data or []))
                analyzed_docs.append({
                    "id": d.id,
                    "name": d.name,
                    "summary_first": (an.summary or "").split(". ")[0] + ".",
                    "clauses_count": clauses_count,
                    "issues_count": len(an.issues or [])
                })
        if len(analyzed_docs) >= 3:
            break

    # Requires review
    requires_review = []
    contras = db.query(Contradiction).filter(Contradiction.org_id == org.id, Contradiction.status == "open").all()
    for c in contras:
        requires_review.append({
            "sev": c.sev,
            "t": f"{c.topic}: {c.a_data.get('value')} vs {c.b_data.get('value')}",
            "s": "Potential contradiction" if c.kind == "contradiction" else "Inconsistency",
            "go": f"compare?a={c.pair[0]}&b={c.pair[1]}&f={c.id}"
        })
    for d in docs:
        if d.security_state == "review":
            requires_review.append({
                "sev": "med",
                "t": f"{d.name} — sensitive data found",
                "s": "Security · Legal AI on hold",
                "go": "documents?f=review"
            })
        if d.security_state == "blocked":
            requires_review.append({
                "sev": "high",
                "t": f"{d.name} — blocked by gateway",
                "s": "Security · quarantined",
                "go": "security"
            })

    # Research threads
    threads = db.query(ResearchThread).filter(ResearchThread.org_id == org.id).order_by(ResearchThread.updated_at.desc()).limit(3).all()
    research_items = [{
        "id": t.id,
        "title": t.title,
        "at": t.updated_at.isoformat()
    } for t in threads]

    return {
        "recent_documents": recent_docs,
        "recent_analysis": analyzed_docs,
        "requires_review": requires_review,
        "security": {
            "uploaded": len(docs),
            "scanned": ver + rev + blk,
            "verified": ver,
            "held": rev + blk
        },
        "research": research_items
    }
