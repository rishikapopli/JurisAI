import os
import json
import datetime
from sqlalchemy.orm import Session
from argon2 import PasswordHasher
from backend.app.models.entities import (
    Organization, User, Membership, UserSetting, Document, DocumentPage,
    SecurityScan, SecurityScanCheck, PIIFinding, Clause, Analysis, Contradiction,
    Jurisdiction, LegalSource, ClauseLegalMapping, ResearchThread, Notification,
    AuditEvent, HelpCategory, HelpArticle, Translation
)

ph = PasswordHasher()

def seed_database(db: Session):
    # 1. Organization
    org = db.query(Organization).filter(Organization.slug == "northwind").first()
    if not org:
        org = Organization(
            id="org_default",
            name="Northwind Analytics Ltd",
            slug="northwind",
            kind="TEAM",
            data_region="eu-west"
        )
        db.add(org)
        db.commit()
        db.refresh(org)

    # 2. Demo User
    user = db.query(User).filter(User.email == "demo@jurisai.com").first()
    if not user:
        user = User(
            id="user_demo",
            email="demo@jurisai.com",
            name="Daniel Okafor",
            password_hash=ph.hash("jurisai123!"),
            job_title="Senior Data Analyst",
            email_verified_at=datetime.datetime.utcnow(),
            onboarded_at=datetime.datetime.utcnow(),
            status="ACTIVE"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Membership
    mem = db.query(Membership).filter(Membership.org_id == org.id, Membership.user_id == user.id).first()
    if not mem:
        mem = Membership(
            org_id=org.id,
            user_id=user.id,
            role="OWNER",
            status="ACTIVE"
        )
        db.add(mem)

    # User Settings
    settings_obj = db.query(UserSetting).filter(UserSetting.user_id == user.id).first()
    if not settings_obj:
        default_settings = {
            "jur": "uk", "lang": "en", "theme": "ivory", "dateFmt": "dmy", "collapsed": False,
            "cite": "numbered", "sourceDisplay": "panel", "research": "balanced", "showInference": True,
            "speed": 1.0, "voice": "Neutral (UK)", "voiceInput": True, "retention": "12",
            "autoDelete": False, "analytics": False, "training": False, "twofa": False,
            "secNotify": True, "notifyEmail": True, "notifyBrowser": False, "notifyDigest": "daily",
            "notifCats": {"sec": True, "rev": True, "ana": True, "upd": False}
        }
        settings_obj = UserSetting(user_id=user.id, data=default_settings)
        db.add(settings_obj)

    # 3. Jurisdictions
    jurisdictions_data = [
        {"id": "uk", "name": "United Kingdom", "sys": "England & Wales · common law", "country_code": "GB"},
        {"id": "in", "name": "India", "sys": "Union & State · common law", "country_code": "IN"},
        {"id": "us", "name": "United States", "sys": "Federal & State · common law", "country_code": "US"}
    ]
    for j in jurisdictions_data:
        if not db.query(Jurisdiction).filter(Jurisdiction.id == j["id"]).first():
            db.add(Jurisdiction(**j, enabled=True, coverage_status="BROAD"))

    # 4. Help Categories & Articles
    help_cats = [
        ("gs", "Getting Started", "play", 1),
        ("up", "Uploading Documents", "upload", 2),
        ("sec", "Security Scanning", "shield-check", 3),
        ("an", "Document Analysis", "analyze", 4),
        ("co", "Contradictions", "compare", 5),
        ("lc", "Legal Context", "scales", 6),
        ("rs", "AI Research", "sparkle", 7),
        ("tv", "Translation & Voice", "translate", 8),
        ("rp", "Reports", "file", 9),
        ("ac", "Account & Security", "key", 10)
    ]
    for cid, title, icon, ord_n in help_cats:
        if not db.query(HelpCategory).filter(HelpCategory.id == cid).first():
            db.add(HelpCategory(id=cid, title=title, icon=icon, ordinal=ord_n))
    db.commit()

    articles_data = [
        ("gs1", "gs", "What is JURISAI and how does it work?",
         ["JURISAI is a security-first legal intelligence workspace. Every document passes a security gateway before any AI reads it. Verified documents can then be analysed, compared, connected to relevant law and queried with grounded questions.", "The workflow is: upload, secure, understand, compare, verify and ask. Each stage records what it did so the result can be audited."],
         ["Upload and secure documents", "Understand clauses in plain language", "Compare documents for contradictions", "Connect clauses to law in your jurisdiction", "Ask questions with traceable sources"]),
        ("gs2", "gs", "Your first five minutes",
         ["Choose your use case and a default jurisdiction, then upload a first document. JURISAI scans it, and once it is verified you can open its analysis straight away.", "You can replay the welcome tour any time from your profile menu."],
         ["Pick a jurisdiction in the top bar", "Upload from Documents → Upload Document", "Open Analyze to read your first clause explanation"]),
        ("up1", "up", "Which files can I upload?",
         ["JURISAI accepts PDF, DOCX, TXT and scanned images (PNG, JPG, TIFF) up to 50 MB each. Scanned documents are read with OCR after they pass the security gateway.", "Executables, scripts and archive formats are never accepted."], []),
        ("sec1", "sec", "How does JURISAI protect my documents?",
         ["Every file is isolated on arrival and never opened by an AI component until it passes the security gateway. The gateway runs four checks: integrity, threat screening, sensitive-data inspection and document verification.", "Documents are encrypted in transit and at rest, and every security decision is recorded in your audit log. Only verified documents reach Legal AI."],
         ["Isolated intake before analysis", "Integrity hash recorded for each file", "Threat and prompt-injection screening", "Sensitive-data inspection with masking", "Audit trail for every decision"]),
        ("co1", "co", "How does contradiction detection work?",
         ["JURISAI matches related clauses across documents, compares the obligations they create, and flags differences. Each finding shows both sources side by side, what conflicts, why it may matter and what needs review.", "It does not decide which document prevails. That can depend on precedence clauses, dates and applicable law, so findings are flagged for qualified review."], []),
        ("lc1", "lc", "How does jurisdiction selection work?",
         ["Choose United Kingdom, India or United States in the top bar. JURISAI then maps each clause to legal concepts and sources relevant to that jurisdiction. Changing it updates Legal Context, Research and Reports.", "Where JURISAI does not have verified sources for a concept in a jurisdiction, it says so instead of guessing."], [])
    ]
    for aid, acid, atitle, paras, bullets in articles_data:
        if not db.query(HelpArticle).filter(HelpArticle.id == aid).first():
            db.add(HelpArticle(id=aid, category_id=acid, title=atitle, paras=paras, bullets=bullets))

    # 5. Seed Documents
    seed_docs = [
        {"id": "emp", "name": "Employment_Contract.pdf", "doc_type": "Employment agreement", "size_formatted": "2.4 MB", "page_count": 5, "sec": "verified", "an": "analyzed", "jur": "uk", "sha256": "a91f3c0784918e7e390c91823719b284e918273619284729183746281928d24e"},
        {"id": "pol", "name": "Company_Policy.pdf", "doc_type": "Policy handbook", "size_formatted": "5.1 MB", "page_count": 34, "sec": "verified", "an": "analyzed", "jur": "uk", "sha256": "7be20d91827461928374628192837461928472918274619283746281928341c8"},
        {"id": "nda", "name": "NDA_Meridian_Partners.pdf", "doc_type": "Non-disclosure agreement", "size_formatted": "640 KB", "page_count": 9, "sec": "verified", "an": "analyzed", "jur": "us", "sha256": "c4408e5a827461928374628192837461928472918274619283746281928309b1"},
        {"id": "cons", "name": "Consultancy_Agreement_Draft.docx", "doc_type": "Consultancy agreement", "size_formatted": "318 KB", "page_count": 12, "sec": "review", "an": "pending", "jur": "in", "sha256": "2d7a6b188274619283746281928374619284729182746192837462819283ff30"},
        {"id": "lease", "name": "Lease_Agreement_Unit_4B.pdf", "doc_type": "Leave & licence agreement", "size_formatted": "3.8 MB", "page_count": 18, "sec": "verified", "an": "pending", "jur": "in", "sha256": "90c15ae282746192837462819283746192847291827461928374628192837d63"},
        {"id": "msa", "name": "Vendor_MSA_2024.pdf", "doc_type": "Master services agreement", "size_formatted": "8.9 MB", "page_count": 46, "sec": "verified", "an": "failed", "jur": "uk", "sha256": "e16b44d08274619283746281928374619284729182746192837462819283a2f9"},
        {"id": "sett", "name": "Settlement_Draft_v3.pdf", "doc_type": "Settlement agreement", "size_formatted": "1.1 MB", "page_count": 7, "sec": "blocked", "an": "pending", "jur": "uk", "sha256": "f003b9c782746192837462819283746192847291827461928374628192835e12"},
        {"id": "sup", "name": "Supplier_Terms_Q4.pdf", "doc_type": "Supplier terms", "size_formatted": "2.0 MB", "page_count": 14, "sec": "processing", "an": "pending", "jur": "uk", "sha256": "pending"},
        {"id": "nda22", "name": "NDA_Archive_2022.pdf", "doc_type": "Non-disclosure agreement", "size_formatted": "510 KB", "page_count": 6, "sec": "verified", "an": "analyzed", "jur": "uk", "sha256": "51ae0c7b8274619283746281928374619284729182746192837462819283b8d4"}
    ]

    for sd in seed_docs:
        doc = db.query(Document).filter(Document.id == sd["id"]).first()
        if not doc:
            doc = Document(
                id=sd["id"],
                org_id=org.id,
                owner_id=user.id,
                name=sd["name"],
                doc_type=sd["doc_type"],
                size_formatted=sd["size_formatted"],
                page_count=sd["page_count"],
                security_state=sd["sec"],
                analysis_state=sd["an"],
                jurisdiction_id=sd["jur"],
                sha256=sd["sha256"],
                archived_at=datetime.datetime.utcnow() if sd.get("archived") else None
            )
            db.add(doc)
            db.commit()

            # Security scan checks
            scan_obj = SecurityScan(
                document_id=doc.id,
                org_id=org.id,
                decision="ALLOW" if sd["sec"] == "verified" else "REVIEW" if sd["sec"] == "review" else "QUARANTINE",
                sha256=sd["sha256"]
            )
            db.add(scan_obj)
            db.commit()

            if sd["sec"] == "review":
                db.add(PIIFinding(
                    scan_id=scan_obj.id, document_id=doc.id, org_id=org.id,
                    entity_type="BANK_ACCOUNT", page_no=9, masked_value="•••• •••• 4821", context_label="Payroll Account"
                ))
                db.add(PIIFinding(
                    scan_id=scan_obj.id, document_id=doc.id, org_id=org.id,
                    entity_type="BANK_ACCOUNT", page_no=9, masked_value="•••• •••• 7730", context_label="Savings Account"
                ))
                db.add(PIIFinding(
                    scan_id=scan_obj.id, document_id=doc.id, org_id=org.id,
                    entity_type="NATIONAL_ID", page_no=10, masked_value="•••• •••• 3187", context_label="National ID (Aadhaar)"
                ))

    # 6. Detailed Analysis for 'emp'
    emp_doc = db.query(Document).filter(Document.id == "emp").first()
    if emp_doc:
        emp_analysis = db.query(Analysis).filter(Analysis.document_id == "emp").first()
        if not emp_analysis:
            emp_clauses = [
                {"id": "1", "title": "Parties and Definitions", "page": 1, "paras": [
                    {"ref": "1.1", "text": "This Agreement is made on 3 March 2025 between Northwind Analytics Ltd, a company registered in England and Wales (the “Company”), and Daniel Okafor (the “Employee”)."},
                    {"ref": "1.2", "text": "“Confidential Information” means all non-public information relating to the business, clients, finances, products or technology of the Company or any Group Company. “Restricted Period” means the period of six (6) months following the Termination Date."}
                ]},
                {"id": "2", "title": "Commencement and Probation", "page": 1, "paras": [
                    {"ref": "2.1", "text": "Employment under this Agreement begins on 3 March 2025 (the “Start Date”). No employment with a previous employer counts towards continuous employment."},
                    {"ref": "2.2", "text": "The first six (6) months of employment form a probationary period. During probation the Company may extend the period once, by up to three (3) months, by written notice."}
                ]},
                {"id": "3", "title": "Role, Duties and Place of Work", "page": 2, "paras": [
                    {"ref": "3.1", "text": "The Employee is employed as Senior Data Analyst and shall perform the duties reasonably assigned by the Company from time to time."},
                    {"ref": "3.2", "text": "The Employee’s normal place of work is the Company’s London office, which the Employee shall attend at least three (3) days each week unless the Company agrees otherwise in writing."}
                ]},
                {"id": "4", "title": "Remuneration", "page": 2, "paras": [
                    {"ref": "4.1", "text": "The Company shall pay the Employee a gross annual salary of £62,000, payable monthly in arrears."},
                    {"ref": "4.2", "text": "Salary is reviewed annually in April. The Company has no obligation to award an increase."},
                    {"ref": "4.3", "text": "The Employee is eligible for a discretionary annual bonus of up to ten per cent (10%) of salary, subject to performance and the Company’s bonus rules."}
                ]},
                {"id": "5", "title": "Hours and Holiday", "page": 3, "paras": [
                    {"ref": "5.1", "text": "Normal working hours are 9:00 am to 5:30 pm, Monday to Friday, with a one-hour unpaid lunch break."},
                    {"ref": "5.2", "text": "The Employee is entitled to twenty-five (25) working days’ paid holiday in each holiday year, in addition to the usual public holidays in England and Wales."}
                ]},
                {"id": "6", "title": "Confidentiality", "page": 3, "paras": [
                    {"ref": "6.1", "text": "The Employee shall not, during employment or at any time afterwards, use or disclose any Confidential Information except as necessary for the proper performance of their duties or as required by law. This obligation continues without limit in time."},
                    {"ref": "6.2", "text": "Nothing in this clause prevents the Employee from making a protected disclosure under the Public Interest Disclosure Act 1998."}
                ]},
                {"id": "9", "title": "Post-Termination Restrictions", "page": 4, "paras": [
                    {"ref": "9.1", "text": "For the Restricted Period, the Employee shall not, without the Company’s written consent, work for any business that competes with the Company within a twenty-five (25) mile radius of the Company’s London office."},
                    {"ref": "9.2", "text": "For twelve (12) months after the Termination Date, the Employee shall not solicit or deal with any client of the Company."}
                ]},
                {"id": "10", "title": "Garden Leave", "page": 4, "paras": [
                    {"ref": "10.1", "text": "After notice of termination has been given by either party, the Company may require the Employee to stay away from work and perform no duties for up to twelve (12) weeks (“Garden Leave”)."}
                ]},
                {"id": "11", "title": "Termination", "page": 4, "paras": [
                    {"ref": "11.1", "text": "During the probationary period either party may terminate this Agreement by giving one (1) week’s written notice."},
                    {"ref": "11.2", "text": "Either party may terminate this Agreement upon thirty (30) days’ written notice, provided that the Company may, at its sole discretion, elect to pay salary in lieu of notice, and the Employee shall remain bound by clause 9 following termination."},
                    {"ref": "11.3", "text": "The Company may terminate this Agreement immediately and without notice in cases of gross misconduct, including serious breach of clause 6."}
                ]},
                {"id": "12", "title": "Governing Law and General", "page": 5, "paras": [
                    {"ref": "12.1", "text": "This Agreement and any dispute arising from it are governed by the law of England and Wales."},
                    {"ref": "12.2", "text": "This Agreement constitutes the entire agreement between the parties and supersedes all prior agreements."}
                ]}
            ]

            emp_notes = {
                "1.1": {"gist": "Identifies employer and employee.", "explain": "Names Northwind Analytics Ltd and Daniel Okafor.", "means": ["Check company details on payslip."], "questions": ["Is Group Company defined?"], "terms": []},
                "11.2": {"gist": "Termination on 30 days’ notice.", "explain": "Either party may terminate upon 30 days’ written notice with pay in lieu option.", "means": ["Notice must be in writing.", "Post-termination restrictions survive."], "questions": ["Does notice differ from handbook?"], "terms": [{"t": "In lieu of notice", "d": "Payment instead of working the notice period."}]},
                "5.2": {"gist": "25 days holiday plus public holidays.", "explain": "Entitled to 25 working days paid holiday in addition to public holidays.", "means": ["Total is approximately 33 paid days per year."], "questions": ["Does holiday carry over?"], "terms": []},
                "6.1": {"gist": "Perpetual confidentiality obligation.", "explain": "Prohibits disclosure of confidential information without time limit.", "means": ["Applies during and after employment."], "questions": ["Does it protect general know-how?"], "terms": [{"t": "Confidential Information", "d": "Non-public proprietary commercial data."}]},
                "9.1": {"gist": "6-month non-compete within 25 miles.", "explain": "Bars competitive work within 25-mile radius for 6 months.", "means": ["Applies after termination date."], "questions": ["Is 25 miles reasonable?"], "terms": [{"t": "Restricted Period", "d": "Six months post-termination."}]}
            }

            emp_analysis = Analysis(
                org_id=org.id,
                document_id="emp",
                state="COMPLETED",
                doc_type="Employment agreement",
                summary="A full-time employment agreement between Northwind Analytics Ltd and Daniel Okafor as Senior Data Analyst, starting 3 March 2025 on a £62,000 salary. It sets a six-month probation, 30 days’ notice, a confidentiality duty with no end date, and restrictions that apply after employment ends.",
                facts=[["Type", "Employment agreement"], ["Parties", "Northwind Analytics Ltd · Daniel Okafor"], ["Start date", {"iso": "2025-03-03"}], ["Notice", "30 days"], ["Salary", "£62,000 p.a."], ["Governing law", "England & Wales"]],
                clauses_data=emp_clauses,
                governing_law={"text": "Governed by the law of England and Wales.", "ref": "emp:12.1", "jur": "uk"},
                dates=[{"iso": "2025-03-03", "label": "Employment begins", "ref": "emp:2.1"}],
                obligations=[{"who": "Employee", "text": "Attend London office at least 3 days a week.", "ref": "emp:3.2"}, {"who": "Company", "text": "Pay gross annual salary of £62,000.", "ref": "emp:4.1"}],
                issues=[{"sev": "high", "title": "Notice period discrepancy", "text": "Contract sets 30 days notice while Company Policy specifies 60 days.", "ref": "emp:11.2", "link": "compare?a=emp&b=pol&f=f1"}],
                definitions=[{"t": "Confidential Information", "d": "Non-public proprietary business data.", "ref": "emp:1.2"}],
                marks={"11.2": [["sole discretion", "Sole discretion"], ["in lieu of notice", "Pay in lieu of notice"]]},
                notes=emp_notes
            )
            db.add(emp_analysis)
            db.commit()

            # Add Clause records for search & compare
            for cl in emp_clauses:
                for p in cl["paras"]:
                    db.add(Clause(
                        document_id="emp",
                        clause_number=p["ref"],
                        title=cl["title"],
                        text=p["text"],
                        page_no=cl["page"]
                    ))
            db.commit()

    # 7. Analysis for 'pol'
    pol_doc = db.query(Document).filter(Document.id == "pol").first()
    if pol_doc:
        pol_analysis = db.query(Analysis).filter(Analysis.document_id == "pol").first()
        if not pol_analysis:
            pol_clauses = [
                {"id": "1", "title": "About this Handbook", "page": 3, "paras": [{"ref": "1.2", "text": "This Handbook sets out Company policy. It forms part of an employee’s contract only where it is expressly incorporated by their written terms of employment; otherwise it is guidance."}]},
                {"id": "3", "title": "Working Arrangements", "page": 9, "paras": [{"ref": "3.4", "text": "As of version 4.2, staff are expected to attend the office a minimum of two (2) days per week. This replaces the previous three-day expectation."}]},
                {"id": "4", "title": "Leaving the Company", "page": 12, "paras": [
                    {"ref": "4.3", "text": "Employees must be given sixty (60) days’ notice prior to termination of employment."},
                    {"ref": "4.5", "text": "Where the Company places an employee on garden leave, the period will not normally exceed four (4) weeks unless the employee’s contract provides otherwise."}
                ]},
                {"id": "5", "title": "Annual Leave", "page": 15, "paras": [{"ref": "5.1", "text": "Full-time employees receive twenty-eight (28) working days’ paid annual leave, inclusive of public holidays."}]},
                {"id": "6", "title": "After Employment", "page": 18, "paras": [{"ref": "6.2", "text": "Employees in senior roles may be asked to observe a restriction on joining a competitor for twelve (12) months after leaving."}]}
            ]
            pol_analysis = Analysis(
                org_id=org.id,
                document_id="pol",
                state="COMPLETED",
                doc_type="Policy handbook",
                summary="Northwind’s Employee Handbook, version 4.2 (effective 1 September 2025). It covers working arrangements, leaving the company, leave and post-employment expectations.",
                facts=[["Type", "Policy handbook"], ["Version", "v4.2"], ["Effective", {"iso": "2025-09-01"}], ["Notice", "60 days"], ["Annual leave", "28 days incl. public holidays"]],
                clauses_data=pol_clauses,
                governing_law={"text": "No governing law is stated in the extract analysed.", "ref": "pol:1.2", "jur": "uk"},
                dates=[{"iso": "2025-09-01", "label": "Handbook v4.2 takes effect", "ref": "pol:3.4"}],
                obligations=[{"who": "Company", "text": "Give 60 days’ notice before termination.", "ref": "pol:4.3"}],
                issues=[{"sev": "high", "title": "Notice period differs from contract", "text": "Handbook stipulates 60 days notice.", "ref": "pol:4.3", "link": "compare?a=emp&b=pol&f=f1"}],
                definitions=[{"t": "Expressly incorporated", "d": "Written into employment terms by name.", "ref": "pol:1.2"}],
                marks={},
                notes={"4.3": {"gist": "60 days notice.", "explain": "Requires 60 days notice prior to termination.", "means": ["Double the 30 days in contract."], "questions": ["Which governs?"], "terms": []}}
            )
            db.add(pol_analysis)
            db.commit()

            for cl in pol_clauses:
                for p in cl["paras"]:
                    db.add(Clause(
                        document_id="pol",
                        clause_number=p["ref"],
                        title=cl["title"],
                        text=p["text"],
                        page_no=cl["page"]
                    ))
            db.commit()

    # 8. Seed Contradictions f1 to f6
    contradictions_data = [
        {
            "id": "f1", "pair": ["emp", "pol"], "kind": "contradiction", "sev": "high", "topic": "Notice period",
            "a": {"ref": "emp:11.2", "value": "30 days", "quote": "Either party may terminate this Agreement upon thirty (30) days’ written notice…"},
            "b": {"ref": "pol:4.3", "value": "60 days", "quote": "Employees must be given sixty (60) days’ notice prior to termination of employment."},
            "what": "Both documents set a notice period for ending employment, but the periods differ by 30 days.",
            "why": "The notice you owe — or are owed — may differ by 30 days, affecting pay and start dates.",
            "impact": "Up to 30 days of salary and benefits; the date on which restrictions begin.",
            "review": "Which document governs depends on whether Handbook is incorporated and entire-agreement terms.",
            "graph": {"clauseA": "§11.2 Termination", "clauseB": "§4.3 Leaving", "obligation": "Notice before termination", "stA": "30 days", "stB": "60 days"},
            "law": "emp:11.2"
        },
        {
            "id": "f2", "pair": ["emp", "pol"], "kind": "contradiction", "sev": "med", "topic": "Post-employment competition restriction",
            "a": {"ref": "emp:9.1", "value": "6 months", "quote": "“Restricted Period” means the period of six (6) months following the Termination Date."},
            "b": {"ref": "pol:6.2", "value": "12 months", "quote": "Employees in senior roles may be asked to observe a restriction on joining a competitor for twelve (12) months after leaving."},
            "what": "Contract limits competing work to six months; Handbook refers to twelve months for senior roles.",
            "why": "A longer restriction would keep you out of competing work for six extra months.",
            "impact": "Possible additional six months of restricted employment options.",
            "review": "Handbook says employees 'may be asked'. Confirm whether senior role rules apply.",
            "graph": {"clauseA": "§9.1 Restrictions", "clauseB": "§6.2 After employment", "obligation": "No joining a competitor", "stA": "6 months", "stB": "12 months"},
            "law": "emp:9.1"
        },
        {
            "id": "f3", "pair": ["emp", "pol"], "kind": "inconsistency", "sev": "med", "topic": "Annual leave",
            "a": {"ref": "emp:5.2", "value": "25 days + public holidays", "quote": "…twenty-five (25) working days’ paid holiday in each holiday year, in addition to the usual public holidays…"},
            "b": {"ref": "pol:5.1", "value": "28 days incl. public holidays", "quote": "Full-time employees receive twenty-eight (28) working days’ paid annual leave, inclusive of public holidays."},
            "what": "Documents count leave on different bases: contract adds public holidays; Handbook includes them.",
            "why": "Depending on the basis, total ranges from 28 to about 33 days.",
            "impact": "Several days of paid leave per year.",
            "review": "The contract is more generous overall. This is a difference in counting, not a direct conflict.",
            "graph": {"clauseA": "§5.2 Holiday", "clauseB": "§5.1 Annual leave", "obligation": "Paid annual leave", "stA": "25 + public", "stB": "28 incl. public"},
            "law": "emp:5.2"
        },
        {
            "id": "f4", "pair": ["emp", "pol"], "kind": "update", "sev": "low", "topic": "Office attendance",
            "a": {"ref": "emp:3.2", "value": "3 days a week", "quote": "…attend at least three (3) days each week unless the Company agrees otherwise in writing."},
            "b": {"ref": "pol:3.4", "value": "2 days a week", "quote": "As of version 4.2, staff are expected to attend the office a minimum of two (2) days per week."},
            "what": "Handbook replaces a three-day expectation with two days.",
            "why": "A later policy appears to relax the contract expectation.",
            "impact": "One fewer required office day each week.",
            "review": "Request written confirmation that the Handbook update applies to your contract.",
            "graph": {"clauseA": "§3.2 Place of work", "clauseB": "§3.4 Working arrangements", "obligation": "Office attendance", "stA": "3 days", "stB": "2 days"},
            "law": None
        },
        {
            "id": "f5", "pair": ["emp", "pol"], "kind": "legit", "sev": "low", "topic": "Garden leave length",
            "a": {"ref": "emp:10.1", "value": "Up to 12 weeks", "quote": "…stay away from work and perform no duties for up to twelve (12) weeks (“Garden Leave”)…"},
            "b": {"ref": "pol:4.5", "value": "Normally up to 4 weeks", "quote": "…will not normally exceed four (4) weeks unless the employee’s individual contract provides otherwise."},
            "what": "Contract allows 12 weeks; Handbook says four weeks unless a contract provides otherwise.",
            "why": "Handbook expressly defers to individual contracts.",
            "impact": "None, provided the contract applies.",
            "review": "No action needed. Intended role-specific difference.",
            "graph": {"clauseA": "§10.1 Garden Leave", "clauseB": "§4.5 Leaving", "obligation": "Paid time away from work", "stA": "12 weeks", "stB": "4 weeks"},
            "law": "emp:10.1"
        },
        {
            "id": "f6", "pair": ["emp", "nda"], "kind": "inconsistency", "sev": "low", "topic": "Confidentiality duration",
            "a": {"ref": "emp:6.1", "value": "No end date", "quote": "…This obligation continues without limit in time."},
            "b": {"ref": "nda:4.1", "value": "3 years", "quote": "The obligations of confidentiality in this Agreement survive for three (3) years from the date of each disclosure."},
            "what": "Employment confidentiality is unlimited; NDA expires after three years.",
            "why": "Disclosed information could remain protected after the NDA obligation ends.",
            "impact": "Unclear which duty applies to Meridian-sourced information after three years.",
            "review": "Review whether Meridian information should be treated as Company Confidential Information.",
            "graph": {"clauseA": "§6.1 Confidentiality", "clauseB": "§4.1 Term", "obligation": "Keep information secret", "stA": "No end date", "stB": "3 years"},
            "law": "emp:6.1"
        }
    ]
    for cd in contradictions_data:
        if not db.query(Contradiction).filter(Contradiction.id == cd["id"]).first():
            db.add(Contradiction(
                id=cd["id"],
                org_id=org.id,
                pair=cd["pair"],
                kind=cd["kind"],
                sev=cd["sev"],
                topic=cd["topic"],
                a_data=cd["a"],
                b_data=cd["b"],
                what=cd["what"],
                why=cd["why"],
                impact=cd["impact"],
                review=cd["review"],
                graph=cd["graph"],
                law=cd.get("law"),
                status="open",
                notes=[]
            ))
    db.commit()

    # 9. Seed Clause Legal Mappings
    mappings = [
        {"doc_id": "emp", "ref": "11.2", "jur": "uk", "concept": "Statutory minimum notice", "strength": "Strong",
         "why": "Both 30 and 60 days exceed the statutory minimum for continuous service under a year; statutory floor does not decide which prevails.",
         "verify": ["Continuous service at notice date", "Whether handbook is incorporated into contract"],
         "sources": [{"name": "Employment Rights Act 1996 — section 86", "cite": "ERA 1996, s.86", "type": "Statute", "rel": "Requires at least one week notice per year of service, up to 12 weeks.", "url": "https://www.legislation.gov.uk/ukpga/1996/18/section/86"}]},
        {"doc_id": "emp", "ref": "9.1", "jur": "uk", "concept": "Restraint of trade doctrine", "strength": "Strong",
         "why": "Post-termination non-competes are presumed unenforceable unless reasonable in time, area and scope.",
         "verify": ["Legitimate business interest protected", "Whether 12-month policy applies"],
         "sources": [{"name": "Tillman v Egon Zehnder Ltd", "cite": "[2019] UKSC 32", "type": "Case", "rel": "Supreme Court test for enforceability and severance of restrictive covenants.", "url": "https://www.bailii.org/uk/cases/UKSC/2019/32.html"}]},
        {"doc_id": "emp", "ref": "6.1", "jur": "uk", "concept": "Breach of confidence and trade secrets", "strength": "Strong",
         "why": "An indefinite duty sits alongside equitable confidence. Courts distinguish genuine trade secrets from general skill.",
         "verify": ["Genuine confidential nature", "Whistleblowing protections under ERA 1996 s.43A"],
         "sources": [{"name": "Trade Secrets Regulations 2018", "cite": "SI 2018/597", "type": "Regulation", "rel": "Protects commercially secret information subject to reasonable safeguards.", "url": "https://www.legislation.gov.uk/uksi/2018/597/contents"}]},
        {"doc_id": "emp", "ref": "5.2", "jur": "uk", "concept": "Minimum paid annual leave", "strength": "Strong",
         "why": "Contract's 25 days plus public holidays exceeds statutory 28 days for a 5-day week.",
         "verify": ["Five-day work week calculation", "Public holidays count"],
         "sources": [{"name": "Working Time Regulations 1998", "cite": "SI 1998/1833, reg 13", "type": "Regulation", "rel": "Entitles workers to 5.6 weeks paid annual leave.", "url": "https://www.legislation.gov.uk/uksi/1998/1833/regulation/13"}]}
    ]
    for m in mappings:
        if not db.query(ClauseLegalMapping).filter(ClauseLegalMapping.document_id == m["doc_id"], ClauseLegalMapping.clause_ref == m["ref"], ClauseLegalMapping.jurisdiction_id == m["jur"]).first():
            db.add(ClauseLegalMapping(
                document_id=m["doc_id"],
                clause_ref=m["ref"],
                jurisdiction_id=m["jur"],
                concept=m["concept"],
                strength=m["strength"],
                why=m["why"],
                verify=m["verify"],
                sources=m["sources"]
            ))
    db.commit()

    # 10. Seed Notifications
    notifs_data = [
        {"kind": "warn", "icon": "alert", "title": "Review required", "text": "Consultancy_Agreement_Draft.docx contains sensitive data. Legal AI access is on hold.", "route_hint": "documents?f=review"},
        {"kind": "ok", "icon": "shield-check", "title": "Document verified", "text": "Employment_Contract.pdf passed the security gateway.", "route_hint": "analyze/emp"},
        {"kind": "risk", "icon": "compare", "title": "Potential contradiction detected", "text": "Notice period: 30 days vs 60 days across two documents.", "route_hint": "compare?a=emp&b=pol&f=f1"},
        {"kind": "risk", "icon": "lock", "title": "File blocked", "text": "Settlement_Draft_v3.pdf was quarantined by the security gateway.", "route_hint": "security"}
    ]
    for nd in notifs_data:
        if not db.query(Notification).filter(Notification.title == nd["title"]).first():
            db.add(Notification(
                user_id=user.id,
                org_id=org.id,
                kind=nd["kind"],
                icon=nd["icon"],
                title=nd["title"],
                text=nd["text"],
                route_hint=nd["route_hint"]
            ))
    db.commit()

    # 11. Seed Audit Events
    if db.query(AuditEvent).count() == 0:
        events = [
            ("upload", "Document uploaded", "Employment_Contract.pdf · 2.4 MB", "emp", "documents"),
            ("scan", "Security scan completed", "Employment_Contract.pdf", "emp", "documents"),
            ("verify", "Document verified", "Employment_Contract.pdf", "emp", "analyze/emp"),
            ("analysis", "Analysis completed", "Employment_Contract.pdf", "emp", "analyze/emp"),
            ("contradiction", "Contradiction detected", "Notice period: 30 days vs 60 days", "emp", "compare?a=emp&b=pol&f=f1")
        ]
        prev_h = "0" * 64
        for action, title, obj, doc_id, go in events:
            h = f"{prev_h}|{org.id}|{action}|{title}|{obj}"
            ev_hash = str(abs(hash(h)))[:64].ljust(64, "0")
            db.add(AuditEvent(
                org_id=org.id,
                actor_id=user.id,
                actor_name="You",
                action=action,
                title=title,
                ui_type=action,
                object_label=obj,
                document_id=doc_id,
                go=go,
                prev_hash=prev_h,
                event_hash=ev_hash
            ))
            prev_h = ev_hash
        db.commit()
