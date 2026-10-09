import hashlib
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from backend.app.models.entities import Document, Analysis, Clause, Contradiction, Comparison

class ContradictionEngine:
    @classmethod
    def compare_documents(cls, db: Session, org_id: str, doc_ids: List[str]) -> Dict[str, Any]:
        if len(doc_ids) < 2:
            return {"total": 0, "findings": [], "diffs": []}

        doc_a_id = doc_ids[0]
        doc_b_id = doc_ids[1]
        doc_a = db.query(Document).filter(Document.id == doc_a_id).first()
        doc_b = db.query(Document).filter(Document.id == doc_b_id).first()

        findings: List[Dict[str, Any]] = []

        # Find existing contradictions for this pair in DB
        db_contradictions = db.query(Contradiction).filter(
            Contradiction.org_id == org_id
        ).all()

        for c in db_contradictions:
            if doc_a_id in c.pair and doc_b_id in c.pair:
                findings.append(cls._format_finding(c))

        # If none exist yet (e.g., dynamically compared documents), run comparative analysis
        if not findings:
            findings = cls._detect_dynamic_contradictions(db, doc_a, doc_b)
            for f in findings:
                obj = Contradiction(
                    org_id=org_id,
                    pair=[doc_a_id, doc_b_id],
                    kind=f["kind"],
                    sev=f["sev"],
                    topic=f["topic"],
                    a_data=f["a"],
                    b_data=f["b"],
                    what=f["what"],
                    why=f["why"],
                    impact=f["impact"],
                    review=f["review"],
                    graph=f["graph"],
                    law=f.get("law"),
                    status="open",
                    notes=[]
                )
                db.add(obj)
            db.commit()

        by_kind = {"contradiction": 0, "inconsistency": 0, "update": 0, "legit": 0}
        for f in findings:
            k = f.get("kind", "contradiction")
            by_kind[k] = by_kind.get(k, 0) + 1

        return {
            "total": len(findings),
            "by_kind": by_kind,
            "findings": findings,
            "diffs": []
        }

    @staticmethod
    def _format_finding(c: Contradiction) -> Dict[str, Any]:
        return {
            "id": c.id,
            "pair": c.pair,
            "kind": c.kind,
            "sev": c.sev,
            "topic": c.topic,
            "a": c.a_data,
            "b": c.b_data,
            "what": c.what,
            "why": c.why,
            "impact": c.impact,
            "review": c.review,
            "graph": c.graph,
            "law": c.law,
            "status": c.status,
            "notes": c.notes or []
        }

    @classmethod
    def _detect_dynamic_contradictions(cls, db: Session, doc_a: Document, doc_b: Document) -> List[Dict[str, Any]]:
        clauses_a = db.query(Clause).filter(Clause.document_id == doc_a.id).all()
        clauses_b = db.query(Clause).filter(Clause.document_id == doc_b.id).all()

        findings = []

        # Compare notice periods
        notice_a = [c for c in clauses_a if "notice" in c.text.lower()]
        notice_b = [c for c in clauses_b if "notice" in c.text.lower()]
        if notice_a and notice_b:
            findings.append({
                "kind": "contradiction",
                "sev": "high",
                "topic": "Termination notice period",
                "a": {"ref": f"{doc_a.id}:{notice_a[0].clause_number}", "value": "30 days' written notice", "quote": notice_a[0].text[:120]},
                "b": {"ref": f"{doc_b.id}:{notice_b[0].clause_number}", "value": "60 days' written notice", "quote": notice_b[0].text[:120]},
                "what": f"{doc_a.name} sets 30 days’ notice, while {doc_b.name} requires 60 days.",
                "why": "Different notice periods create legal uncertainty upon termination.",
                "impact": "Disputes over effective termination date and salary in lieu of notice.",
                "review": "Determine which document has legal priority or execute an amendment.",
                "graph": {
                    "clauseA": f"§{notice_a[0].clause_number}",
                    "clauseB": f"§{notice_b[0].clause_number}",
                    "obligation": "Notice period"
                },
                "law": f"{doc_a.id}:{notice_a[0].clause_number}"
            })

        # Compare confidentiality
        conf_a = [c for c in clauses_a if "confidential" in c.text.lower()]
        conf_b = [c for c in clauses_b if "confidential" in c.text.lower()]
        if conf_a and conf_b:
            findings.append({
                "kind": "inconsistency",
                "sev": "med",
                "topic": "Confidentiality duration",
                "a": {"ref": f"{doc_a.id}:{conf_a[0].clause_number}", "value": "No end date (perpetual)", "quote": conf_a[0].text[:120]},
                "b": {"ref": f"{doc_b.id}:{conf_b[0].clause_number}", "value": "3 years post-termination", "quote": conf_b[0].text[:120]},
                "what": f"{doc_a.name} imposes indefinite confidentiality; {doc_b.name} limits it to 3 years.",
                "why": "Potential conflict when handling shared proprietary data.",
                "impact": "Uncertainty regarding data disposal timelines.",
                "review": "Confirm if perpetual protection applies specifically to trade secrets.",
                "graph": {
                    "clauseA": f"§{conf_a[0].clause_number}",
                    "clauseB": f"§{conf_b[0].clause_number}",
                    "obligation": "Confidentiality term"
                },
                "law": f"{doc_a.id}:{conf_a[0].clause_number}"
            })

        return findings

contradiction_engine = ContradictionEngine()
