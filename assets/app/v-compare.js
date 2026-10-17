/* COMPARE — contradiction detection with typed findings and a relationship graph */
(function () {
  'use strict';
  var J = window.J, D = J.data, esc = J.esc, I = J.icon, A = J.actions, $ = J.$, $$ = J.$$;
  var C = J.state.cmp = { a: 'emp', b: 'pol', c: '', ran: false, running: false, filter: 'all', sel: null };
  var KIND_ORDER = ['contradiction', 'inconsistency', 'update', 'legit'];
  var SEVW = { high: 0, med: 1, low: 2 };

  function eligible() { return D.docs.filter(function (d) { return d.sec === 'verified' && !d.archived && d.content && (d.an === 'analyzed' || d.an === 'pending'); }); }
  function short(d) { return d.name.replace(/\.[^.]+$/, '').replace(/_/g, ' '); }
  function ids() { return [C.a, C.b, C.c].filter(Boolean); }
  function results() {
    var s = ids();
    return D.findings.filter(function (f) { return s.indexOf(f.pair[0]) >= 0 && s.indexOf(f.pair[1]) >= 0; }).sort(function (x, y) { return KIND_ORDER.indexOf(x.kind) - KIND_ORDER.indexOf(y.kind) || SEVW[x.sev] - SEVW[y.sev]; });
  }
  function opts(sel, none) {
    return (none ? '<option value="">None</option>' : '') + eligible().map(function (d) { return '<option value="' + d.id + '"' + (d.id === sel ? ' selected' : '') + '>' + esc(d.name) + '</option>'; }).join('');
  }

  function graph(f) {
    var da = D.docById(f.a.ref.split(':')[0]), db = D.docById(f.b.ref.split(':')[0]), g = f.graph;
    var col = { contradiction: '#A83232', inconsistency: '#B7791F', update: '#A8863F', legit: '#5B6676' }[f.kind];
    var node = function (x, y, w, h, t1, t2, stroke, fill, bold) {
      return '<g><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + (fill || '#FCFAF5') + '" stroke="' + stroke + '" stroke-width="1"/>' +
        '<text x="' + (x + 12) + '" y="' + (y + (t2 ? 20 : h / 2 + 4)) + '" class="gn-t' + (bold ? ' gn-b' : '') + '">' + esc(t1) + '</text>' + (t2 ? '<text x="' + (x + 12) + '" y="' + (y + 36) + '" class="gn-s">' + esc(t2) + '</text>' : '') + '</g>';
    };
    var path = function (x1, y1, x2, y2, c) { var m = (x1 + x2) / 2; return '<path d="M' + x1 + ' ' + y1 + ' C' + m + ' ' + y1 + ' ' + m + ' ' + y2 + ' ' + x2 + ' ' + y2 + '" fill="none" stroke="' + (c || '#C9BEA4') + '" stroke-width="1.25"/>'; };
    var h = ['Documents', 'Clauses', 'Obligations', 'Conflicting statements'], hx = [10, 195, 395, 575];
    return '<svg class="graph" preserveAspectRatio="xMidYMid meet" viewBox="0 0 760 196" role="img" aria-label="Relationship between ' + esc(short(da)) + ' and ' + esc(short(db)) + ' for ' + esc(f.topic) + '">' +
      h.map(function (t, i) { return '<text x="' + hx[i] + '" y="12" class="gn-h">' + t.toUpperCase() + '</text>'; }).join('') +
      path(160, 56, 195, 56, '#1B3454') + path(160, 140, 195, 140, '#A8863F') + path(345, 56, 395, 98, '#1B3454') + path(345, 140, 395, 98, '#A8863F') + path(535, 98, 575, 56, col) + path(535, 98, 575, 140, col) +
      node(10, 32, 150, 48, short(da), 'Source A', '#1B3454') + node(10, 116, 150, 48, short(db), 'Source B', '#A8863F') +
      node(195, 32, 150, 48, g.clauseA, f.a.ref.split(':')[1] ? 'p.' + (J.refInfo(f.a.ref) || { clause: { page: '' } }).clause.page : '', '#1B3454') + node(195, 116, 150, 48, g.clauseB, 'p.' + (J.refInfo(f.b.ref) || { clause: { page: '' } }).clause.page, '#A8863F') +
      node(395, 74, 140, 48, g.obligation, 'Shared obligation', '#7C8594', '#F3EAD0') +
      node(575, 32, 175, 48, f.a.value, 'says', col, '#fff', true) + node(575, 116, 175, 48, f.b.value, 'says', col, '#fff', true) +
      '<line x1="662" y1="82" x2="662" y2="114" stroke="' + col + '" stroke-width="1.5" stroke-dasharray="4 3"/><circle cx="662" cy="98" r="9" fill="' + col + '"/><text x="662" y="102" text-anchor="middle" class="gn-x">' + (f.kind === 'contradiction' ? '!' : f.kind === 'legit' ? '=' : '≠') + '</text></svg>';
  }

  function srcBlock(side, label, f) {
    var s = f[side], info = J.refInfo(s.ref), d = info.doc;
    return '<div class="src ' + (side === 'a' ? 'sa' : 'sb') + '"><div class="src-h"><span class="tag-ab">' + label + '</span><b>' + esc(short(d)) + '</b><span class="mono">' + info.label + '</span></div><div class="src-v">' + esc(s.value) + '</div><blockquote class="q q-sm">' + esc(s.quote) + '</blockquote>' + J.citeLink(s.ref, 'Open source') + '</div>';
  }

  function detail(f) {
    var st = D.findingState(f.id), k = D.kinds[f.kind], why = J.tr(f.id + '.why', f.why);
    return '<div class="fd-h"><div><div class="fd-chips">' + J.chip(k.cls, k.label, k.icon) + '<span class="chip chip-' + (f.sev === 'high' ? 'risk' : f.sev === 'med' ? 'warn' : 'slate') + '">' + ({ high: 'High', med: 'Medium', low: 'Low' })[f.sev] + ' priority</span>' +
      (st.status === 'reviewed' ? J.chip('chip-ok', 'Reviewed', 'check') : st.status === 'dismissed' ? J.chip('', 'Dismissed', 'x') : J.chip('chip-warn', 'Review required', 'flag')) + '</div><h2>' + esc(f.topic) + '</h2><p class="muted">' + k.desc + '</p></div></div>' +
      graph(f) + '<div class="srcs">' + srcBlock('a', 'Source A', f) + srcBlock('b', 'Source B', f) + '</div>' +
      '<dl class="fd-rows"><div><dt>What conflicts</dt><dd>' + esc(f.what) + '</dd></div>' +
      '<div><dt>Why it may matter ' + J.tag('ai') + '</dt><dd>' + esc(why.t) + (why.miss ? ' <span class="field-hint">(not yet translated)</span>' : '') + '</dd></div>' +
      '<div><dt>Potential impact ' + J.tag('inference') + '</dt><dd>' + esc(f.impact) + '</dd></div>' +
      '<div><dt>Review required ' + J.tag('review') + '</dt><dd>' + esc(f.review) + '</dd></div></dl>' +
      (st.notes.length ? '<div class="fd-notes"><span class="k">Notes</span>' + st.notes.map(function (n) { return '<p>' + I('note', 'ico-sm') + '<span>' + esc(n.t) + '<small class="mono">' + J.fmt.dt(n.at) + ' · ' + esc(J.userName()) + '</small></span></p>'; }).join('') + '</div>' : '') +
      '<div class="fd-a"><button class="btn btn-secondary btn-xs" data-act="cmp-source" data-id="' + f.id + '">' + I('external', 'ico-sm') + 'Open Source</button>' +
      (st.status === 'dismissed' ? '<button class="btn btn-secondary btn-xs" data-act="cmp-restore" data-id="' + f.id + '">' + I('refresh', 'ico-sm') + 'Restore</button>' : '<button class="btn ' + (st.status === 'reviewed' ? 'btn-secondary' : 'btn-primary') + ' btn-xs" data-act="cmp-review" data-id="' + f.id + '">' + I('check', 'ico-sm') + (st.status === 'reviewed' ? 'Reviewed — undo' : 'Mark Reviewed') + '</button><button class="btn btn-secondary btn-xs" data-act="cmp-dismiss" data-id="' + f.id + '">' + I('x', 'ico-sm') + 'Dismiss</button>') +
      '<button class="btn btn-secondary btn-xs" data-act="cmp-note" data-id="' + f.id + '">' + I('note', 'ico-sm') + 'Add Note</button>' +
      (f.law ? '<button class="linkbtn" data-go="law?doc=' + f.law.split(':')[0] + '&c=' + f.law.split(':')[1] + '">What law may apply?</button>' : '') +
      '<button class="linkbtn" data-go="research?q=' + encodeURIComponent('Explain the ' + f.topic.toLowerCase() + ' difference between these documents') + '">Ask JURISAI</button></div>';
  }

  function listHTML(list) {
    var f = C.filter === 'all' ? list : list.filter(function (x) { return x.kind === C.filter; });
    if (!f.length) return '<p class="field-hint pad-s">No findings of this type.</p>';
    return f.map(function (x) {
      var st = D.findingState(x.id), k = D.kinds[x.kind];
      return '<button class="fl-i' + (C.sel === x.id ? ' on' : '') + (st.status === 'dismissed' ? ' dim' : '') + '" data-act="cmp-pick" data-id="' + x.id + '"><span class="fl-k fl-' + x.kind + '">' + I(k.icon, 'ico-xs') + k.short + '</span><b>' + esc(x.topic) + '</b><span class="fl-v mono">' + esc(x.a.value) + '  ≠  ' + esc(x.b.value) + '</span>' + (st.status !== 'open' ? '<span class="fl-s">' + (st.status === 'reviewed' ? '✓ Reviewed' : 'Dismissed') + '</span>' : '') + '</button>';
    }).join('');
  }

  function resultsHTML() {
    var list = results();
    if (!list.length) return '<div class="pad cmp-empty">' + J.errorState('evidence', { text: 'JURISAI found no overlapping obligations between the selected documents, so there is nothing to compare reliably. Try documents that cover the same subject, such as a contract and the policy that governs it.', acts: '<button class="btn btn-secondary btn-sm" data-act="cmp-reset">Choose different documents</button>' }) + '</div>';
    if (!C.sel || !list.some(function (x) { return x.id === C.sel; })) C.sel = list[0].id;
    var cnt = {}; list.forEach(function (x) { cnt[x.kind] = (cnt[x.kind] || 0) + 1; });
    var sel = list.filter(function (x) { return x.id === C.sel; })[0];
    return '<div class="cmp-sum pad"><span class="cmp-n"><b>' + list.length + '</b> differences found</span><button class="kchip' + (C.filter === 'all' ? ' on' : '') + '" data-act="cmp-filter" data-f="all">All</button>' +
      KIND_ORDER.map(function (k) { return cnt[k] ? '<button class="kchip' + (C.filter === k ? ' on' : '') + '" data-act="cmp-filter" data-f="' + k + '"><i class="kd kd-' + k + '"></i>' + cnt[k] + ' ' + D.kinds[k].label.toLowerCase() + (cnt[k] > 1 && k !== 'legit' && k !== 'update' ? 's' : '') + '</button>' : ''; }).join('') +
      '<span class="cmp-note">Not every difference is a contradiction. JURISAI separates four kinds.</span></div>' +
      '<div class="cmp-body pad"><nav class="fl" id="fl" aria-label="Findings">' + listHTML(list) + '</nav><section class="fd" id="fd" data-speak>' + detail(sel) + '</section></div>';
  }

  J.views.compare = {
    title: 'Compare', fixed: true, crumbs: function () { return ['Compare']; },
    render: function (r) {
      if (!D.docs.some(function(d){return !!d.content;})) return '<header class="ph"><div><div class="kicker">Workspace</div><h1>Compare <em>documents</em></h1><p class="sub">Document comparison is not enabled yet.</p></div></header><div class="pad">'+J.empty({icon:'compare',title:'Comparison engine unavailable',text:'This version stores, validates, displays, and downloads your real documents. It does not generate comparisons.',actions:'<a class="btn btn-primary btn-sm" href="#/documents">Open documents</a>'})+'</div>';
      if (eligible().length < 2) return '<header class="ph"><div><div class="kicker">Workspace</div><h1>Compare <em>documents</em></h1><p class="sub">Compare requires at least two verified documents.</p></div></header><div class="pad">'+J.empty({icon:'compare',title:'Not enough verified documents',text:'Upload and verify at least two documents before starting a comparison.',actions:'<a class="btn btn-primary btn-sm" href="#/documents/intake">Upload document</a>'})+'</div>';
      var el = eligible().map(function (d) { return d.id; });
      if (r.q.a && el.indexOf(r.q.a) >= 0) { if (C.a !== r.q.a) C.ran = false; C.a = r.q.a; if (!r.q.b && C.b === C.a) C.b = el.filter(function (x) { return x !== C.a; })[0] || ''; }
      if (r.q.b && el.indexOf(r.q.b) >= 0) { if (C.b !== r.q.b) C.ran = false; C.b = r.q.b; }
      if (r.q.f) C.sel = r.q.f; if (r.q.c !== undefined && r.q.c !== '') C.c = r.q.c;
      if (el.indexOf(C.a) < 0) C.a = el[0]; if (el.indexOf(C.b) < 0 || C.b === C.a) C.b = el.filter(function (x) { return x !== C.a; })[0];
      var auto = !C.ran && !C.running;
      return '<header class="ph"><div><div class="kicker">Workspace</div><h1>Compare <em>documents</em></h1><p class="sub">Find where documents disagree — and separate real conflicts from updates and legitimate differences.</p></div>' +
        '<div class="ph-actions">' + (C.ran ? '<button class="btn btn-secondary btn-sm" data-act="cmp-export">' + I('file', 'ico-sm') + 'Contradiction report</button>' : '') + '</div></header>' +
        '<div class="cmp-sel pad"><div class="field"><label for="cmp-a">Document A</label><select class="input in-sm" id="cmp-a">' + opts(C.a) + '</select></div><div class="cmp-vs">' + I('compare') + '</div><div class="field"><label for="cmp-b">Document B</label><select class="input in-sm" id="cmp-b">' + opts(C.b) + '</select></div>' +
        '<div class="field"><label for="cmp-c">Document C <span class="opt">Optional</span></label><select class="input in-sm" id="cmp-c">' + opts(C.c, true) + '</select></div><button class="btn btn-primary btn-sm" data-act="cmp-run" id="cmp-go">' + I('compare', 'ico-sm') + 'Compare</button></div>' +
        '<div class="cmp-stage" id="cmp-stage">' + (C.ran ? resultsHTML() : (C.running || auto ? '<div class="pad cmp-load"><div id="cmp-ls"></div></div>' : '')) + '</div>';
    },
    mount: function () {
      ['a', 'b', 'c'].forEach(function (k) {
        var el = $('#cmp-' + k);
        if (el) {
          el.addEventListener('change', function (e) {
            C[k] = e.target.value;
            C.ran = false;
            C.sel = null;
            var stg = $('#cmp-stage');
            if (stg) {
              stg.innerHTML = '<div class="pad">' + J.empty({ icon: 'compare', title: 'Selection changed', text: 'Press Compare to analyse the selected documents.' }) + '</div>';
            }
          });
        }
      });
      if ($('#cmp-stage') && !C.ran) run();
    }
  };
  function run() {
    if (!C.a || !C.b || C.a === C.b || C.a === C.c || C.b === C.c) { J.toast('Choose different documents to compare', 'warn'); return; }
    if (J.state.offline || !navigator.onLine) { $('#cmp-stage').innerHTML = '<div class="pad">' + J.errorState('network') + '</div>'; return; }
    C.running = true; C.ran = false; $('#cmp-stage').innerHTML = '<div class="pad cmp-load"><div id="cmp-ls"></div></div>';
    J.runSteps($('#cmp-ls'), 'Contradiction analysis', ['Matching related clauses…', 'Comparing obligations…', 'Detecting inconsistencies…', 'Classifying differences…'], 700, function () {
      C.running = false; C.ran = true; var n = results().length;
      D.addEvent({ type: 'analysis', title: 'Comparison completed', obj: ids().map(function (i) { return D.docById(i).name; }).join(' vs ') + ' · ' + n + ' differences', doc: C.a, go: 'compare?a=' + C.a + '&b=' + C.b, who: 'JURISAI', meta: '' });
      J.later(function () { if ($('#cmp-stage')) J.render(true); }, 250);
    });
  }
  A['cmp-run'] = function () { C.ran = false; C.sel = null; run(); };
  A['cmp-reset'] = function () { C.a = 'emp'; C.b = 'pol'; C.c = ''; C.ran = false; J.render(true); };
  A['cmp-filter'] = function (el) { C.filter = el.dataset.f; var l = results(); $$('.kchip').forEach(function (b) { b.classList.toggle('on', b.dataset.f === C.filter); }); $('#fl').innerHTML = listHTML(l); };
  A['cmp-pick'] = function (el) { C.sel = el.dataset.id; var l = results(); $('#fl').innerHTML = listHTML(l); $('#fd').innerHTML = detail(l.filter(function (x) { return x.id === C.sel; })[0]); $('#fd').scrollTop = 0; if (window.innerWidth <= 1000) $('#fd').scrollIntoView({ behavior: 'smooth' }); };
  function refreshDetail() { var l = results(); $('#fl').innerHTML = listHTML(l); $('#fd').innerHTML = detail(l.filter(function (x) { return x.id === C.sel; })[0]); }
  function F(id) { return D.findings.filter(function (x) { return x.id === id; })[0]; }
  A['cmp-review'] = function (el) {
    var f = F(el.dataset.id), s = D.findingState(f.id), nx = s.status === 'reviewed' ? 'open' : 'reviewed'; D.setFindingState(f.id, { status: nx });
    if (nx === 'reviewed') { D.addEvent({ type: 'review', title: 'Finding marked reviewed', obj: f.topic + ' (' + f.a.value + ' vs ' + f.b.value + ')', go: 'compare?f=' + f.id, who: 'You', meta: D.kinds[f.kind].label }); J.toast('Marked as reviewed'); } else J.toast('Review status removed');
    refreshDetail();
  };
  A['cmp-dismiss'] = function (el) { var f = F(el.dataset.id); D.setFindingState(f.id, { status: 'dismissed' }); D.addEvent({ type: 'review', title: 'Finding dismissed', obj: f.topic, go: 'compare?f=' + f.id, who: 'You', meta: '' }); J.toast('Dismissed. You can restore it from the finding.'); refreshDetail(); };
  A['cmp-restore'] = function (el) { D.setFindingState(el.dataset.id, { status: 'open' }); J.toast('Finding restored'); refreshDetail(); };
  A['cmp-note'] = function (el) {
    J.ui.modal({ title: 'Add note', html: '<p class="muted">Notes are visible to your workspace and recorded in the audit log.</p><div class="field"><label for="note-t">Note</label><textarea class="input" id="note-t" rows="4" placeholder="e.g. Asked HR to confirm which notice period applies."></textarea></div>', foot: '<button class="btn btn-secondary btn-sm" data-act="modal-close">Cancel</button><button class="btn btn-primary btn-sm" data-act="cmp-note-ok" data-id="' + el.dataset.id + '">Save note</button>' });
  };
  A['cmp-note-ok'] = function (el) {
    var t = $('#note-t').value.trim(); if (!t) { J.toast('Write a note first', 'warn'); return; }
    var s = D.findingState(el.dataset.id); D.setFindingState(el.dataset.id, { notes: s.notes.concat([{ t: t, at: new Date().toISOString() }]) });
    J.ui.closeModal(); J.toast('Note added'); refreshDetail();
  };
  A['cmp-source'] = function (el) {
    var f = F(el.dataset.id), ia = J.refInfo(f.a.ref), ib = J.refInfo(f.b.ref);
    var blk = function (i, lab) { return '<section class="osrc"><div class="an-sec-h"><span class="tag-ab">' + lab + '</span><b>' + esc(i.doc.name) + '</b><span class="mono">' + i.label + '</span></div><h4>' + esc(i.clause.title) + '</h4><blockquote class="q">' + esc(i.para.text) + '</blockquote><button class="btn btn-secondary btn-xs" data-act="cite" data-ref="' + i.doc.id + ':' + i.para.ref + '">' + I('file', 'ico-sm') + 'Open in document</button></section>'; };
    J.ui.drawer({ wide: true, kicker: 'Sources', title: esc(f.topic), html: blk(ia, 'Source A') + blk(ib, 'Source B') + '<div class="banner">' + I('info') + '<div>Both passages are quoted from verified documents. JURISAI does not alter source text.</div></div>' });
  };
  A['cmp-export'] = function () { J.go('reports?type=contra&a=' + C.a + '&b=' + C.b); };
})();
