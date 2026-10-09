import re
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from backend.app.models.entities import Document, Analysis, Clause
from backend.app.services.parsing_service import parsing_service
from backend.app.services.embedding_provider import embedding_provider

class AnalysisService:
    @classmethod
    def analyze_document(cls, db: Session, document: Document, full_text: str, pages: List[Dict[str, Any]]) -> Analysis:
        structure = parsing_service.parse_clauses_and_structure(pages, document.name)
        sections = structure["sections"]
        all_clauses = structure["clauses"]

        # Save individual clauses into DB with embeddings
        for c in all_clauses:
            existing = db.query(Clause).filter(
                Clause.document_id == document.id,
                Clause.clause_number == c["ref"]
            ).first()
            emb = embedding_provider.embed_text(c["text"])
            if not existing:
                cl_obj = Clause(
                    document_id=document.id,
                    clause_number=c["ref"],
                    title=c["title"],
                    text=c["text"],
                    page_no=c["page"],
                    embedding=emb
                )
                db.add(cl_obj)

        # Extract dates
        dates = []
        date_pattern = re.compile(r"\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b", re.IGNORECASE)
        for c in all_clauses:
            for match in date_pattern.finditer(c["text"]):
                dates.append({
                    "text": match.group(1),
                    "label": f"Mentioned in {c['title']}",
                    "ref": f"{document.id}:{c['ref']}"
                })

        # Extract obligations
        obligations = []
        obl_pattern = re.compile(r"([^.]*?\b(?:shall|must|agrees to|shall not)\b[^.]*)", re.IGNORECASE)
        for c in all_clauses:
            for m in obl_pattern.finditer(c["text"]):
                clause_text = m.group(0).strip()
                if len(clause_text) > 20:
                    who = "Employee" if "employee" in clause_text.lower() else "Company" if "company" in clause_text.lower() else "Party"
                    obligations.append({
                        "who": who,
                        "text": clause_text[:180] + ("…" if len(clause_text) > 180 else ""),
                        "ref": f"{document.id}:{c['ref']}"
                    })

        # Extract definitions
        definitions = []
        def_pattern = re.compile(r"“([^”\"]+)”\s+means\s+([^.]+)", re.IGNORECASE)
        for c in all_clauses:
            for m in def_pattern.finditer(c["text"]):
                definitions.append({
                    "t": m.group(1).strip(),
                    "d": m.group(2).strip(),
                    "ref": f"{document.id}:{c['ref']}"
                })

        # Build notes & marks
        notes = {}
        marks = {}
        issues = []

        for c in all_clauses:
            ref = c["ref"]
            t = c["text"]
            gist = f"Provisions regarding {c['title'].lower()}."
            explain = f"Clause {ref} defines the requirements and standards applicable under {c['title'].lower()}."
            means = [f"Binds parties to the specifications outlined in section {ref}."]
            questions = [f"Has this clause been reviewed by counsel for {document.jurisdiction_id.upper()} compliance?"]
            terms = []

            # Check specific topics
            t_low = t.lower()
            if "notice" in t_low or "terminat" in t_low:
                gist = "Termination requirements and written notice periods."
                explain = f"Specifies notice periods required to terminate the agreement and consequences of termination."
                means.append("Written notice must be delivered within the designated timeframe.")
                marks[ref] = [["notice", "Notice requirement"], ["terminate", "Termination right"]]
            elif "confidential" in t_low:
                gist = "Obligations to safeguard confidential and proprietary information."
                explain = "Requires parties to keep non-public commercial and technical information strictly secret."
                means.append("Duty applies throughout and continues beyond the agreement's term.")
                terms.append({"t": "Confidential Information", "d": "Non-public proprietary business data."})
                marks[ref] = [["Confidential Information", "Protected assets"]]
            elif "restrict" in t_low or "compete" in t_low:
                gist = "Post-termination non-competition and client restrictions."
                explain = "Imposes limitations on competitive activities following termination of the engagement."
                issues.append({
                    "sev": "med",
                    "title": "Post-termination restrictive covenants",
                    "text": "Restrictive covenant length and geographic reach require careful enforceability review.",
                    "ref": f"{document.id}:{ref}"
                })

            notes[ref] = {
                "gist": gist,
                "explain": explain,
                "means": means,
                "questions": questions,
                "terms": terms
            }

        # Governing law
        gov_law = {"text": "Governing law is determined by the selected jurisdiction.", "ref": f"{document.id}:1.1", "jur": document.jurisdiction_id}
        for c in all_clauses:
            if "governed by" in c["text"].lower() or "jurisdiction" in c["text"].lower():
                gov_law = {"text": c["text"][:150], "ref": f"{document.id}:{c['ref']}", "jur": document.jurisdiction_id}
                break

        summary = f"A {document.doc_type.lower()} of {document.page_count} pages uploaded to your workspace. JURISAI extracted its structure and mapped {len(all_clauses)} key clauses."
        facts = [
            ["Type", document.doc_type],
            ["Pages", str(document.page_count)],
            ["Uploaded", {"iso": document.uploaded_at.strftime("%Y-%m-%d")}],
            ["Jurisdiction", document.jurisdiction_id.upper()]
        ]

        analysis = db.query(Analysis).filter(Analysis.document_id == document.id).first()
        if not analysis:
            analysis = Analysis(
                org_id=document.org_id,
                document_id=document.id,
                state="COMPLETED",
                doc_type=document.doc_type,
                summary=summary,
                facts=facts,
                clauses_data=sections,
                governing_law=gov_law,
                dates=dates,
                obligations=obligations,
                issues=issues,
                definitions=definitions,
                marks=marks,
                notes=notes
            )
            db.add(analysis)
        else:
            analysis.state = "COMPLETED"
            analysis.summary = summary
            analysis.facts = facts
            analysis.clauses_data = sections
            analysis.governing_law = gov_law
            analysis.dates = dates
            analysis.obligations = obligations
            analysis.issues = issues
            analysis.definitions = definitions
            analysis.marks = marks
            analysis.notes = notes

        document.analysis_state = "analyzed"
        db.commit()
        db.refresh(analysis)
        return analysis

analysis_service = AnalysisService()
