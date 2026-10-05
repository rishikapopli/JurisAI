/* WELCOME / ONBOARDING — bare, full-screen, 5 steps */
(function () {
  'use strict';
  var J = window.J, D = J.data, esc = J.esc, I = J.icon, A = J.actions, $ = J.$;
  var W = J.state.welcome = { step: 0, use: '', jur: '', doc: null, outcome: 'verified', fname: '', scanDone: false };
  var USES = [['review', 'Review contracts', 'Understand clauses, dates and obligations in agreements.', 'file'], ['compare', 'Check consistency', 'Find contradictions across policies and contracts.', 'compare'], ['research', 'Legal research', 'Ask grounded questions with cited sources.', 'scales'], ['compliance', 'Compliance & policy', 'Track obligations against governing law.', 'shield-check']];
  var STEPS = ['Choose your use case', 'Select jurisdiction', 'Upload first document', 'Security scan', 'First analysis'];

  function rail() {
    return '<ol class="wl-rail">' + STEPS.map(function (s, i) { return '<li class="' + (i < W.step ? 'done' : i === W.step ? 'on' : '') + '"><span class="n mono">' + (i < W.step ? '✓' : i + 1) + '</span><span>' + s + '</span></li>'; }).join('') + '</ol>';
  }
  function body() {
    var s = W.step;
    if (s === 0) return '<div class="k">Step 1 of 5</div><h1>What will you use <em>JURISAI</em> for?</h1><p class="sub">This tunes suggestions. You can change it any time in Settings.</p><div class="wl-opts">' + USES.map(function (u) { return '<button class="wl-opt ' + (W.use === u[0] ? 'on' : '') + '" data-act="wl-use" data-v="' + u[0] + '">' + I(u[3]) + '<b>' + u[1] + '</b><small>' + u[2] + '</small></button>'; }).join('') + '</div>';
    if (s === 1) return '<div class="k">Step 2 of 5</div><h1>Which <em>jurisdiction</em> do you work in?</h1><p class="sub">Legal context and research are scoped to this. Sources outside it are never mixed in silently.</p><div class="wl-opts wl-jur">' + D.jurs.map(function (j) { return '<button class="wl-opt ' + (W.jur === j.id ? 'on' : '') + '" data-act="wl-jur" data-v="' + j.id + '"><b>' + esc(j.name) + '</b><small>' + esc(j.sys) + '</small></button>'; }).join('') + '</div>';
    if (s === 2) return '<div class="k">Step 3 of 5</div><h1>Upload your first <em>document</em></h1><p class="sub">Every file passes the security gateway before Legal AI can read it.</p><div class="wl-drop"><div>' + I('upload', 'ico-lg') + '<b>Choose a file</b><small>PDF, DOCX or TXT · up to 50 MB</small><input type="file" id="wl-file" accept=".pdf,.doc,.docx,.txt" hidden><button class="btn btn-primary btn-sm" data-act="wl-browse">Browse files</button></div></div><p class="wl-or">or use a sample</p><div class="wl-samples"><button class="btn btn-secondary btn-sm" data-act="wl-sample" data-n="Employment_Agreement.pdf">Employment_Agreement.pdf</button><button class="btn btn-secondary btn-sm" data-act="wl-sample" data-n="Mutual_NDA.pdf">Mutual_NDA.pdf</button></div>';
    if (s === 3) return '<div class="k">Step 4 of 5</div><h1>Secure <em>scan</em></h1><p class="sub">' + esc(W.fname) + '</p><div class="wl-gate" id="wl-gate"></div>';
    return '<div class="k">Step 5 of 5</div><h1>Your first <em>analysis</em></h1><p class="sub">' + esc(W.fname) + '</p><div id="wl-an"></div>';
  }
  function foot() {
    var s = W.step, nx = '', can = (s === 0 && W.use) || (s === 1 && W.jur) || (s === 3 && W.scanDone && W.outcome !== 'blocked');
    if (s < 2) nx = '<button class="btn btn-primary" data-act="wl-next"' + (can ? '' : ' disabled') + '>Continue' + I('arrow-right', 'ico-sm') + '</button>';
    if (s === 3) nx = '<button class="btn btn-primary" data-act="wl-next"' + (W.scanDone && W.outcome !== 'blocked' ? '' : ' disabled') + '>Analyze document' + I('arrow-right', 'ico-sm') + '</button>';
    return '<div class="wl-foot">' + (s > 0 && s !== 3 && s !== 4 ? '<button class="btn btn-secondary" data-act="wl-back">Back</button>' : '<span></span>') + nx + '</div>';
  }
  function paint() {
    $('#wl-main').innerHTML = '<div class="wl-card">' + body() + '</div>' + (W.step === 4 ? '' : foot());
    $('#wl-rail').innerHTML = rail();
    if (W.step === 2) $('#wl-file').addEventListener('change', function (e) { var f = e.target.files[0]; if (f) pick(f.name, D.evaluateFile(f.name)); });
    if (W.step === 3) scan();
    if (W.step === 4) analysis();
  }
  function pick(name, outcome) {
    if (outcome === 'unsupported' || outcome === 'corrupt') { J.toast(outcome === 'corrupt' ? 'That file looks corrupted. Try another.' : 'File type not accepted. Use PDF, DOCX or TXT.', 'warn'); return; }
    W.fname = name; W.outcome = outcome; W.scanDone = false; W.step = 3; paint();
  }
  function scan() {
    var g = $('#wl-gate'), step = 0, oc = W.outcome === 'network' ? 'verified' : W.outcome;
    (function tick() {
      if (!g.isConnected) return;
      g.innerHTML = J.gatePipeline(oc, step, step >= 6) + (step >= 6 ? '<p class="gate-note">' + I(oc === 'blocked' ? 'lock' : 'shield-check', 'ico-sm') + (oc === 'verified' ? 'Verified. Legal AI is <b>unlocked</b> for this document.' : oc === 'review' ? 'Sensitive data found. You can continue after review in Documents.' : 'This file was blocked and quarantined.') + '</p>' : '');
      if (step < 6) { step++; J.later(tick, 650); } else {
        W.scanDone = true; W.doc = J.registerUpload(W.fname, '1.2 MB', oc);
        if (oc === 'review') { W.outcome = 'review'; }
        var f = $('#wl-main .wl-foot'); if (!f) $('#wl-main').insertAdjacentHTML('beforeend', foot()); else f.outerHTML = foot();
      }
    })();
  }
  function analysis() {
    var h = $('#wl-an'), d = W.doc && W.doc.sec === 'verified' ? W.doc : D.docById('emp');
    if (d.id !== 'emp') J.ensureContent(d);
    J.runSteps(h, 'Document analysis', ['Extracting structure…', 'Identifying clauses…', 'Building document map…'], 700, function () {
      d.an = 'analyzed';
      var c = d.content;
      h.innerHTML = '<div class="wl-prev"><div class="k">Plain-language summary ' + J.tag('ai') + '</div><p>' + esc(c.summary) + '</p><ul class="wl-facts">' + c.facts.slice(0, 4).map(function (f) { return '<li><span>' + esc(f[0]) + '</span><b>' + (typeof f[1] === 'object' ? J.fmt.date(f[1].iso) : esc(f[1])) + '</b></li>'; }).join('') + '</ul><p class="field-hint">AI-assisted reading. Review required before reliance.</p></div><div class="wl-foot"><button class="btn btn-secondary" data-act="wl-finish" data-to="home">Go to dashboard</button><button class="btn btn-primary" data-act="wl-finish" data-to="analyze/' + d.id + '">Open full analysis' + I('arrow-right', 'ico-sm') + '</button></div>';
    });
  }
  function finish(to) { J.store.set('onboarded', true); J.set('jur', W.jur || J.settings.jur); J.go(to || 'home'); }

  J.views.welcome = {
    title: 'Welcome', bare: true,
    render: function () {
      return '<div class="wl"><aside class="wl-side"><a class="wl-logo" href="index.html" aria-label="JURISAI home"><img src="assets/logo-wordmark-light.png" alt="JURISAI"></a><div><div class="k">Welcome' + (J.user().name ? ', ' + esc(J.firstName()) : '') + '</div><h2>Secure. Understand. Verify.</h2><div id="wl-rail"></div></div><p class="wl-fine">' + I('lock', 'ico-sm') + 'Documents are scanned before any AI reads them.</p></aside><main class="wl-main"><div class="wl-top"><span class="mono">First-run setup</span><button class="linkbtn" data-act="wl-skip">Skip for now</button></div><div id="wl-main"></div></main></div>';
    },
    mount: function () { W.step = 0; W.use = ''; W.jur = J.settings.jur || ''; W.scanDone = false; paint(); },
    leave: function () {}
  };
  A['wl-use'] = function (el) { W.use = el.dataset.v; paint(); };
  A['wl-jur'] = function (el) { W.jur = el.dataset.v; paint(); };
  A['wl-next'] = function () { if (W.step === 3 && !W.scanDone) return; W.step++; paint(); };
  A['wl-back'] = function () { W.step = Math.max(0, W.step - 1); paint(); };
  A['wl-browse'] = function () { $('#wl-file').click(); };
  A['wl-sample'] = function (el) { pick(el.dataset.n, D.evaluateFile(el.dataset.n)); };
  A['wl-skip'] = function () { finish('home'); };
  A['wl-finish'] = function (el) { finish(el.dataset.to); };
})();
