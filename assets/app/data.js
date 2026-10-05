/* ==========================================================================
   JURISAI APP — demonstration data. Everything the interface shows is
   derived from here so that every view, citation and report agrees.
   ========================================================================== */
(function () {
  'use strict';
  var J = window.J, D = J.data, ago = J.ago;
  var DAY = 1440;

  D.jurs = [
    { id: 'uk', name: 'United Kingdom', sys: 'England & Wales · common law' },
    { id: 'in', name: 'India', sys: 'Union & State · common law' },
    { id: 'us', name: 'United States', sys: 'Federal & State · common law' }
  ];
  D.langs = [{ id: 'en', label: 'English' }, { id: 'hi', label: 'हिन्दी' }, { id: 'es', label: 'Español' }];

  /* ---------- security scan templates ---------- */
  function scan(kind, o) {
    o = o || {};
    var base = {
      ok: [['Integrity check', 'pass', 'SHA-256 verified · file structure valid'], ['Threat screening', 'pass', 'No malware signatures · no embedded scripts · no prompt-injection patterns'], ['Sensitive data inspection', 'pass', 'No unexpected personal or financial identifiers'], ['Document verification', 'pass', 'Attested and released to Legal AI']],
      sensitive: [['Integrity check', 'pass', 'SHA-256 verified · file structure valid'], ['Threat screening', 'pass', 'No malware signatures · no embedded scripts · no prompt-injection patterns'], ['Sensitive data inspection', 'flag', '3 items detected on pp. 9–10: 2 bank account numbers, 1 national ID'], ['Document verification', 'hold', 'Held for your review before Legal AI access']],
      blocked: [['Integrity check', 'pass', 'File structure readable'], ['Threat screening', 'fail', 'Embedded JavaScript auto-action and an obfuscated stream were detected'], ['Sensitive data inspection', 'skip', 'Skipped — file failed threat screening'], ['Document verification', 'fail', 'Quarantined. Never opened by any AI component']],
      processing: [['Integrity check', 'pass', 'SHA-256 verified · file structure valid'], ['Threat screening', 'run', 'Scanning embedded content…'], ['Sensitive data inspection', 'wait', 'Queued'], ['Document verification', 'wait', 'Queued']]
    }[kind];
    return base;
  }

  /* ---------- documents (content is attached below) ---------- */
  D.docs = [
    { id: 'emp', name: 'Employment_Contract.pdf', type: 'Employment agreement', size: '2.4 MB', pages: 5, uploaded: ago(2 * DAY + 130), sec: 'verified', an: 'analyzed', jur: 'uk', scan: scan('ok'), sha: 'a91f3c07…d24e', mime: 'application/pdf' },
    { id: 'pol', name: 'Company_Policy.pdf', type: 'Policy handbook', size: '5.1 MB', pages: 34, uploaded: ago(2 * DAY + 126), sec: 'verified', an: 'analyzed', jur: 'uk', scan: scan('ok'), sha: '7be20d91…41c8', mime: 'application/pdf' },
    { id: 'nda', name: 'NDA_Meridian_Partners.pdf', type: 'Non-disclosure agreement', size: '640 KB', pages: 9, uploaded: ago(6 * DAY), sec: 'verified', an: 'analyzed', jur: 'us', scan: scan('ok'), sha: 'c4408e5a…09b1', mime: 'application/pdf' },
    { id: 'cons', name: 'Consultancy_Agreement_Draft.docx', type: 'Consultancy agreement', size: '318 KB', pages: 12, uploaded: ago(1 * DAY + 40), sec: 'review', an: 'pending', jur: 'in', scan: scan('sensitive'), sha: '2d7a6b18…ff30', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      sensitive: [{ kind: 'Bank account number', val: '•••• •••• 4821', page: 9 }, { kind: 'Bank account number', val: '•••• •••• 7730', page: 9 }, { kind: 'National ID (Aadhaar)', val: '•••• •••• 3187', page: 10 }] },
    { id: 'lease', name: 'Lease_Agreement_Unit_4B.pdf', type: 'Leave & licence agreement', size: '3.8 MB', pages: 18, uploaded: ago(9 * DAY), sec: 'verified', an: 'pending', jur: 'in', scan: scan('ok'), sha: '90c15ae2…7d63', mime: 'application/pdf' },
    { id: 'msa', name: 'Vendor_MSA_2024.pdf', type: 'Master services agreement', size: '8.9 MB', pages: 46, uploaded: ago(12 * DAY), sec: 'verified', an: 'failed', jur: 'uk', scan: scan('ok'), sha: 'e16b44d0…a2f9', mime: 'application/pdf' },
    { id: 'sett', name: 'Settlement_Draft_v3.pdf', type: 'Settlement agreement', size: '1.1 MB', pages: 7, uploaded: ago(3 * DAY + 15), sec: 'blocked', an: 'pending', jur: 'uk', scan: scan('blocked'), sha: 'f003b9c7…5e12', mime: 'application/pdf' },
    { id: 'sup', name: 'Supplier_Terms_Q4.pdf', type: 'Supplier terms', size: '2.0 MB', pages: 14, uploaded: ago(4), sec: 'processing', an: 'pending', jur: 'uk', scan: scan('processing'), sha: 'pending', mime: 'application/pdf' },
    { id: 'nda22', name: 'NDA_Archive_2022.pdf', type: 'Non-disclosure agreement', size: '510 KB', pages: 6, uploaded: ago(310 * DAY), sec: 'verified', an: 'analyzed', jur: 'uk', archived: true, scan: scan('ok'), sha: '51ae0c7b…b8d4', mime: 'application/pdf' }
  ];
  D.docById = function (id) { return D.docs.filter(function (d) { return d.id === id; })[0]; };
  var dd = D.docById;

  /* ======================= EMPLOYMENT CONTRACT ======================= */
  dd('emp').content = {
    summary: "A full-time employment agreement between Northwind Analytics Ltd and Daniel Okafor as Senior Data Analyst, starting 3 March 2025 on a £62,000 salary. It sets a six-month probation, 30 days’ notice, a confidentiality duty with no end date, and restrictions that apply after employment ends.",
    facts: [['Type', 'Employment agreement'], ['Parties', 'Northwind Analytics Ltd · Daniel Okafor'], ['Start date', { iso: '2025-03-03' }], ['Notice', '30 days'], ['Salary', '£62,000 p.a.'], ['Governing law', 'England & Wales']],
    clauses: [
      { id: '1', title: 'Parties and Definitions', page: 1, paras: [
        { ref: '1.1', text: "This Agreement is made on 3 March 2025 between Northwind Analytics Ltd, a company registered in England and Wales (the “Company”), and Daniel Okafor (the “Employee”)." },
        { ref: '1.2', text: "“Confidential Information” means all non-public information relating to the business, clients, finances, products or technology of the Company or any Group Company. “Restricted Period” means the period of six (6) months following the Termination Date. “Termination Date” means the date on which the Employee’s employment ends." }] },
      { id: '2', title: 'Commencement and Probation', page: 1, paras: [
        { ref: '2.1', text: "Employment under this Agreement begins on 3 March 2025 (the “Start Date”). No employment with a previous employer counts towards the Employee’s period of continuous employment." },
        { ref: '2.2', text: "The first six (6) months of employment form a probationary period. During probation the Company may extend the period once, by up to three (3) months, by written notice." }] },
      { id: '3', title: 'Role, Duties and Place of Work', page: 2, paras: [
        { ref: '3.1', text: "The Employee is employed as Senior Data Analyst and shall perform the duties reasonably assigned by the Company from time to time." },
        { ref: '3.2', text: "The Employee’s normal place of work is the Company’s London office, which the Employee shall attend at least three (3) days each week unless the Company agrees otherwise in writing." }] },
      { id: '4', title: 'Remuneration', page: 2, paras: [
        { ref: '4.1', text: "The Company shall pay the Employee a gross annual salary of £62,000, payable monthly in arrears." },
        { ref: '4.2', text: "Salary is reviewed annually in April. The Company has no obligation to award an increase." },
        { ref: '4.3', text: "The Employee is eligible for a discretionary annual bonus of up to ten per cent (10%) of salary, subject to performance and the Company’s bonus rules." }] },
      { id: '5', title: 'Hours and Holiday', page: 3, paras: [
        { ref: '5.1', text: "Normal working hours are 9:00 am to 5:30 pm, Monday to Friday, with a one-hour unpaid lunch break." },
        { ref: '5.2', text: "The Employee is entitled to twenty-five (25) working days’ paid holiday in each holiday year, in addition to the usual public holidays in England and Wales." }] },
      { id: '6', title: 'Confidentiality', page: 3, paras: [
        { ref: '6.1', text: "The Employee shall not, during employment or at any time afterwards, use or disclose any Confidential Information except as necessary for the proper performance of their duties or as required by law. This obligation continues without limit in time." },
        { ref: '6.2', text: "Nothing in this clause prevents the Employee from making a protected disclosure under the Public Interest Disclosure Act 1998." }] },
      { id: '7', title: 'Intellectual Property', page: 3, paras: [
        { ref: '7.1', text: "All inventions, works and materials created by the Employee in the course of employment belong to the Company, and the Employee assigns all rights in them to the Company." }] },
      { id: '8', title: 'Data Protection', page: 3, paras: [
        { ref: '8.1', text: "The Company will process the Employee’s personal data in accordance with its Privacy Notice and applicable data protection law. The Employee shall comply with the Company’s data protection policies when handling personal data." }] },
      { id: '9', title: 'Post-Termination Restrictions', page: 4, paras: [
        { ref: '9.1', text: "For the Restricted Period, the Employee shall not, without the Company’s written consent, work for any business that competes with the Company within a twenty-five (25) mile radius of the Company’s London office." },
        { ref: '9.2', text: "For twelve (12) months after the Termination Date, the Employee shall not solicit or deal with any client of the Company with whom the Employee had material dealings in the preceding twelve (12) months." }] },
      { id: '10', title: 'Garden Leave', page: 4, paras: [
        { ref: '10.1', text: "After notice of termination has been given by either party, the Company may require the Employee to stay away from work and perform no duties for up to twelve (12) weeks (“Garden Leave”), during which salary and benefits continue." }] },
      { id: '11', title: 'Termination', page: 4, paras: [
        { ref: '11.1', text: "During the probationary period either party may terminate this Agreement by giving one (1) week’s written notice." },
        { ref: '11.2', text: "Either party may terminate this Agreement upon thirty (30) days’ written notice, provided that the Company may, at its sole discretion, elect to pay salary in lieu of notice, and the Employee shall remain bound by clause 9 following termination." },
        { ref: '11.3', text: "The Company may terminate this Agreement immediately and without notice in cases of gross misconduct, including serious breach of clause 6." }] },
      { id: '12', title: 'Governing Law and General', page: 5, paras: [
        { ref: '12.1', text: "This Agreement and any dispute arising from it are governed by the law of England and Wales." },
        { ref: '12.2', text: "This Agreement constitutes the entire agreement between the parties and supersedes all prior agreements, understandings and representations relating to its subject matter." },
        { ref: '12.3', text: "The courts of England and Wales have exclusive jurisdiction over any dispute arising out of this Agreement." }] }
    ],
    marks: { '11.2': [['sole discretion', 'Sole discretion'], ['in lieu of notice', 'Pay in lieu of notice'], ['remain bound by clause 9', 'Surviving obligations']], '9.1': [['Restricted Period', 'Restricted Period']], '10.1': [['Garden Leave', 'Garden Leave']], '6.1': [['without limit in time', 'No end date']] },
    notes: {
      '1.1': { gist: 'Identifies the employer and the employee.', explain: "Names the two parties: Northwind Analytics Ltd (the employer) and Daniel Okafor (the employee).", means: ['Check the company name and number on any payslip match this clause.'], questions: ['Is “Group Company” defined anywhere?'], terms: [] },
      '1.2': { gist: 'Defines three terms used throughout.', explain: "Sets out what counts as confidential information, what the “Restricted Period” is (six months after leaving) and when employment is considered to end.", terms: [{ t: 'Confidential Information', d: 'Non-public information about the business, its clients, money, products or technology.' }, { t: 'Restricted Period', d: 'The six months after you leave during which the clause 9.1 restriction applies.' }], means: ['The definition of Confidential Information is broad: it includes anything non-public about Group Companies too.', 'The six-month Restricted Period starts on your last day, not when notice is given.'], questions: ['Does “Group Company” include affiliates I have never worked with?', 'Does a long garden-leave period count towards the six months?'] },
      '2.1': { gist: 'Employment starts 3 March 2025.', explain: "Your job starts on 3 March 2025. Time worked for earlier employers does not count towards your length of service with this company.", means: ['Your length-of-service clock for this employer starts on 3 March 2025.'], questions: ['Does any statutory right depend on my length of service?'], terms: [{ t: 'Continuous employment', d: 'Uninterrupted service with one employer, used to work out some legal rights.' }] },
      '2.2': { gist: 'Six-month probation, extendable once by three months.', explain: "Your first six months are a trial period. The company can extend it once, by up to three months, if it tells you in writing.", terms: [{ t: 'Probationary period', d: 'A trial period at the start of a job in which performance is assessed.' }], means: ['Probation could last up to nine months in total.', 'The notice you must give is shorter during probation (clause 11.1).'], questions: ['What happens if probation is extended — does notice stay at one week?', 'What criteria will be used to assess probation?'] },
      '3.1': { gist: 'Your role is Senior Data Analyst.', explain: "You are hired as a Senior Data Analyst and must do the reasonable duties the company gives you.", means: ['“Reasonably assigned” gives the company flexibility to change your day-to-day work.'], questions: ['Is there a job description that limits the duties?'], terms: [] },
      '3.2': { gist: 'London office, at least three days a week.', explain: "Your normal workplace is the London office, and you need to be there at least three days a week unless the company agrees otherwise in writing.", means: ['Working from home on those days needs written agreement.', 'The Company Policy (v4.2) now says two days — see the comparison.'], questions: ['Has the three-day requirement been varied in writing?'], terms: [{ t: 'In writing', d: 'A signed or emailed record, not just a conversation.' }] },
      '4.1': { gist: '£62,000 gross per year, paid monthly.', explain: "Your pay is £62,000 a year before tax, paid at the end of each month.", means: ['“Gross” means before tax and National Insurance.'], questions: ['Are pension contributions deducted from this figure?'], terms: [{ t: 'Gross', d: 'The amount before tax and other deductions.' }, { t: 'In arrears', d: 'Paid after the work is done, at the end of the period.' }] },
      '4.2': { gist: 'Annual pay review in April; no guaranteed increase.', explain: "Your salary is looked at every April, but the company does not have to give you a raise.", means: ['A review is not a promise of an increase.'], questions: ['Is there a policy that links reviews to performance?'], terms: [] },
      '4.3': { gist: 'Discretionary bonus of up to 10%.', explain: "You may get a bonus of up to 10% of your salary, but only if the company chooses to give it, based on performance and its bonus rules.", means: ['Because it is discretionary, there is no automatic right to a bonus.'], questions: ['Where can I read the Company’s bonus rules?'], terms: [{ t: 'Discretionary', d: 'The company decides; it is not obliged.' }] },
      '5.1': { gist: '9:00–17:30, Monday to Friday.', explain: "Your normal hours are 9:00 am to 5:30 pm on weekdays, with an unpaid one-hour lunch.", means: ['That is 7.5 paid hours a day.'], questions: ['Is overtime ever paid or compensated?'], terms: [] },
      '5.2': { gist: '25 days’ holiday plus public holidays.', explain: "You get 25 working days of paid holiday every year, plus the public holidays in England and Wales.", terms: [{ t: 'Holiday year', d: 'The 12-month period over which holiday is counted.' }], means: ['In total that is about 33 paid days off a year.', 'The Company Policy counts 28 days including public holidays — a different basis.'], questions: ['Does unused holiday carry over?', 'Is accrued holiday paid when I leave?'] },
      '6.1': { gist: 'Confidentiality continues forever.', explain: "You must keep the company’s non-public information secret — while you work there and afterwards, with no end date. The only exceptions are doing your job and disclosures required by law.", terms: [{ t: 'Without limit in time', d: 'The duty has no expiry date.' }, { t: 'Confidential Information', d: 'Non-public information about the business, clients, finances, products or technology.' }], means: ['The duty applies for life, unlike many NDAs that expire after a few years.', 'Clause 6.2 protects whistleblowing.'], questions: ['Would a court treat an unlimited confidentiality duty as reasonable?', 'Does it cover information that later becomes public?'] },
      '6.2': { gist: 'Whistleblowing carve-out.', explain: "Nothing in the confidentiality clause stops you from reporting wrongdoing in the public interest under the Public Interest Disclosure Act 1998.", means: ['Protected whistleblowing disclosures are not a breach of confidence.'], questions: ['Who should I report to first?'], terms: [{ t: 'Protected disclosure', d: 'A report of wrongdoing made in the way the law protects.' }] },
      '7.1': { gist: 'Company owns what you create at work.', explain: "Anything you create as part of your job belongs to the company, and you hand over the rights to it.", means: ['Check whether personal projects could be argued to fall “in the course of employment”.'], questions: ['Does this cover work done on my own time with company tools?'], terms: [{ t: 'Assign', d: 'Formally transfer ownership of rights.' }] },
      '8.1': { gist: 'Data protection duties on both sides.', explain: "The company will handle your personal data under its Privacy Notice and the law, and you must follow its data-protection policies when handling other people’s data.", means: ['You may be personally responsible for breaches of the data-protection policy.'], questions: ['Where is the Privacy Notice located?'], terms: [{ t: 'Personal data', d: 'Information that identifies a living person.' }] },
      '9.1': { gist: '6-month non-compete within 25 miles.', explain: "For six months after you leave, you can’t work for a competitor within 25 miles of the London office unless the Company agrees in writing.", terms: [{ t: 'Restricted Period', d: 'Six months from your last day.' }, { t: 'Non-compete', d: 'A promise not to work for competitors for a set time and area.' }], means: ['The restriction is limited by time (6 months) and geography (25 miles).', 'Courts only enforce restrictions that protect a legitimate business interest and go no further than necessary.'], questions: ['Would a remote role for a competitor outside 25 miles be allowed?', 'Is the company paying anything during the restricted period?'] },
      '9.2': { gist: '12-month client non-solicit.', explain: "For a year after you leave you can’t solicit or deal with clients you worked closely with in your last year.", terms: [{ t: 'Non-solicitation', d: 'A promise not to approach the company’s clients or staff.' }], means: ['It is narrower than a non-compete: it only covers clients you personally dealt with.'], questions: ['What if a client contacts me first?'] },
      '10.1': { gist: 'Up to 12 weeks’ paid garden leave.', explain: "After notice is given, the company can tell you to stay home for up to 12 weeks (“garden leave”) while still paying you.", terms: [{ t: 'Garden Leave', d: 'Being paid but told not to work during the notice period.' }], means: ['Garden leave is longer than the 30-day notice period in clause 11.2 — check how the two fit together.', 'The Company Policy says 4 weeks unless your contract says otherwise.'], questions: ['Can the Company impose garden leave longer than my notice period?', 'Does the Restricted Period run during garden leave?'] },
      '11.1': { gist: 'One week’s notice during probation.', explain: "While you are on probation, either side can end the job with one week’s written notice.", means: ['Notice is much shorter during probation.'], questions: ['Does an extended probation keep the shorter notice?'], terms: [] },
      '11.2': { gist: '30 days’ notice, with pay in lieu, and clause 9 survives.', explain: "Either you or the company can end the job by giving 30 days’ written notice. The company can choose to pay you for those 30 days and let you go immediately instead. Whichever way it ends, certain promises you made in clause 9 still apply.", terms: [{ t: 'Sole discretion', d: 'The company decides alone and doesn’t need your agreement or a reason.' }, { t: 'In lieu of notice', d: 'Paying you instead of having you work the notice period.' }, { t: 'Remain bound', d: 'Some duties survive after the job ends — here, those in clause 9.' }], means: ['Notice must be in writing — a conversation alone may not count.', 'The company can end your work early, but must still pay for the period.', 'Check clause 9: it may limit where you can work next.'], questions: ['What does clause 9 restrict after I leave?', 'Is 30 days consistent with my other documents?', 'Does the law set a minimum notice period here?'] },
      '11.3': { gist: 'Summary dismissal for gross misconduct.', explain: "The company can end your job immediately, without notice, for gross misconduct — which includes a serious breach of the confidentiality clause.", terms: [{ t: 'Gross misconduct', d: 'Behaviour so serious it destroys the working relationship.' }], means: ['No notice period or pay in lieu applies in this case.'], questions: ['How does the Company define gross misconduct in practice?'] },
      '12.1': { gist: 'English law governs.', explain: "English law applies to this contract and to any dispute about it.", means: ['The law chosen cannot reduce certain statutory employment rights.'], questions: ['Which statutory rights apply regardless of this clause?'], terms: [{ t: 'Governing law', d: 'The country’s law used to interpret the contract.' }] },
      '12.2': { gist: 'Entire agreement clause.', explain: "This document is the whole deal. Earlier promises or discussions about the same subject no longer count.", terms: [{ t: 'Entire agreement', d: 'A clause saying the written contract replaces earlier statements.' }], means: ['It supersedes prior agreements; whether a later handbook can add to it depends on whether the handbook is incorporated.'], questions: ['Is the Company Handbook part of my contract?'] },
      '12.3': { gist: 'English courts have exclusive jurisdiction.', explain: "If there is a legal dispute, it must be heard in the courts of England and Wales.", means: ['You cannot choose another country’s courts.'], questions: ['Does this affect tribunal claims?'], terms: [{ t: 'Exclusive jurisdiction', d: 'Only these courts may hear the dispute.' }] }
    },
    dates: [
      { iso: '2025-03-03', label: 'Employment begins', ref: 'emp:2.1' },
      { iso: '2025-09-03', label: 'Probation ends (extendable by up to 3 months)', ref: 'emp:2.2' },
      { text: 'Every April', label: 'Annual salary review', ref: 'emp:4.2' },
      { text: '30 days after notice', label: 'Notice period ends', ref: 'emp:11.2' },
      { text: 'Up to 12 weeks', label: 'Maximum garden leave after notice', ref: 'emp:10.1' },
      { text: '6 / 12 months after leaving', label: 'Non-compete / client non-solicit end', ref: 'emp:9.1' }
    ],
    obligations: [
      { who: 'Employee', text: 'Attend the London office at least three days a week.', ref: 'emp:3.2' },
      { who: 'Employee', text: 'Keep Confidential Information secret, during and after employment.', ref: 'emp:6.1' },
      { who: 'Employee', text: 'Give 30 days’ written notice to resign.', ref: 'emp:11.2' },
      { who: 'Employee', text: 'No competing work within 25 miles for 6 months; no client solicitation for 12 months.', ref: 'emp:9.1' },
      { who: 'Company', text: 'Pay £62,000 a year, monthly in arrears.', ref: 'emp:4.1' },
      { who: 'Company', text: 'Provide 25 days’ paid holiday plus public holidays.', ref: 'emp:5.2' },
      { who: 'Company', text: 'Give 30 days’ notice, or pay in lieu of notice.', ref: 'emp:11.2' },
      { who: 'Company', text: 'Continue salary and benefits during any garden leave.', ref: 'emp:10.1' }
    ],
    issues: [
      { sev: 'high', title: 'Notice period differs from Company Policy', text: '§11.2 says 30 days; Policy §4.3 says 60 days. Neither document states which prevails.', ref: 'emp:11.2', link: 'compare?a=emp&b=pol&f=f1' },
      { sev: 'med', title: 'Restricted Period may be longer in the Policy', text: '§9.1 sets six months; Policy §6.2 refers to twelve months for senior roles.', ref: 'emp:9.1', link: 'compare?a=emp&b=pol&f=f2' },
      { sev: 'low', title: 'Confidentiality has no end date', text: '§6.1 continues “without limit in time”. This is broader than a typical fixed-term NDA.', ref: 'emp:6.1', link: 'law?doc=emp&c=6.1' },
      { sev: 'low', title: 'Non-compete radius is geographic only', text: '§9.1 restricts work within 25 miles. Enforceability depends on whether it is reasonable.', ref: 'emp:9.1', link: 'law?doc=emp&c=9.1' }
    ],
    defs: [
      { t: 'Confidential Information', d: 'Non-public information about the business, clients, finances, products or technology.', ref: 'emp:1.2' },
      { t: 'Restricted Period', d: 'Six months after the Termination Date.', ref: 'emp:1.2' },
      { t: 'Termination Date', d: 'The day the employment ends.', ref: 'emp:1.2' },
      { t: 'Garden Leave', d: 'A period after notice when the Employee is paid but told to stay away from work.', ref: 'emp:10.1' },
      { t: 'Pay in lieu of notice', d: 'Money paid instead of working out the notice period.', ref: 'emp:11.2' }
    ],
    law: { text: 'This Agreement and any dispute are governed by the law of England and Wales, and its courts have exclusive jurisdiction.', ref: 'emp:12.1', jur: 'uk' }
  };

  /* ======================= COMPANY POLICY ======================= */
  dd('pol').content = {
    summary: "Northwind’s Employee Handbook, version 4.2 (effective 1 September 2025). It covers working arrangements, leaving the company, leave and post-employment expectations. The Handbook states it is contractual only when expressly incorporated into an employee’s written terms.",
    facts: [['Type', 'Policy handbook'], ['Version', 'v4.2'], ['Effective', { iso: '2025-09-01' }], ['Notice', '60 days'], ['Annual leave', '28 days incl. public holidays'], ['Status', 'Guidance unless incorporated']],
    clauses: [
      { id: '1', title: 'About this Handbook', page: 3, paras: [{ ref: '1.2', text: "This Handbook sets out Company policy. It forms part of an employee’s contract only where it is expressly incorporated by their written terms of employment; otherwise it is guidance, which the Company may amend from time to time." }] },
      { id: '3', title: 'Working Arrangements', page: 9, paras: [{ ref: '3.4', text: "As of version 4.2, staff are expected to attend the office a minimum of two (2) days per week. This replaces the previous three-day expectation." }] },
      { id: '4', title: 'Leaving the Company', page: 12, paras: [
        { ref: '4.3', text: "Employees must be given sixty (60) days’ notice prior to termination of employment." },
        { ref: '4.5', text: "Where the Company places an employee on garden leave, the period will not normally exceed four (4) weeks unless the employee’s individual contract provides otherwise." }] },
      { id: '5', title: 'Annual Leave', page: 15, paras: [{ ref: '5.1', text: "Full-time employees receive twenty-eight (28) working days’ paid annual leave, inclusive of public holidays." }] },
      { id: '6', title: 'After Employment', page: 18, paras: [{ ref: '6.2', text: "Employees in senior roles may be asked to observe a restriction on joining a competitor for twelve (12) months after leaving." }] }
    ],
    marks: {},
    notes: {
      '1.2': { gist: 'The Handbook is guidance unless incorporated.', explain: "The Handbook only becomes part of your contract if your own written terms say so. Otherwise it is guidance the company can change.", means: ['Check whether your Employment Agreement mentions the Handbook — it does not appear to.'], questions: ['Does the Employment Agreement incorporate the Handbook?'], terms: [{ t: 'Expressly incorporated', d: 'Written into the contract by name or reference.' }] },
      '3.4': { gist: 'Two office days a week from v4.2.', explain: "From version 4.2, staff are expected in the office two days a week, replacing the earlier three-day expectation.", means: ['This is a later, softer expectation than the three days in Employment Agreement §3.2.'], questions: ['Did the Company confirm this in writing for me?'], terms: [] },
      '4.3': { gist: '60 days’ notice.', explain: "The Handbook says employees must be given 60 days’ notice before their employment is terminated.", means: ['This is double the 30 days in the Employment Agreement.', 'It is guidance unless incorporated into the contract.'], questions: ['Which notice period applies to me?'], terms: [{ t: 'Notice', d: 'Advance warning that employment will end.' }] },
      '4.5': { gist: 'Garden leave normally up to four weeks.', explain: "If the company puts someone on garden leave it will not normally last more than four weeks — unless that person’s own contract allows longer.", means: ['Your contract allows up to 12 weeks, so the Handbook defers to it.'], questions: ['Is 12 weeks of garden leave reasonable for my role?'], terms: [{ t: 'Individual contract', d: 'The written terms agreed with one employee.' }] },
      '5.1': { gist: '28 days including public holidays.', explain: "Full-time employees get 28 working days of paid leave, and that figure already includes public holidays.", means: ['The Employment Agreement gives 25 days plus public holidays — a different way of counting.'], questions: ['Which holiday entitlement applies to me?'], terms: [{ t: 'Inclusive of', d: 'Counting public holidays within the total.' }] },
      '6.2': { gist: 'Senior roles may face a 12-month non-compete.', explain: "People in senior roles may be asked not to join a competitor for twelve months after leaving.", means: ['This is twice the six-month Restricted Period in your Employment Agreement.'], questions: ['Am I classed as a senior role?'], terms: [{ t: 'Senior role', d: 'A grade or title defined by the company, not by the contract.' }] }
    },
    dates: [{ iso: '2025-09-01', label: 'Handbook v4.2 takes effect', ref: 'pol:3.4' }],
    obligations: [{ who: 'Company', text: 'Give 60 days’ notice before termination.', ref: 'pol:4.3' }, { who: 'Employee', text: 'Attend the office at least two days a week.', ref: 'pol:3.4' }],
    issues: [{ sev: 'high', title: 'Notice period differs from Employment Agreement', text: '§4.3 says 60 days; the contract says 30 days.', ref: 'pol:4.3', link: 'compare?a=emp&b=pol&f=f1' }],
    defs: [{ t: 'Expressly incorporated', d: 'Written into the employee’s contract by name or reference.', ref: 'pol:1.2' }],
    law: { text: 'No governing law is stated in the extract analysed.', ref: 'pol:1.2', jur: 'uk' }
  };

  /* ======================= NDA ======================= */
  dd('nda').content = {
    summary: "A mutual non-disclosure agreement between Northwind Analytics Ltd and Meridian Partners LLC for evaluating a proposed transaction. Confidentiality obligations survive for three years from each disclosure, and Delaware law applies.",
    facts: [['Type', 'Mutual NDA'], ['Parties', 'Northwind Analytics Ltd · Meridian Partners LLC'], ['Term', '3 years from disclosure'], ['Governing law', 'Delaware, USA']],
    clauses: [
      { id: '1', title: 'Confidential Information', page: 1, paras: [{ ref: '1.1', text: "“Confidential Information” means non-public technical, financial or business information disclosed by one party to the other, whether orally or in writing, that is marked or reasonably understood to be confidential." }] },
      { id: '2', title: 'Obligations', page: 2, paras: [{ ref: '2.1', text: "The Receiving Party shall use Confidential Information solely to evaluate the Proposed Transaction and shall protect it with at least reasonable care." }] },
      { id: '4', title: 'Term', page: 4, paras: [{ ref: '4.1', text: "The obligations of confidentiality in this Agreement survive for three (3) years from the date of each disclosure." }] },
      { id: '7', title: 'Governing Law', page: 7, paras: [{ ref: '7.1', text: "This Agreement is governed by the laws of the State of Delaware." }] }
    ],
    marks: {},
    notes: {
      '1.1': { gist: 'What counts as confidential.', explain: "Information counts as confidential if it is non-public and either marked confidential or obviously sensitive.", means: ['Unmarked information can still be protected if it is reasonably understood to be confidential.'], questions: ['How do we mark oral disclosures?'], terms: [{ t: 'Receiving Party', d: 'The side that receives the information.' }] },
      '2.1': { gist: 'Use only to evaluate the deal.', explain: "Each side may only use what it receives to assess the proposed transaction, and must protect it with reasonable care.", means: ['Using the information for any other purpose would breach the agreement.'], questions: ['Who inside each company may see it?'], terms: [{ t: 'Reasonable care', d: 'The level of protection a careful organisation would apply.' }] },
      '4.1': { gist: 'Confidentiality lasts three years per disclosure.', explain: "Each secret you share stays protected for three years after the date it was shared, then the duty ends.", means: ['Information disclosed later gets its own three-year period.', 'This is shorter than the open-ended duty in the Employment Agreement.'], questions: ['Should trade secrets be protected for longer?'], terms: [{ t: 'Survive', d: 'Continue to apply after the agreement ends.' }] },
      '7.1': { gist: 'Delaware law applies.', explain: "The agreement is interpreted under the laws of the State of Delaware, USA.", means: ['Delaware law, not English law, governs this NDA.'], questions: ['Where would a dispute be heard?'], terms: [{ t: 'Governing law', d: 'The law used to interpret the contract.' }] }
    },
    dates: [{ text: '3 years from each disclosure', label: 'Confidentiality expires per disclosure', ref: 'nda:4.1' }],
    obligations: [{ who: 'Both parties', text: 'Use Confidential Information only to evaluate the Proposed Transaction.', ref: 'nda:2.1' }, { who: 'Both parties', text: 'Protect it with at least reasonable care.', ref: 'nda:2.1' }],
    issues: [{ sev: 'low', title: 'Fixed three-year term', text: 'Trade secrets may need protection for longer than three years.', ref: 'nda:4.1', link: 'law?doc=nda&c=4.1' }],
    defs: [{ t: 'Receiving Party', d: 'The party that receives Confidential Information.', ref: 'nda:2.1' }],
    law: { text: 'Governed by the laws of the State of Delaware.', ref: 'nda:7.1', jur: 'us' }
  };

  /* ======================= LEASE ======================= */
  dd('lease').content = {
    summary: "An eleven-month leave and licence agreement for Unit 4B, Marine View, Mumbai, at ₹85,000 per month with a six-month security deposit. After a six-month lock-in either party may end it on two months’ written notice.",
    facts: [['Type', 'Leave & licence'], ['Term', '11 months from 1 Jul 2025'], ['Licence fee', '₹85,000 / month'], ['Deposit', '₹5,10,000'], ['Lock-in', '6 months'], ['Notice', '2 months']],
    clauses: [
      { id: '1', title: 'Term', page: 2, paras: [{ ref: '1.1', text: "The License is granted for a period of eleven (11) months commencing on 1 July 2025." }] },
      { id: '2', title: 'Licence Fee', page: 3, paras: [{ ref: '2.1', text: "The Licensee shall pay a monthly licence fee of ₹85,000, due on or before the 5th day of each month." }] },
      { id: '3', title: 'Security Deposit', page: 4, paras: [{ ref: '3.1', text: "The Licensee has paid an interest-free refundable security deposit of ₹5,10,000, equal to six (6) months’ licence fee." }] },
      { id: '5', title: 'Termination', page: 7, paras: [{ ref: '5.1', text: "After a lock-in period of six (6) months, either party may terminate this Agreement by giving two (2) months’ written notice." }] }
    ],
    marks: {},
    notes: {
      '1.1': { gist: 'Eleven-month licence from 1 July 2025.', explain: "You are allowed to occupy the unit for 11 months, starting 1 July 2025.", means: ['Eleven-month terms are common in India; renewal needs a fresh agreement.'], questions: ['What happens at the end of the 11 months?'], terms: [{ t: 'Licence', d: 'Permission to use a property without owning or renting it as a tenant.' }] },
      '2.1': { gist: '₹85,000 per month, due by the 5th.', explain: "You pay ₹85,000 every month, by the 5th.", means: ['Late payment terms should be checked elsewhere in the agreement.'], questions: ['Is there a late-fee clause?'], terms: [] },
      '3.1': { gist: 'Six months’ refundable deposit.', explain: "You have paid a refundable deposit of ₹5,10,000 (six months’ fee). It earns no interest.", means: ['Deductions at exit should be itemised in writing.'], questions: ['Under what conditions can deductions be made?'], terms: [{ t: 'Interest-free', d: 'The deposit earns no interest while held.' }] },
      '5.1': { gist: 'Six-month lock-in, then two months’ notice.', explain: "For the first six months neither side can leave early. After that, either side can end it by giving two months’ written notice.", means: ['The earliest exit is month 8 if notice is given at the end of the lock-in.'], questions: ['What is the penalty for leaving during the lock-in?'], terms: [{ t: 'Lock-in period', d: 'A time during which neither party may terminate.' }] }
    },
    dates: [{ iso: '2025-07-01', label: 'Licence begins', ref: 'lease:1.1' }, { iso: '2026-05-31', label: 'Licence ends (11 months)', ref: 'lease:1.1' }, { iso: '2025-12-31', label: 'Lock-in ends (6 months)', ref: 'lease:5.1' }],
    obligations: [{ who: 'Licensee', text: 'Pay ₹85,000 by the 5th of each month.', ref: 'lease:2.1' }, { who: 'Either party', text: 'Give two months’ written notice after the lock-in.', ref: 'lease:5.1' }],
    issues: [{ sev: 'low', title: 'Eleven-month structure', text: 'The licence ends before the 12-month threshold that triggers lease registration rules.', ref: 'lease:1.1', link: 'law?doc=lease&c=1.1' }],
    defs: [{ t: 'Lock-in period', d: 'The first six months during which neither party may terminate.', ref: 'lease:5.1' }],
    law: { text: 'Governing law is not stated in the extract analysed.', ref: 'lease:1.1', jur: 'in' }
  };

  /* ======================= MSA (analysis fails first, succeeds on retry) ======================= */
  D.msaContent = {
    summary: "A three-year master services agreement with Orbit Cloud Services Ltd. It renews automatically for 12-month periods unless either side gives 90 days’ notice, invoices are payable within 45 days, and liability is capped at 100% of the fees paid in the preceding 12 months.",
    facts: [['Type', 'Master services agreement'], ['Initial term', '3 years'], ['Renewal', 'Automatic, 12 months'], ['Payment', '45 days'], ['Liability cap', '100% of 12 months’ fees']],
    clauses: [
      { id: '3', title: 'Term and Renewal', page: 5, paras: [{ ref: '3.1', text: "This Agreement has an initial term of three (3) years and renews automatically for successive twelve (12) month periods unless either party gives ninety (90) days’ written notice of non-renewal." }] },
      { id: '6', title: 'Payment', page: 9, paras: [{ ref: '6.1', text: "The Customer shall pay each undisputed invoice within forty-five (45) days of receipt." }] },
      { id: '9', title: 'Limitation of Liability', page: 14, paras: [{ ref: '9.1', text: "Each party’s total liability under this Agreement is limited to one hundred per cent (100%) of the fees paid in the twelve (12) months preceding the claim." }] }
    ],
    marks: {},
    notes: {
      '3.1': { gist: 'Auto-renews unless you give 90 days’ notice.', explain: "The contract runs three years, then renews itself each year unless one side gives 90 days’ written notice.", means: ['Missing the notice window means another 12-month commitment.'], questions: ['When exactly is the notice deadline?'], terms: [{ t: 'Auto-renewal', d: 'Continuing automatically unless someone opts out.' }] },
      '6.1': { gist: '45-day payment terms.', explain: "You must pay undisputed invoices within 45 days of receiving them.", means: ['Disputed amounts can be withheld while the dispute is resolved.'], questions: ['How do we raise an invoice dispute?'], terms: [{ t: 'Undisputed', d: 'Not formally challenged by the customer.' }] },
      '9.1': { gist: 'Liability capped at 12 months’ fees.', explain: "If something goes wrong, the most either side can be made to pay is the fees paid in the last 12 months.", means: ['A low-fee year means a low cap, even for serious losses.'], questions: ['Are any losses excluded from the cap?'], terms: [{ t: 'Limitation of liability', d: 'A ceiling on the damages one party can claim from the other.' }] }
    },
    dates: [{ text: '3 years from signing', label: 'Initial term ends', ref: 'msa:3.1' }, { text: '90 days before renewal', label: 'Non-renewal notice deadline', ref: 'msa:3.1' }],
    obligations: [{ who: 'Customer', text: 'Pay undisputed invoices within 45 days.', ref: 'msa:6.1' }, { who: 'Either party', text: 'Give 90 days’ notice to prevent renewal.', ref: 'msa:3.1' }],
    issues: [{ sev: 'med', title: 'Automatic renewal', text: 'A missed 90-day notice locks in another 12 months.', ref: 'msa:3.1', link: 'law?doc=msa&c=9.1' }],
    defs: [{ t: 'Auto-renewal', d: 'The contract continues unless a party gives notice.', ref: 'msa:3.1' }],
    law: { text: 'Governing law is not stated in the extract analysed.', ref: 'msa:3.1', jur: 'uk' }
  };

  /* ======================= COMPARISON FINDINGS ======================= */
  D.kinds = {
    contradiction: { label: 'Potential contradiction', short: 'Contradiction', cls: 'chip-risk', icon: 'alert', desc: 'Two statements about the same obligation cannot both be applied as written.' },
    inconsistency: { label: 'Inconsistency', short: 'Inconsistency', cls: 'chip-warn', icon: 'compare', desc: 'The documents describe the same topic differently, but both could still hold.' },
    update: { label: 'Document update', short: 'Update', cls: 'chip-gold', icon: 'clock', desc: 'A later document appears to replace or revise an earlier statement.' },
    legit: { label: 'Legitimate change', short: 'Legitimate', cls: 'chip-slate', icon: 'check', desc: 'The difference is explained by role, context or an express carve-out.' }
  };
  D.findings = [
    { id: 'f1', pair: ['emp', 'pol'], kind: 'contradiction', sev: 'high', topic: 'Notice period', a: { ref: 'emp:11.2', value: '30 days', quote: 'Either party may terminate this Agreement upon thirty (30) days’ written notice…' }, b: { ref: 'pol:4.3', value: '60 days', quote: 'Employees must be given sixty (60) days’ notice prior to termination of employment.' },
      what: 'Both documents set a notice period for ending employment, but the periods differ by 30 days.', why: 'The notice you owe — or are owed — may differ by 30 days, affecting pay, start dates and obligations during the gap.', impact: 'Up to 30 days of salary and benefits; the date on which the six-month Restricted Period begins.', review: 'Which document governs depends on whether the Handbook is incorporated (Policy §1.2) and what the entire-agreement clause (Contract §12.2) covers. JURISAI cannot decide this — it is flagged for a qualified reviewer.',
      graph: { clauseA: '§11.2 Termination', clauseB: '§4.3 Leaving', obligation: 'Notice before termination', stA: '30 days', stB: '60 days' }, law: 'emp:11.2' },
    { id: 'f2', pair: ['emp', 'pol'], kind: 'contradiction', sev: 'med', topic: 'Post-employment competition restriction', a: { ref: 'emp:9.1', value: '6 months', quote: '“Restricted Period” means the period of six (6) months following the Termination Date.' }, b: { ref: 'pol:6.2', value: '12 months', quote: 'Employees in senior roles may be asked to observe a restriction on joining a competitor for twelve (12) months after leaving.' },
      what: 'The contract limits competing work to six months; the Handbook refers to twelve months for senior roles.', why: 'A longer restriction would keep you out of competing work for six extra months.', impact: 'Possible additional six months of restricted employment options.', review: 'The Handbook says employees “may be asked”, which is softer than a binding restriction. Confirm whether you are in a “senior role” and whether the Handbook applies to you.',
      graph: { clauseA: '§9.1 Restrictions', clauseB: '§6.2 After employment', obligation: 'No joining a competitor', stA: '6 months', stB: '12 months' }, law: 'emp:9.1' },
    { id: 'f3', pair: ['emp', 'pol'], kind: 'inconsistency', sev: 'med', topic: 'Annual leave', a: { ref: 'emp:5.2', value: '25 days + public holidays', quote: '…twenty-five (25) working days’ paid holiday in each holiday year, in addition to the usual public holidays…' }, b: { ref: 'pol:5.1', value: '28 days incl. public holidays', quote: 'Full-time employees receive twenty-eight (28) working days’ paid annual leave, inclusive of public holidays.' },
      what: 'The documents count leave on different bases: the contract adds public holidays; the Handbook includes them.', why: 'Depending on the basis, the total ranges from 28 to about 33 days.', impact: 'Several days of paid leave per year.', review: 'The contract is more generous overall. This is a difference in counting, not necessarily a conflict.',
      graph: { clauseA: '§5.2 Holiday', clauseB: '§5.1 Annual leave', obligation: 'Paid annual leave', stA: '25 + public', stB: '28 incl. public' }, law: 'emp:5.2' },
    { id: 'f4', pair: ['emp', 'pol'], kind: 'update', sev: 'low', topic: 'Office attendance', a: { ref: 'emp:3.2', value: '3 days a week', quote: '…attend at least three (3) days each week unless the Company agrees otherwise in writing.' }, b: { ref: 'pol:3.4', value: '2 days a week', quote: 'As of version 4.2, staff are expected to attend the office a minimum of two (2) days per week. This replaces the previous three-day expectation.' },
      what: 'The Handbook (v4.2, effective 1 Sep 2025) replaces a three-day expectation with two days.', why: 'A later policy appears to relax the contract expectation.', impact: 'One fewer required office day each week, if confirmed.', review: 'Request written confirmation that the Handbook update applies to your contract — the contract requires a written agreement to vary the three days.',
      graph: { clauseA: '§3.2 Place of work', clauseB: '§3.4 Working arrangements', obligation: 'Office attendance', stA: '3 days', stB: '2 days' }, law: null },
    { id: 'f5', pair: ['emp', 'pol'], kind: 'legit', sev: 'low', topic: 'Garden leave length', a: { ref: 'emp:10.1', value: 'Up to 12 weeks', quote: '…stay away from work and perform no duties for up to twelve (12) weeks (“Garden Leave”)…' }, b: { ref: 'pol:4.5', value: 'Normally up to 4 weeks', quote: '…will not normally exceed four (4) weeks unless the employee’s individual contract provides otherwise.' },
      what: 'The contract allows 12 weeks of garden leave; the Handbook says four weeks unless a contract says otherwise.', why: 'The Handbook expressly defers to individual contracts, so the difference is intended.', impact: 'None, provided the contract applies.', review: 'No action needed. This is a role-specific term the Handbook anticipates.',
      graph: { clauseA: '§10.1 Garden Leave', clauseB: '§4.5 Leaving', obligation: 'Paid time away from work', stA: '12 weeks', stB: '4 weeks' }, law: 'emp:10.1' },
    { id: 'f6', pair: ['emp', 'nda'], kind: 'inconsistency', sev: 'low', topic: 'Confidentiality duration', a: { ref: 'emp:6.1', value: 'No end date', quote: '…This obligation continues without limit in time.' }, b: { ref: 'nda:4.1', value: '3 years', quote: 'The obligations of confidentiality in this Agreement survive for three (3) years from the date of each disclosure.' },
      what: 'The Employment Agreement’s confidentiality duty is unlimited; the Meridian NDA expires after three years.', why: 'Information the Company receives from Meridian could remain protected for you after the NDA obligation to Meridian has ended.', impact: 'Unclear which duty applies to Meridian-sourced information after three years.', review: 'These are separate contracts with different counterparties. Review whether Meridian information should be treated as Company Confidential Information.',
      graph: { clauseA: '§6.1 Confidentiality', clauseB: '§4.1 Term', obligation: 'Keep information secret', stA: 'No end date', stB: '3 years' }, law: 'emp:6.1' }
  ];
  J.state.findings = J.store.get('findings', {});
  D.findingState = function (id) { return J.state.findings[id] || { status: 'open', notes: [] }; };
  D.setFindingState = function (id, patch) { var s = Object.assign({ status: 'open', notes: [] }, J.state.findings[id], patch); J.state.findings[id] = s; J.store.set('findings', J.state.findings); return s; };

  /* ======================= LEGAL CONTEXT ======================= */
  var U = function (name, cite, type, rel, url) { return { name: name, cite: cite, type: type, rel: rel, url: url || '' }; };
  D.law = {
    'emp:2.2': {
      concept: 'Probation and qualifying service',
      uk: { concept: 'Qualifying service for employment protection', strength: 'Limited', sources: [U('Employment Rights Act 1996 — Part X (unfair dismissal)', 'ERA 1996, Part X', 'Statute', 'Protection against unfair dismissal depends on continuous service. A probationary label does not by itself remove statutory rights.', 'https://www.legislation.gov.uk/ukpga/1996/18/part/X')], why: 'A probationary period governs how the employer assesses performance, but statutory protections turn on length of service and the reason for dismissal rather than the “probation” label.', verify: ['The current qualifying-service threshold — employment legislation has been under reform.', 'Whether probation was properly extended in writing.'] },
      in: { unavailable: true }, us: { concept: 'At-will employment', strength: 'Limited', sources: [U('At-will employment doctrine (state law)', 'State common law', 'Doctrine', 'In most US states employment is at-will unless a contract says otherwise; probation terms are creatures of contract and state law.', '')], why: 'In the US, a probationary period is largely a contractual label; rights on termination depend on state law and any written agreement.', verify: ['Which state’s law would apply.', 'Any statutory protections against discriminatory dismissal.'] }
    },
    'emp:5.2': {
      concept: 'Statutory annual leave',
      uk: { concept: 'Minimum paid annual leave', strength: 'Strong', sources: [U('Working Time Regulations 1998 — regulation 13 and 13A', 'SI 1998/1833, regs 13, 13A', 'Regulation', 'Workers are entitled to 5.6 weeks’ paid annual leave, which for a five-day week is 28 days and may include public holidays.', 'https://www.legislation.gov.uk/uksi/1998/1833/regulation/13')], why: 'The contract’s 25 days plus public holidays exceeds the statutory minimum for a five-day week; the Handbook’s 28 days inclusive meets it.', verify: ['Whether the employee works a five-day week.', 'Whether public holidays are counted towards the statutory minimum.'] },
      in: { concept: 'Annual leave by state establishments law', strength: 'Limited', sources: [U('State Shops and Establishments Acts', 'Varies by State', 'State statute', 'Paid leave for office staff is mostly governed by state Shops and Establishments Acts, which vary in entitlement.', 'https://www.indiacode.nic.in/'), U('Factories Act, 1948 — section 79', 'Act 63 of 1948, s.79', 'Statute', 'Annual leave with wages for factory workers.', 'https://www.indiacode.nic.in/')], why: 'There is no single national leave entitlement for office staff; the relevant State Act and the contract determine it.', verify: ['The State in which the employee works.', 'Whether the employee is covered as a “worker” under the Factories Act.'] },
      us: { concept: 'No federal paid-leave mandate', strength: 'Moderate', sources: [U('Fair Labor Standards Act', '29 U.S.C. §201 et seq.', 'Federal statute', 'The FLSA does not require employers to provide paid vacation; entitlement arises from contract or state law.', 'https://www.law.cornell.edu/uscode/text/29/chapter-8')], why: 'Annual leave in the US is generally a matter of contract and employer policy, with some state-specific rules on payout.', verify: ['State rules on payout of accrued leave.'] }
    },
    'emp:6.1': {
      concept: 'Confidentiality and trade secrets',
      uk: { concept: 'Breach of confidence and trade secrets', strength: 'Strong', sources: [U('Trade Secrets (Enforcement, etc.) Regulations 2018', 'SI 2018/597', 'Regulation', 'Protects information that is secret, has commercial value and is subject to reasonable steps to keep it secret.', 'https://www.legislation.gov.uk/uksi/2018/597/contents'), U('Employment Rights Act 1996 — Part IVA (protected disclosures)', 'ERA 1996, ss.43A–43L', 'Statute', 'Protects workers who make qualifying whistleblowing disclosures, whatever a confidentiality clause says.', 'https://www.legislation.gov.uk/ukpga/1996/18/part/IVA')], why: 'An indefinite contractual duty sits alongside equitable duties of confidence. Courts distinguish genuine trade secrets from general skill and knowledge, which an employee may use freely after leaving.', verify: ['Whether the information is genuinely confidential rather than general know-how.', 'Whether clause 6.2 adequately reflects whistleblowing protections.'] },
      in: { concept: 'Contractual confidentiality (no dedicated trade secrets statute)', strength: 'Moderate', sources: [U('Indian Contract Act, 1872', 'Act 9 of 1872', 'Statute', 'Confidentiality is enforced principally through contract and equitable remedies, as India has no dedicated trade secrets statute.', 'https://www.indiacode.nic.in/')], why: 'Protection depends on the contract’s terms and general principles of equity; courts have granted injunctions to protect confidential information.', verify: ['Whether the confidentiality duty is reasonable in scope.'] },
      us: { concept: 'Defend Trade Secrets Act', strength: 'Strong', sources: [U('Defend Trade Secrets Act of 2016', '18 U.S.C. §1836', 'Federal statute', 'Creates a federal civil claim for misappropriation of trade secrets.', 'https://www.law.cornell.edu/uscode/text/18/1836'), U('DTSA whistleblower immunity notice', '18 U.S.C. §1833(b)', 'Federal statute', 'Employers must give notice of immunity for confidential disclosures to authorities in contracts governing confidential information.', 'https://www.law.cornell.edu/uscode/text/18/1833')], why: 'The DTSA protects trade secrets and requires an immunity notice in employee confidentiality agreements; omission can limit remedies.', verify: ['Whether the agreement includes the §1833(b) notice.', 'Which state trade-secrets law also applies.'] }
    },
    'emp:8.1': {
      concept: 'Employee data protection',
      uk: { concept: 'UK GDPR and Data Protection Act 2018', strength: 'Strong', sources: [U('Data Protection Act 2018', 'c.12', 'Statute', 'Sets the framework for processing employee personal data in the UK alongside the UK GDPR.', 'https://www.legislation.gov.uk/ukpga/2018/12/contents')], why: 'The employer must have a lawful basis for processing employee data and give a privacy notice; the clause refers to both.', verify: ['The lawful bases listed in the Privacy Notice.'] },
      in: { concept: 'Digital Personal Data Protection Act', strength: 'Moderate', sources: [U('Digital Personal Data Protection Act, 2023', 'Act 22 of 2023', 'Statute', 'India’s national data-protection law; permits processing for employment as a legitimate use.', 'https://www.indiacode.nic.in/')], why: 'If an Indian employee’s data were processed, the DPDP Act would be the primary statute.', verify: ['Commencement status of the relevant provisions.'] },
      us: { concept: 'No comprehensive federal law', strength: 'Limited', sources: [U('California Consumer Privacy Act (as amended)', 'Cal. Civ. Code §1798.100 et seq.', 'State statute', 'Covers personal data of California employees, among others.', 'https://leginfo.legislature.ca.gov/')], why: 'The US has no single federal employee-privacy law; state laws such as California’s apply case by case.', verify: ['The employee’s State of residence.'] }
    },
    'emp:9.1': {
      concept: 'Restraint of trade',
      uk: { concept: 'Restraint of trade doctrine', strength: 'Strong', sources: [U('Tillman v Egon Zehnder Ltd', '[2019] UKSC 32', 'Case', 'Restrictive covenants are enforceable only to the extent they protect a legitimate business interest and go no further than reasonably necessary. The Supreme Court considered whether offending words can be severed.', 'https://www.bailii.org/uk/cases/UKSC/2019/32.html')], why: 'Post-termination non-competes are presumed unenforceable unless reasonable in time, area and scope. A six-month, 25-mile restriction is shorter than many, but reasonableness depends on the employee’s role and access to sensitive information.', verify: ['Whether the Company has a legitimate interest that only a non-compete protects.', 'Whether the Policy’s 12-month period could be argued to apply.'] },
      in: { concept: 'Agreements in restraint of trade are void', strength: 'Strong', sources: [U('Indian Contract Act, 1872 — section 27', 'Act 9 of 1872, s.27', 'Statute', 'Agreements that restrain a person from exercising a lawful profession, trade or business are void, subject to a narrow exception.', 'https://www.indiacode.nic.in/')], why: 'Indian courts generally decline to enforce post-employment non-compete clauses, though confidentiality and non-solicitation may be treated differently.', verify: ['Whether the restriction operates only during employment, which is generally permitted.'] },
      us: { concept: 'State-by-state enforceability', strength: 'Moderate', sources: [U('California Business and Professions Code §16600', 'Cal. Bus. & Prof. Code §16600', 'State statute', 'Voids contractual restraints on practising a lawful profession, with limited exceptions.', 'https://leginfo.legislature.ca.gov/')], why: 'Enforceability varies widely: California largely prohibits non-competes, while many other states enforce reasonable ones.', verify: ['The governing State’s law.', 'Any current federal rulemaking, which has been the subject of litigation.'] }
    },
    'emp:10.1': {
      concept: 'Garden leave',
      uk: { concept: 'Garden leave and restrictive covenants', strength: 'Moderate', sources: [U('William Hill Organisation Ltd v Tucker', '[1998] EWCA Civ 1008; [1999] ICR 291', 'Case', 'An employer may in principle require an employee to remain on paid garden leave where the contract allows it and the employee has a right to work only in limited circumstances.', '')], why: 'Whether a contract can impose garden leave depends on its terms and the employee’s role. A clear garden-leave clause is generally enforceable; courts may also credit garden leave against restrictive covenants.', verify: ['Whether the Restricted Period runs during garden leave.'] },
      in: { unavailable: true }, us: { unavailable: true }
    },
    'emp:11.2': {
      concept: 'Statutory minimum notice',
      uk: { concept: 'Statutory minimum notice', strength: 'Strong', sources: [U('Employment Rights Act 1996 — section 86', 'ERA 1996, s.86', 'Statute', 'An employer must give at least one week’s notice for each full year of continuous service (once past one month), up to twelve weeks. A contract may give more, but not less.', 'https://www.legislation.gov.uk/ukpga/1996/18/section/86')], why: 'Both 30 and 60 days exceed the statutory minimum for an employee with under a year of service, so the statutory floor does not decide which document prevails — it only confirms a floor.', verify: ['The employee’s continuous service at the notice date.', 'Whether the Handbook is incorporated into the contract.'] },
      in: { concept: 'Notice on termination', strength: 'Limited', sources: [U('Industrial Disputes Act, 1947 — section 25F', 'Act 14 of 1947, s.25F', 'Statute', 'Requires one month’s notice (or pay) for retrenchment of a “workman” with a year’s continuous service. It does not apply to all employees.', 'https://www.indiacode.nic.in/'), U('State Shops and Establishments Acts', 'Varies by State', 'State statute', 'Many States prescribe notice for termination of employees in establishments.', 'https://www.indiacode.nic.in/')], why: 'Notice periods for most office roles in India are set by contract, with statutory protection depending on whether the employee is a “workman” and on State law.', verify: ['Whether the employee is a “workman”.', 'The applicable State Act.'] },
      us: { concept: 'At-will employment and WARN', strength: 'Moderate', sources: [U('Worker Adjustment and Retraining Notification Act', '29 U.S.C. §2101 et seq.', 'Federal statute', 'Requires 60 days’ notice for qualifying mass layoffs and plant closings, but not for individual terminations.', 'https://www.law.cornell.edu/uscode/text/29/2101')], why: 'Most US employment is at-will, so notice is a matter of contract. The 60-day figure arises under the WARN Act only for qualifying mass layoffs, not individual terminations.', verify: ['Whether the employer meets WARN size thresholds.', 'State mini-WARN laws.'] }
    },
    'emp:12.1': {
      concept: 'Governing law and statutory rights',
      uk: { concept: 'Contracting out of statutory rights', strength: 'Strong', sources: [U('Employment Rights Act 1996 — section 203', 'ERA 1996, s.203', 'Statute', 'Any provision purporting to exclude or limit the operation of the Act is void, subject to limited exceptions.', 'https://www.legislation.gov.uk/ukpga/1996/18/section/203')], why: 'Choosing English law is consistent with the employee’s UK work location. Statutory rights apply regardless of what the contract says.', verify: ['Whether any term tries to waive a statutory right.'] },
      in: { concept: 'Choice of law and public policy', strength: 'Limited', sources: [U('Indian Contract Act, 1872 — sections 23 and 28', 'Act 9 of 1872, ss.23, 28', 'Statute', 'Agreements with unlawful objects, or restricting legal proceedings, may be void.', 'https://www.indiacode.nic.in/')], why: 'An Indian court may consider whether a foreign governing-law and exclusive-jurisdiction clause offends public policy.', verify: ['Where the employee is actually based.'] },
      us: { concept: 'Choice-of-law clauses', strength: 'Limited', sources: [U('Restatement (Second) of Conflict of Laws §187', 'Restatement (Second)', 'Secondary source', 'A chosen law is generally honoured unless it conflicts with a fundamental policy of a State with a materially greater interest.', '')], why: 'US courts typically respect a chosen law unless it undermines a fundamental policy of the employee’s home State.', verify: ['The State in which the employee works.'] }
    },
    'nda:4.1': {
      concept: 'Confidentiality term and trade secrets',
      us: { concept: 'Trade secrets under Delaware and federal law', strength: 'Moderate', sources: [U('Delaware Uniform Trade Secrets Act', '6 Del. C. §2001 et seq.', 'State statute', 'Protects trade secrets independent of contract. A fixed contractual term does not necessarily end statutory protection while the information remains secret.', ''), U('Defend Trade Secrets Act of 2016', '18 U.S.C. §1836', 'Federal statute', 'Federal civil claim for misappropriation of trade secrets.', 'https://www.law.cornell.edu/uscode/text/18/1836')], why: 'A three-year NDA term may end the contractual duty while trade-secret law continues to protect information that is still secret.', verify: ['Whether any information should be treated as a trade secret.'] },
      uk: { unavailable: true }, in: { unavailable: true }
    },
    'lease:1.1': {
      concept: 'Leave and licence structure',
      in: { concept: 'Registration of leases and licences', strength: 'Limited', sources: [U('Registration Act, 1908 — section 17', 'Act 16 of 1908, s.17', 'Statute', 'Leases of immovable property for more than one year must be registered; shorter leave-and-licence arrangements are commonly structured to fall outside this.', 'https://www.indiacode.nic.in/'), U('Maharashtra Rent Control Act, 1999', 'Mah. Act XVIII of 1999', 'State statute', 'Rent-control provisions apply to tenancies; a genuine licence is generally outside its scope.', 'https://www.indiacode.nic.in/')], why: 'Eleven-month terms are a common way to structure a licence rather than a lease. Whether a court treats the arrangement as a licence depends on substance, not label.', verify: ['Whether the licensee has exclusive possession.', 'Applicable stamp duty and registration requirements in Maharashtra.'] },
      uk: { unavailable: true }, us: { unavailable: true }
    },
    'msa:9.1': {
      concept: 'Limitation of liability',
      uk: { concept: 'Reasonableness of liability caps', strength: 'Moderate', sources: [U('Unfair Contract Terms Act 1977 — sections 2, 3 and 11', 'UCTA 1977, ss.2, 3, 11', 'Statute', 'Limits on liability in business contracts are subject to a requirement of reasonableness in many circumstances.', 'https://www.legislation.gov.uk/ukpga/1977/50/contents')], why: 'A cap tied to fees paid is common in commercial contracts; whether it is reasonable depends on bargaining position and insurance availability.', verify: ['Whether any liabilities are carved out of the cap.'] },
      in: { unavailable: true }, us: { unavailable: true }
    }
  };
  D.lawConcept = function (docId, ref, jur) {
    var e = D.law[docId + ':' + ref]; if (!e) return null;
    return e[jur] || { unavailable: true };
  };

  /* ======================= NOTIFICATIONS ======================= */
  D.notifs = [
    { kind: 'warn', icon: 'alert', title: 'Review required', text: 'Consultancy_Agreement_Draft.docx contains sensitive data. Legal AI access is on hold.', at: ago(95), go: 'documents?f=review', read: false },
    { kind: 'ok', icon: 'shield-check', title: 'Document verified', text: 'Employment_Contract.pdf passed the security gateway.', at: ago(150), go: 'analyze/emp', read: false },
    { kind: 'risk', icon: 'compare', title: 'Potential contradiction detected', text: 'Notice period: 30 days vs 60 days across two documents.', at: ago(160), go: 'compare?a=emp&b=pol&f=f1', read: false },
    { kind: 'risk', icon: 'lock', title: 'File blocked', text: 'Settlement_Draft_v3.pdf was quarantined by the security gateway.', at: ago(3 * DAY), go: 'security', read: true }
  ];

  /* ======================= ACTIVITY ======================= */
  D.activity = function () {
    var ev = [
      { t: ago(12), type: 'report', title: 'Report exported', obj: 'Contradiction report · Employment_Contract.pdf vs Company_Policy.pdf', doc: 'emp', go: 'reports?type=contra', who: 'You', meta: 'PDF · 3 pages' },
      { t: ago(38), type: 'legal', title: 'Legal context researched', obj: '§11.2 Notice of termination · United Kingdom', doc: 'emp', go: 'law?doc=emp&c=11.2', who: 'JURISAI', meta: '1 source · review required' },
      { t: ago(62), type: 'contradiction', title: 'Contradiction detected', obj: 'Notice period: 30 days vs 60 days', doc: 'emp', go: 'compare?a=emp&b=pol&f=f1', who: 'JURISAI', meta: 'Potential contradiction · high' },
      { t: ago(70), type: 'analysis', title: 'Comparison completed', obj: 'Employment_Contract.pdf vs Company_Policy.pdf · 5 differences', doc: 'emp', go: 'compare?a=emp&b=pol', who: 'JURISAI', meta: '2 contradictions · 1 inconsistency · 1 update · 1 legitimate' },
      { t: ago(95), type: 'review', title: 'Review required', obj: 'Consultancy_Agreement_Draft.docx · sensitive data found', doc: 'cons', go: 'documents?f=review', who: 'Security gateway', meta: '3 identifiers · pp. 9–10' },
      { t: ago(110), type: 'analysis', title: 'Analysis completed', obj: 'Company_Policy.pdf', doc: 'pol', go: 'analyze/pol', who: 'JURISAI', meta: '34 pages · 5 clauses mapped' },
      { t: ago(118), type: 'analysis', title: 'Analysis started', obj: 'Company_Policy.pdf', doc: 'pol', go: 'analyze/pol', who: 'JURISAI', meta: '' },
      { t: ago(132), type: 'verify', title: 'Document verified', obj: 'Employment_Contract.pdf', doc: 'emp', go: 'analyze/emp', who: 'Security gateway', meta: 'sha256 a91f3c07…d24e' },
      { t: ago(134), type: 'scan', title: 'Security scan completed', obj: 'Employment_Contract.pdf', doc: 'emp', go: 'documents', who: 'Security gateway', meta: '4 of 4 checks passed' },
      { t: ago(136), type: 'upload', title: 'Document uploaded', obj: 'Employment_Contract.pdf · 2.4 MB', doc: 'emp', go: 'documents', who: 'You', meta: '' },
      { t: ago(1 * DAY + 40), type: 'scan', title: 'Security scan completed', obj: 'Consultancy_Agreement_Draft.docx', doc: 'cons', go: 'documents?f=review', who: 'Security gateway', meta: '3 of 4 checks passed · 1 flagged' },
      { t: ago(1 * DAY + 42), type: 'upload', title: 'Document uploaded', obj: 'Consultancy_Agreement_Draft.docx · 318 KB', doc: 'cons', go: 'documents', who: 'You', meta: '' },
      { t: ago(3 * DAY + 14), type: 'block', title: 'File blocked', obj: 'Settlement_Draft_v3.pdf · embedded script', doc: 'sett', go: 'security', who: 'Security gateway', meta: 'Quarantined · never opened by AI' },
      { t: ago(3 * DAY + 15), type: 'upload', title: 'Document uploaded', obj: 'Settlement_Draft_v3.pdf · 1.1 MB', doc: 'sett', go: 'documents', who: 'You', meta: '' },
      { t: ago(6 * DAY), type: 'verify', title: 'Document verified', obj: 'NDA_Meridian_Partners.pdf', doc: 'nda', go: 'analyze/nda', who: 'Security gateway', meta: 'sha256 c4408e5a…09b1' },
      { t: ago(6 * DAY + 3), type: 'analysis', title: 'Analysis completed', obj: 'NDA_Meridian_Partners.pdf', doc: 'nda', go: 'analyze/nda', who: 'JURISAI', meta: '4 clauses mapped' },
      { t: ago(9 * DAY), type: 'verify', title: 'Document verified', obj: 'Lease_Agreement_Unit_4B.pdf', doc: 'lease', go: 'documents', who: 'Security gateway', meta: 'sha256 90c15ae2…7d63' },
      { t: ago(12 * DAY), type: 'verify', title: 'Document verified', obj: 'Vendor_MSA_2024.pdf', doc: 'msa', go: 'documents', who: 'Security gateway', meta: 'sha256 e16b44d0…a2f9' },
      { t: ago(12 * DAY - 6), type: 'analysis', title: 'Analysis failed', obj: 'Vendor_MSA_2024.pdf · text layer unreadable', doc: 'msa', go: 'analyze/msa', who: 'JURISAI', meta: 'ANL-502' }
    ];
    (D.userEvents || []).forEach(function (e) { ev.unshift(e); });
    return ev.sort(function (a, b) { return b.t - a.t; });
  };
  D.userEvents = [];
  D.addEvent = function (e) { e.t = new Date(); D.userEvents.unshift(e); };

  /* ======================= RESEARCH HISTORY ======================= */
  D.threads = [
    { id: 'q1', title: 'Does the termination clause conflict with the company policy?', at: ago(45) },
    { id: 'q2', title: 'What happens to my confidentiality obligations after I leave?', at: ago(2 * DAY) },
    { id: 'q3', title: 'Is the non-compete likely to be enforceable?', at: ago(2 * DAY + 20) },
    { id: 'q4', title: 'What is my salary and when is it reviewed?', at: ago(6 * DAY) }
  ];

  /* ======================= TRANSLATIONS (explanations & summaries only) ======================= */
  D.tr = {
    hi: {
      'emp.summary': 'Northwind Analytics Ltd और Daniel Okafor के बीच वरिष्ठ डेटा विश्लेषक के पद के लिए पूर्णकालिक रोज़गार अनुबंध, जो 3 मार्च 2025 से शुरू होता है और £62,000 वार्षिक वेतन तय करता है। इसमें छह महीने की परिवीक्षा, 30 दिन का नोटिस, बिना समय-सीमा वाला गोपनीयता दायित्व और नौकरी समाप्त होने के बाद लागू प्रतिबंध शामिल हैं।',
      'emp.2.2': 'आपके पहले छह महीने परीक्षण अवधि हैं। कंपनी लिखित सूचना देकर इसे एक बार, अधिकतम तीन महीने के लिए बढ़ा सकती है।',
      'emp.3.2': 'आपका सामान्य कार्यस्थल लंदन कार्यालय है, और जब तक कंपनी लिखित रूप से अन्यथा सहमत न हो, आपको सप्ताह में कम से कम तीन दिन वहाँ उपस्थित रहना होगा।',
      'emp.5.2': 'आपको हर साल 25 कार्य-दिवस का सवेतन अवकाश मिलता है, इसके अलावा इंग्लैंड और वेल्स की सार्वजनिक छुट्टियाँ भी।',
      'emp.6.1': 'आपको कंपनी की गैर-सार्वजनिक जानकारी गोपनीय रखनी होगी — नौकरी के दौरान और उसके बाद भी, बिना किसी समाप्ति तिथि के। अपवाद केवल आपके काम के लिए आवश्यक उपयोग और क़ानून द्वारा अपेक्षित खुलासे हैं।',
      'emp.9.1': 'नौकरी छोड़ने के बाद छह महीने तक, कंपनी की लिखित सहमति के बिना आप लंदन कार्यालय से 25 मील के भीतर किसी प्रतिस्पर्धी के लिए काम नहीं कर सकते।',
      'emp.10.1': 'नोटिस दिए जाने के बाद कंपनी आपको वेतन देते हुए अधिकतम 12 सप्ताह तक घर पर रहने के लिए कह सकती है (“गार्डन लीव”)।',
      'emp.11.2': 'आप या कंपनी, दोनों में से कोई भी 30 दिन का लिखित नोटिस देकर नौकरी समाप्त कर सकता है। कंपनी चाहे तो उन 30 दिनों का वेतन देकर आपको तुरंत मुक्त कर सकती है। नौकरी जैसे भी समाप्त हो, खंड 9 में आपके द्वारा किए गए कुछ वादे फिर भी लागू रहते हैं।',
      'emp.12.1': 'इस अनुबंध पर अंग्रेज़ी क़ानून लागू होता है, और विवाद इंग्लैंड और वेल्स की अदालतों में जाएँगे।',
      'f1.why': 'आप पर बकाया — या आपको देय — नोटिस अवधि में 30 दिन का अंतर हो सकता है, जिससे वेतन, शुरुआत की तारीख़ें और बीच की अवधि के दायित्व प्रभावित होते हैं।',
      'q1.answer': 'एक बिंदु पर संभवतः हाँ। रोज़गार अनुबंध की धारा 11.2 में 30 दिन का नोटिस है, जबकि कंपनी नीति की धारा 4.3 में 60 दिन। किसी भी दस्तावेज़ में यह नहीं लिखा कि कौन प्रभावी होगा, इसलिए JURISAI इसे निश्चित विरोधाभास नहीं, बल्कि संभावित विरोधाभास के रूप में चिह्नित करता है।',
      'pol.summary': 'Northwind की कर्मचारी पुस्तिका, संस्करण 4.2 (1 सितंबर 2025 से प्रभावी)। यह तभी अनुबंध का हिस्सा बनती है जब कर्मचारी की लिखित शर्तों में इसे स्पष्ट रूप से शामिल किया गया हो।'
    },
    es: {
      'emp.summary': 'Contrato de trabajo a tiempo completo entre Northwind Analytics Ltd y Daniel Okafor como analista sénior de datos, con inicio el 3 de marzo de 2025 y un salario de £62.000 anuales. Incluye seis meses de prueba, preaviso de 30 días, un deber de confidencialidad sin límite de tiempo y restricciones posteriores a la terminación.',
      'emp.2.2': 'Los primeros seis meses son un periodo de prueba. La empresa puede ampliarlo una vez, hasta tres meses, avisando por escrito.',
      'emp.3.2': 'Su lugar de trabajo habitual es la oficina de Londres y debe acudir al menos tres días por semana, salvo acuerdo escrito en contrario.',
      'emp.5.2': 'Tiene 25 días laborables de vacaciones pagadas al año, además de los festivos de Inglaterra y Gales.',
      'emp.6.1': 'Debe mantener en secreto la información no pública de la empresa, durante el empleo y después, sin fecha de fin. Las únicas excepciones son su trabajo y las revelaciones exigidas por ley.',
      'emp.9.1': 'Durante seis meses tras su salida, no puede trabajar para un competidor a menos de 25 millas de la oficina de Londres sin el consentimiento escrito de la empresa.',
      'emp.10.1': 'Tras el preaviso, la empresa puede pedirle que no acuda al trabajo hasta 12 semanas (“garden leave”) manteniendo su salario.',
      'emp.11.2': 'Tanto usted como la empresa pueden terminar el empleo con un preaviso escrito de 30 días. La empresa puede optar por pagarle esos 30 días y dejarle ir de inmediato. De cualquier forma, ciertas promesas de la cláusula 9 siguen vigentes.',
      'emp.12.1': 'Este contrato se rige por la ley inglesa y las disputas se resuelven en los tribunales de Inglaterra y Gales.',
      'f1.why': 'El preaviso que usted debe —o se le debe— puede diferir en 30 días, lo que afecta al salario, a las fechas de inicio y a las obligaciones durante ese intervalo.',
      'q1.answer': 'Posiblemente, en un punto. La cláusula 11.2 del contrato de trabajo fija un preaviso de 30 días y la cláusula 4.3 de la política de la empresa fija 60. Ningún documento indica cuál prevalece, por lo que JURISAI lo señala como una posible contradicción y no como una contradicción definitiva.',
      'pol.summary': 'Manual del empleado de Northwind, versión 4.2 (vigente desde el 1 de septiembre de 2025). Solo forma parte del contrato cuando se incorpora expresamente a las condiciones escritas del empleado.'
    }
  };

  /* ======================= HELP CENTER ======================= */
  D.helpCats = [
    ['gs', 'Getting Started', 'play'], ['up', 'Uploading Documents', 'upload'], ['sec', 'Security Scanning', 'shield-check'], ['an', 'Document Analysis', 'analyze'], ['co', 'Contradictions', 'compare'],
    ['lc', 'Legal Context', 'scales'], ['rs', 'AI Research', 'sparkle'], ['tv', 'Translation & Voice', 'translate'], ['rp', 'Reports', 'file'], ['ac', 'Account & Security', 'key']
  ];
  var H = function (id, cat, title, paras, bullets) { return { id: id, cat: cat, title: title, paras: paras, bullets: bullets || [], text: paras.join(' ') + ' ' + (bullets || []).join(' ') }; };
  D.help = [
    H('gs1', 'gs', 'What is JURISAI and how does it work?', ['JURISAI is a security-first legal intelligence workspace. Every document passes a security gateway before any AI reads it. Verified documents can then be analysed, compared, connected to relevant law and queried with grounded questions.', 'The workflow is: upload, secure, understand, compare, verify and ask. Each stage records what it did so the result can be audited.'], ['Upload and secure documents', 'Understand clauses in plain language', 'Compare documents for contradictions', 'Connect clauses to law in your jurisdiction', 'Ask questions with traceable sources']),
    H('gs2', 'gs', 'Your first five minutes', ['Choose your use case and a default jurisdiction, then upload a first document. JURISAI scans it, and once it is verified you can open its analysis straight away.', 'You can replay the welcome tour any time from your profile menu.'], ['Pick a jurisdiction in the top bar', 'Upload from Documents → Upload Document', 'Open Analyze to read your first clause explanation']),
    H('up1', 'up', 'Which files can I upload?', ['JURISAI accepts PDF, DOCX, TXT and scanned images (PNG, JPG, TIFF) up to 50 MB each. Scanned documents are read with OCR after they pass the security gateway.', 'Executables, scripts and archive formats are never accepted.']),
    H('up2', 'up', 'Uploading a folder', ['Use Upload Folder to add a whole matter at once. Each file passes the gateway individually, so one failing file never blocks the rest.']),
    H('sec1', 'sec', 'How does JURISAI protect my documents?', ['Every file is isolated on arrival and never opened by an AI component until it passes the security gateway. The gateway runs four checks: integrity, threat screening, sensitive-data inspection and document verification.', 'Documents are encrypted in transit and at rest, and every security decision is recorded in your audit log. Only verified documents reach Legal AI.'], ['Isolated intake before analysis', 'Integrity hash recorded for each file', 'Threat and prompt-injection screening', 'Sensitive-data inspection with masking', 'Audit trail for every decision']),
    H('sec2', 'sec', 'What happens when a document fails security scanning?', ['A failing file is quarantined. It is not opened by any AI component, it cannot be analysed, and it stays visible in your library with a Blocked status.', 'You can download the scan report to see exactly which check failed, request a manual review, or upload a clean copy from the original source.'], ['Blocked: threat found. File is quarantined', 'Review required: sensitive data found. You decide whether to redact or release', 'Corrupted or unsupported: nothing is analysed; upload a new copy']),
    H('sec3', 'sec', 'Why was my document marked Review Required?', ['Review Required means the file is safe to open but contains personal or financial identifiers such as bank accounts or national ID numbers. Legal AI stays locked until you choose to redact the items or release the document with acknowledgement.']),
    H('an1', 'an', 'How document analysis works', ['After verification JURISAI extracts the document structure, identifies clauses, builds a document map and prepares explanations. The original text is always shown beside the analysis.', 'Analysis is AI-assisted. Each explanation shows its source so you can check it against the clause.']),
    H('an2', 'an', 'Reading citations and source references', ['Numbered citations link to the exact clause and page. Selecting one scrolls the document viewer to that clause and highlights it.']),
    H('co1', 'co', 'How does contradiction detection work?', ['JURISAI matches related clauses across documents, compares the obligations they create, and flags differences. Each finding shows both sources side by side, what conflicts, why it may matter and what needs review.', 'It does not decide which document prevails. That can depend on precedence clauses, dates and applicable law, so findings are flagged for qualified review.']),
    H('co2', 'co', 'Contradiction, inconsistency, update or legitimate change?', ['Not every difference is a contradiction. JURISAI separates four kinds so that you spend your time on what matters.'], ['Potential contradiction: both statements cannot apply as written', 'Inconsistency: described differently but may still both hold', 'Document update: a later document appears to replace an earlier one', 'Legitimate change: explained by role, context or an express carve-out']),
    H('lc1', 'lc', 'How does jurisdiction selection work?', ['Choose United Kingdom, India or United States in the top bar. JURISAI then maps each clause to legal concepts and sources relevant to that jurisdiction. Changing it updates Legal Context, Research and Reports.', 'Where JURISAI does not have verified sources for a concept in a jurisdiction, it says so instead of guessing.']),
    H('lc2', 'lc', 'Can JURISAI provide legal advice?', ['No. JURISAI provides AI-assisted legal research and document analysis. It does not provide legal advice, and its output is not a substitute for a qualified lawyer.', 'Every legal-context result is labelled AI-assisted research, shows its sources and is marked Review Required. Always verify sources before relying on them.']),
    H('rs1', 'rs', 'How are research answers grounded?', ['Every answer separates what the documents say from what the law says and from what JURISAI infers. Labels make the difference visible: Document evidence, Legal source, AI explanation, Inference and Review required.', 'If the documents do not contain enough evidence, JURISAI says so instead of guessing.'], ['Document evidence: quoted from your files', 'Legal source: a named statute, rule or case', 'AI explanation: plain-language reading', 'Inference: a reasoned step that is not stated', 'Review required: needs a qualified person']),
    H('tv1', 'tv', 'Translation and Listen', ['Choose a language in the top bar to translate explanations, summaries and reports. Original clause text stays in its source language because translations of legal text can change meaning.', 'Use Listen on any explanation, answer or report to hear it read aloud.']),
    H('tv2', 'tv', 'Using voice input', ['Select the microphone in a search or question field and speak your question. Your browser may ask for microphone permission. You can turn voice input off in Settings.']),
    H('rp1', 'rp', 'Exporting reports', ['Reports can be generated as a Summary, Detailed Analysis, Contradiction Report or Legal Context Report. Each includes JURISAI branding, security status, jurisdiction, timestamp, findings, sources and a disclaimer. Export as PDF from the report preview.']),
    H('ac1', 'ac', 'Two-factor authentication and sessions', ['Turn on two-factor authentication in Settings → Security. You can review active sessions and sign out of any of them.']),
    H('ac2', 'ac', 'Document retention and deletion', ['By default documents are kept for 12 months. In Settings → Documents & Privacy you can shorten retention or turn on auto-delete after analysis.'])
  ];

  /* ======================= FAKE FILE EVALUATION (intake) ======================= */
  D.evaluateFile = function (name, size) {
    var n = name.toLowerCase(), ext = (n.split('.').pop() || '');
    if (['exe', 'bat', 'msi', 'dll', 'zip', 'rar', '7z', 'js', 'sh', 'app', 'dmg'].indexOf(ext) >= 0) return 'unsupported';
    if (/corrupt|damaged|broken/.test(n)) return 'corrupt';
    if (/virus|malware|eicar|macro|exploit|inject/.test(n)) return 'blocked';
    if (/ssn|passport|aadhaar|bank|payroll|medical|confidential_personal|sensitive/.test(n)) return 'review';
    return 'verified';
  };
})();
