/* HOME — intelligence dashboard (not a metrics wall) */
(function () {
  'use strict';
  var J = window.J, D = J.data, esc = J.esc, I = J.icon, A = J.actions;

  function greet() { var h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }

  J.issuesList = function () {
    var out = [];
    D.findings.forEach(function (f) {
      var s = D.findingState(f.id);
      if (s.status === 'open' && (f.kind === 'contradiction' || f.kind === 'inconsistency')) out.push({ sev: f.sev, t: f.topic + ': ' + f.a.value + ' vs ' + f.b.value, s: D.kinds[f.kind].label, go: 'compare?a=' + f.pair[0] + '&b=' + f.pair[1] + '&f=' + f.id });
    });
    D.docs.forEach(function (d) {
      if (d.sec === 'review') out.push({ sev: 'med', t: d.name + ' — sensitive data found', s: 'Security · Legal AI on hold', go: 'documents?f=review' });
      if (d.sec === 'blocked') out.push({ sev: 'high', t: d.name + ' — blocked by gateway', s: 'Security · quarantined', go: 'security' });
      if (d.an === 'failed' && d.sec === 'verified') out.push({ sev: 'med', t: d.name + ' — analysis failed', s: 'Analysis · retry available', go: 'analyze/' + d.id });
    });
    var w = { high: 0, med: 1, low: 2 };
    return out.sort(function (a, b) { return w[a.sev] - w[b.sev]; });
  };

  function recentDocs() {
    var rows = D.docs.filter(function (d) { return !d.archived; }).sort(function (a, b) { return b.uploaded - a.uploaded; }).slice(0, 5);
    return '<table class="tbl tbl-tight"><tbody>' + rows.map(function (d) {
      return '<tr class="row" data-act="doc-open" data-id="' + d.id + '"><td><div class="nm">' + fileIc(d) + '<div><b>' + esc(d.name) + '</b><small>' + esc(d.type) + ' · ' + J.fmt.rel(d.uploaded) + '</small></div></div></td><td class="hide-md">' + J.secChip(d.sec) + '</td><td class="hide-sm">' + J.anChip(d) + '</td></tr>';
    }).join('') + '</tbody></table>';
  }
  function fileIc(d) { var e = d.name.split('.').pop().toLowerCase(); return '<span class="fileic ' + e + '">' + e.toUpperCase() + '</span>'; }
  J.fileIc = fileIc;

  J.views.home = {
    title: 'Home', crumbs: function () { return ['Home']; },
    render: function () {
      var issues = J.issuesList(), docs = D.docs.filter(function (d) { return !d.archived; });
      var ver = docs.filter(function (d) { return d.sec === 'verified'; }).length, rev = docs.filter(function (d) { return d.sec === 'review'; }).length, blk = docs.filter(function (d) { return d.sec === 'blocked'; }).length;
      var analysed = docs.filter(function (d) { return d.an === 'analyzed' && d.sec === 'verified'; }).slice(0, 3);
      return '<div class="home">' +
        '<section class="home-ask"><div class="kicker-l">' + greet() + '</div><h1>' + greet() + ', <em>' + esc(J.firstName()) + '.</em></h1><p class="home-q">What would you like to research?</p>' +
        '<form class="ask-box" id="ask-form" autocomplete="off"><label class="sr-only" for="ask-in">Ask JURISAI about your documents</label>' +
        '<span class="ask-ic">' + I('sparkle') + '</span><input id="ask-in" placeholder="Ask JURISAI about your documents…" />' +
        '<button type="button" class="icon-btn" id="ask-mic" data-act="ask-voice" aria-label="Voice input">' + I('mic') + '</button>' +
        '<button class="btn btn-primary btn-sm" type="submit">Research ' + I('arrow-right', 'ico-sm arr') + '</button></form>' +
        '<div class="ask-sugg"><span class="k">Try</span>' +
        ['Does the termination clause conflict with the company policy?', 'What happens to my confidentiality obligations after I leave?', 'Is the non-compete likely to be enforceable?'].map(function (q) { return '<button class="sugg" data-act="ask-sugg" data-q="' + esc(q) + '">' + esc(q) + '</button>'; }).join('') + '</div>' +
        '<nav class="qa" aria-label="Quick actions">' +
        [['upload', 'Upload Documents', 'documents/intake'], ['analyze', 'Analyze Document', 'analyze'], ['compare', 'Compare Documents', 'compare'], ['scales', 'Research the Law', 'law'], ['sparkle', 'Ask JURISAI', 'research']].map(function (q) { return '<a href="#/' + q[2] + '">' + I(q[0]) + '<span>' + q[1] + '</span>' + I('arrow-right', 'ico-sm qa-arr') + '</a>'; }).join('') + '</nav></section>' +
        '<div class="home-grid">' +
        '<div class="home-main">' +
        '<section><header class="sec-h"><h2>Recent documents</h2><a class="linkbtn" href="#/documents">All documents</a></header>' + recentDocs() + '</section>' +
        '<section><header class="sec-h"><h2>Recent analysis</h2><a class="linkbtn" href="#/analyze">Open workspace</a></header><div class="an-list">' +
        analysed.map(function (d) {
          var n = d.content ? d.content.issues.length : 0;
          return '<a class="an-row" href="#/analyze/' + d.id + '"><div><b>' + esc(d.name) + '</b><p>' + esc(d.content.summary.split('. ')[0]) + '.</p></div><div class="an-meta"><span class="mono">' + d.content.clauses.reduce(function (a, c) { return a + c.paras.length; }, 0) + ' clauses</span>' + (n ? '<span class="mono warn">' + n + ' issue' + (n > 1 ? 's' : '') + '</span>' : '<span class="mono ok">no issues</span>') + '</div></a>';
        }).join('') + '</div></section></div>' +
        '<aside class="home-rail">' +
        '<section><header class="sec-h"><h2>Requires review</h2><span class="mono">' + issues.length + ' open</span></header>' +
        (issues.length ? '<ul class="issues">' + issues.slice(0, 5).map(function (i) { return '<li><a href="#/' + i.go + '"><i class="sev sev-' + i.sev + '"></i><span><b>' + esc(i.t) + '</b><small>' + esc(i.s) + '</small></span>' + I('chev-right', 'ico-sm') + '</a></li>'; }).join('') + '</ul>' : J.empty({ icon: 'shield-check', title: 'Nothing needs review', text: 'Every finding has been reviewed.' })) + '</section>' +
        '<section class="sec-gate"><header class="sec-h"><h2>Security status</h2><span class="chip chip-ok">' + I('shield-check', 'ico-xs') + 'Gateway online</span></header>' +
        '<div class="mini-pipe"><div><b>' + docs.length + '</b><span>Uploaded</span></div><i></i><div><b>' + (ver + rev + blk) + '</b><span>Scanned</span></div><i></i><div class="ok"><b>' + ver + '</b><span>Verified</span></div><i></i><div class="' + (rev + blk ? 'warn' : '') + '"><b>' + (rev + blk) + '</b><span>Held</span></div></div>' +
        '<p class="gate-line">Nothing enters Legal AI until it passes the security gate.</p></section>' +
        '<section><header class="sec-h"><h2>Research activity</h2><a class="linkbtn" href="#/research">Open</a></header><ul class="ra">' +
        D.threads.slice(0, 3).map(function (t) { return '<li><a href="#/research?t=' + t.id + '">' + I('message', 'ico-sm') + '<span>' + esc(t.title) + '<small class="mono">' + J.fmt.rel(t.at) + '</small></span></a></li>'; }).join('') + '</ul></section>' +
        '</aside></div></div>';
    },
    mount: function (host) {
      var f = J.$('#ask-form', host);
      f.addEventListener('submit', function (e) { e.preventDefault(); var v = J.$('#ask-in').value.trim(); J.go('research' + (v ? '?q=' + encodeURIComponent(v) : '')); });
    }
  };
  A['ask-voice'] = function (el) { J.voice(J.$('#ask-in'), el, function (t) { J.go('research?q=' + encodeURIComponent(t)); }); };
  A['ask-sugg'] = function (el) { J.go('research?q=' + encodeURIComponent(el.dataset.q)); };
})();
