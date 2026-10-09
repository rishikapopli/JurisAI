import uuid
import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
)
from sqlalchemy.orm import relationship
from backend.app.database import Base

def gen_uuid():
    return str(uuid.uuid4())

class Organization(Base):
    __tablename__ = "organizations"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True)
    kind = Column(String(50), default="PERSONAL")
    data_region = Column(String(50), default="eu-west")
    settings = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class User(Base):
    __tablename__ = "users"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=True)
    job_title = Column(String(255), default="Legal researcher")
    oidc_provider = Column(String(50), nullable=True)
    oidc_subject = Column(String(255), nullable=True)
    totp_secret = Column(String(255), nullable=True)
    totp_enabled_at = Column(DateTime, nullable=True)
    email_verified_at = Column(DateTime, nullable=True)
    onboarded_at = Column(DateTime, nullable=True)
    status = Column(String(50), default="ACTIVE")
    failed_login_count = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Membership(Base):
    __tablename__ = "memberships"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    org_id = Column(String(36), ForeignKey("organizations.id"), index=True, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    role = Column(String(50), default="OWNER")  # OWNER, ADMIN, REVIEWER, ANALYST, VIEWER
    status = Column(String(50), default="ACTIVE")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Session(Base):
    __tablename__ = "sessions"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), index=True, nullable=False)
    org_id = Column(String(36), ForeignKey("organizations.id"), index=True, nullable=False)
    token_hash = Column(String(128), unique=True, index=True, nullable=False)
    csrf_secret = Column(String(128), nullable=False)
    remember = Column(Boolean, default=True)
    ip = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    device_label = Column(String(255), default="Chrome on macOS")
    geo_label = Column(String(255), default="Local Workspace")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_seen_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime, nullable=True)

class LoginEvent(Base):
    __tablename__ = "login_events"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), nullable=True, index=True)
    outcome = Column(String(50), default="SUCCESS")  # SUCCESS, FAILED, BLOCKED
    reason = Column(String(255), nullable=True)
    ip = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    device_label = Column(String(255), default="Browser")
    geo_label = Column(String(255), default="Local")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class EmailToken(Base):
    __tablename__ = "email_tokens"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), index=True, nullable=False)
    purpose = Column(String(50), nullable=False)  # VERIFY_EMAIL, RESET_PASSWORD, INVITE
    token_hash = Column(String(128), index=True, nullable=False)
    code_hash = Column(String(128), nullable=True)
    attempts = Column(Integer, default=0)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    meta = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class UserSetting(Base):
    __tablename__ = "user_settings"
    user_id = Column(String(36), primary_key=True)
    data = Column(JSON, nullable=False, default=dict)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Document(Base):
    __tablename__ = "documents"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    org_id = Column(String(36), ForeignKey("organizations.id"), index=True, nullable=False)
    owner_id = Column(String(36), nullable=True)
    name = Column(String(255), nullable=False)
    ext = Column(String(20), default="pdf")
    mime = Column(String(100), default="application/pdf")
    size_bytes = Column(Integer, default=0)
    size_formatted = Column(String(50), default="1.0 MB")
    sha256 = Column(String(64), nullable=False)
    page_count = Column(Integer, default=1)
    doc_type = Column(String(100), default="Legal document")
    language = Column(String(10), default="en")
    jurisdiction_id = Column(String(20), default="uk")
    governing_law_text = Column(String(255), nullable=True)
    processing_state = Column(String(50), default="COMPLETED")
    security_state = Column(String(50), default="VERIFIED")  # PENDING, VERIFIED, REVIEW_REQUIRED, QUARANTINED
    analysis_state = Column(String(50), default="NOT_ANALYZED")  # NOT_ANALYZED, RUNNING, ANALYZED, FAILED
    archived_at = Column(DateTime, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    verified_at = Column(DateTime, nullable=True)

class DocumentFile(Base):
    __tablename__ = "document_files"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    document_id = Column(String(36), ForeignKey("documents.id"), index=True, nullable=False)
    kind = Column(String(50), default="ORIGINAL")  # ORIGINAL, REDACTED_TEXT, TEXT
    file_path = Column(String(500), nullable=False)
    size_bytes = Column(Integer, default=0)
    sha256 = Column(String(64), nullable=False)
    mime = Column(String(100), default="application/pdf")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class DocumentPage(Base):
    __tablename__ = "document_pages"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    document_id = Column(String(36), ForeignKey("documents.id"), index=True, nullable=False)
    page_no = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    char_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ProcessingJob(Base):
    __tablename__ = "processing_jobs"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    org_id = Column(String(36), nullable=False, index=True)
    document_id = Column(String(36), nullable=True, index=True)
    kind = Column(String(50), nullable=False)  # SCAN, EXTRACT, ANALYZE, COMPARE, RESEARCH, REPORT
    state = Column(String(50), default="RUNNING")  # QUEUED, RUNNING, SUCCEEDED, FAILED
    stage = Column(String(100), default="Starting")
    stage_index = Column(Integer, default=0)
    stage_total = Column(Integer, default=6)
    progress = Column(Float, default=0.0)
    error_code = Column(String(50), nullable=True)
    result_ref = Column(JSON, default=dict)
    queued_at = Column(DateTime, default=datetime.datetime.utcnow)
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)

class SecurityScan(Base):
    __tablename__ = "security_scans"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    document_id = Column(String(36), ForeignKey("documents.id"), index=True, nullable=False)
    org_id = Column(String(36), nullable=False)
    state = Column(String(50), default="COMPLETED")
    decision = Column(String(50), default="ALLOW")  # ALLOW, REVIEW, QUARANTINE
    decision_reasons = Column(JSON, default=list)
    risk_level = Column(String(50), default="LOW")
    sha256 = Column(String(64), nullable=False)
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    finished_at = Column(DateTime, default=datetime.datetime.utcnow)

class SecurityScanCheck(Base):
    __tablename__ = "security_scan_checks"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    scan_id = Column(String(36), ForeignKey("security_scans.id"), index=True, nullable=False)
    stage_no = Column(Integer, nullable=False)
    key = Column(String(50), nullable=False)  # RECEIVED, INTEGRITY, THREAT, SENSITIVE, VERIFICATION, ACCESS
    label = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False)  # pass, flag, hold, fail, run, wait
    detail = Column(Text, nullable=False)
    data = Column(JSON, default=dict)

class SecurityFinding(Base):
    __tablename__ = "security_findings"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    scan_id = Column(String(36), ForeignKey("security_scans.id"), index=True, nullable=False)
    document_id = Column(String(36), ForeignKey("documents.id"), index=True, nullable=False)
    org_id = Column(String(36), nullable=False)
    category = Column(String(100), nullable=False)  # MALWARE, ACTIVE_CONTENT, PROMPT_INJECTION, etc.
    severity = Column(String(50), default="INFO")
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    evidence = Column(JSON, default=dict)
    location = Column(JSON, default=dict)
    recommendation = Column(Text, nullable=True)
    status = Column(String(50), default="OPEN")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class PIIFinding(Base):
    __tablename__ = "pii_findings"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    scan_id = Column(String(36), ForeignKey("security_scans.id"), index=True, nullable=False)
    document_id = Column(String(36), ForeignKey("documents.id"), index=True, nullable=False)
    org_id = Column(String(36), nullable=False)
    entity_type = Column(String(100), nullable=False)  # BANK_ACCOUNT, NATIONAL_ID, etc.
    page_no = Column(Integer, default=1)
    masked_value = Column(String(100), nullable=False)
    context_label = Column(String(255), nullable=True)
    confidence = Column(String(50), default="HIGH")
    review_required = Column(Boolean, default=True)
    action = Column(String(50), default="NONE")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Clause(Base):
    __tablename__ = "clauses"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    document_id = Column(String(36), ForeignKey("documents.id"), index=True, nullable=False)
    clause_number = Column(String(50), nullable=False)  # '11.2'
    title = Column(String(255), default="")
    text = Column(Text, nullable=False)
    page_no = Column(Integer, default=1)
    topic = Column(String(100), nullable=True)
    embedding = Column(JSON, nullable=True)

class Analysis(Base):
    __tablename__ = "analyses"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    org_id = Column(String(36), nullable=False)
    document_id = Column(String(36), ForeignKey("documents.id"), unique=True, nullable=False)
    state = Column(String(50), default="COMPLETED")
    doc_type = Column(String(100), default="Legal document")
    summary = Column(Text, default="")
    facts = Column(JSON, default=list)
    clauses_data = Column(JSON, default=list)  # structured sections & paragraphs
    governing_law = Column(JSON, default=dict)
    dates = Column(JSON, default=list)
    obligations = Column(JSON, default=list)
    issues = Column(JSON, default=list)
    definitions = Column(JSON, default=list)
    marks = Column(JSON, default=dict)
    notes = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Comparison(Base):
    __tablename__ = "comparisons"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    org_id = Column(String(36), nullable=False)
    doc_ids = Column(JSON, default=list)  # [docA, docB, docC]
    state = Column(String(50), default="COMPLETED")
    summary = Column(JSON, default=dict)
    findings = Column(JSON, default=list)
    diffs = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Contradiction(Base):
    __tablename__ = "contradictions"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    org_id = Column(String(36), nullable=False)
    comparison_id = Column(String(36), nullable=True, index=True)
    pair = Column(JSON, default=list)  # [docA, docB]
    kind = Column(String(50), default="contradiction")  # contradiction, inconsistency, update, legit
    sev = Column(String(50), default="high")  # high, med, low
    topic = Column(String(255), nullable=False)
    a_data = Column(JSON, default=dict)  # {ref, value, quote}
    b_data = Column(JSON, default=dict)
    what = Column(Text, default="")
    why = Column(Text, default="")
    impact = Column(Text, default="")
    review = Column(Text, default="")
    graph = Column(JSON, default=dict)
    law = Column(String(100), nullable=True)
    status = Column(String(50), default="open")  # open, reviewed, dismissed
    notes = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Jurisdiction(Base):
    __tablename__ = "jurisdictions"
    id = Column(String(20), primary_key=True)  # 'uk', 'in', 'us'
    name = Column(String(100), nullable=False)
    sys = Column(String(255), nullable=False)
    country_code = Column(String(10), default="GB")
    enabled = Column(Boolean, default=True)
    coverage_status = Column(String(50), default="BROAD")

class LegalSource(Base):
    __tablename__ = "legal_sources"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    jurisdiction_id = Column(String(20), ForeignKey("jurisdictions.id"), index=True, nullable=False)
    name = Column(String(255), nullable=False)
    cite = Column(String(255), nullable=False)
    type = Column(String(100), default="Statute")
    authority_level = Column(String(50), default="BINDING")
    rel = Column(Text, default="")
    url = Column(String(500), nullable=True)
    summary = Column(Text, default="")
    verification_status = Column(String(50), default="VERIFIED_OFFICIAL")

class ClauseLegalMapping(Base):
    __tablename__ = "clause_legal_mappings"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    document_id = Column(String(36), index=True, nullable=False)
    clause_ref = Column(String(50), nullable=False)
    jurisdiction_id = Column(String(20), nullable=False)
    concept = Column(String(255), nullable=False)
    strength = Column(String(50), default="Strong")
    why = Column(Text, default="")
    verify = Column(JSON, default=list)
    sources = Column(JSON, default=list)
    unavailable = Column(Boolean, default=False)

class JurisdictionRequest(Base):
    __tablename__ = "jurisdiction_requests"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    org_id = Column(String(36), nullable=False)
    user_id = Column(String(36), nullable=False)
    text = Column(String(255), nullable=False)
    status = Column(String(50), default="OPEN")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ResearchThread(Base):
    __tablename__ = "research_threads"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    org_id = Column(String(36), nullable=False)
    user_id = Column(String(36), nullable=False)
    title = Column(String(255), nullable=False)
    jurisdiction_id = Column(String(20), default="uk")
    scope = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class ResearchQuery(Base):
    __tablename__ = "research_queries"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    thread_id = Column(String(36), ForeignKey("research_threads.id"), index=True, nullable=False)
    question = Column(Text, nullable=False)
    jurisdiction_id = Column(String(20), default="uk")
    scope = Column(JSON, default=list)
    state = Column(String(50), default="COMPLETED")
    result = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Review(Base):
    __tablename__ = "reviews"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    org_id = Column(String(36), nullable=False)
    target_type = Column(String(50), nullable=False)
    target_id = Column(String(36), nullable=False, index=True)
    document_id = Column(String(36), nullable=True)
    state = Column(String(50), default="OPEN")  # OPEN, UNDER_REVIEW, APPROVED, REJECTED, DISMISSED
    priority = Column(String(50), default="MEDIUM")
    opened_by = Column(String(255), default="System")
    resolution = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ReviewEvent(Base):
    __tablename__ = "review_events"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    review_id = Column(String(36), ForeignKey("reviews.id"), index=True, nullable=False)
    actor_id = Column(String(36), nullable=True)
    actor_name = Column(String(255), default="You")
    kind = Column(String(50), default="NOTE")
    note = Column(Text, nullable=False)
    meta = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Report(Base):
    __tablename__ = "reports"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    public_id = Column(String(50), unique=True, index=True, nullable=False)  # JR-YYYYMMDD-XXXX
    org_id = Column(String(36), nullable=False)
    created_by = Column(String(36), nullable=False)
    type = Column(String(50), default="summary")
    title = Column(String(255), nullable=False)
    document_ids = Column(JSON, default=list)
    comparison_id = Column(String(36), nullable=True)
    jurisdiction_id = Column(String(20), default="uk")
    language = Column(String(10), default="en")
    status = Column(String(50), default="VERIFIED")
    content = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class AuditEvent(Base):
    __tablename__ = "audit_events"
    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(String(36), default=gen_uuid, unique=True, index=True)
    org_id = Column(String(36), nullable=False, index=True)
    actor_type = Column(String(50), default="USER")
    actor_id = Column(String(36), nullable=True)
    actor_name = Column(String(255), default="You")
    action = Column(String(100), nullable=False)
    category = Column(String(50), default="security")
    ui_type = Column(String(50), default="upload")
    title = Column(String(255), nullable=False)
    object_type = Column(String(50), nullable=True)
    object_id = Column(String(36), nullable=True)
    object_label = Column(String(255), default="")
    document_id = Column(String(36), nullable=True, index=True)
    outcome = Column(String(50), default="SUCCESS")
    meta = Column(String(255), default="")
    go = Column(String(255), default="")
    prev_hash = Column(String(64), nullable=True)
    event_hash = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), index=True, nullable=False)
    org_id = Column(String(36), nullable=False)
    kind = Column(String(50), default="info")  # warn, ok, risk, info
    category = Column(String(50), default="sec")  # sec, rev, ana, upd
    icon = Column(String(50), default="bell")
    title = Column(String(255), nullable=False)
    text = Column(Text, nullable=False)
    route_hint = Column(String(255), default="home")
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class HelpCategory(Base):
    __tablename__ = "help_categories"
    id = Column(String(50), primary_key=True)
    title = Column(String(255), nullable=False)
    icon = Column(String(50), default="help")
    ordinal = Column(Integer, default=0)

class HelpArticle(Base):
    __tablename__ = "help_articles"
    id = Column(String(50), primary_key=True)
    category_id = Column(String(50), ForeignKey("help_categories.id"), nullable=False)
    title = Column(String(255), nullable=False)
    paras = Column(JSON, default=list)
    bullets = Column(JSON, default=list)
    ordinal = Column(Integer, default=0)

class HelpFeedback(Base):
    __tablename__ = "help_feedback"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    article_id = Column(String(50), nullable=False)
    user_id = Column(String(36), nullable=False)
    helpful = Column(Boolean, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class SupportTicket(Base):
    __tablename__ = "support_tickets"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    org_id = Column(String(36), nullable=False)
    user_id = Column(String(36), nullable=False)
    topic = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    state = Column(String(50), default="OPEN")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Share(Base):
    __tablename__ = "shares"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    token_hash = Column(String(128), unique=True, index=True, nullable=False)
    org_id = Column(String(36), nullable=False)
    created_by = Column(String(36), nullable=False)
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(String(36), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Translation(Base):
    __tablename__ = "translations"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    source_hash = Column(String(64), index=True, nullable=False)
    lang = Column(String(10), nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class AdversarialReview(Base):
    __tablename__ = "adversarial_reviews"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    org_id = Column(String(36), nullable=False)
    target_type = Column(String(50), nullable=False)
    target_id = Column(String(36), nullable=False)
    user_challenge = Column(Text, nullable=True)
    state = Column(String(50), default="COMPLETED")
    result = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class TrustAssessment(Base):
    __tablename__ = "trust_assessments"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    org_id = Column(String(36), nullable=False)
    target_type = Column(String(50), nullable=False)
    target_id = Column(String(36), nullable=False)
    status = Column(String(50), default="VERIFIED")
    summary = Column(Text, default="")
    signals = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class RiskAssessment(Base):
    __tablename__ = "risk_assessments"
    id = Column(String(36), primary_key=True, default=gen_uuid)
    org_id = Column(String(36), nullable=False)
    subject_type = Column(String(50), nullable=False)
    subject_id = Column(String(36), nullable=False)
    overall_level = Column(String(50), default="LOW")
    risks = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
