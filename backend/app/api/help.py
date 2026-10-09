from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.entities import HelpCategory, HelpArticle, HelpFeedback, SupportTicket
from backend.app.schemas.api_schemas import HelpFeedbackRequest, SupportTicketRequest
from backend.app.api.deps import get_current_user_and_org

router = APIRouter(prefix="", tags=["help"])

@router.get("/help/articles")
def get_help_articles(
    cat: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db)
):
    categories = db.query(HelpCategory).order_by(HelpCategory.ordinal.asc()).all()
    cats_data = [[c.id, c.title, c.icon] for c in categories]

    query = db.query(HelpArticle)
    if cat:
        query = query.filter(HelpArticle.category_id == cat)
    articles = query.all()

    if q and q.strip():
        q_low = q.strip().lower()
        articles = [a for a in articles if q_low in (a.title + " " + " ".join(a.paras or [])).lower()]

    items = [{
        "id": a.id,
        "cat": a.category_id,
        "title": a.title,
        "paras": a.paras or [],
        "bullets": a.bullets or [],
        "text": " ".join(a.paras or [])
    } for a in articles]

    return {"categories": cats_data, "items": items}

@router.post("/help/feedback", status_code=status.HTTP_200_OK)
def submit_feedback(
    req: HelpFeedbackRequest,
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    fb = HelpFeedback(
        article_id=req.article_id,
        user_id=user.id,
        helpful=req.helpful,
        comment=req.comment
    )
    db.add(fb)
    db.commit()
    return {"status": "recorded"}

@router.post("/support/tickets", status_code=status.HTTP_201_CREATED)
def create_support_ticket(
    req: SupportTicketRequest,
    principal=Depends(get_current_user_and_org),
    db: Session = Depends(get_db)
):
    user, org = principal
    ticket = SupportTicket(
        org_id=org.id,
        user_id=user.id,
        topic=req.topic,
        message=req.message,
        state="OPEN"
    )
    db.add(ticket)
    db.commit()
    return {"status": "created", "ticket_id": ticket.id}
