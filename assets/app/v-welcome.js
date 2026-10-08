/* WELCOME / ONBOARDING — bare, full-screen, 5 steps */
(function () {
  'use strict';
  var J = window.J, D = J.data, esc = J.esc, I = J.icon, A = J.actions, $ = J.$;
  var W = J.state.welcome = { step: 0, use: '', jur: '', doc: null, outcome: 'verified', fname: '', file: null, scanDone: false };
  var USES = [['review', 'Review contracts', 'Understand clauses, dates and obligations in agreements.', 'file'], ['compare', 'Check consistency', 'Find contradictions across policies and contracts.', 'compare'], ['research', 'Legal research', 'Ask grounded questions with cited sources.', 'scales'], ['compliance', 'Compliance & policy', 'Track obligations against governing law.', 'shield-check']];
  var STEPS = ['Choose your use case', 'Select jurisdiction', 'Upload first document', 'Security scan', 'First analysis'];

  function rail() {
    return '<ol class="wl-rail">' + STEPS.map(function (s, i) { return '<li class="' + (i < W.step ? 'done' : i === W.step ? 'on' : '') + '"><span class="n mono">' + (i < W.step ? '✓' : i + 1) + '</span><span>' + s + '</span></li>'; }).join('') + '</ol>';
  }
  function body() {
    var s = W.step;
    if (s === 0) return '<div class="k">Step 1 of 5</div><h1>What will you use <em>JURISAI</em> for?</h1><p class="sub">This tunes suggestions. You can change it any time in Settings.</p><div class="wl-opts">' + USES.map(function (u) { return '<button class="wl-opt ' + (W.use === u[0] ? 'on' : '') + '" data-act="wl-use" data-v="' + u[0] + '">' + I(u[3]) + '<b>' + u[1] + '</b><small>' + u[2] + '</small></button>'; }).join('') + '</div>';
    if (s === 1) return '<div class="k">Step 2 of 5</div><h1>Which <em>jurisdiction</em> do you work in?</h1><p class="sub">Legal context and research are scoped to this. Sources outside it are never mixed in silently.</p><div class="wl-opts wl-jur">' + D.jurs.map(function (j) { return '<button class="wl-opt ' + (W.jur === j.id ? 'on' : '') + '" data-act="wl-jur" data-v="' + j.id + '"><b>' + esc(j.name) + '</b><small>' + esc(j.sys) + '</small></button>'; }).join('') + '</div>';
    if (s === 2) return '<div class="k">Step 3 of 5</div><h1>Upload your first <em>document</em></h1><p class="sub">Files receive type, signature, structure, and SHA-256 checks. Antivirus is optional.</p><div class="wl-drop"><div>' + I('upload', 'ico-lg') + '<b>Choose a file</b><small>PDF, DOCX, UTF-8 TXT, PNG, JPG or TIFF · up to 50 MB</small><input type="file" id="wl-file" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.tif,.tiff" hidden><button class="btn btn-primary btn-sm" data-act="wl-browse">Browse files</button></div></div>';
    if (s === 3) return '<div class="k">Step 4 of 5</div><h1>Secure <em>scan</em></h1><p class="sub">' + esc(W.fname) + '</p><div class="wl-gate" id="wl-gate"></div>';
    return '<div class="k">Step 5 of 5</div><h1>Your first <em>analysis</em></h1><p class="sub">' + esc(W.fname) + '</p><div id="wl-an"></div>';
  }
  function foot() {
    var s = W.step, nx = '', can = (s === 0 && W.use) || (s === 1 && W.jur) || (s === 3 && W.scanDone && W.outcome !== 'blocked');
    if (s < 2) nx = '<button class="btn btn-primary" data-act="wl-next"' + (can ? '' : ' disabled') + '>Continue' + I('arrow-right', 'ico-sm') + '</button>';
    if (s === 3) nx = '<button class="btn btn-primary" data-act="wl-next"' + (W.scanDone && W.outcome !== 'blocked' ? '' : ' disabled') + '>Continue' + I('arrow-right', 'ico-sm') + '</button>';
    return '<div class="wl-foot">' + (s > 0 && s !== 3 && s !== 4 ? '<button class="btn btn-secondary" data-act="wl-back">Back</button>' : '<span></span>') + nx + '</div>';
  }
  function paint() {
    $('#wl-main').innerHTML = '<div class="wl-card">' + body() + '</div>' + (W.step === 4 ? '' : foot());
    $('#wl-rail').innerHTML = rail();
    if (W.step === 2) $('#wl-file').addEventListener('change', function(e){var f=e.target.files[0];if(f){W.file=f;pick(f.name);}});
    if (W.step === 3) scan();
    if (W.step === 4) analysis();
  }
  function pick(name){W.fname=name;W.scanDone=false;W.step=3;paint();}
  async function scan(){var g=$('#wl-gate');if(!g||!W.file)return;g.innerHTML=J.gatePipeline('verified',1,false);try{W.doc=await J.uploadDocument(W.file);W.scanDone=true;W.outcome='verified';g.innerHTML=J.gatePipeline('verified',6,true)+'<p class="gate-note">'+I('shield-check','ico-sm')+'Uploaded and stored securely.</p>';var f=$('#wl-main .wl-foot');if(!f)$('#wl-main').insertAdjacentHTML('beforeend',foot());else f.outerHTML=foot();}catch(e){W.outcome='blocked';W.scanDone=false;g.innerHTML='<div class="banner banner-risk">'+I('alert')+'<div><b>Upload failed.</b> '+esc(e.message||'Could not upload file.')+'</div></div>';}}
  function analysis(){var h=$('#wl-an');if(!h)return;h.innerHTML='<div class="banner"><div><b>Document stored.</b> Advanced AI analysis is not enabled yet.</div></div><div class="wl-foot"><button class="btn btn-secondary" data-act="wl-finish" data-to="home">Go to dashboard</button><button class="btn btn-primary" data-act="wl-finish" data-to="documents">Open document library'+I('arrow-right','ico-sm')+'</button></div>'; }
  function finish(to) { J.store.set('onboarded', true); J.set('jur', W.jur || J.settings.jur); J.go(to || 'home'); }

  J.views.welcome = {
    title: 'Welcome', bare: true,
    render: function () {
      return '<div class="wl"><aside class="wl-side"><a class="wl-logo" href="index.html" aria-label="JURISAI home"><img src="assets/logo-wordmark-light.png" alt="JURISAI"></a><div><div class="k">Welcome' + (J.user().name ? ', ' + esc(J.firstName()) : '') + '</div><h2>Secure. Understand. Verify.</h2><div id="wl-rail"></div></div><p class="wl-fine">' + I('lock', 'ico-sm') + 'Type, structure, and integrity checks run at upload.</p></aside><main class="wl-main"><div class="wl-top"><span class="mono">First-run setup</span><button class="linkbtn" data-act="wl-skip">Skip for now</button></div><div id="wl-main"></div></main></div>';
    },
    mount: function () { W.step = 0; W.use = ''; W.jur = J.settings.jur || ''; W.scanDone = false; paint(); },
    leave: function () {}
  };
  A['wl-use'] = function (el) { W.use = el.dataset.v; paint(); };
  A['wl-jur'] = function (el) { W.jur = el.dataset.v; paint(); };
  A['wl-next'] = function () { if (W.step === 3 && !W.scanDone) return; W.step++; paint(); };
  A['wl-back'] = function () { W.step = Math.max(0, W.step - 1); paint(); };
  A['wl-browse'] = function () { $('#wl-file').click(); };
  A['wl-skip'] = function () { finish('home'); };
  A['wl-finish'] = function (el) { finish(el.dataset.to); };
})();
