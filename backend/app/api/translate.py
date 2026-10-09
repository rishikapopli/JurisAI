from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.schemas.api_schemas import TranslationRequest
from backend.app.services.translation_service import translation_service

router = APIRouter(prefix="", tags=["translate"])

@router.post("/translate")
def translate_content(req: TranslationRequest, db: Session = Depends(get_db)):
    if req.texts:
        translated_list = [translation_service.translate(db, t, req.lang) for t in req.texts]
        return {"translated": translated_list, "translations": translated_list}
    return {"status": "ok"}
