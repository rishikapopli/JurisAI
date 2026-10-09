from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.app.models.entities import Jurisdiction, LegalSource, ClauseLegalMapping, Document, Clause

class LegalService:
    @classmethod
    def get_jurisdictions(cls, db: Session) -> List[Dict[str, Any]]:
        jurs = db.query(Jurisdiction).filter(Jurisdiction.enabled == True).all()
        return [{"id": j.id, "name": j.name, "sys": j.sys, "coverage": j.coverage_status} for j in jurs]

    @classmethod
    def get_legal_context(cls, db: Session, doc_id: str, clause_ref: str, jurisdiction_id: str) -> Dict[str, Any]:
        mapping = db.query(ClauseLegalMapping).filter(
            ClauseLegalMapping.document_id == doc_id,
            ClauseLegalMapping.clause_ref == clause_ref,
            ClauseLegalMapping.jurisdiction_id == jurisdiction_id
        ).first()

        if mapping:
            return {
                "concept": mapping.concept,
                "strength": mapping.strength,
                "why": mapping.why,
                "verify": mapping.verify or [],
                "sources": mapping.sources or [],
                "unavailable": mapping.unavailable
            }

        # If not mapped specifically, check if any source matches the concept
        clause = db.query(Clause).filter(
            Clause.document_id == doc_id,
            Clause.clause_number == clause_ref
        ).first()

        # By default, per spec principle 4: "JURISAI never guesses law. If no verified source exists for a concept in the selected jurisdiction, the UI shows LAW-503"
        return {
            "concept": "General contractual provision",
            "strength": "Limited",
            "why": "No specific statutory mandate or verified source has been cataloged for this clause in this jurisdiction.",
            "verify": ["Consult authoritative primary law texts."],
            "sources": [],
            "unavailable": True
        }

legal_service = LegalService()
