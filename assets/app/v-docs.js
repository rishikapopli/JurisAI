/* DOCUMENTS library + SECURE DOCUMENT INTAKE (security gate) */
(function () {
  'use strict';
  var J = window.J, D = J.data, esc = J.esc, I = J.icon, A = J.actions, $ = J.$;

  /* ---------- helpers shared with onboarding ---------- */
  var STAGES = [
    ['File received', 'Isolated in a sandbox'], ['Integrity check', 'Hash and file structure'], ['Threat screening', 'Malware, embedded content, prompt injection'],
    ['Sensitive data inspection', 'Personal and financial identifiers'], ['Document verification', 'Attestation and release decision'], ['Legal AI access', 'Analysis begins on verified files only']
  ];
  var OUT = {
    verified: [['pass', 'Isolated'], ['pass', 'SHA-256 recorded · structure valid'], ['pass', 'No malware · no embedded scripts · no injection'], ['pass', 'No unexpected identifiers'], ['pass', 'Attested and released'], ['pass', 'Unlocked']],
    review: [['pass', 'Isolated'], ['pass', 'SHA-256 recorded · structure valid'], ['pass', 'No threats found'], ['flag', '3 identifiers found (bank accounts, national ID)'], ['hold', 'Awaiting your decision'], ['lock', 'Locked until reviewed']],
    blocked: [['pass', 'Isolated'], ['pass', 'File structure readable'], ['fail', 'Embedded script and obfuscated stream detected'], ['skip', 'Skipped'], ['fail', 'Quarantined — never opened by AI'], ['lock', 'Locked']],
    corrupt: [['pass', 'Isolated'], ['fail', 'File structure unreadable'], ['skip', 'Skipped'], ['skip', 'Skipped'], ['skip', 'Skipped'], ['lock', 'Locked']],
    unsupported: [['fail', 'File type not accepted'], ['skip', 'Skipped'], ['skip', 'Skipped'], ['skip', 'Skipped'], ['skip', 'Skipped'], ['lock', 'Locked']]
  };
  var ST = { pass: ['Passed', 'ok', 'check'], flag: ['Flagged', 'warn', 'alert'], hold: ['On hold', 'warn', 'clock'], fail: ['Failed', 'risk', 'x'], skip: ['Skipped', '', 'x'], lock: ['Locked', 'lock', 'lock'], run: ['Checking', 'run', 'scan'], wait: ['Queued', '', 'clock'] };
  J.gateOutcomes = OUT;
  J.gatePipeline = function (outcome, step, done, dark) {
    var fin = OUT[outcome];
    return '<ol class="gate' + (dark ? ' gate-dark' : '') + '">' + STAGES.map(function (s, i) {
      var st = i < step ? fin[i][0] : (i === step && !done ? 'run' : 'wait'), detail = i < step ? fin[i][1] : (st === 'run' ? 'Working…' : 'Queued');
      var last = i === 5, label = last ? (st === 'pass' ? 'Unlocked' : st === 'lock' ? 'Locked' : st === 'run' ? 'Pending' : 'Locked') : ST[st][0];
      var cls = last && st === 'wait' ? 'lock' : ST[st][1];
      var ico = last ? (st === 'pass' ? 'unlock' : 'lock') : ST[st][2];
      return '<li class="g-' + st + (last ? ' g-last' : '') + '"><span class="g-mk">' + I(ico, 'ico-sm') + '</span><div class="g-b"><b>' + s[0] + '</b><small>' + esc(detail) + '</small></div><span class="g-st g-st-' + cls + '">' + label + '</span></li>';
    }).join('') + '</ol>';
  };

  function guessType(n) { n = n.toLowerCase(); if (/nda|confiden/.test(n)) return 'Non-disclosure agreement'; if (/lease|licen/.test(n)) return 'Lease agreement'; if (/employ|offer/.test(n)) return 'Employment agreement'; if (/msa|service/.test(n)) return 'Services agreement'; if (/polic|handbook/.test(n)) return 'Policy'; return 'Legal document'; }
  function hex(n) { var s = ''; while (s.length < n) s += Math.floor(Math.random() * 16).toString(16); return s; }
  var counter = 0;
  /* creates a library record + audit events for a completed intake */
  J.registerUpload = function (name, sizeLabel, outcome) {
    if (outcome === 'unsupported' || outcome === 'corrupt') { D.addEvent({ type: 'block', title: outcome === 'corrupt' ? 'File rejected (corrupted)' : 'File rejected (unsupported type)', obj: name, go: 'documents/intake', who: 'Security gateway', meta: outcome === 'corrupt' ? 'INT-210' : 'TYPE-415' }); return null; }
    var id = 'u' + (++counter), sec = outcome === 'review' ? 'review' : outcome === 'blocked' ? 'blocked' : 'verified';
    var scanKind = { verified: 'ok', review: 'sensitive', blocked: 'blocked' }[outcome];
    var tmp = { id: id, name: name, type: guessType(name), size: sizeLabel, pages: 4 + Math.floor(Math.random() * 20), uploaded: new Date(), sec: sec, an: 'pending', jur: J.settings.jur, sha: hex(8) + '…' + hex(4), mime: 'application/pdf' };
    var LB = ['Integrity check', 'Threat screening', 'Sensitive data inspection', 'Document verification'];
    tmp.scan = OUT[outcome].slice(1, 5).map(function (r, i) { return [LB[i], r[0], r[1]]; });
    if (outcome === 'review') tmp.sensitive = [{ kind: 'Bank account number', val: '•••• •••• ' + hex(4).replace(/[a-f]/g, '7'), page: 3 }, { kind: 'Bank account number', val: '•••• •••• ' + hex(4).replace(/[a-f]/g, '2'), page: 3 }, { kind: 'National ID', val: '•••• •••• ' + hex(4).replace(/[a-f]/g, '9'), page: 4 }];
    D.docs.unshift(tmp);
    D.addEvent({ type: 'upload', title: 'Document uploaded', obj: name + ' · ' + sizeLabel, doc: id, go: 'documents', who: 'You', meta: '' });
    D.addEvent({ type: outcome === 'blocked' ? 'block' : 'scan', title: outcome === 'blocked' ? 'File blocked' : 'Security scan completed', obj: name, doc: id, go: 'documents', who: 'Security gateway', meta: outcome === 'verified' ? '4 of 4 checks passed' : outcome === 'review' ? '3 of 4 checks passed · 1 flagged' : 'Quarantined' });
    if (outcome === 'verified') D.addEvent({ type: 'verify', title: 'Document verified', obj: name, doc: id, go: 'documents', who: 'Security gateway', meta: 'sha256 ' + tmp.sha });
    if (outcome === 'review') D.notifs.unshift({ kind: 'warn', icon: 'alert', title: 'Review required', text: name + ' contains sensitive data. Legal AI access is on hold.', at: new Date(), go: 'documents?f=review', read: false });
    if (outcome === 'blocked') D.notifs.unshift({ kind: 'risk', icon: 'lock', title: 'File blocked', text: name + ' was quarantined by the security gateway.', at: new Date(), go: 'security', read: false });
    return tmp;
  };
  /* analysis for a freshly uploaded document: reuse a content template so the product feels continuous */
  J.ensureContent = function (d) {
    if (d.content) return;
    var t = D.docById('lease').content;
    d.content = JSON.parse(JSON.stringify(t));
    d.content.summary = 'A ' + d.type.toLowerCase() + ' of ' + d.pages + ' pages uploaded to your workspace. JURISAI extracted its structure and mapped the key clauses below.';
    d.content.facts = [['Type', d.type], ['Pages', String(d.pages)], ['Uploaded', { iso: d.uploaded.toISOString().slice(0, 10) }], ['Jurisdiction', J.jurName(d.jur)]];
    d.content.dates = d.content.dates.slice(0, 1).map(function (x) { return Object.assign({}, x, { ref: d.id + ':' + x.ref.split(':')[1] }); });
    d.content.obligations = d.content.obligations.map(function (x) { return Object.assign({}, x, { ref: d.id + ':' + x.ref.split(':')[1] }); });
    d.content.issues = []; d.content.defs = d.content.defs.map(function (x) { return Object.assign({}, x, { ref: d.id + ':' + x.ref.split(':')[1] }); });
    d.content.law = { text: 'Governing law is not stated in the extract analysed.', ref: d.id + ':1.1', jur: d.jur };
  };

  /* ---------- sensitive-data decisions ---------- */
  function setSens(d, text, how) {
    d.sec = 'verified'; d.scan[2] = ['Sensitive data inspection', 'pass', text]; d.scan[3] = ['Document verification', 'pass', 'Attested and released to Legal AI'];
    D.addEvent({ type: 'verify', title: 'Document verified', obj: d.name + ' · ' + how, doc: d.id, go: 'documents', who: 'You', meta: 'Sensitive data ' + (how === 'redacted' ? 'redacted' : 'acknowledged') });
  }
  A['doc-redact'] = function (el) { var d = D.docById(el.dataset.id); setSens(d, '3 items redacted and masked before analysis', 'redacted'); J.ui.closeDrawer(); J.toast('Redacted and verified. Legal AI is now unlocked for ' + esc(d.name)); J.render(true); };
  A['doc-release'] = function (el) {
    var id = el.dataset.id, d = D.docById(id);
    J.ui.modal({ title: 'Release with acknowledgement', html: '<p class="muted">' + esc(d.name) + ' contains ' + (d.sensitive ? d.sensitive.length : 3) + ' sensitive identifiers. Releasing it lets Legal AI read them as part of the analysis. The decision is recorded in your audit log.</p><label class="check"><input type="checkbox" id="rel-ack"> I understand and confirm this document may be analysed with these identifiers present.</label>', foot: '<button class="btn btn-secondary btn-sm" data-act="modal-close">Cancel</button><button class="btn btn-primary btn-sm" data-act="doc-release-ok" data-id="' + id + '">Release to Legal AI</button>' });
  };
  A['doc-release-ok'] = function (el) {
    if (!$('#rel-ack').checked) { J.toast('Please confirm the acknowledgement first', 'warn'); return; }
    var d = D.docById(el.dataset.id); setSens(d, '3 items acknowledged and released by you', 'acknowledged'); J.ui.closeModal(); J.ui.closeDrawer(); J.toast('Released. Legal AI is now unlocked for ' + esc(d.name)); J.render(true);
  };
  A['doc-hold'] = function () { J.ui.closeDrawer(); J.toast('Kept on hold. Legal AI stays locked for this file.', 'warn'); };
  A['doc-manual'] = function (el) { var d = D.docById(el.dataset.id); D.addEvent({ type: 'review', title: 'Manual review requested', obj: d.name, doc: d.id, go: 'security', who: 'You', meta: 'Security team notified' }); J.ui.closeDrawer(); J.toast('Manual review requested. You will be notified of the outcome.'); };
  A['scan-report'] = function (el) {
    var d = D.docById(el.dataset.doc) || { name: 'file', scan: [], sha: '—' };
    var txt = 'JURISAI SECURITY SCAN REPORT\nFile: ' + d.name + '\nSHA-256: ' + d.sha + '\nGenerated: ' + new Date().toISOString() + '\n\n' + d.scan.map(function (c) { return c[0].toUpperCase() + ' — ' + c[1].toUpperCase() + '\n  ' + c[2]; }).join('\n') + '\n\nNothing enters Legal AI until it passes the security gate.\n';
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' })); a.download = d.name.replace(/\.[^.]+$/, '') + '_scan_report.txt'; document.body.appendChild(a); a.click(); a.remove(); J.toast('Scan report downloaded');
  };

  /* ---------- document drawer ---------- */
  function checksHTML(d) {
    var ic = { pass: ['check', 'ok'], flag: ['alert', 'warn'], hold: ['clock', 'warn'], fail: ['x', 'risk'], skip: ['x', ''], run: ['scan', 'run'], wait: ['clock', ''] };
    return '<ul class="checks">' + d.scan.map(function (c) { return '<li class="c-' + c[1] + '"><span class="c-ic c-' + (ic[c[1]] || ic.wait)[1] + '">' + I((ic[c[1]] || ic.wait)[0], 'ico-sm') + '</span><div><b>' + c[0] + '</b><small>' + esc(c[2]) + '</small></div></li>'; }).join('') + '</ul>';
  }
  J.checksHTML = checksHTML;
  A['doc-open'] = function (el) {
    var d = D.docById(el.dataset.id); if (!d) return;
    var locked = d.sec !== 'verified';
    var body = '<div class="dd-top">' + J.fileIc(d) + '<div><div class="dd-chips">' + J.secChip(d.sec) + J.anChip(d) + '</div><p class="muted">' + esc(d.type) + ' · ' + esc(d.size) + ' · ' + d.pages + ' pages</p></div></div>' +
      '<dl class="dl dd-meta"><dt>Uploaded</dt><dd>' + J.fmt.dt(d.uploaded) + '</dd><dt>Jurisdiction</dt><dd>' + J.jurName(d.jur) + '</dd><dt>SHA-256</dt><dd class="mono">' + esc(d.sha) + '</dd></dl>' +
      '<div class="gate-access ' + (locked ? 'locked' : 'open') + '">' + I(locked ? 'lock' : 'unlock') + '<div><b>Legal AI access: ' + (locked ? 'LOCKED' : 'UNLOCKED') + '</b><small>' + (d.sec === 'review' ? 'Waiting for your decision on sensitive data.' : d.sec === 'blocked' ? 'Quarantined. This file is never opened by any AI component.' : d.sec === 'processing' ? 'The security gateway is still scanning this file.' : 'Verified and attested. Ready for analysis.') + '</small></div></div>' +
      '<h3 class="dd-h">Security checks</h3>' + checksHTML(d);
    if (d.sec === 'review' && d.sensitive) body += '<h3 class="dd-h">Sensitive items detected</h3><table class="tbl tbl-tight"><tbody>' + d.sensitive.map(function (s) { return '<tr><td>' + s.kind + '</td><td class="mono">' + s.val + '</td><td class="mono">p.' + s.page + '</td></tr>'; }).join('') + '</tbody></table><p class="field-hint">Values are masked here. JURISAI never shows full identifiers in the interface.</p>';
    var foot = '';
    if (d.sec === 'verified') foot = (d.archived ? '' : '<button class="btn btn-secondary btn-sm" data-go="compare?a=' + d.id + '">' + I('compare', 'ico-sm') + 'Compare</button><button class="btn btn-secondary btn-sm" data-go="research?doc=' + d.id + '">' + I('sparkle', 'ico-sm') + 'Ask</button>') + '<button class="btn btn-primary btn-sm" data-go="analyze/' + d.id + '">' + I('analyze', 'ico-sm') + (d.an === 'analyzed' ? 'Open analysis' : 'Analyze') + '</button>';
    if (d.sec === 'review') foot = '<button class="btn btn-secondary btn-sm" data-act="doc-hold">Keep on hold</button><button class="btn btn-secondary btn-sm" data-act="doc-release" data-id="' + d.id + '">Release…</button><button class="btn btn-primary btn-sm" data-act="doc-redact" data-id="' + d.id + '">Redact &amp; verify</button>';
    if (d.sec === 'blocked') foot = '<button class="btn btn-secondary btn-sm" data-act="scan-report" data-doc="' + d.id + '">' + I('download', 'ico-sm') + 'Scan report</button><button class="btn btn-primary btn-sm" data-act="doc-manual" data-id="' + d.id + '">Request manual review</button>';
    if (d.sec === 'processing') foot = '<button class="btn btn-secondary btn-sm" data-go="documents/intake">View in secure intake</button>';
    J.ui.drawer({ kicker: 'Document', title: esc(d.name), html: body, foot: foot });
  };

  /* ---------- row actions ---------- */
  A['doc-menu'] = function (el, e) {
    e.stopPropagation(); var d = D.docById(el.dataset.id), v = d.sec === 'verified';
    var items = [{ label: 'Open details', icon: 'eye', fn: function () { A['doc-open']({ dataset: { id: d.id } }); } }];
    if (v) items.push({ label: 'Analyze', icon: 'analyze', fn: function () { J.go('analyze/' + d.id); } }, { label: 'Compare with…', icon: 'compare', fn: function () { J.go('compare?a=' + d.id); } }, { label: 'Generate report', icon: 'file', fn: function () { J.go('reports?doc=' + d.id); } });
    items.push({ label: 'Download scan report', icon: 'download', fn: function () { A['scan-report']({ dataset: { doc: d.id } }); } }, { divider: true },
      { label: d.archived ? 'Restore from archive' : 'Archive', icon: 'archive', fn: function () { d.archived = !d.archived; J.toast(d.archived ? 'Archived ' + esc(d.name) : 'Restored ' + esc(d.name)); J.render(true); } },
      { label: 'Remove from library', icon: 'trash', danger: true, fn: function () { A['doc-delete']({ dataset: { id: d.id } }); } });
    J.ui.menu(el, items, { align: 'right', width: 230 });
  };
  A['doc-delete'] = function (el) {
    var d = D.docById(el.dataset.id);
    J.ui.modal({ title: 'Remove from library?', html: '<p class="muted"><b>' + esc(d.name) + '</b> will be permanently removed together with its analysis. The audit log keeps a record that it existed.</p>', foot: '<button class="btn btn-secondary btn-sm" data-act="modal-close">Cancel</button><button class="btn btn-danger btn-sm" data-act="doc-delete-ok" data-id="' + d.id + '">Remove</button>' });
  };
  A['doc-delete-ok'] = function (el) { var i = D.docs.findIndex(function (x) { return x.id === el.dataset.id; }); var n = D.docs[i].name; D.docs.splice(i, 1); J.ui.closeModal(); J.toast('Removed ' + esc(n)); J.render(true); };

  /* ======================= DOCUMENTS LIBRARY ======================= */
  var FILTERS = [['all', 'All'], ['verified', 'Verified'], ['review', 'Review required'], ['blocked', 'Blocked'], ['processing', 'Processing'], ['archived', 'Archived']];
  function filtered(f, q) {
    return D.docs.filter(function (d) {
      if (f === 'archived') { if (!d.archived) return false; } else { if (d.archived) return false; if (f !== 'all' && d.sec !== f) return false; }
      return !q || (d.name + ' ' + d.type + ' ' + J.jurName(d.jur)).toLowerCase().indexOf(q.toLowerCase()) >= 0;
    });
  }
  function rows(f, q) {
    var list = filtered(f, q);
    if (!list.length) {
      var noq = !q && f === 'all';
      return '<tr><td colspan="7">' + J.empty(noq ? { icon: 'folder', title: 'Your library is empty', text: 'Upload your first document. Every file passes the security gateway before Legal AI can read it.', actions: '<a class="btn btn-primary btn-sm" href="#/documents/intake">' + I('upload', 'ico-sm') + 'Upload Document</a>' } : { icon: 'search', title: 'No matching documents', text: q ? 'Nothing matches “' + esc(q) + '” in this view.' : 'No documents have this status.', actions: '<button class="btn btn-secondary btn-sm" data-act="docs-clear">Clear search and filters</button>' }) + '</td></tr>';
    }
    return list.map(function (d) {
      return '<tr class="row" data-act="doc-open" data-id="' + d.id + '"><td><div class="nm">' + J.fileIc(d) + '<div><b>' + esc(d.name) + '</b><small>' + esc(d.size) + ' · ' + d.pages + ' pages</small></div></div></td><td class="hide-md">' + esc(d.type) + '</td><td class="hide-md mono">' + J.fmt.date(d.uploaded) + '</td><td>' + J.secChip(d.sec) + '</td><td class="hide-sm">' + J.anChip(d) + '</td><td class="hide-sm">' + J.jurName(d.jur) + '</td><td class="tr"><button class="icon-btn" data-act="doc-menu" data-id="' + d.id + '" aria-label="Actions for ' + esc(d.name) + '">' + I('more') + '</button></td></tr>';
    }).join('');
  }
  var dState = { f: 'all', q: '' };
  J.views.documents = {
    title: 'Documents', fixed: true, crumbs: function () { return ['Documents']; },
    render: function (r) {
      if (r.q.f) dState.f = r.q.f; if (r.q.q != null) dState.q = r.q.q; if (!r.q.f && !r.q.q && r.name === 'documents') { /* keep state */ }
      var all = D.docs.filter(function (d) { return !d.archived; });
      var cnt = function (k) { return k === 'archived' ? D.docs.filter(function (d) { return d.archived; }).length : k === 'all' ? all.length : all.filter(function (d) { return d.sec === k; }).length; };
      return '<header class="ph"><div><div class="kicker">Workspace</div><h1>Documents</h1><p class="sub">Every file is scanned and verified before Legal AI can read it.</p></div><div class="ph-actions"><a class="btn btn-secondary btn-sm" href="#/documents/intake?mode=folder">' + I('folder-up', 'ico-sm') + 'Upload Folder</a><a class="btn btn-primary btn-sm" href="#/documents/intake">' + I('upload', 'ico-sm') + 'Upload Document</a></div></header>' +
        '<div class="lib-bar pad"><label class="lib-search">' + I('search', 'ico-sm') + '<input id="lib-q" type="search" placeholder="Search by name, type or jurisdiction" value="' + esc(dState.q) + '" aria-label="Search documents"></label>' +
        '<div class="tabs" role="tablist">' + FILTERS.map(function (f) { return '<button role="tab" class="' + (dState.f === f[0] ? 'on' : '') + '" data-act="docs-filter" data-f="' + f[0] + '">' + f[1] + ' <span class="n">' + cnt(f[0]) + '</span></button>'; }).join('') + '</div></div>' +
        '<div class="lib-scroll pad"><table class="tbl lib"><thead><tr><th>Document</th><th class="hide-md">Type</th><th class="hide-md">Uploaded</th><th>Security</th><th class="hide-sm">Analysis</th><th class="hide-sm">Jurisdiction</th><th></th></tr></thead><tbody id="lib-rows">' + rows(dState.f, dState.q) + '</tbody></table></div>';
    },
    mount: function () {
      $('#lib-q').addEventListener('input', function (e) { dState.q = e.target.value; $('#lib-rows').innerHTML = rows(dState.f, dState.q); });
    }
  };
  A['docs-filter'] = function (el) { dState.f = el.dataset.f; J.render(true); };
  A['docs-clear'] = function () { dState.f = 'all'; dState.q = ''; J.render(true); };

  /* ======================= SECURE DOCUMENT INTAKE ======================= */
  var SAMPLES = [
    ['verified', 'Lease_Renewal_Draft.pdf', '1.6 MB', 'Clean contract'], ['review', 'Payroll_Bank_Details.docx', '212 KB', 'Contains sensitive data'],
    ['blocked', 'Invoice_macro_inject.pdf', '890 KB', 'Malicious content'], ['corrupt', 'Contract_corrupt.pdf', '0.9 MB', 'Corrupted file'], ['unsupported', 'installer_setup.exe', '14 MB', 'Unsupported type']
  ];
  var queue = [], active = -1;
  function sizeLabel(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
  function addFiles(list) {
    list.forEach(function (f) {
      queue.push({ name: f.name, size: f.size, outcome: f.outcome || D.evaluateFile(f.name), step: 0, done: false, doc: null });
    });
    active = queue.length - list.length; runNext();
  }
  function runNext() {
    var idx = queue.findIndex(function (q) { return !q.done && !q.running; });
    if (idx < 0 || queue.some(function (q) { return q.running; })) { paint(); return; }
    var it = queue[idx]; it.running = true; active = idx;
    if (J.state.offline || !navigator.onLine) { it.done = true; it.running = false; it.outcome = 'network'; paint(); return; }
    paint();
    (function tick() {
      if (!$('#gate-host') && !$('#intake-queue')) { /* view left: finish instantly */ while (it.step < 6) it.step++; finish(it); return; }
      if (it.step < 6) { it.step++; paint(); J.later(tick, it.step === 3 ? 950 : 700); } else finish(it);
    })();
  }
  function finish(it) {
    it.done = true; it.running = false; it.doc = J.registerUpload(it.name, sizeLabel(it.size), it.outcome); paint();
    if (it.outcome === 'verified') J.toast(esc(it.name) + ' verified. Legal AI is unlocked.');
    else if (it.outcome === 'review') J.toast(esc(it.name) + ' needs your review', 'warn'); else J.toast(esc(it.name) + ' was not admitted', 'risk');
    runNext();
  }
  function resultHTML(it) {
    if (!it.done) return '';
    if (it.outcome === 'network') return J.errorState('network');
    if (it.outcome === 'verified') return '<div class="banner banner-ok">' + I('shield-check') + '<div><b>Verified.</b> ' + esc(it.name) + ' passed all four checks and is attested (' + it.doc.sha + '). Legal AI can now read it.</div></div><div class="res-a"><button class="btn btn-primary btn-sm" data-go="analyze/' + it.doc.id + '">' + I('analyze', 'ico-sm') + 'Analyze document</button><button class="btn btn-secondary btn-sm" data-go="compare?a=' + it.doc.id + '">' + I('compare', 'ico-sm') + 'Compare</button><button class="btn btn-secondary btn-sm" data-go="research?doc=' + it.doc.id + '">' + I('sparkle', 'ico-sm') + 'Ask JURISAI</button></div>';
    if (it.outcome === 'review') return '<div class="banner banner-warn">' + I('alert') + '<div><b>Review required.</b> The file is safe to open but contains sensitive identifiers. Legal AI stays locked until you decide.</div></div><table class="tbl tbl-tight"><tbody>' + it.doc.sensitive.map(function (s) { return '<tr><td>' + s.kind + '</td><td class="mono">' + s.val + '</td><td class="mono">p.' + s.page + '</td></tr>'; }).join('') + '</tbody></table><div class="res-a"><button class="btn btn-primary btn-sm" data-act="doc-redact" data-id="' + it.doc.id + '">Redact &amp; verify</button><button class="btn btn-secondary btn-sm" data-act="doc-release" data-id="' + it.doc.id + '">Release with acknowledgement…</button><button class="btn btn-secondary btn-sm" data-act="doc-hold">Keep on hold</button></div>';
    if (it.outcome === 'blocked') return J.errorState('scan', { doc: it.doc && it.doc.id });
    return J.errorState(it.outcome);
  }
  function paint() {
    var qh = $('#intake-queue'), gh = $('#gate-host'); if (!qh || !gh) return;
    qh.innerHTML = queue.map(function (q, i) {
      var chip = !q.done ? '<span class="chip chip-gold"><i class="dot pulse"></i>Scanning</span>' : q.outcome === 'verified' ? J.secChip('verified') : q.outcome === 'review' ? J.secChip('review') : q.outcome === 'blocked' ? J.secChip('blocked') : q.outcome === 'network' ? J.chip('chip-risk', 'Network error', 'wifi-off') : J.chip('chip-warn', q.outcome === 'corrupt' ? 'Corrupted' : 'Unsupported', 'file-x');
      return '<button class="q-i' + (i === active ? ' on' : '') + '" data-act="intake-pick" data-i="' + i + '"><span><b>' + esc(q.name) + '</b><small class="mono">' + sizeLabel(q.size) + '</small></span>' + chip + '</button>';
    }).join('') || '<p class="field-hint">Files you add appear here.</p>';
    var it = queue[active];
    if (!it) { gh.innerHTML = '<div class="gate-idle">' + J.gatePipeline('verified', 0, false) .replace(/<li class="g-run/, '<li class="g-wait').replace(/Working…/g, 'Queued').replace(/g-st g-st-run">Checking/, 'g-st g-st-">Queued') + '<p class="gate-note">' + I('lock', 'ico-sm') + 'Legal AI is <b>locked</b>. Add a document to begin secure intake.</p></div>'; return; }
    var oc = it.outcome === 'network' ? 'verified' : it.outcome;
    gh.innerHTML = '<div class="gate-file">' + I('file') + '<div><b>' + esc(it.name) + '</b><small class="mono">' + sizeLabel(it.size) + (it.done ? '' : ' · scanning') + '</small></div></div>' + (it.outcome === 'network' ? '' : J.gatePipeline(oc, it.step, it.done)) + '<div class="res">' + resultHTML(it) + '</div>';
  }
  A['intake-pick'] = function (el) { active = +el.dataset.i; paint(); };
  A['intake-reset'] = function () { queue = []; active = -1; J.render(true); };
  A['intake-sample'] = function (el) { var s = SAMPLES[+el.dataset.i]; addFiles([{ name: s[1], size: s[2].indexOf('MB') > 0 ? parseFloat(s[2]) * 1048576 : parseFloat(s[2]) * 1024, outcome: s[0] }]); };
  A['intake-browse'] = function (el) { $(el.dataset.input).click(); };

  J.views.intake = {
    title: 'Secure intake', nav: 'documents', fixed: true, crumbs: function () { return [['Documents', '#/documents'], 'Secure intake']; },
    render: function (r) {
      var folder = r.q.mode === 'folder';
      return '<header class="ph"><div><div class="kicker">Security gate</div><h1>Secure document <em>intake</em></h1><p class="sub">Nothing enters Legal AI until it passes the security gate.</p></div><div class="ph-actions"><a class="linkbtn" href="#/help/sec1">How the gate works</a></div></header>' +
        '<div class="intake pad"><div class="intake-l">' +
        '<div class="drop" id="drop" tabindex="0" role="button" data-act="intake-browse" data-input="#file-in"><div class="drop-ic">' + I(folder ? 'folder-up' : 'upload', 'ico-lg') + '</div><b>' + (folder ? 'Drop a folder here' : 'Drop documents here') + '</b><span>or <u>browse your computer</u> · PDF, DOCX, TXT, scanned images · up to 50 MB</span><small class="mono">' + I('lock', 'ico-xs') + ' Files are isolated on arrival and never opened by AI before verification</small></div>' +
        '<input type="file" id="file-in" multiple ' + (folder ? 'webkitdirectory' : '') + ' hidden>' +
        '<div class="sample"><span class="k">Try a sample</span>' + SAMPLES.map(function (s, i) { return '<button class="sugg" data-act="intake-sample" data-i="' + i + '">' + s[3] + '</button>'; }).join('') + '</div>' +
        '<div class="q-h"><span class="k">Intake queue</span></div><div id="intake-queue" class="queue"></div></div>' +
        '<div class="intake-r"><div class="gate-h"><span class="k">Security gateway</span><span class="chip chip-ok"><i class="dot dot-ok pulse"></i>Online</span></div><div id="gate-host"></div></div></div>';
    },
    mount: function (host) {
      var inp = $('#file-in'), drop = $('#drop');
      inp.addEventListener('change', function () { var fs = [].slice.call(inp.files).filter(function (f) { return !/^\./.test(f.name); }); if (fs.length) addFiles(fs.map(function (f) { return { name: f.name, size: f.size }; })); inp.value = ''; });
      ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
      drop.addEventListener('drop', function (e) { var fs = [].slice.call(e.dataTransfer.files); if (fs.length) addFiles(fs.map(function (f) { return { name: f.name, size: f.size }; })); });
      drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } });
      /* resume any running items */
      queue.forEach(function (q) { if (q.running) q.running = false; });
      paint(); runNext();
    }
  };
})();
