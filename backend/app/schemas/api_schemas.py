from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

# --- Auth ---
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    org: Optional[str] = "Personal workspace"
    accept_terms: bool = True

class VerifyEmailRequest(BaseModel):
    email: str
    code: str

class ResendVerificationRequest(BaseModel):
    email: str

class LoginRequest(BaseModel):
    email: str
    password: str
    remember: bool = True

class LoginMfaRequest(BaseModel):
    mfa_token: str
    code: Optional[str] = None
    recovery_code: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class TwoFaConfirmRequest(BaseModel):
    code: str

# --- Users & Settings ---
class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    job_title: Optional[str] = None
    org: Optional[str] = None

class UserSettingsSchema(BaseModel):
    jur: str = "uk"
    lang: str = "en"
    theme: str = "ivory"
    dateFmt: str = "dmy"
    collapsed: bool = False
    cite: str = "numbered"
    sourceDisplay: str = "panel"
    research: str = "balanced"
    showInference: bool = True
    speed: float = 1.0
    voice: str = "Neutral (UK)"
    voiceInput: bool = True
    retention: str = "12"
    autoDelete: bool = False
    analytics: bool = False
    training: bool = False
    twofa: bool = False
    secNotify: bool = True
    notifyEmail: bool = True
    notifyBrowser: bool = False
    notifyDigest: str = "daily"
    notifCats: Dict[str, bool] = Field(default_factory=lambda: {"sec": True, "rev": True, "ana": True, "upd": False})
    useCase: Optional[str] = ""

# --- Documents & Security ---
class DocumentDecisionRequest(BaseModel):
    action: str  # 'redact', 'release', 'hold', 'request_manual_review'
    acknowledged: bool = False
    note: Optional[str] = ""

# --- Comparison & Reviews ---
class CompareRequest(BaseModel):
    document_ids: List[str]
    mode: str = "auto"
    jurisdiction: Optional[str] = None

class ReviewActionRequest(BaseModel):
    action: str  # 'start', 'approve', 'reject', 'false_positive', 'escalate', 'reopen', 'assign'
    note: Optional[str] = ""
    assignee_id: Optional[str] = None

class ReviewNoteRequest(BaseModel):
    text: str

# --- Legal ---
class LegalContextRequest(BaseModel):
    document_id: str
    clause_ref: str
    jurisdiction: str

class JurisdictionRequestCreate(BaseModel):
    text: str

# --- Research ---
class ResearchQueryCreate(BaseModel):
    question: Optional[str] = None
    query: Optional[str] = None
    thread_id: Optional[str] = None
    document_ids: Optional[List[str]] = None
    scope: Optional[List[str]] = None
    include_legal: Optional[bool] = True
    include_law: Optional[bool] = None
    jurisdiction: str = "uk"
    depth: str = "balanced"
    lang: Optional[str] = "en"

# --- Reports & Shares ---
class ReportCreateRequest(BaseModel):
    type: Optional[str] = "summary"
    report_type: Optional[str] = None
    title: Optional[str] = "Legal Report"
    document_ids: List[str]
    comparison_id: Optional[str] = None
    jurisdiction: Optional[str] = "uk"
    language: Optional[str] = "en"
    include_sources: bool = True
    format: Optional[str] = "markdown"
    content_json: Optional[Dict[str, Any]] = None

class ShareCreateRequest(BaseModel):
    resource_type: str  # 'analysis', 'report'
    resource_id: str
    expires_in_days: int = 30

# --- Support & Help ---
class HelpFeedbackRequest(BaseModel):
    article_id: str
    helpful: bool
    comment: Optional[str] = ""

class SupportTicketRequest(BaseModel):
    topic: str
    message: str
    context: Optional[Dict[str, Any]] = None

class TranslationRequest(BaseModel):
    object_type: Optional[str] = None
    object_id: Optional[str] = None
    field: Optional[str] = None
    texts: Optional[List[str]] = None
    lang: str

class AdversarialReviewRequest(BaseModel):
    target_type: str
    target_id: str
    challenge: Optional[str] = ""
    depth: str = "standard"
