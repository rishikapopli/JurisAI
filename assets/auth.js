/* JURISAI — auth behaviour.
   NOTE: network calls are simulated (see `fakeRequest`). Replace with real API calls.
   Demo rules: password "wrong"/"invalid" fails sign-in; code "000000" fails verification. */
window.JurisAuth = (function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function fakeRequest(ok, ms) { return new Promise(function (res, rej) { setTimeout(function () { ok ? res() : rej(); }, ms || 1300); }); }

  function show(view) {
    $$('.panel').forEach(function (p) { p.classList.toggle('on', p.dataset.view === view); });
    var h = $('.panel.on h1'); if (h) { h.setAttribute('tabindex', '-1'); }
    var first = $('.panel.on input:not([type=checkbox])'); if (first && window.innerWidth > 960) setTimeout(function () { first.focus({ preventScroll: true }); }, 60);
  }
  function setErr(wrap, on) {
    if (!wrap) return; wrap.classList.toggle('is-error', !!on);
    var inp = $('input', wrap); if (inp) inp.setAttribute('aria-invalid', on ? 'true' : 'false');
  }
  function btnState(btn, st) { btn.classList.toggle('is-loading', st === 'loading'); btn.classList.toggle('is-done', st === 'done'); btn.disabled = st === 'loading' || st === 'done'; }
  function lock(form, on) { $$('input,button:not([data-toggle-pw])', form).forEach(function (el) { if (el.type !== 'submit' && el.id !== 'signin-btn') el.disabled = on; }); }

  function wireToggles() {
    $$('[data-toggle-pw]').forEach(function (b) {
      b.addEventListener('click', function () {
        var inp = $('input', b.parentNode), show = inp.type === 'password';
        inp.type = show ? 'text' : 'password';
        b.setAttribute('aria-pressed', show); b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        b.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-' + (show ? 'eye-off' : 'eye') + '"/></svg>';
      });
    });
    $$('[data-go]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); show(a.dataset.go); }); });
    // clear field errors on input
    $$('.field input').forEach(function (i) { i.addEventListener('input', function () { setErr(i.closest('.field'), false); }); });
  }

  /* ---- Left-hand session console (sign in) ---- */
  function session(state) {
    var li = $('#session-auth'); if (!li) return;
    var t = $('#session-auth-t'), s = $('#session-auth-s'), head = $('#session-state');
    li.className = state;
    var map = {
      wait: ['Waiting for sign-in', 'PENDING', 'AWAITING AUTHENTICATION'],
      busy: ['Verifying credentials…', 'CHECKING', 'AUTHENTICATING'],
      ok:   ['Identity confirmed', 'VERIFIED', 'SESSION ESTABLISHED'],
      fail: ['Authentication failed', 'DENIED', 'ACCESS DENIED']
    }[state];
    t.textContent = map[0]; s.textContent = map[1]; head.textContent = map[2];
    if (state === 'ok') li.classList.remove('wait');
  }

  /* ================= SIGN IN ================= */
  function initSignin(opts) {
    opts = opts || {};
    wireToggles();
    var form = $('#signin-form'), btn = $('#signin-btn'), alertEl = $('#signin-alert');
    var email = $('#email'), pw = $('#password');

    function fail() { alertEl.classList.remove('on'); void alertEl.offsetWidth; alertEl.classList.add('on'); session('fail'); btnState(btn, 'idle'); lock(form, false); setErr(email.closest('.field'), true); setErr(pw.closest('.field'), true); $$('.field-msg', form).forEach(function (m) { m.textContent = ''; }); }
    function win() { btnState(btn, 'done'); session('ok'); setTimeout(function () { show('success'); if (opts.redirect) setTimeout(function () { location.href = opts.redirect; }, 1800); }, 700); }

    form.addEventListener('submit', function (e) {
      e.preventDefault(); alertEl.classList.remove('on');
      var okE = EMAIL.test(email.value.trim()), okP = pw.value.length > 0;
      var mE = $('.field-msg', email.closest('.field')), mP = $('.field-msg', pw.closest('.field'));
      mE.textContent = email.value.trim() ? 'Enter a valid email address.' : 'Enter your email address.'; mP.textContent = 'Enter your password.';
      setErr(email.closest('.field'), !okE); setErr(pw.closest('.field'), !okP);
      if (!okE || !okP) { (okE ? pw : email).focus(); return; }
      btnState(btn, 'loading'); session('busy'); lock(form, true);
      var bad = /^(wrong|invalid)$/i.test(pw.value);
      fakeRequest(!bad, 1500).then(function () { lock(form, false); if (window.JurisSession) JurisSession.signIn(email.value.trim()); win(); }, fail);
    });

    $('#google-btn').addEventListener('click', function () { session('busy'); var b = this; b.disabled = true; b.innerHTML = '<span class="spin"></span>Redirecting to Google…'; });

    // forgot password
    var fForm = $('#forgot-form'), fBtn = $('#forgot-btn'), fEmail = $('#femail');
    fForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = EMAIL.test(fEmail.value.trim()); setErr(fEmail.closest('.field'), !ok); if (!ok) { fEmail.focus(); return; }
      btnState(fBtn, 'loading');
      fakeRequest(true, 1100).then(function () { btnState(fBtn, 'idle'); $('#sent-to').textContent = fEmail.value.trim(); show('forgot-sent'); });
    });
    $('#forgot-resend').addEventListener('click', function () { var b = this; b.textContent = 'Link sent again ✓'; b.disabled = true; setTimeout(function () { b.textContent = 'Resend link'; b.disabled = false; }, 4000); });
    $$('[data-go="forgot"]').forEach(function (a) { a.addEventListener('click', function () { if (email.value) fEmail.value = email.value; }); });

    // preview states
    $$('.dev [data-state]').forEach(function (b) {
      b.addEventListener('click', function () {
        var s = b.dataset.state; $('.dev').open = false;
        alertEl.classList.remove('on'); btnState(btn, 'idle'); lock(form, false); setErr(email.closest('.field'), false); setErr(pw.closest('.field'), false); session('wait');
        if (s === 'idle') show('signin');
        if (s === 'loading') { show('signin'); email.value = email.value || 'user@example.com'; pw.value = pw.value || 'password123'; btnState(btn, 'loading'); session('busy'); }
        if (s === 'invalid') { show('signin'); email.value = email.value || 'user@example.com'; pw.value = 'wrong'; fail(); }
        if (s === 'forgot') show('forgot');
        if (s === 'forgot-sent') { $('#sent-to').textContent = email.value || 'user@example.com'; show('forgot-sent'); }
        if (s === 'success') { session('ok'); show('success'); var bar = $('.bar-load i'); bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; }
      });
    });
  }

  /* ================= SIGN UP ================= */
  function score(v) {
    var s = 0; if (v.length >= 10) s++; if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++; if (/\d/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v) || v.length >= 16) s++;
    return v.length < 10 ? Math.min(s, 1) : s;
  }
  function initSignup(opts) {
    opts = opts || {};
    wireToggles();
    var form = $('#signup-form'), btn = $('#signup-btn'), alertEl = $('#signup-alert');
    var f = { name: $('#name'), email: $('#email'), pw: $('#password'), confirm: $('#confirm'), terms: $('#terms') };
    var str = $('#strength'), strT = $('#strength-t'), labels = ['Use 10+ characters with a mix of letters, numbers and symbols.', 'Weak — add length and variety.', 'Fair — add numbers or symbols.', 'Good', 'Strong'];

    f.pw.addEventListener('input', function () {
      var v = f.pw.value, s = v ? Math.max(1, score(v)) : 0; str.dataset.s = s; strT.textContent = labels[s];
      if (f.confirm.value) setErr(f.confirm.closest('.field'), f.confirm.value !== v);
    });
    f.confirm.addEventListener('input', function () { setErr(f.confirm.closest('.field'), f.confirm.value !== f.pw.value); });
    f.terms.addEventListener('change', function () { setErr(f.terms.closest('.field'), false); });

    function validate() {
      var r = {
        name: f.name.value.trim().length > 1, email: EMAIL.test(f.email.value.trim()), pw: f.pw.value.length >= 10,
        confirm: f.confirm.value === f.pw.value && f.confirm.value.length > 0, terms: f.terms.checked
      };
      setErr(f.name.closest('.field'), !r.name); setErr(f.email.closest('.field'), !r.email); setErr(f.pw.closest('.field'), !r.pw);
      setErr(f.confirm.closest('.field'), !r.confirm); setErr(f.terms.closest('.field'), !r.terms);
      return r;
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault(); alertEl.classList.remove('on');
      var r = validate(), bad = ['name', 'email', 'pw', 'confirm', 'terms'].filter(function (k) { return !r[k]; });
      if (bad.length) { f[bad[0]].focus(); return; }
      btnState(btn, 'loading');
      fakeRequest(true, 1500).then(function () { btnState(btn, 'idle'); $('#verify-to').textContent = f.email.value.trim(); show('verify'); startResend(); });
    });
    $('#google-btn').addEventListener('click', function () { var b = this; b.disabled = true; b.innerHTML = '<span class="spin"></span>Redirecting to Google…'; });

    /* verification code */
    var code = $('#code'), ins = $$('input', code), vForm = $('#verify-form'), vBtn = $('#verify-btn'), vAlert = $('#verify-alert');
    ins.forEach(function (inp, i) {
      inp.addEventListener('input', function () {
        inp.value = inp.value.replace(/\D/g, '').slice(0, 1); code.classList.remove('err'); vAlert.classList.remove('on');
        if (inp.value && ins[i + 1]) ins[i + 1].focus();
        if (ins.every(function (x) { return x.value; })) vForm.requestSubmit();
      });
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !inp.value && ins[i - 1]) { ins[i - 1].focus(); ins[i - 1].value = ''; }
        if (e.key === 'ArrowLeft' && ins[i - 1]) ins[i - 1].focus();
        if (e.key === 'ArrowRight' && ins[i + 1]) ins[i + 1].focus();
      });
      inp.addEventListener('paste', function (e) {
        var t = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6); if (!t) return; e.preventDefault();
        t.split('').forEach(function (c, k) { if (ins[k]) ins[k].value = c; }); (ins[Math.min(t.length, 5)]).focus();
        if (t.length === 6) vForm.requestSubmit();
      });
    });
    function badCode() { code.classList.remove('err'); void code.offsetWidth; code.classList.add('err'); vAlert.classList.remove('on'); void vAlert.offsetWidth; vAlert.classList.add('on'); btnState(vBtn, 'idle'); ins.forEach(function (x) { x.disabled = false; }); ins[0].focus(); }
    vForm.addEventListener('submit', function (e) {
      e.preventDefault(); var v = ins.map(function (x) { return x.value; }).join('');
      if (v.length < 6) { badCode(); return; }
      btnState(vBtn, 'loading'); ins.forEach(function (x) { x.disabled = true; });
      fakeRequest(v !== '000000', 1200).then(function () { btnState(vBtn, 'idle'); ins.forEach(function (x) { x.disabled = false; }); if (window.JurisSession) JurisSession.register({ name: f.name.value, email: f.email.value }); show('created'); }, badCode);
    });

    var rt, left = 0, rBtn = $('#resend'), rTxt = $('#resend-t');
    function startResend() {
      clearInterval(rt); left = 30; rBtn.disabled = true; rBtn.style.display = 'none'; rTxt.style.display = '';
      rTxt.textContent = 'Resend code in 30s';
      rt = setInterval(function () { left--; if (left <= 0) { clearInterval(rt); rTxt.style.display = 'none'; rBtn.style.display = ''; rBtn.disabled = false; } else rTxt.textContent = 'Resend code in ' + left + 's'; }, 1000);
    }
    rBtn.addEventListener('click', function () { startResend(); rTxt.textContent = 'New code sent · resend in 30s'; });
    rBtn.style.display = 'none';

    /* preview states */
    $$('.dev [data-state]').forEach(function (b) {
      b.addEventListener('click', function () {
        var s = b.dataset.state; $('.dev').open = false;
        alertEl.classList.remove('on'); vAlert.classList.remove('on'); code.classList.remove('err'); btnState(btn, 'idle');
        if (s === 'idle') { show('signup'); $$('.field').forEach(function (w) { setErr(w, false); }); }
        if (s === 'errors') { show('signup'); f.name.value = 'A'; f.email.value = 'user@'; f.pw.value = 'short'; f.pw.dispatchEvent(new Event('input')); f.confirm.value = 'different'; f.terms.checked = false; validate(); }
        if (s === 'loading') { show('signup'); f.name.value = f.name.value || 'Sample User'; f.email.value = f.email.value || 'user@example.com'; f.pw.value = 'Correct-Horse-9!'; f.confirm.value = f.pw.value; f.pw.dispatchEvent(new Event('input')); f.terms.checked = true; $$('.field').forEach(function (w) { setErr(w, false); }); btnState(btn, 'loading'); }
        if (s === 'verify') { $('#verify-to').textContent = f.email.value || 'user@example.com'; show('verify'); startResend(); }
        if (s === 'badcode') { $('#verify-to').textContent = f.email.value || 'user@example.com'; show('verify'); ins.forEach(function (x, k) { x.value = '000000'[k]; }); badCode(); }
        if (s === 'created') show('created');
      });
    });
  }

  return { initSignin: initSignin, initSignup: initSignup, show: show };
})();
