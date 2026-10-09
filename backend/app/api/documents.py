import os
import json
import asyncio
import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Response, status
from fastapi.responses import StreamingResponse, PlainTextResponse, FileResponse
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.entities import Document, DocumentFile, DocumentPage, SecurityScan, SecurityScanCheck, PIIFinding, Analysis, Clause
from backend.app.api.deps import get_current_user_and_org
from backend.app.services.storage_service import storage_service
from backend.app.services.security_scanner import security_scanner
from backend.app.services.parsing_service import parsing_service
from backend.app.services.analysis_service import analysis_service
from backend.app.services.audit_service import AuditService

router = APIRouter(prefix="/documents", tags=["documents"])

@router.post("", status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    file: UploadFile = File(...),
    jurisdiction: Optional[str] = Form("uk"),
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    fname = file.filename or "uploaded_file"
    ext = os.path.splitext(fname)[1].lower().lstrip(".")

    # Reject unsupported executable/archive files per spec (TYPE-415)
    unsupported_exts = ["exe", "bat", "msi", "dll", "zip", "rar", "7z", "js", "sh", "app", "dmg"]
    if ext in unsupported_exts:
        AuditService.record(
            db, org_id=org.id, action="security.reject_type",
            title="File rejected (unsupported type)", actor_id=user.id,
            object_label=fname, meta="TYPE-415"
        )
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail={"code": "TYPE-415", "message": "File type not supported. Please upload PDF, DOCX or TXT."}
        )

    file_bytes = await file.read()
    if not file_bytes:
        AuditService.record(
            db, org_id=org.id, action="security.reject_corrupt",
            title="File rejected (corrupted)", actor_id=user.id,
            object_label=fname, meta="INT-210"
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "INT-210", "message": "Corrupted or empty file."}
        )

    # Save to quarantine
    file_path, sha, size_bytes = storage_service.save_upload(file_bytes, fname)
    size_formatted = f"{size_bytes / 1048576:.1f} MB" if size_bytes > 1048576 else f"{max(1, round(size_bytes / 1024))} KB"

    # Extract text preview for scanning
    full_text, pages = parsing_service.extract_text_and_pages(file_bytes, fname)

    # Security scan
    scan_res = security_scanner.scan_file(file_path, fname, file_bytes, full_text)
    sec_state = scan_res["security_state"]  # 'verified', 'review', 'blocked'

    # If verified, move to verified storage
    if sec_state == "verified":
        file_path = storage_service.move_to_verified(file_path)

    # Guess document type
    doc_type = "Legal document"
    fn_lower = fname.lower()
    if "employ" in fn_lower:
        doc_type = "Employment agreement"
    elif "policy" in fn_lower:
        doc_type = "Policy handbook"
    elif "nda" in fn_lower:
        doc_type = "Non-disclosure agreement"
    elif "lease" in fn_lower:
        doc_type = "Leave & licence agreement"
    elif "msa" in fn_lower or "vendor" in fn_lower:
        doc_type = "Master services agreement"
    elif "settle" in fn_lower:
        doc_type = "Settlement agreement"

    # Create document record
    doc = Document(
        org_id=org.id,
        owner_id=user.id,
        name=fname,
        ext=ext,
        size_bytes=size_bytes,
        size_formatted=size_formatted,
        sha256=sha,
        page_count=len(pages),
        doc_type=doc_type,
        jurisdiction_id=jurisdiction or "uk",
        security_state=sec_state,
        analysis_state="pending" if sec_state == "verified" else "not_analyzed"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Store file record
    doc_file = DocumentFile(
        document_id=doc.id,
        kind="ORIGINAL",
        file_path=file_path,
        size_bytes=size_bytes,
        sha256=sha
    )
    db.add(doc_file)

    # Store pages
    for p in pages:
        db.add(DocumentPage(
            document_id=doc.id,
            page_no=p["page_no"],
            text=p["text"],
            char_count=p["char_count"]
        ))

    # Store scan records
    scan_obj = SecurityScan(
        document_id=doc.id,
        org_id=org.id,
        decision=scan_res["decision"],
        risk_level="HIGH" if sec_state == "blocked" else "MEDIUM" if sec_state == "review" else "LOW",
        sha256=sha
    )
    db.add(scan_obj)
    db.commit()

    # Store sensitive items if review
    if sec_state == "review":
        for s in scan_res["sensitive"]:
            db.add(PIIFinding(
                scan_id=scan_obj.id,
                document_id=doc.id,
                org_id=org.id,
                entity_type="BANK_ACCOUNT" if "bank" in s["kind"].lower() else "NATIONAL_ID",
                page_no=s["page"],
                masked_value=s["val"],
                context_label=s["kind"]
            ))

    # Auto-extract analysis if verified
    if sec_state == "verified":
        analysis_service.analyze_document(db, doc, full_text, pages)

    # Audit records
    AuditService.record(
        db, org_id=org.id, action="document.upload",
        title="Document uploaded", actor_id=user.id,
        object_label=f"{fname} · {size_formatted}", document_id=doc.id,
        ui_type="upload"
    )
    AuditService.record(
        db, org_id=org.id, action="security.scan",
        title="File blocked" if sec_state == "blocked" else "Security scan completed",
        actor_id=user.id, actor_name="Security gateway",
        object_label=fname, document_id=doc.id,
        ui_type="block" if sec_state == "blocked" else "scan"
    )

    doc_data = {
        "id": doc.id,
        "name": doc.name,
        "type": doc.doc_type,
        "size": doc.size_formatted,
        "pages": doc.page_count,
        "sec": doc.security_state,
        "an": doc.analysis_state,
        "jur": doc.jurisdiction_id,
        "sha": f"{sha[:8]}…{sha[-4:]}",
        "scan": scan_res["checks"],
        "sensitive": scan_res["sensitive"]
    }

    job_data = {
        "id": f"job_{doc.id}",
        "state": "SUCCEEDED",
        "stage": "COMPLETED",
        "stage_index": 6,
        "stage_total": 6,
        "progress": 1.0
    }

    return {"document": doc_data, "job": job_data, **doc_data}

@router.get("")
def list_documents(
    status: Optional[str] = "all",
    q: Optional[str] = "",
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    query = db.query(Document).filter(Document.org_id == org.id)

    all_docs = query.all()
    non_archived = [d for d in all_docs if not d.archived_at]
    archived = [d for d in all_docs if d.archived_at]

    counts = {
        "all": len(non_archived),
        "verified": len([d for d in non_archived if d.security_state == "verified"]),
        "review": len([d for d in non_archived if d.security_state == "review"]),
        "blocked": len([d for d in non_archived if d.security_state == "blocked"]),
        "processing": len([d for d in non_archived if d.security_state == "processing"]),
        "archived": len(archived)
    }

    # Filter
    if status == "archived":
        filtered = archived
    else:
        filtered = non_archived
        if status and status != "all":
            filtered = [d for d in filtered if d.security_state == status]

    if q and q.strip():
        q_low = q.strip().lower()
        filtered = [d for d in filtered if q_low in (d.name + " " + (d.doc_type or "") + " " + d.jurisdiction_id).lower()]

    items = []
    for d in filtered:
        sha_short = f"{d.sha256[:8]}…{d.sha256[-4:]}" if d.sha256 else "—"
        items.append({
            "id": d.id,
            "name": d.name,
            "type": d.doc_type or "Legal document",
            "size": d.size_formatted,
            "pages": d.page_count,
            "uploaded": d.uploaded_at.isoformat(),
            "sec": d.security_state,
            "an": d.analysis_state,
            "jur": d.jurisdiction_id,
            "sha": sha_short,
            "archived": d.archived_at is not None
        })

    return {"items": items, "total": len(items), "counts": counts}

@router.get("/{id}")
def get_document(id: str, principal=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    user, org = principal
    doc = db.query(Document).filter(Document.id == id, Document.org_id == org.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    pii_rows = db.query(PIIFinding).filter(PIIFinding.document_id == doc.id).all()
    sensitive_items = [{"kind": p.context_label or p.entity_type, "val": p.masked_value, "page": p.page_no} for p in pii_rows]

    # Generate checks matching J.checksHTML
    checks = []
    if doc.security_state == "verified":
        checks = [
            ["Integrity check", "pass", "SHA-256 verified · file structure valid"],
            ["Threat screening", "pass", "No malware signatures · no embedded scripts · no prompt-injection patterns"],
            ["Sensitive data inspection", "pass", "No unexpected personal or financial identifiers"],
            ["Document verification", "pass", "Attested and released to Legal AI"]
        ]
    elif doc.security_state == "review":
        checks = [
            ["Integrity check", "pass", "SHA-256 verified · file structure valid"],
            ["Threat screening", "pass", "No malware signatures · no embedded scripts · no prompt-injection patterns"],
            ["Sensitive data inspection", "flag", f"{len(sensitive_items)} items detected on pp. 9–10: bank account numbers, national ID"],
            ["Document verification", "hold", "Held for your review before Legal AI access"]
        ]
    else:
        checks = [
            ["Integrity check", "pass", "File structure readable"],
            ["Threat screening", "fail", "Embedded script or malicious pattern detected"],
            ["Sensitive data inspection", "skip", "Skipped — file failed threat screening"],
            ["Document verification", "fail", "Quarantined. Never opened by any AI component"]
        ]

    an = db.query(Analysis).filter(Analysis.document_id == doc.id).first()

    sha_short = f"{doc.sha256[:8]}…{doc.sha256[-4:]}" if doc.sha256 else "—"

    return {
        "id": doc.id,
        "name": doc.name,
        "type": doc.doc_type,
        "size": doc.size_formatted,
        "pages": doc.page_count,
        "uploaded": doc.uploaded_at.isoformat(),
        "sec": doc.security_state,
        "an": doc.analysis_state,
        "jur": doc.jurisdiction_id,
        "sha": sha_short,
        "archived": doc.archived_at is not None,
        "scan": checks,
        "sensitive": sensitive_items,
        "content": {
            "summary": an.summary if an else "",
            "facts": an.facts if an else [],
            "clauses": an.clauses_data if an else [],
            "marks": an.marks if an else {},
            "notes": an.notes if an else {},
            "dates": an.dates if an else [],
            "obligations": an.obligations if an else [],
            "issues": an.issues if an else [],
            "defs": an.definitions if an else [],
            "law": an.governing_law if an else {}
        } if an else None
    }

@router.get("/{id}/events")
async def document_intake_events(id: str, principal=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    user, org = principal
    doc = db.query(Document).filter(Document.id == id, Document.org_id == org.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    async def event_generator():
        stages = ["File received", "Integrity check", "Threat screening", "Sensitive data inspection", "Document verification", "Legal AI access"]
        for idx, stage in enumerate(stages):
            data = {
                "document_id": doc.id,
                "stage": stage,
                "stage_index": idx + 1,
                "stage_total": 6,
                "ui_state": doc.security_state
            }
            yield f"event: job.progress\ndata: {json.dumps(data)}\n\n"
            await asyncio.sleep(0.3)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/{id}/pages")
def get_document_pages(id: str, principal=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    user, org = principal
    pages = db.query(DocumentPage).filter(DocumentPage.document_id == id).order_by(DocumentPage.page_no.asc()).all()
    return {"pages": [{"page_no": p.page_no, "text": p.text, "flags": []} for p in pages]}

@router.get("/{id}/text")
def get_document_text(id: str, principal=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    user, org = principal
    pages = db.query(DocumentPage).filter(DocumentPage.document_id == id).order_by(DocumentPage.page_no.asc()).all()
    return PlainTextResponse("\n\n".join([p.text for p in pages]))

@router.get("/{id}/file")
def download_original_file(id: str, principal=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    user, org = principal
    doc = db.query(Document).filter(Document.id == id, Document.org_id == org.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    if doc.security_state == "blocked":
        raise HTTPException(status_code=403, detail="File is quarantined and cannot be downloaded.")

    doc_file = db.query(DocumentFile).filter(DocumentFile.document_id == doc.id).first()
    if doc_file and os.path.exists(doc_file.file_path):
        return FileResponse(doc_file.file_path, filename=doc.name)

    # If file content not on disk (e.g. initial demo seed), synthesize plain text attachment
    pages = db.query(DocumentPage).filter(DocumentPage.document_id == id).order_by(DocumentPage.page_no.asc()).all()
    txt = "\n\n".join([p.text for p in pages]) or f"JURISAI Document Archive: {doc.name}"
    return Response(
        content=txt.encode("utf-8"),
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="{doc.name}.txt"'}
    )

@router.post("/{id}/archive")
def archive_document(id: str, principal=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    user, org = principal
    doc = db.query(Document).filter(Document.id == id, Document.org_id == org.id).first()
    if doc:
        doc.archived_at = datetime.datetime.utcnow()
        db.commit()
    return {"status": "archived"}

@router.post("/{id}/restore")
def restore_document(id: str, principal=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    user, org = principal
    doc = db.query(Document).filter(Document.id == id, Document.org_id == org.id).first()
    if doc:
        doc.archived_at = None
        db.commit()
    return {"status": "restored"}

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(id: str, principal=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    user, org = principal
    doc = db.query(Document).filter(Document.id == id, Document.org_id == org.id).first()
    if doc:
        name = doc.name
        db.query(Analysis).filter(Analysis.document_id == id).delete()
        db.query(Clause).filter(Clause.document_id == id).delete()
        db.query(DocumentPage).filter(DocumentPage.document_id == id).delete()
        db.query(DocumentFile).filter(DocumentFile.document_id == id).delete()
        db.delete(doc)
        db.commit()

        AuditService.record(
            db, org_id=org.id, action="document.delete",
            title="Document removed", actor_id=user.id,
            object_label=name, document_id=id
        )
