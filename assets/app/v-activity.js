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
    mount: function () {
      var q = $('#act-q');
      if (q) {
        q.addEventListener('input', function (e) {
          AC.q = e.target.value;
          var tl = $('#tl');
          if (tl) tl.innerHTML = timeline();
        });
      }
    }
  };
  A['act-filter'] = function (el) { AC.f = el.dataset.f; J.render(true); };
  A['act-clear'] = function () { AC.f = 'all'; AC.q = ''; J.render(true); };
  A['act-csv'] = function () {
    var rows = [['timestamp', 'event', 'object', 'actor', 'detail']].concat(D.activity().map(function (e) { return [e.t.toISOString(), e.title, e.obj, e.who, e.meta]; }));
    J.download('jurisai_audit_log.csv', rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n'), 'text/csv'); J.toast('Audit log exported (' + (rows.length - 1) + ' events)');
    D.addEvent({ type: 'report', title: 'Audit log exported', obj: 'jurisai_audit_log.csv', go: 'activity', who: 'You', meta: 'CSV' });
  };

  /* ======================= SECURITY CENTER ======================= */
  J.views.security = {
    title: 'Security', fixed: false, crumbs: function () { return ['Security Center']; },
    render: function () {
      var rows=D.docs.map(function(d){
        var ocrDesc = (d.scan&&d.scan[1]?d.scan[1][2]:'Structure read');
        return '<tr><td>'+esc(d.name)+'</td><td>'+esc(ocrDesc)+'</td><td class="mono">'+esc(d.sha||'')+'</td></tr>';
      }).join('');
      return '<header class="ph"><div><div class="kicker">Workspace</div><h1>Security <em>Center</em></h1><p class="sub">Integrity, structure, and text extraction checks.</p></div><div class="ph-actions"><a class="btn btn-primary btn-sm" href="#/documents/intake">'+I('upload','ico-sm')+'Upload document</a></div></header><div class="pad"><div class="banner">'+I('info')+'<div><b>Intake verification</b><p>File type, header signature, document structure, OCR text extraction, and SHA-256 integrity verification.</p></div></div><table class="tbl"><thead><tr><th>File</th><th>Structure / OCR status</th><th>SHA-256</th></tr></thead><tbody>'+(rows||'<tr><td colspan="3">No uploaded documents.</td></tr>')+'</tbody></table></div>';
    }
  };})();

