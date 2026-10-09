/* ANALYZE — document sections | original viewer | JURISAI analysis */
(function () {
  'use strict';
  var J = window.J, D = J.data, esc = J.esc, I = J.icon, A = J.actions, $ = J.$, $$ = J.$$;
  var S = J.state.an = { tab: 'overview', ref: null, zoom: 1, pane: 'doc' };
  var TABS = [['overview', 'Summary'], ['clauses', 'Key clauses'], ['dates', 'Dates'], ['obligations', 'Obligations'], ['issues', 'Issues'], ['terms', 'Definitions'], ['law', 'Governing law']];
  var cur = null;

  function val(v) { return v && v.iso ? J.fmt.date(v.iso) : esc(v); }
  function paraByRef(d, ref) { var f = null; d.content.clauses.forEach(function (c) { c.paras.forEach(function (p) { if (p.ref === ref) f = { c: c, p: p }; }); }); return f; }
  function markText(d, p) {
    var t = esc(p.text), m = d.content.marks && d.content.marks[p.ref] || [];
    m.forEach(function (x) { t = t.replace(esc(x[0]), '<mark class="term" title="' + esc(x[1]) + '">' + esc(x[0]) + '</mark>'); });
    return t;
  }
  function trExplain(d, ref, en) { return J.tr(d.id + '.' + ref, en); }

  /* ---------- left: sections ---------- */
  function sectionsHTML(d) {
    var issueRefs = {}; d.content.issues.forEach(function (i) { issueRefs[i.ref.split(':')[1]] = i.sev; });
    return '<div class="k pane-k">Document map</div><ol class="map">' + d.content.clauses.map(function (c) {
      var sev = null; c.paras.forEach(function (p) { if (issueRefs[p.ref]) sev = sev === 'high' ? sev : issueRefs[p.ref]; });
      return '<li><a href="#/analyze/' + d.id + '?ref=' + c.paras[0].ref + '" data-act="an-section" data-ref="' + c.paras[0].ref + '" class="' + (S.ref && S.ref.split('.')[0] === c.id ? 'on' : '') + '"><span class="mono">' + c.id + '</span><span class="map-t">' + esc(c.title) + '</span>' + (sev ? '<i class="sev sev-' + sev + '" title="Issue flagged"></i>' : '') + '<span class="mono map-p">p.' + c.page + '</span></a></li>';
    }).join('') + '</ol>';
  }
  /* ---------- centre: original document ---------- */
  function viewerHTML(d) {
    var pg = 0, out = '', fl = {};
    d.content.issues.forEach(function (i) { fl[i.ref.split(':')[1]] = i.sev; });
    var title = d.type.toUpperCase(), parties = (d.content.facts.filter(function (f) { return f[0] === 'Parties'; })[0] || [])[1];
    out += '<div class="paper-head"><span class="mono">' + esc(d.name) + '</span><h2>' + esc(title) + '</h2>' + (parties ? '<p>' + esc(parties) + '</p>' : '') + '</div>';
    d.content.clauses.forEach(function (c) {
      if (c.page !== pg) { pg = c.page; out += '<div class="pgbreak"><span>Page ' + pg + ' of ' + d.pages + '</span></div>'; }
      out += '<section class="cl" id="cl-' + c.id + '"><h3><span class="mono">' + c.id + '.</span> ' + esc(c.title) + '</h3>' +
        c.paras.map(function (p) { return '<p class="para' + (fl[p.ref] ? ' flag flag-' + fl[p.ref] : '') + '" id="p-' + p.ref + '" data-act="an-pick" data-ref="' + p.ref + '" tabindex="0"><span class="pn mono">' + p.ref + '</span>' + markText(d, p) + '</p>'; }).join('') + '</section>';
    });
    return out;
  }
  /* ---------- right: analysis ---------- */
  function tabsHTML(d) {
    var n = { clauses: d.content.clauses.reduce(function (a, c) { return a + c.paras.length; }, 0), dates: d.content.dates.length, obligations: d.content.obligations.length, issues: d.content.issues.length, terms: d.content.defs.length };
    return '<div class="tabs tabs-sc" role="tablist">' + TABS.map(function (t) { return '<button role="tab" class="' + (S.tab === t[0] && !S.ref ? 'on' : '') + '" data-act="an-tab" data-tab="' + t[0] + '">' + t[1] + (n[t[0]] != null ? ' <span class="n">' + n[t[0]] + '</span>' : '') + '</button>'; }).join('') + '</div>';
  }
  function xbanner(d) {
    if (J.settings.lang === 'en') return '';
    var l = D.langs.filter(function (x) { return x.id === J.settings.lang; })[0].label;
    return '<div class="banner">' + I('translate') + '<div><b>Explanations shown in ' + l + '.</b> Original clause text stays in its source language, since translating legal wording can change its meaning.</div></div>';
  }
  function overview(d) {
    var c = d.content, sm = J.tr(d.id + '.summary', c.summary);
    var tops = c.issues.slice(0, 2);
    return xbanner(d) + '<section class="an-sec"><div class="an-sec-h"><span class="k">Document summary</span>' + J.tag('ai') + '<button class="mini" data-act="listen" data-label="Document summary" data-text="' + esc(sm.t) + '" title="Listen">' + I('volume', 'ico-sm') + '</button></div>' +
      '<p class="summary">' + esc(sm.t) + '</p>' + (sm.miss ? '<p class="field-hint">Not yet translated — showing English.</p>' : '') + '</section>' +
      '<dl class="facts">' + c.facts.map(function (f) { return '<div><dt>' + f[0] + '</dt><dd>' + val(f[1]) + '</dd></div>'; }).join('') + '</dl>' +
      (tops.length ? '<section class="an-sec"><div class="an-sec-h"><span class="k">Needs attention</span>' + J.tag('review') + '</div>' + tops.map(issueRow).join('') + '</section>' : '<div class="banner banner-ok">' + I('check') + '<div><b>No issues flagged</b> in this document. Compare it with related documents to look for conflicts.</div></div>') +
      '<div class="an-next"><button class="btn btn-secondary btn-sm" data-go="compare?a=' + d.id + '">' + I('compare', 'ico-sm') + 'Compare</button><button class="btn btn-secondary btn-sm" data-go="law?doc=' + d.id + '">' + I('scales', 'ico-sm') + 'Legal context</button><button class="btn btn-secondary btn-sm" data-go="research?doc=' + d.id + '">' + I('sparkle', 'ico-sm') + 'Ask JURISAI</button></div>';
  }
  function issueRow(i) {
    return '<div class="issue"><i class="sev sev-' + i.sev + '"></i><div><b>' + esc(i.title) + '</b><p>' + esc(i.text) + '</p><div class="issue-a">' + J.citeLink(i.ref, 'Show in document') + (i.link ? '<button class="linkbtn" data-go="' + i.link + '">Open analysis</button>' : '') + '</div></div></div>';
  }
  function clausesTab(d) {
    return d.content.clauses.map(function (c) { return c.paras.map(function (p) { var n = d.content.notes[p.ref]; return '<button class="kc" data-act="an-pick" data-ref="' + p.ref + '"><span class="mono kc-n">§' + p.ref + '</span><span><b>' + esc(c.title) + '</b><small>' + esc(n ? n.gist : p.text.slice(0, 80)) + '</small></span>' + I('chev-right', 'ico-sm') + '</button>'; }).join(''); }).join('');
  }
  function datesTab(d) { return d.content.dates.map(function (x) { return '<div class="dt-row"><div class="dt-d">' + (x.iso ? J.fmt.date(x.iso) : esc(x.text)) + '</div><div><b>' + esc(x.label) + '</b>' + J.citeLink(x.ref) + '</div></div>'; }).join(''); }
  function oblTab(d) {
    var who = {}; d.content.obligations.forEach(function (o) { (who[o.who] = who[o.who] || []).push(o); });
    return Object.keys(who).map(function (k) { return '<div class="an-sec"><div class="an-sec-h"><span class="k">' + k + '</span></div>' + who[k].map(function (o) { return '<div class="ob"><span>' + esc(o.text) + '</span>' + J.citeLink(o.ref, '§' + o.ref.split(':')[1]) + '</div>'; }).join('') + '</div>'; }).join('');
  }
  function issuesTab(d) { return d.content.issues.length ? '<div class="banner">' + I('flag') + '<div>Issues are AI-assisted flags for human review, not conclusions.</div></div>' + d.content.issues.map(issueRow).join('') : J.empty({ icon: 'shield-check', title: 'No issues flagged', text: 'JURISAI did not find potential issues in this document on its own. Comparing it with related documents may surface more.' }); }
  function termsTab(d) { return d.content.defs.map(function (x) { return '<div class="def"><b>' + esc(x.t) + '</b><p>' + esc(x.d) + '</p>' + J.citeLink(x.ref, '§' + x.ref.split(':')[1]) + '</div>'; }).join(''); }
  function lawTab(d) {
    var l = d.content.law; return '<div class="an-sec"><div class="an-sec-h"><span class="k">Governing law</span>' + J.tag('evidence') + '</div><blockquote class="q">' + esc(l.text) + '</blockquote>' + J.citeLink(l.ref) + '</div>' +
      '<div class="banner">' + I('scales') + '<div><b>AI-assisted legal research.</b> See which statutes and cases may be relevant to this document in <a class="linkbtn" href="#/law?doc=' + d.id + '">Legal Context</a>. Not legal advice.</div></div>';
  }
  function clauseDetail(d, ref) {
    var f = paraByRef(d, ref), n = d.content.notes[ref] || {}, ex = trExplain(d, ref, n.explain || '');
    var info = J.refInfo(d.id + ':' + ref);
    return '<button class="back" data-act="an-back">' + I('chev-left', 'ico-sm') + 'Back to ' + TABS.filter(function (t) { return t[0] === S.tab; })[0][1].toLowerCase() + '</button>' + xbanner(d) +
      '<div class="cd-h"><span class="mono">§' + ref + '</span><h3>' + esc(f.c.title) + '</h3></div>' +
      '<section class="cd-s"><div class="an-sec-h"><span class="k">Original clause</span>' + J.tag('evidence') + '</div><blockquote class="q">' + esc(f.p.text) + '</blockquote><p class="srcline mono">' + esc(info.full) + '</p></section>' +
      '<section class="cd-s"><div class="an-sec-h"><span class="k">JURISAI explains</span>' + J.tag('ai') + '<button class="mini" data-act="listen" data-label="§' + ref + ' explanation" data-text="' + esc(ex.t) + '" title="Listen">' + I('volume', 'ico-sm') + '</button><button class="mini" data-act="translate-menu" title="Translate">' + I('translate', 'ico-sm') + '</button></div><p class="plain">' + esc(ex.t) + '</p>' + (ex.miss ? '<p class="field-hint">Not yet translated — showing English.</p>' : '') + '</section>' +
      (n.terms && n.terms.length ? '<section class="cd-s"><div class="an-sec-h"><span class="k">Legal terms</span></div><dl class="terms">' + n.terms.map(function (t) { return '<div><dt>' + esc(t.t) + '</dt><dd>' + esc(t.d) + '</dd></div>'; }).join('') + '</dl></section>' : '') +
      (n.means && n.means.length ? '<section class="cd-s"><div class="an-sec-h"><span class="k">What this means</span>' + J.tag('inference') + '</div><ul class="means">' + n.means.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul></section>' : '') +
      (n.questions && n.questions.length ? '<section class="cd-s"><div class="an-sec-h"><span class="k">Questions to consider</span></div>' + n.questions.map(function (q) { return '<button class="qbtn" data-go="research?doc=' + d.id + '&q=' + encodeURIComponent(q) + '">' + esc(q) + I('arrow-right', 'ico-sm') + '</button>'; }).join('') + '</section>' : '') +
      '<section class="cd-s"><div class="an-sec-h"><span class="k">Source</span></div><p class="srcline">' + esc(d.name) + ' · section ' + ref + ' · page ' + f.c.page + '</p><div class="issue-a"><button class="linkbtn" data-act="an-show" data-ref="' + ref + '">Show in document</button>' + (D.law[d.id + ':' + ref] ? '<button class="linkbtn" data-go="law?doc=' + d.id + '&c=' + ref + '">What law may apply?</button>' : '') + '</div></section>';
  }
  function rightHTML(d) {
    var body = S.ref ? clauseDetail(d, S.ref) : ({ overview: overview, clauses: clausesTab, dates: datesTab, obligations: oblTab, issues: issuesTab, terms: termsTab, law: lawTab }[S.tab])(d);
    return tabsHTML(d) + '<div class="an-body" id="an-body" data-speak data-cite-panel-off>' + body + '</div>';
  }

  /* ---------- states ---------- */
  function docPicker() {
    var list = D.docs.filter(function (d) { return !d.archived; });
    return '<header class="ph"><div><div class="kicker">Workspace</div><h1>Analyze a document</h1><p class="sub">Choose a verified document to open its analysis.</p></div></header><div class="pad"><table class="tbl"><tbody>' +
      list.map(function (d) { return '<tr class="row" data-go="analyze/' + d.id + '"><td><div class="nm">' + J.fileIc(d) + '<div><b>' + esc(d.name) + '</b><small>' + esc(d.type) + '</small></div></div></td><td>' + J.secChip(d.sec) + '</td><td>' + J.anChip(d) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }
  function head(d, extra) {
    return '<header class="an-head"><div class="an-title"><button class="doc-sw" data-act="an-switch" aria-label="Switch document"><h1>' + esc(d.name) + '</h1>' + I('chev-down', 'ico-sm') + '</button>' +
      '<div class="an-chips">' + J.secChip(d.sec) + '<span class="chip">' + I('globe', 'ico-xs') + J.jurName(d.jur) + '</span><span class="mono">' + d.pages + ' pages · ' + esc(d.size) + '</span></div></div>' +
      '<div class="an-actions">' + (extra || '') + '</div></header>';
  }
  function actions(d) {
    return '<button class="btn btn-secondary btn-xs" data-act="an-download">' + I('download', 'ico-sm') + 'Download</button>' +
      '<button class="btn btn-secondary btn-xs" data-act="translate-menu">' + I('translate', 'ico-sm') + 'Translate</button>' +
      '<button class="btn btn-secondary btn-xs" data-act="an-listen">' + I('volume', 'ico-sm') + 'Listen</button>' +
      '<button class="btn btn-secondary btn-xs" data-act="an-share">' + I('share', 'ico-sm') + 'Share</button>' +
      '<button class="btn btn-secondary btn-xs" data-act="an-more" aria-label="More">' + I('more', 'ico-sm') + 'More</button>';
  }

  J.views.analyze = {
    title: 'Analyze', fixed: true,
    crumbs: function (r) { var d = D.docById(r.arg); return d ? [['Analyze', '#/analyze'], d.name] : ['Analyze']; },
    render: function (r) {
      if (!r.arg) { var last = J.state.lastDoc || 'emp'; if (D.docById(last)) { setTimeout(function () { location.replace('#/analyze/' + last); }, 0); return ''; } return docPicker(); }
      var d = D.docById(r.arg); if (!d) return J.empty({ icon: 'file-x', title: 'Document not found', text: 'It may have been removed from your library.', actions: '<a class="btn btn-primary btn-sm" href="#/documents">Back to documents</a>' });
      if (cur !== d.id) { S.tab = 'overview'; S.ref = null; cur = d.id; }
      J.state.lastDoc = d.id;
      if (d.sec !== 'verified') {
        var msg = d.sec === 'review' ? '<div class="banner banner-warn">' + I('lock') + '<div><b>Legal AI is locked for this document.</b> It contains sensitive data waiting for your decision.</div></div><div class="res-a"><button class="btn btn-primary btn-sm" data-act="doc-open" data-id="' + d.id + '">Review findings</button></div>'
          : d.sec === 'blocked' ? J.errorState('scan', { doc: d.id }) : '<div class="banner">' + I('scan') + '<div><b>The security gateway is still scanning this file.</b> Analysis starts automatically once it is verified.</div></div>';
        return head(d) + '<div class="pad an-lock"><div class="gate-access locked">' + I('lock') + '<div><b>Legal AI access: LOCKED</b><small>Nothing enters Legal AI until it passes the security gate.</small></div></div>' + msg + J.checksHTML(d) + '</div>';
      }
      if (d.an === 'failed') return head(d) + '<div class="pad an-lock">' + J.errorState('analysis', { doc: d.id }) + '</div>';
      if (d.an === 'pending' || d.an === 'running') return head(d) + '<div class="pad an-lock"><div id="an-run"></div></div>';
      return head(d, actions(d)) +
        '<div class="an-mob"><button class="' + (S.pane === 'map' ? 'on' : '') + '" data-act="an-pane" data-p="map">Sections</button><button class="' + (S.pane === 'doc' ? 'on' : '') + '" data-act="an-pane" data-p="doc">Document</button><button class="' + (S.pane === 'ai' ? 'on' : '') + '" data-act="an-pane" data-p="ai">Analysis</button></div>' +
        '<div class="an-grid pane-' + S.pane + '"><nav class="an-map" id="an-map" aria-label="Document sections">' + sectionsHTML(d) + '</nav>' +
        '<div class="an-doc"><div class="doc-tools"><span class="mono">Original document · read-only</span><div><button class="mini" data-act="an-zoom" data-d="-0.08" aria-label="Smaller text">A−</button><button class="mini" data-act="an-zoom" data-d="0.08" aria-label="Larger text">A+</button></div></div><div class="paper-wrap" id="paper-wrap"><article class="paper" id="paper" style="font-size:' + (16 * S.zoom).toFixed(1) + 'px">' + viewerHTML(d) + '</article></div></div>' +
        '<aside class="an-ai" id="an-ai" aria-label="JURISAI analysis">' + rightHTML(d) + '</aside></div>';
    },
    mount: function (host, r) {
      var d = D.docById(r.arg); if (!d) return;
      if (d.sec === 'verified' && (d.an === 'pending' || d.an === 'running')) {
        d.an = 'running'; var h = $('#an-run');
        if (window.JurisAPI && window.JurisAPI.analysis) {
          J.runSteps(h, 'Document analysis', ['Extracting structure…', 'Identifying clauses…', 'Building document map…', 'Preparing explanations…'], 700, function () {});
          JurisAPI.analysis.run(d.id).then(function (anData) {
            d.content = anData.content || anData;
            d.an = 'analyzed';
            D.addEvent({ type: 'analysis', title: 'Analysis completed', obj: d.name, doc: d.id, go: 'analyze/' + d.id, who: 'JURISAI', meta: (d.content.clauses || []).length + ' sections mapped' });
            J.later(function () { J.render(true); }, 200);
          }).catch(function () {
            J.ensureContent(d); d.an = 'analyzed';
            D.addEvent({ type: 'analysis', title: 'Analysis completed', obj: d.name, doc: d.id, go: 'analyze/' + d.id, who: 'JURISAI', meta: d.content.clauses.length + ' sections mapped' });
            J.later(function () { J.render(true); }, 200);
          });
        } else {
          J.runSteps(h, 'Document analysis', ['Extracting structure…', 'Identifying clauses…', 'Building document map…', 'Preparing explanations…'], 750, function () {
            J.ensureContent(d); d.an = 'analyzed'; D.addEvent({ type: 'analysis', title: 'Analysis completed', obj: d.name, doc: d.id, go: 'analyze/' + d.id, who: 'JURISAI', meta: d.content.clauses.length + ' sections mapped' });
            J.later(function () { J.render(true); }, 300);
          });
        }
        D.addEvent({ type: 'analysis', title: 'Analysis started', obj: d.name, doc: d.id, go: 'analyze/' + d.id, who: 'JURISAI', meta: '' });
        return;
      }
      if (d.an !== 'analyzed') return;
      var ref = r.q.ref; if (ref && paraByRef(d, ref)) { S.ref = ref; J.later(function () { J.views.analyze.focusRef(ref, true); }, 60); }
      else if (S.ref) { J.later(function () { scrollTo(S.ref, false); mark(S.ref); }, 30); }
    },
    focusRef: function (ref, fromMount) {
      var d = D.docById(J.route.arg); if (!d || !paraByRef(d, ref)) return;
      S.ref = ref; S.pane = 'doc'; refreshRight(d); mark(ref); scrollTo(ref, true);
      $('.an-grid').className = 'an-grid pane-doc';
      $$('.an-mob button').forEach(function (b) { b.classList.toggle('on', b.dataset.p === 'doc'); });
    }
  };
  function mark(ref) {
    $$('.para.sel').forEach(function (e) { e.classList.remove('sel'); }); var p = $('#p-' + ref.replace(/\./g, '\\.'));
    if (p) p.classList.add('sel');
    $$('.map a').forEach(function (a) { a.classList.toggle('on', ref.split('.')[0] === a.dataset.ref.split('.')[0]); });
  }
  function scrollTo(ref, flash) {
    var p = document.getElementById('p-' + ref), w = $('#paper-wrap'); if (!p || !w) return;
    w.scrollTo({ top: p.offsetTop - 90, behavior: 'smooth' });
    if (flash) { p.classList.remove('flash'); void p.offsetWidth; p.classList.add('flash'); }
  }
  function refreshRight(d) { var ai = $('#an-ai'); if (ai) { var sc = $('#an-body') ? $('#an-body').scrollTop : 0; ai.innerHTML = rightHTML(d); $('#an-body').scrollTop = S.ref ? 0 : sc; } }
  var R = function () { return D.docById(J.route.arg); };

  A['an-pick'] = function (el) { var ref = el.dataset.ref; if (window.getSelection && String(window.getSelection()).length > 3) return; S.ref = ref; refreshRight(R()); mark(ref); if (window.innerWidth <= 1000) { S.pane = 'ai'; $('.an-grid').className = 'an-grid pane-ai'; $$('.an-mob button').forEach(function (b) { b.classList.toggle('on', b.dataset.p === 'ai'); }); } };
  A['an-section'] = function (el, e) { e.preventDefault(); var ref = el.dataset.ref; S.pane = 'doc'; $('.an-grid').className = 'an-grid pane-doc'; $$('.an-mob button').forEach(function (b) { b.classList.toggle('on', b.dataset.p === 'doc'); }); mark(ref); scrollTo(ref, true); };
  A['an-show'] = function (el) { J.views.analyze.focusRef(el.dataset.ref); };
  A['an-tab'] = function (el) { S.tab = el.dataset.tab; S.ref = null; refreshRight(R()); mark('0'); $$('.para.sel').forEach(function (e) { e.classList.remove('sel'); }); };
  A['an-back'] = function () { S.ref = null; refreshRight(R()); $$('.para.sel').forEach(function (e) { e.classList.remove('sel'); }); };
  A['an-zoom'] = function (el) { S.zoom = Math.max(.8, Math.min(1.4, S.zoom + parseFloat(el.dataset.d))); $('#paper').style.fontSize = (16 * S.zoom).toFixed(1) + 'px'; };
  A['an-pane'] = function (el) { S.pane = el.dataset.p; $('.an-grid').className = 'an-grid pane-' + S.pane; $$('.an-mob button').forEach(function (b) { b.classList.toggle('on', b === el); }); };
  A['an-switch'] = function (el) {
    var items = D.docs.filter(function (d) { return !d.archived; }).map(function (d) { return { label: d.name, sub: d.type, icon: d.sec === 'verified' ? 'file' : 'lock', checked: d.id === J.route.arg, fn: function () { J.go('analyze/' + d.id); } }; });
    J.ui.menu(el, [{ header: 'Switch document' }].concat(items), { width: 340 });
  };
  A['an-listen'] = function (el) {
    var d = R(), t = S.ref ? (trExplain(d, S.ref, d.content.notes[S.ref].explain)).t : J.tr(d.id + '.summary', d.content.summary).t;
    J.speak(t, S.ref ? '§' + S.ref + ' explanation' : 'Document summary', el);
  };
  function dl(name, text, type) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/plain' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  J.download = dl;
  A['an-download'] = function (el) {
    var d = R();
    J.ui.menu(el, [{ header: 'Download' }, { label: 'Original text', sub: 'Plain-text rendering of the verified document', icon: 'file', fn: function () { dl(d.name.replace(/\.[^.]+$/, '') + '.txt', d.content.clauses.map(function (c) { return c.id + '. ' + c.title.toUpperCase() + '\n' + c.paras.map(function (p) { return p.ref + '  ' + p.text; }).join('\n'); }).join('\n\n')); J.toast('Original text downloaded'); } },
      { label: 'Analysis (Markdown)', sub: 'Summary, key clauses and issues', icon: 'analyze', fn: function () { dl(d.name.replace(/\.[^.]+$/, '') + '_analysis.md', '# ' + d.name + ' — JURISAI analysis\n\n' + d.content.summary + '\n\n## Issues\n' + (d.content.issues.map(function (i) { return '- **' + i.title + '** (' + i.ref + '): ' + i.text; }).join('\n') || 'None flagged') + '\n\n_AI-assisted analysis. Not legal advice. Review required._\n', 'text/markdown'); J.toast('Analysis downloaded'); } },
      { label: 'Full report (PDF)…', icon: 'printer', fn: function () { J.go('reports?doc=' + d.id + '&type=detail'); } }], { align: 'right', width: 320 });
  };
  A['an-share'] = function () {
    var d = R(), url = location.origin === 'null' || location.protocol === 'file:' ? 'https://app.jurisai.example/d/' + d.id : location.origin + location.pathname + '#/analyze/' + d.id;
    J.ui.modal({ title: 'Share ' + esc(d.name), html: '<p class="muted">Share a read-only view of this analysis with people in your workspace. The original file is only shared if you choose to.</p><div class="field"><label for="sh-l">Link</label><div class="input-wrap"><input class="input in-sm" id="sh-l" readonly value="' + esc(url) + '"></div></div><div class="field"><label for="sh-p">Access</label><select class="input in-sm" id="sh-p"><option>Workspace members — view analysis only</option><option>Workspace members — view analysis and document</option></select></div>', foot: '<button class="btn btn-secondary btn-sm" data-act="modal-close">Close</button><button class="btn btn-primary btn-sm" data-act="share-copy">' + I('copy', 'ico-sm') + 'Copy link</button>' });
  };
  A['share-copy'] = function () {
    var d = R();
    if (window.JurisAPI && window.JurisAPI.reports) {
      JurisAPI.reports.createShare('analysis', d.id).catch(function () {});
    }
    try { navigator.clipboard.writeText($('#sh-l').value); } catch (e) {}
    J.ui.closeModal(); J.toast('Link copied. Sharing is recorded in the audit log.');
    D.addEvent({ type: 'report', title: 'Analysis shared', obj: d.name, doc: d.id, go: 'analyze/' + d.id, who: 'You', meta: 'Workspace link' });
  };
  A['an-more'] = function (el) {
    var d = R();
    J.ui.menu(el, [{ label: 'Compare with another document', icon: 'compare', fn: function () { J.go('compare?a=' + d.id); } }, { label: 'Open legal context', icon: 'scales', fn: function () { J.go('law?doc=' + d.id); } }, { label: 'Ask JURISAI about this document', icon: 'sparkle', fn: function () { J.go('research?doc=' + d.id); } }, { label: 'Generate report', icon: 'file', fn: function () { J.go('reports?doc=' + d.id); } }, { divider: true }, { label: 'Security details', icon: 'shield-check', fn: function () { A['doc-open']({ dataset: { id: d.id } }); } }], { align: 'right', width: 280 });
  };
  A['retry-analysis'] = function (el) {
    var id = el.dataset.doc;
    var d = D.docById(id);
    if (window.JurisAPI && window.JurisAPI.analysis) {
      JurisAPI.analysis.retry(id, { ocr: true, msa: true }).then(function (res) {
        if (d) { d.content = res.content || res; d.an = 'analyzed'; }
        J.toast('Analysis retried with OCR'); J.render(true);
      }).catch(function () {
        if (d) { d.content = d.content || D.msaContent; d.an = 'pending'; }
        J.toast('Retrying with OCR'); J.render();
      });
    } else {
      if (d) { d.content = d.content || D.msaContent; d.an = 'pending'; }
      J.toast('Retrying with OCR'); J.render();
    }
  };
})();
