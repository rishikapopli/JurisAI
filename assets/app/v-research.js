/* JURISAI RESEARCH — structured, grounded research memos (not a chat transcript) */
(function () {
  'use strict';
  var J = window.J, D = J.data, esc = J.esc, I = J.icon, A = J.actions, $ = J.$, $$ = J.$$;
  var R = J.state.rs = { turns: [], scope: ['emp', 'pol', 'nda'], law: true, panel: null, simple: {}, seq: 0 };

  /* ---------- memo library (answers are composed from verified sources) ---------- */
  var M = {
    q1: { docs: ['emp', 'pol'], q: 'Does the termination clause conflict with the company policy?',
      answer: [
        { t: '**Potentially, yes — on notice length.** The Employment Contract sets 30 days’ written notice {1}, while the Company Policy requires 60 days {2}. Neither document says which prevails, so JURISAI flags this as a *potential* contradiction rather than a definite one.', tr: 'q1.answer' },
        { t: 'The Policy says it forms part of a contract only where expressly incorporated {3}, and the contract’s entire-agreement clause supersedes *prior* agreements {4}. Nothing in the contract mentions the Handbook, which points towards the contract’s 30 days.', inf: true }],
      simple: 'Your contract says 30 days. The handbook says 60 days. They disagree, and nothing says which one wins. The handbook may not even be part of your contract. Ask HR to confirm in writing which period applies.',
      src: { 'emp:11.2': 'Sets 30 days’ written notice for either party, with pay in lieu at the Company’s option.', 'pol:4.3': 'States 60 days’ notice before termination.', 'pol:1.2': 'The Handbook is guidance unless expressly incorporated into the written terms.', 'emp:12.2': 'Entire-agreement clause supersedes prior agreements. Handbook v4.2 post-dates the contract.' },
      law: [['emp', '11.2']], related: { title: 'Post-employment restriction: 6 months vs 12 months', text: 'The contract’s Restricted Period runs six months from the Termination Date, but the Handbook mentions twelve months for senior roles. The notice dispute also changes when that period starts.', go: 'compare?a=emp&b=pol&f=f2' },
      cmp: 'f1', lawGo: 'law?doc=emp&c=11.2', ground: { level: 'High', n: 5, of: 6, inf: 1 }, follow: ['Is the Handbook part of my contract?', 'What happens to my restrictions if I give 30 days’ notice?'] },
    q2: { docs: ['emp'], q: 'What happens to my confidentiality obligations after I leave?',
      answer: [{ t: '**They continue.** The duty to keep the company’s non-public information secret applies during employment “or at any time afterwards” and “continues without limit in time” {1}. The exceptions are doing your job and disclosures required by law, and protected whistleblowing {2}.' },
        { t: 'A serious breach of the confidentiality clause is also named as gross misconduct while you are employed, which allows dismissal without notice {3}.' },
        { t: 'A court may treat an unlimited duty as reasonable only for genuine trade secrets, not for general skill and knowledge you gain in the job.', inf: true }],
      simple: 'You can never share the company’s private information, even after you leave. You can still do your job, obey the law, and report wrongdoing through proper channels. General skills you learned are yours to keep.',
      src: { 'emp:6.1': 'No end date on the confidentiality duty.', 'emp:6.2': 'Whistleblowing carve-out.', 'emp:11.3': 'Names serious breach of clause 6 as gross misconduct.' },
      law: [['emp', '6.1']], related: { title: 'Meridian NDA expires after 3 years', text: 'The Meridian NDA obligations survive three years, while your duty has no end date. It is unclear which applies to Meridian-sourced information later.', go: 'compare?a=emp&b=nda&f=f6' }, cmp: 'f6', lawGo: 'law?doc=emp&c=6.1', ground: { level: 'High', n: 4, of: 4, inf: 1 }, follow: ['Does it cover information that becomes public?', 'Who can I report wrongdoing to?'] },
    q3: { docs: ['emp', 'pol'], q: 'Is the non-compete likely to be enforceable?',
      answer: [{ t: '**JURISAI cannot predict enforceability.** It can show what the clause says and the legal tests that usually apply. The clause bars competing work within 25 miles for the six-month Restricted Period {1} {2}. The Handbook separately mentions twelve months for senior roles {3}.' },
        { t: 'A short period and limited area are factors that generally support reasonableness, but the outcome depends on your role, the information you held and the company’s legitimate interest.', inf: true }],
      simple: 'The contract stops you working for a competitor nearby for six months after you leave. Whether a court would enforce that depends on your job and what you knew. A lawyer should look at this.',
      src: { 'emp:9.1': 'Six months, 25-mile radius, written consent exception.', 'emp:1.2': 'Defines Restricted Period as six months after the Termination Date.', 'pol:6.2': 'Handbook refers to 12 months for senior roles.' },
      law: [['emp', '9.1']], related: { title: 'Conflicting restriction periods', text: 'Six months in the contract against twelve in the Handbook is flagged as a potential contradiction.', go: 'compare?a=emp&b=pol&f=f2' }, cmp: 'f2', lawGo: 'law?doc=emp&c=9.1', ground: { level: 'Moderate', n: 3, of: 4, inf: 1 }, follow: ['Does garden leave count towards the six months?', 'What does the Handbook mean by a senior role?'] },
    q4: { docs: ['emp'], q: 'What is my salary and when is it reviewed?',
      answer: [{ t: '**£62,000 gross per year, paid monthly in arrears** {1}. It is reviewed every April, but the Company has no obligation to award an increase {2}. A discretionary bonus of up to 10% of salary may be paid, subject to performance and the bonus rules {3}.' }],
      simple: 'You earn £62,000 a year before tax. Your pay is looked at every April, but a raise isn’t promised. You might get a bonus of up to 10% if the company decides to give one.',
      src: { 'emp:4.1': 'Gross annual salary, paid monthly in arrears.', 'emp:4.2': 'Annual April review; no obligation to increase.', 'emp:4.3': 'Discretionary bonus up to 10%.' },
      law: [], related: null, cmp: null, lawGo: null, ground: { level: 'High', n: 3, of: 3, inf: 0 }, follow: ['Where can I read the bonus rules?'] },
    q5: { docs: ['emp', 'pol'], q: 'How much holiday do I get?',
      answer: [{ t: '**25 working days plus public holidays** under the contract {1}, which is about 33 days in total. The Handbook states 28 days *including* public holidays {2}. These count leave on different bases, so JURISAI flags an *inconsistency*, not a conflict: the contract is more generous.' }],
      simple: 'Your contract gives 25 days off plus the public holidays. The handbook counts public holidays inside its 28 days. Your contract gives you more, so it is likely what applies.',
      src: { 'emp:5.2': '25 working days plus public holidays in England and Wales.', 'pol:5.1': '28 working days including public holidays.' },
      law: [['emp', '5.2']], related: null, cmp: 'f3', lawGo: 'law?doc=emp&c=5.2', ground: { level: 'High', n: 3, of: 3, inf: 0 }, follow: ['Does unused holiday carry over?'] }
  };
  function match(q) {
    q = q.toLowerCase();
    if (/holiday|vacation|days off|annual leave/.test(q)) return 'q5';
    if (/confiden|secret|\bnda\b|disclos/.test(q)) return 'q2';
    if (/compete|non-compete|restrict|enforce|solicit/.test(q)) return 'q3';
    if (/salary|pay\b|bonus|wage|paid/.test(q)) return 'q4';
    if (/notice|terminat|conflict|policy|contradict|60 day|30 day/.test(q)) return 'q1';
    return null;
  }

  /* ---------- rendering ---------- */
  function md(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<em>$1</em>'); }
  function sources(m) {
    var out = [], n = 0; Object.keys(m.src).forEach(function (ref) { out.push({ n: ++n, kind: 'd', ref: ref, key: 'd:' + ref }); });
    m.law.forEach(function (l) { var x = D.lawConcept(l[0], l[1], J.settings.jur); if (x && !x.unavailable && R.law) x.sources.forEach(function (s, i) { out.push({ n: ++n, kind: 'l', s: s, key: 'l:' + l[0] + ':' + l[1] + ':' + i, doc: l[0], c: l[1] }); }); });
    return out;
  }
  function cites(text, srcs) { return md(text).replace(/\{(\d+)\}/g, function (_, k) { var s = srcs.filter(function (x) { return x.n === +k; })[0]; return s ? '<button class="cite" data-act="rs-cite" data-s="' + s.key + '" title="Show source">' + k + '</button>' : ''; }); }
  function memoHTML(t) {
    var m = M[t.memo], srcs = sources(m), jn = J.jurName(J.settings.jur), docSrc = srcs.filter(function (x) { return x.kind === 'd'; });
    var A1 = m.answer.filter(function (p) { return J.settings.showInference !== false || !p.inf; }).map(function (p, i) {
      var tr = p.tr ? J.tr(p.tr, p.t) : null;
      var body = tr && tr.tr ? esc(tr.t) + ' ' + (p.t.match(/\{\d+\}/g) || []).map(function (c) { return cites(c, srcs); }).join('') : cites(p.t, srcs);
      return '<p class="ans">' + body + (p.inf ? ' ' + J.tag('inference') : '') + '</p>';
    }).join('');
    var xl = J.settings.lang !== 'en' ? '<div class="banner">' + I('translate') + '<div>Answer translated where available. Quoted evidence stays in the original language.</div></div>' : '';
    var simple = R.simple[t.id] ? '<div class="ms-simple"><div class="an-sec-h"><span class="k">In plain words</span>' + J.tag('ai') + '</div><p>' + esc(m.simple) + '</p></div>' : '';
    var ev = docSrc.map(function (s) {
      var i = J.refInfo(s.ref), q = i.para.text; if (q.length > 230) q = q.slice(0, 227) + '…';
      return '<li><button class="cite" data-act="rs-cite" data-s="' + s.key + '">' + s.n + '</button><div><div class="ev-h"><b>' + esc(i.doc.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ')) + '</b><span class="mono">' + i.label + '</span></div><blockquote class="q q-sm">' + esc(q) + '</blockquote><p class="ev-n">' + esc(m.src[s.ref]) + '</p></div></li>';
    }).join('');
    var lawH = '';
    if (!m.law.length) lawH = '<p class="muted">Not applicable — this question is answered entirely from the document.</p>';
    else if (!R.law) lawH = '<p class="muted">Legal sources are switched off for this research session. Turn them on in the scope panel to see the law that may apply.</p>';
    else lawH = m.law.map(function (l) {
      var x = D.lawConcept(l[0], l[1], J.settings.jur); if (!x || x.unavailable) return J.errorState('research', { acts: '<button class="btn btn-secondary btn-sm" data-act="law-switch">Choose another jurisdiction</button>' });
      return '<div class="law-m"><div class="law-m-h"><b>' + esc(x.concept) + '</b><span class="chip">' + jn + '</span></div><p>' + esc(x.why) + '</p><ul class="law-srcs">' + srcs.filter(function (s) { return s.kind === 'l' && s.doc === l[0] && s.c === l[1]; }).map(function (s) { return '<li><button class="cite" data-act="rs-cite" data-s="' + s.key + '">' + s.n + '</button><span><b>' + esc(s.s.name) + '</b><small class="mono">' + esc(s.s.cite) + '</small></span></li>'; }).join('') + '</ul><span class="stamp">' + I('scales', 'ico-xs') + 'AI-assisted legal research</span></div>';
    }).join('');
    var g = m.ground, segs = g.level === 'High' ? 5 : g.level === 'Moderate' ? 3 : 2;
    return '<article class="memo" data-speak id="memo-' + t.id + '"><header class="memo-q"><span class="k">Question</span><h2>' + esc(t.q) + '</h2><div class="memo-meta mono">' + docSrc.reduce(function (a, s) { var d = s.ref.split(':')[0]; return a.indexOf(d) < 0 ? a.concat(d) : a; }, []).length + ' documents · ' + jn + ' · ' + J.fmt.rel(t.at) + '</div></header>' + xl +
      '<section class="ms"><div class="ms-h"><span class="k">Answer</span>' + J.tag('ai') + '</div>' + A1 + simple + '</section>' +
      '<section class="ms"><div class="ms-h"><span class="k">Document evidence</span>' + J.tag('evidence') + '</div><ol class="ev">' + ev + '</ol></section>' +
      '<section class="ms"><div class="ms-h"><span class="k">Legal context</span>' + J.tag('law') + '</div>' + lawH + '</section>' +
      (m.related ? '<section class="ms"><div class="ms-h"><span class="k">Related issue</span>' + J.tag('inference') + '</div><div class="rel"><b>' + esc(m.related.title) + '</b><p>' + esc(m.related.text) + '</p><button class="linkbtn" data-go="' + m.related.go + '">Open comparison</button></div></section>' : '') +
      '<section class="ms ms-src"><div class="ms-h"><span class="k">Sources</span></div><ol class="srcl">' + srcs.map(function (s) { var d = s.kind === 'd'; return '<li><button class="cite" data-act="rs-cite" data-s="' + s.key + '">' + s.n + '</button><span>' + (d ? esc(J.refInfo(s.ref).full) : esc(s.s.name) + ' <small class="mono">' + esc(s.s.cite) + '</small>') + '</span><span class="chip ' + (d ? '' : 'chip-gold') + '">' + (d ? 'Document' : 'Legal source') + '</span></li>'; }).join('') + '</ol></section>' +
      '<footer class="memo-f"><div class="ground"><span class="k">Grounding</span><span class="gm">' + [1, 2, 3, 4, 5].map(function (i) { return '<i class="' + (i <= segs ? 'on' : '') + '"></i>'; }).join('') + '</span><b class="g-' + g.level.toLowerCase() + '">' + g.level + '</b><span class="mono">' + g.n + ' of ' + g.of + ' statements cited' + (g.inf ? ' · ' + g.inf + ' inference' : '') + '</span>' + J.tag('review') + '</div>' +
      '<div class="memo-a"><button class="btn btn-secondary btn-xs" data-act="rs-simple" data-t="' + t.id + '">' + I('sparkle', 'ico-sm') + (R.simple[t.id] ? 'Hide plain words' : 'Explain Simply') + '</button><button class="btn btn-secondary btn-xs" data-act="rs-first" data-t="' + t.id + '">' + I('file', 'ico-sm') + 'Show Source</button>' +
      (m.cmp ? '<button class="btn btn-secondary btn-xs" data-go="compare?a=emp&b=' + (m.cmp === 'f6' ? 'nda' : 'pol') + '&f=' + m.cmp + '">' + I('compare', 'ico-sm') + 'Compare Related Clauses</button>' : '') +
      (m.lawGo ? '<button class="btn btn-secondary btn-xs" data-go="' + m.lawGo + '">' + I('scales', 'ico-sm') + 'What Law May Apply?</button>' : '') +
      '<button class="btn btn-secondary btn-xs" data-act="translate-menu">' + I('translate', 'ico-sm') + 'Translate</button><button class="btn btn-secondary btn-xs" data-act="rs-listen" data-t="' + t.id + '">' + I('volume', 'ico-sm') + 'Listen</button></div></footer></article>' +
      '<div class="follow"><span class="k">Follow-up</span>' + m.follow.concat(m.related ? [] : []).map(function (f) { return '<button class="sugg" data-act="rs-ask" data-q="' + esc(f) + '">' + esc(f) + '</button>'; }).join('') + '</div>';
  }
  function insufficient(t) {
    var missing = t.missing;
    if (missing) return '<article class="memo"><header class="memo-q"><span class="k">Question</span><h2>' + esc(t.q) + '</h2></header>' + J.errorState('evidence', { text: 'This needs <b>' + missing.map(function (i) { return esc(D.docById(i).name); }).join(', ') + '</b>, which is outside the current scope. Add it to the scope to answer from the document itself.', acts: '<button class="btn btn-primary btn-sm" data-act="rs-addscope" data-docs="' + missing.join(',') + '" data-q="' + esc(t.q) + '">Add to scope and ask again</button>' }) + '</article>';
    return '<article class="memo"><header class="memo-q"><span class="k">Question</span><h2>' + esc(t.q) + '</h2></header>' + J.errorState('evidence', { acts: '<button class="btn btn-secondary btn-sm" data-act="rs-ask" data-q="Does the termination clause conflict with the company policy?">Try a question JURISAI can ground</button><button class="btn btn-secondary btn-sm" data-go="documents/intake">Add a document</button>' }) + '<div class="banner">' + I('info') + '<div>JURISAI answers only from your verified documents and named legal sources. When the evidence is not there, it tells you rather than guessing.</div></div></article>';
  }
  function turnHTML(t) {
    if (t.state === 'loading') return '<article class="memo"><header class="memo-q"><span class="k">Question</span><h2>' + esc(t.q) + '</h2></header><div id="rs-ls-' + t.id + '"></div></article>';
    if (t.state === 'network') return '<article class="memo"><header class="memo-q"><span class="k">Question</span><h2>' + esc(t.q) + '</h2></header>' + J.errorState('network') + '</article>';
    if (!t.memo || t.missing) return insufficient(t);
    return memoHTML(t);
  }
  function paintTurns() { var c = $('#rs-thread'); if (!c) return; c.innerHTML = R.turns.map(turnHTML).join('') || startHTML(); c.scrollTop = c.scrollHeight; if (R.turns.length === 1) c.scrollTop = 0; }
  function startHTML() {
    return '<div class="rs-start">' + J.empty({ icon: 'sparkle', title: 'Ask about your documents', text: 'Every answer separates what your documents say from what the law says and what JURISAI infers — and links each statement to its source.', actions: Object.keys(M).slice(0, 3).map(function (k) { return '<button class="sugg" data-act="rs-ask" data-q="' + esc(M[k].q) + '">' + esc(M[k].q) + '</button>'; }).join('') }) + '</div>';
  }

  /* ---------- panels ---------- */
  function threadsHTML() {
    return D.threads.map(function (t) { return '<button class="th' + (R.turns.length === 1 && R.turns[0].tid === t.id ? ' on' : '') + '" data-act="rs-thread" data-id="' + t.id + '"><span>' + esc(t.title) + '</span><small class="mono">' + J.fmt.rel(t.at) + '</small></button>'; }).join('');
  }
  function scopeHTML() {
    var el = D.docs.filter(function (d) { return d.sec === 'verified' && d.content && !d.archived; });
    return el.map(function (d) { return '<label class="check sc"><input type="checkbox" data-act="rs-scope" data-id="' + d.id + '"' + (R.scope.indexOf(d.id) >= 0 ? ' checked' : '') + '><span>' + esc(d.name) + '</span></label>'; }).join('');
  }
  function legend() {
    return '<div class="insp-h"><span class="k">How to read an answer</span></div><ul class="legend">' + [['evidence', 'Quoted from your verified documents.'], ['law', 'A named statute, rule or case, with a link to verify.'], ['ai', 'Plain-language reading by JURISAI.'], ['inference', 'A reasoned step the sources do not state outright.'], ['review', 'Needs a qualified person before anyone relies on it.']].map(function (x) { return '<li>' + J.tag(x[0]) + '<span>' + x[1] + '</span></li>'; }).join('') + '</ul><p class="field-hint">Select any numbered citation to inspect its source here.</p>';
  }
  function inspect(key) {
    var p = key.split(':'), body;
    if (p[0] === 'd') {
      var i = J.refInfo(p[1] + ':' + p[2]);
      body = '<div class="insp-h"><span class="k">Document evidence</span>' + J.tag('evidence') + '</div><h3>' + esc(i.doc.name) + '</h3><p class="mono">' + i.label + ' · ' + esc(i.clause.title) + '</p><blockquote class="q">' + esc(i.para.text) + '</blockquote>' +
        '<div class="insp-a"><button class="btn btn-primary btn-xs" data-act="cite" data-ref="' + p[1] + ':' + p[2] + '">' + I('file', 'ico-sm') + 'Open in document</button></div>';
    } else {
      var x = D.lawConcept(p[1], p[2], J.settings.jur), s = x.sources[+p[3]];
      body = '<div class="insp-h"><span class="k">Legal source</span>' + J.tag('law') + '</div><h3>' + esc(s.name) + '</h3><p class="mono">' + esc(s.cite) + '</p><div class="chips">' + J.chip('', s.type) + J.chip('chip-gold', J.jurName(J.settings.jur)) + '</div><p>' + esc(s.rel) + '</p>' +
        (s.url ? '<a class="linkbtn" href="' + esc(s.url) + '" target="_blank" rel="noopener">Verify at source ' + I('external', 'ico-xs') + '</a>' : '<p class="field-hint">No public link on file — check an authoritative legal database.</p>') +
        '<div class="banner banner-warn">' + I('flag') + '<div><b>Review required.</b> AI-assisted legal research is not legal advice.</div></div>';
    }
    return body;
  }
  function showPanel(html) {
    var pane = $('#rs-insp');
    if (window.innerWidth <= 1200) { J.ui.drawer({ kicker: 'Source inspector', title: 'Source', html: html }); return; }
    pane.innerHTML = html; pane.classList.add('has');
  }

  J.views.research = {
    title: 'AI Research', nav: 'research', fixed: true, crumbs: function () { return ['AI Research']; },
    render: function (r) {
      if (r.q.doc && D.docById(r.q.doc) && R.scope.indexOf(r.q.doc) < 0) R.scope.push(r.q.doc);
      return '<div class="rs"><aside class="rs-l"><button class="btn btn-secondary btn-sm btn-block" data-act="rs-new">' + I('plus', 'ico-sm') + 'New research</button><div class="k pane-k">Research threads</div><div class="ths" id="rs-ths">' + threadsHTML() + '</div>' +
        '<div class="k pane-k">Scope</div><div class="scope">' + scopeHTML() + '<label class="check sc"><input type="checkbox" id="rs-law" data-act="rs-lawtoggle"' + (R.law ? ' checked' : '') + '><span>Include legal sources</span></label><button class="jbtn" data-act="jur-menu">' + I('globe', 'ico-sm') + '<span>' + J.jurName(J.settings.jur) + '</span>' + I('chev-down', 'ico-xs') + '</button></div></aside>' +
        '<section class="rs-c"><header class="rs-h"><div><div class="kicker">Grounded research</div><h1>JURISAI <em>Research</em></h1></div><span class="chip chip-ok">' + I('shield-check', 'ico-xs') + 'Verified documents only</span></header>' +
        '<div class="rs-thread" id="rs-thread"></div>' +
        '<form class="rs-in" id="rs-form" autocomplete="off"><label class="sr-only" for="rs-q">Ask a question</label><textarea id="rs-q" rows="1" placeholder="Ask about your documents, a clause or the law…"></textarea><button type="button" class="icon-btn" data-act="rs-voice" id="rs-mic" aria-label="Voice input">' + I('mic') + '</button><button class="btn btn-primary btn-sm" type="submit" aria-label="Ask">' + I('send', 'ico-sm') + 'Ask</button></form></section>' +
        '<aside class="rs-r" id="rs-insp" aria-label="Source inspector">' + legend() + '</aside></div>';
    },
    mount: function (host, r) {
      var f = $('#rs-form'), q = $('#rs-q');
      f.addEventListener('submit', function (e) { e.preventDefault(); var v = q.value.trim(); if (v) { ask(v); q.value = ''; q.style.height = ''; } });
      q.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); f.requestSubmit(); } });
      q.addEventListener('input', function () { q.style.height = 'auto'; q.style.height = Math.min(q.scrollHeight, 120) + 'px'; });
      R.turns.forEach(function (t) { if (t.state === 'loading') t.state = 'done'; });
      if (r.q.q && R.handled !== location.hash) { R.handled = location.hash; R.turns = []; ask(r.q.q); }
      else if (r.q.t && R.handled !== location.hash) { R.handled = location.hash; loadThread(r.q.t); }
      else if (!R.turns.length) loadThread('q1'); else paintTurns();
      paintTurns();
    },
    leave: function () { R.handled = null; },
    showSource: function (ref) { var p = ref.split(':'); showPanel(inspect('d:' + p[0] + ':' + p[1])); }
  };

  function loadThread(id) {
    var t = D.threads.filter(function (x) { return x.id === id; })[0]; if (!t) return;
    var memo = t.memo || id; R.turns = [{ id: 't' + (++R.seq), tid: t.id, q: t.title, memo: memo, at: t.at, state: 'done' }];
    if ($('#rs-ths')) $('#rs-ths').innerHTML = threadsHTML(); paintTurns();
  }
  function ask(q) {
    var id = 't' + (++R.seq), memo = match(q), turn = { id: id, q: q, memo: memo, at: new Date(), state: 'loading' };
    R.turns = [turn];
    if (memo) { var miss = M[memo].docs.filter(function (d) { return R.scope.indexOf(d) < 0; }); if (miss.length) turn.missing = miss; }
    paintTurns();
    if (J.state.offline || !navigator.onLine) { turn.state = 'network'; paintTurns(); return; }
    var h = $('#rs-ls-' + id); if (!h) return;
    if (window.JurisAPI && window.JurisAPI.research) {
      J.runSteps(h, 'Legal research', ['Identifying legal concept…', 'Checking jurisdiction…', 'Finding relevant sources…', 'Assembling evidence…'], 450, function () {});
      JurisAPI.research.ask({ query: q, scope: R.scope, jurisdiction: J.settings.jur, include_law: R.law }).then(function (res) {
        turn.state = 'done';
        if (res && res.memo) {
          turn.memo = res.memo_id || ('bm_' + id);
          M[turn.memo] = res.memo;
        } else if (res && res.answer) {
          turn.memo = 'bm_' + id;
          M[turn.memo] = {
            docs: res.docs || R.scope,
            q: q,
            answer: Array.isArray(res.answer) ? res.answer : [{ t: res.answer }],
            simple: res.simple || 'Summary in plain words.',
            src: res.src || {},
            law: res.law || [],
            ground: res.ground || { level: 'High', n: 4, of: 4, inf: 0 },
            follow: res.follow || []
          };
        }
        if (turn.memo && !turn.missing) {
          if (!D.threads.some(function (x) { return x.title === q; })) D.threads.unshift({ id: 's' + id, title: q, at: new Date(), memo: turn.memo });
          var groundLevel = (M[turn.memo] && M[turn.memo].ground && M[turn.memo].ground.level) || 'High';
          D.addEvent({ type: 'legal', title: 'Research question answered', obj: q, go: 'research?q=' + encodeURIComponent(q), who: 'JURISAI', meta: 'Grounding ' + groundLevel });
        }
        if ($('#rs-ths')) $('#rs-ths').innerHTML = threadsHTML(); paintTurns();
      }).catch(function () {
        turn.state = 'done';
        if (memo && !turn.missing) {
          if (!D.threads.some(function (x) { return x.title === q; })) D.threads.unshift({ id: 's' + id, title: q, at: new Date(), memo: memo });
          D.addEvent({ type: 'legal', title: 'Research question answered', obj: q, go: 'research?q=' + encodeURIComponent(q), who: 'JURISAI', meta: 'Grounding ' + M[memo].ground.level });
        }
        if ($('#rs-ths')) $('#rs-ths').innerHTML = threadsHTML(); paintTurns();
      });
      return;
    }
    J.runSteps(h, 'Legal research', ['Identifying legal concept…', 'Checking jurisdiction…', 'Finding relevant sources…', 'Assembling evidence…'], 480, function () {
      turn.state = 'done';
      if (memo && !turn.missing) {
        if (!D.threads.some(function (x) { return x.title === q; })) D.threads.unshift({ id: 's' + id, title: q, at: new Date(), memo: memo });
        D.addEvent({ type: 'legal', title: 'Research question answered', obj: q, go: 'research?q=' + encodeURIComponent(q), who: 'JURISAI', meta: 'Grounding ' + M[memo].ground.level });
      }
      if ($('#rs-ths')) $('#rs-ths').innerHTML = threadsHTML(); paintTurns();
    });
  }

  A['rs-ask'] = function (el) { ask(el.dataset.q); };
  A['rs-new'] = function () { R.turns = []; R.panel = null; $('#rs-insp').innerHTML = legend(); $('#rs-insp').classList.remove('has'); paintTurns(); $('#rs-ths').innerHTML = threadsHTML(); $('#rs-q').focus(); };
  A['rs-thread'] = function (el) { loadThread(el.dataset.id); };
  A['rs-voice'] = function (el) { J.voice($('#rs-q'), el, function () { $('#rs-form').requestSubmit(); }); };
  A['rs-cite'] = function (el) { showPanel(inspect(el.dataset.s)); $$('.cite.on').forEach(function (c) { c.classList.remove('on'); }); $$('.cite[data-s="' + el.dataset.s + '"]').forEach(function (c) { c.classList.add('on'); }); };
  A['rs-simple'] = function (el) { R.simple[el.dataset.t] = !R.simple[el.dataset.t]; paintTurns(); };
  A['rs-first'] = function (el) { var t = R.turns[0], m = M[t.memo]; showPanel(inspect('d:' + Object.keys(m.src)[0])); };
  A['rs-listen'] = function (el) { var t = R.turns[0], m = M[t.memo]; var txt = m.answer.map(function (p) { return p.t.replace(/\{\d+\}/g, '').replace(/\*/g, ''); }).join(' '); if (J.settings.lang !== 'en') { var tr = J.tr(m.answer[0].tr || '', ''); if (tr.tr) txt = tr.t; } J.speak(txt, 'Research answer', el); };
  A['rs-scope'] = function (el) { var id = el.dataset.id, i = R.scope.indexOf(id); if (el.checked && i < 0) R.scope.push(id); if (!el.checked && i >= 0) R.scope.splice(i, 1); };
  A['rs-lawtoggle'] = function (el) { R.law = el.checked; paintTurns(); };
  A['rs-addscope'] = function (el) { el.dataset.docs.split(',').forEach(function (d) { if (R.scope.indexOf(d) < 0) R.scope.push(d); }); var q = el.dataset.q; J.render(true); ask(q); };
})();
