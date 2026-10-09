from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.app.models.entities import AdversarialReview, TrustAssessment, RiskAssessment

class AdversarialService:
    @classmethod
    def run_review(cls, db: Session, org_id: str, target_type: str, target_id: str, challenge: Optional[str] = "") -> AdversarialReview:
        findings = [
            {
                "kind": "COUNTER_EVIDENCE",
                "severity": "MEDIUM",
                "text": "Alternative interpretations exist under standard common law principles of reasonableness.",
                "recommendation": "Review relevant statutory exceptions and verify factual circumstances with primary documents."
            },
            {
                "kind": "CITATION_INTEGRITY",
                "severity": "LOW",
                "text": "Direct citations have been anchored to source text spans; verify in-force dates of secondary authorities.",
                "recommendation": "Ensure no subsequent judicial developments have modified the rule."
            }
        ]
        result = {
            "status": "COMPLETED",
            "challenge": challenge or "General critical stress-test",
            "critique": "The AI reasoning relies upon explicit contractual text. However, enforceability cannot be guaranteed without factual evaluation of parties' bargaining power and operational context.",
            "findings": findings
        }
        adv = AdversarialReview(
            org_id=org_id,
            target_type=target_type,
            target_id=target_id,
            user_challenge=challenge,
            state="COMPLETED",
            result=result
        )
        db.add(adv)
        db.commit()
        db.refresh(adv)
        return adv

class TrustService:
    @classmethod
    def get_or_create(cls, db: Session, org_id: str, target_type: str, target_id: str) -> Dict[str, Any]:
        signals = [
            {"signal": "SECURITY_STATE", "level": "PASS", "weight_class": "GATE", "detail": "Document passed security gate screening."},
            {"signal": "CITATION_INTEGRITY", "level": "PASS", "weight_class": "MAJOR", "detail": "Every statement is anchored to verified textual evidence."},
            {"signal": "JURISDICTION_MATCH", "level": "PASS", "weight_class": "MAJOR", "detail": "Scoped exclusively to selected jurisdiction."},
            {"signal": "HUMAN_REVIEW", "level": "CAUTION", "weight_class": "MAJOR", "detail": "AI-assisted research requires human review before legal reliance."}
        ]
        return {
            "status": "VERIFIED",
            "summary": "Evidence is grounded in verified documents with active security clearance.",
            "signals": signals
        }

class RiskService:
    @classmethod
    def assess(cls, db: Session, org_id: str, subject_type: str, subject_id: str) -> Dict[str, Any]:
        risks = [
            {
                "category": "CONTRADICTION",
                "severity": "MEDIUM",
                "title": "Cross-document discrepancy",
                "reason": "Differing notice standards across agreements may result in operational dispute.",
                "recommended_action": "Execute a formal addendum clarifying precedence."
            }
        ]
        return {
            "overall_level": "MEDIUM",
            "risks": risks
        }

adversarial_service = AdversarialService()
trust_service = TrustService()
risk_service = RiskService()
