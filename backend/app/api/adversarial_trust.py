from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.schemas.api_schemas import AdversarialReviewRequest
from backend.app.api.deps import get_current_user_and_org
from backend.app.services.trust_service import adversarial_service, trust_service, risk_service

router = APIRouter(prefix="", tags=["adversarial_trust"])

@router.post("/adversarial/reviews")
def run_adversarial_review(
    req: AdversarialReviewRequest,
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    res = adversarial_service.run_review(db, org.id, req.target_type, req.target_id, req.challenge)
    return res.result

@router.get("/trust/{target_type}/{id}")
def get_trust_assessment(
    target_type: str,
    id: str,
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    return trust_service.get_or_create(db, org.id, target_type, id)

@router.get("/risk/documents/{id}")
def get_document_risk(
    id: str,
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    return risk_service.assess(db, org.id, "DOCUMENT", id)

@router.get("/risk/comparisons/{id}")
def get_comparison_risk(
    id: str,
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    return risk_service.assess(db, org.id, "COMPARISON", id)
