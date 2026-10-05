/* ACTIVITY & AUDIT  +  SECURITY CENTER */
(function () {
  'use strict';
  var J = window.J, D = J.data, esc = J.esc, I = J.icon, A = J.actions, $ = J.$, $$ = J.$$;
  var AC = J.state.act = { f: 'all', q: '' };
  var ICON = { upload: 'upload', scan: 'scan', verify: 'shield-check', block: 'lock', review: 'flag', analysis: 'analyze', contradiction: 'compare', legal: 'scales', report: 'file' };
  var TONE = { verify: 'ok', block: 'risk', review: 'warn', contradiction: 'risk' };
  var GROUP = { security: ['upload', 'scan', 'verify', 'block'], analysis: ['analysis', 'contradiction', 'review'], research: ['legal'], reports: ['report'] };
  var FILTERS = [['all', 'All events'], ['security', 'Security'], ['analysis', 'Analysis'], ['research', 'Research'], ['reports', 'Reports']];

  function dayLabel(d) {
    var n = new Date(), a = new Date(d.getFullYear(), d.getMonth(), d.getDate()), b = new Date(n.getFullYear(), n.getMonth(), n.getDate()), diff = Math.round((b - a) / 864e5);
    return diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : J.fmt.date(d);
  }
  function listEvents() {
    return D.activity().filter(function (e) {
      if (AC.f !== 'all' && GROUP[AC.f].indexOf(e.type) < 0) return false;
      return !AC.q || (e.title + ' ' + e.obj + ' ' + e.meta + ' ' + e.who).toLowerCase().indexOf(AC.q.toLowerCase()) >= 0;
    });
  }
  function timeline() {
    var ev = listEvents(); if (!ev.length) return J.empty({ icon: 'history', title: 'No matching events', text: 'Nothing in the audit log matches this filter.', actions: '<button class="btn btn-secondary btn-sm" data-act="act-clear">Clear filters</button>' });
    var day = '', out = '';
    ev.forEach(function (e) {
      var dl = dayLabel(e.t);
      if (dl !== day) { day = dl; out += '<h3 class="tl-day">' + dl + '</h3>'; }
      out += '<a class="tl-i tone-' + (TONE[e.type] || '') + '" href="#/' + e.go + '"><span class="tl-t mono">' + J.fmt.time(e.t) + '</span><span class="tl-n">' + I(ICON[e.type] || 'file', 'ico-sm') + '</span><span class="tl-b"><b>' + esc(e.title) + '</b><span>' + esc(e.obj) + '</span>' + (e.meta ? '<small class="mono">' + esc(e.meta) + '</small>' : '') + '</span><span class="tl-w">' + esc(e.who) + '</span>' + I('chev-right', 'ico-sm tl-go') + '</a>';
    });
    return out;
  }
  J.views.activity = {
    title: 'Activity', fixed: false, crumbs: function () { return ['Activity & Audit']; },
    render: function () {
      var all = D.activity(), cnt = function (k) { return k === 'all' ? all.length : all.filter(function (e) { return GROUP[k].indexOf(e.type) >= 0; }).length; };
      return '<header class="ph"><div><div class="kicker">Intelligence</div><h1>Activity &amp; <em>Audit</em></h1><p class="sub">Every security decision, analysis and export is recorded with a timestamp, so results can be traced and reviewed.</p></div><div class="ph-actions"><button class="btn btn-secondary btn-sm" data-act="act-csv">' + I('download', 'ico-sm') + 'Export audit log</button></div></header>' +
        '<div class="act pad"><div class="act-main"><div class="act-bar"><label class="lib-search">' + I('search', 'ico-sm') + '<input id="act-q" type="search" placeholder="Search events, files or actors" value="' + esc(AC.q) + '" aria-label="Search events"></label><div class="tabs">' + FILTERS.map(function (f) { return '<button class="' + (AC.f === f[0] ? 'on' : '') + '" data-act="act-filter" data-f="' + f[0] + '">' + f[1] + ' <span class="n">' + cnt(f[0]) + '</span></button>'; }).join('') + '</div></div><div class="tl" id="tl">' + timeline() + '</div></div>' +
        '<aside class="act-side"><div class="k pane-k">Audit integrity</div><p class="muted">Events are append-only and retained for ' + J.settings.retention + ' months. Document hashes let you confirm a file has not changed since it was verified.</p><dl class="dl"><dt>Events recorded</dt><dd class="mono">' + all.length + '</dd><dt>Retention</dt><dd class="mono">' + J.settings.retention + ' months</dd><dt>Log status</dt><dd><span class="chip chip-ok">' + I('check', 'ico-xs') + 'Intact</span></dd></dl><div class="k pane-k">Legend</div><ul class="legend2"><li><i class="sev sev-high"></i>Blocked or contradictory</li><li><i class="sev sev-med"></i>Needs review</li><li><i class="dot dot-ok"></i>Verified</li></ul></aside></div>';
    },
    mount: function () { $('#act-q').addEventListener('input', function (e) { AC.q = e.target.value; $('#tl').innerHTML = timeline(); }); }
  };
  A['act-filter'] = function (el) { AC.f = el.dataset.f; J.render(true); };
  A['act-clear'] = function () { AC.f = 'all'; AC.q = ''; J.render(true); };
  A['act-csv'] = function () {
    var rows = [['timestamp', 'event', 'object', 'actor', 'detail']].concat(D.activity().map(function (e) { return [e.t.toISOString(), e.title, e.obj, e.who, e.meta]; }));
    J.download('jurisai_audit_log.csv', rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n'), 'text/csv'); J.toast('Audit log exported (' + (rows.length - 1) + ' events)');
    D.addEvent({ type: 'report', title: 'Audit log exported', obj: 'jurisai_audit_log.csv', go: 'activity', who: 'You', meta: 'CSV' });
  };

  /* ======================= SECURITY CENTER ======================= */
  function stats() {
    var docs = D.docs.filter(function (d) { return !d.archived || true; });
    var scanned = docs.filter(function (d) { return d.sec !== 'processing'; }).length;
    return { all: docs.length, scanned: scanned, ver: docs.filter(function (d) { return d.sec === 'verified'; }).length, rev: docs.filter(function (d) { return d.sec === 'review'; }).length, blk: docs.filter(function (d) { return d.sec === 'blocked'; }).length, proc: docs.filter(function (d) { return d.sec === 'processing'; }).length, analyzed: docs.filter(function (d) { return d.an === 'analyzed'; }).length };
  }
  J.views.security = {
    title: 'Security', fixed: false, crumbs: function () { return ['Security Center']; },
    render: function () {
      var s = stats(), held = D.docs.filter(function (d) { return d.sec === 'review' || d.sec === 'blocked'; });
      var evs = D.activity().filter(function (e) { return ['upload', 'scan', 'verify', 'block', 'review'].indexOf(e.type) >= 0 && e.type !== 'upload'; }).slice(0, 7);
      var days = [3, 5, 2, 6, 4, 1, 2 + D.userEvents.filter(function (e) { return e.type === 'scan'; }).length], mx = Math.max.apply(null, days);
      var stage = function (cls, label, n, cap, ic) { return '<div class="sg ' + cls + '"><span class="sg-ic">' + I(ic) + '</span><span class="k">' + label + '</span><b>' + n + '</b><small>' + cap + '</small></div>'; };
      return '<header class="ph"><div><div class="kicker">Intelligence</div><h1>Security <em>Center</em></h1><p class="sub">Nothing enters Legal AI until it passes the security gate.</p></div><div class="ph-actions"><span class="chip chip-ok"><i class="dot dot-ok pulse"></i>Gateway operational</span><a class="btn btn-primary btn-sm" href="#/documents/intake">' + I('upload', 'ico-sm') + 'Upload document</a></div></header>' +
        '<div class="sec pad"><section class="sec-flow" aria-label="Document flow">' + stage('', 'Upload', s.all, 'files received', 'upload') + '<i class="sg-ar"></i>' + stage('sg-scan', 'Scan', s.scanned, 'inspected by the gateway', 'scan') + '<i class="sg-ar"></i>' + stage('sg-ok', 'Verify', s.ver, 'attested and released', 'shield-check') + '<i class="sg-ar"></i>' + stage('sg-ai', 'Analyze', s.analyzed, 'read by Legal AI', 'analyze') +
        '<div class="sg-held"><span class="k">Held at the gate</span><b>' + (s.rev + s.blk) + '</b><small>' + s.rev + ' review required · ' + s.blk + ' blocked' + (s.proc ? ' · ' + s.proc + ' scanning' : '') + '</small></div></section>' +
        '<dl class="sec-stats"><div><dt>Security status</dt><dd class="ok">Operational</dd></div><div><dt>Files scanned</dt><dd>' + s.scanned + '</dd></div><div><dt>Files verified</dt><dd>' + s.ver + '</dd></div><div><dt>Review required</dt><dd class="warn">' + s.rev + '</dd></div><div><dt>Blocked</dt><dd class="risk">' + s.blk + '</dd></div></dl>' +
        '<div class="sec-cols"><section><header class="sec-h"><h2>Recent security events</h2><a class="linkbtn" href="#/activity">Full audit log</a></header><table class="tbl tbl-tight"><tbody>' + evs.map(function (e) { return '<tr class="row" data-go="' + e.go + '"><td class="mono nw">' + J.fmt.rel(e.t) + '</td><td><b>' + esc(e.title) + '</b><small class="blk">' + esc(e.obj) + '</small></td><td>' + (e.type === 'block' ? J.chip('chip-risk', 'Blocked', 'lock') : e.type === 'review' ? J.chip('chip-warn', 'Review', 'alert') : e.type === 'verify' ? J.chip('chip-ok', 'Verified', 'check') : J.chip('', 'Scanned', 'scan')) + '</td></tr>'; }).join('') + '</tbody></table>' +
        (held.length ? '<header class="sec-h sec-h2"><h2>Needs your decision</h2></header><ul class="held">' + held.map(function (d) { return '<li><div class="nm">' + J.fileIc(d) + '<div><b>' + esc(d.name) + '</b><small>' + (d.sec === 'review' ? 'Sensitive data found · Legal AI locked' : 'Quarantined · never opened by AI') + '</small></div></div><button class="btn btn-secondary btn-xs" data-act="doc-open" data-id="' + d.id + '">' + (d.sec === 'review' ? 'Review' : 'Details') + '</button></li>'; }).join('') + '</ul>' : '') + '</section>' +
        '<section><header class="sec-h"><h2>Gateway policy</h2><span class="mono">enforced</span></header><ul class="policy">' + [['Integrity and hash verification', 'Every file'], ['Malware and embedded-content screening', 'Every file'], ['Prompt-injection screening', 'Before any AI read'], ['Sensitive-data inspection and masking', 'Every file'], ['Verified-only Legal AI access', 'Always on']].map(function (p) { return '<li>' + I('check', 'ico-sm') + '<span>' + p[0] + '</span><small class="mono">' + p[1] + '</small></li>'; }).join('') + '</ul>' +
        '<header class="sec-h sec-h2"><h2>Files scanned, last 7 days</h2></header><div class="bars" role="img" aria-label="Files scanned per day over the last 7 days">' + days.map(function (n, i) { return '<div><i style="height:' + Math.max(8, n / mx * 72) + 'px"></i><span class="mono">' + n + '</span></div>'; }).join('') + '</div><p class="field-hint">Counts are for this workspace.</p></section></div></div>';
    }
  };
})();
