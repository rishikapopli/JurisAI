import datetime
import random
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.app.models.entities import Report, Document, Analysis, Contradiction

class ReportService:
    @classmethod
    def generate_report(
        cls,
        db: Session,
        org_id: str,
        user_id: str,
        report_type: str,
        doc_ids: List[str],
        comparison_id: Optional[str] = None,
        jurisdiction: str = "uk",
        language: str = "en",
        include_sources: bool = True
    ) -> Report:
        now = datetime.datetime.utcnow()
        public_id = f"JR-{now.strftime('%Y%m%d')}-{random.randint(1000, 9999)}"

        docs = db.query(Document).filter(Document.id.in_(doc_ids)).all() if doc_ids else []
        doc_names = [d.name for d in docs]
        sec_status = "VERIFIED" if all(d.security_state == "verified" for d in docs) else "REVIEW REQUIRED"

        sections = []
        used_refs = []

        if report_type == "summary":
            title = "Summary report"
            for d in docs:
                an = db.query(Analysis).filter(Analysis.document_id == d.id).first()
                if an:
                    sections.append({
                        "h": "Executive summary",
                        "sub": "AI explanation",
                        "blocks": [{"p": an.summary}]
                    })
                    sections.append({
                        "h": "Key facts",
                        "blocks": [{"kv": [[f[0], str(f[1])] for f in (an.facts or [])]}]
                    })
                    sections.append({
                        "h": "Important dates",
                        "blocks": [{"kv": [[dt.get("text", ""), dt.get("label", "")] for dt in (an.dates or [])]}]
                    })
        elif report_type == "detail":
            title = "Detailed analysis"
            for d in docs:
                an = db.query(Analysis).filter(Analysis.document_id == d.id).first()
                if an:
                    sections.append({
                        "h": "Executive summary",
                        "sub": "AI explanation",
                        "blocks": [{"p": an.summary}]
                    })
                    sections.append({
                        "h": "Obligations",
                        "blocks": [{"ul": [f"{o.get('who', '')}: {o.get('text', '')}" for o in (an.obligations or [])]}]
                    })
                    sections.append({
                        "h": "Definitions",
                        "blocks": [{"kv": [[df.get("t", ""), df.get("d", "")] for df in (an.definitions or [])]}]
                    })
        elif report_type == "contra":
            title = "Contradiction report"
            contras = db.query(Contradiction).filter(Contradiction.org_id == org_id).all()
            contra_list = [c for c in contras if any(d_id in c.pair for d_id in doc_ids)]
            sections.append({
                "h": "Overview",
                "blocks": [{"p": f"{len(contra_list)} differences identified between analyzed documents."}]
            })
            for c in contra_list:
                sections.append({
                    "h": f"{c.topic} — {c.kind.title()}",
                    "sub": f"{c.sev.title()} priority · Review required",
                    "blocks": [
                        {"kv": [["Source A", c.a_data.get("value", "")], ["Source B", c.b_data.get("value", "")]]},
                        {"q": c.a_data.get("quote", ""), "src": c.a_data.get("ref", "")},
                        {"q": c.b_data.get("quote", ""), "src": c.b_data.get("ref", "")},
                        {"p": c.what}
                    ]
                })
        else:
            title = "Legal context report"
            sections.append({
                "h": "Overview",
                "blocks": [{"p": f"AI-assisted legal research for {', '.join(doc_names)} under {jurisdiction.upper()} law."}]
            })

        content = {
            "title": title,
            "docs": [{"id": d.id, "name": d.name, "sha": d.sha256[:8] + "…" + d.sha256[-4:]} for d in docs],
            "jur": jurisdiction.upper(),
            "status": sec_status,
            "sha": " · ".join([d.sha256[:8] + "…" + d.sha256[-4:] for d in docs]),
            "when": now.isoformat(),
            "id": public_id,
            "sections": sections,
            "used": used_refs
        }

        report = Report(
            public_id=public_id,
            org_id=org_id,
            created_by=user_id,
            type=report_type,
            title=title,
            document_ids=doc_ids,
            comparison_id=comparison_id,
            jurisdiction_id=jurisdiction,
            language=language,
            status=sec_status,
            content=content
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        return report

    @classmethod
    def to_markdown(cls, report: Report) -> str:
        c = report.content
        lines = [
            f"# JURISAI — {c.get('title', report.title)}",
            "",
            f"**Report ID:** {report.public_id}  ",
            f"**Security Status:** {report.status}  ",
            f"**Jurisdiction:** {c.get('jur', report.jurisdiction_id)}  ",
            f"**Generated:** {report.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')}  ",
            "",
            "---",
            ""
        ]
        for idx, s in enumerate(c.get("sections", [])):
            lines.append(f"## {idx + 1}. {s.get('h', '')}")
            if s.get("sub"):
                lines.append(f"*{s.get('sub')}*\n")
            for b in s.get("blocks", []):
                if "p" in b:
                    lines.append(f"{b['p']}\n")
                if "q" in b:
                    lines.append(f"> {b['q']}\n")
                if "kv" in b:
                    for k, v in b["kv"]:
                        lines.append(f"- **{k}:** {v}")
                    lines.append("")
                if "ul" in b:
                    for item in b["ul"]:
                        lines.append(f"- {item}")
                    lines.append("")
        lines.append("\n---\n*Review required. AI-assisted analysis, not legal advice. Verify all sources before relying on it.*")
        return "\n".join(lines)

report_service = ReportService()
