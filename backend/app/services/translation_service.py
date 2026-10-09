import hashlib
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.app.models.entities import Translation
from backend.app.services.llm_provider import llm_provider

# Curated high-precision legal glossaries for Spanish and Hindi
DICTIONARY_HI = {
    "Document summary": "दस्तावेज़ सारांश",
    "Employment agreement": "रोज़गार अनुबंध",
    "Confidential Information": "गोपनीय जानकारी",
    "Restricted Period": "प्रतिबंधित अवधि",
    "Termination Date": "समाप्ति तिथि",
    "Notice period": "नोटिस अवधि",
    "Governing law": "शासी कानून",
    "Review required": "समीक्षा आवश्यक",
    "Legal AI access": "लीगल एआई पहुंच",
    "Potential contradiction": "संभावित विरोधाभास",
    "Inconsistency": "असंगति",
    "Document update": "दस्तावेज़ अद्यतन",
    "Legitimate difference": "वैध अंतर"
}

DICTIONARY_ES = {
    "Document summary": "Resumen del documento",
    "Employment agreement": "Contrato de trabajo",
    "Confidential Information": "Información confidencial",
    "Restricted Period": "Período restringido",
    "Termination Date": "Fecha de terminación",
    "Notice period": "Período de preaviso",
    "Governing law": "Ley aplicable",
    "Review required": "Revisión requerida",
    "Legal AI access": "Acceso a IA Legal",
    "Potential contradiction": "Contradicción potencial",
    "Inconsistency": "Inconsistencia",
    "Document update": "Actualización del documento",
    "Legitimate difference": "Diferencia legítima"
}

class TranslationService:
    @staticmethod
    def get_hash(text: str) -> str:
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    @classmethod
    def translate(cls, db: Session, text: str, target_lang: str) -> str:
        if not text or target_lang == "en":
            return text

        s_hash = cls.get_hash(text)
        cached = db.query(Translation).filter(
            Translation.source_hash == s_hash,
            Translation.lang == target_lang
        ).first()

        if cached:
            return cached.text

        # Check curated glossary first
        glossary = DICTIONARY_HI if target_lang == "hi" else DICTIONARY_ES
        if text in glossary:
            translated = glossary[text]
        else:
            # Use LLM or rule-based translator
            prompt = f"Translate the following legal explanation accurately into {target_lang}. Preserve all section references and names exactly as they are:\n\n{text}"
            translated = llm_provider.generate(prompt=prompt, system=f"You are a professional legal translator specializing in {target_lang}.")
            if not translated or translated == text:
                # Fallback transliteration/formatting
                translated = f"[{target_lang.upper()}] {text}"

        record = Translation(
            source_hash=s_hash,
            lang=target_lang,
            text=translated
        )
        db.add(record)
        db.commit()
        return translated

translation_service = TranslationService()
