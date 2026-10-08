/* JURISAI — real account authentication. Google authentication is intentionally deferred. */
window.JurisAuth = (function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;


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
      JurisSession.signIn(email.value.trim(), pw.value).then(function () { lock(form, false); win(); }).catch(function () { fail(); });
    });

    $('#google-btn').addEventListener('click', function () { session('busy'); var b = this; b.disabled = true; b.innerHTML = '<span class="spin"></span>Redirecting to Google…'; });

    // forgot password
    var fForm = $('#forgot-form'), fBtn = $('#forgot-btn'), fEmail = $('#femail');
    fForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = EMAIL.test(fEmail.value.trim()); setErr(fEmail.closest('.field'), !ok); if (!ok) { fEmail.focus(); return; }
      btnState(fBtn, 'loading');
      JurisSession.api('/api/auth/request-reset',{method:'POST',body:JSON.stringify({email:fEmail.value.trim()})}).then(function(d){btnState(fBtn,'idle');$('#sent-to').textContent=fEmail.value.trim()+(d.devResetCode?' · Dev reset code: '+d.devResetCode:'');show('forgot-sent');}).catch(function(){btnState(fBtn,'idle');setErr(fEmail.closest('.field'),true);});
    });
    $('#forgot-resend').addEventListener('click', function(){var b=this;b.disabled=true;JurisSession.api('/api/auth/request-reset',{method:'POST',body:JSON.stringify({email:fEmail.value.trim()})}).then(function(d){b.textContent=d.devResetCode?'Code resent · '+d.devResetCode:'Code sent ✓';setTimeout(function(){b.textContent='Resend link';b.disabled=false;},4000);}).catch(function(){b.textContent='Could not resend';setTimeout(function(){b.textContent='Resend link';b.disabled=false;},3000);});});
    $('#reset-btn').addEventListener('click',function(){var code=$('#reset-code').value.trim(),pw=$('#reset-pw').value;if(!/^\d{6}$/.test(code)||pw.length<10){JurisAuth.show('forgot-sent');return;}var b=this;btnState(b,'loading');JurisSession.api('/api/auth/reset-password',{method:'POST',body:JSON.stringify({email:fEmail.value.trim(),code:code,password:pw})}).then(function(){btnState(b,'idle');JurisAuth.show('signin');J.toast&&J.toast('Password reset. You can now sign in.');}).catch(function(e){btnState(b,'idle');b.textContent=e.message||'Reset failed';setTimeout(function(){b.textContent='Set new password';},2500);});});
    $$('[data-go="forgot"]').forEach(function (a) { a.addEventListener('click', function () { if (email.value) fEmail.value = email.value; }); });

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
      JurisSession.register({name:f.name.value.trim(),email:f.email.value.trim(),password:f.pw.value}).then(function (d) { btnState(btn, 'idle'); $('#verify-to').textContent = f.email.value.trim() + (d.devVerificationCode ? ' · Dev code: ' + d.devVerificationCode : ''); show('verify'); startResend(); }).catch(function (e) { btnState(btn, 'idle'); alertEl.querySelector('span').innerHTML = '<b>We couldn’t create your account.</b> ' + (e.message || 'Please try again.'); alertEl.classList.add('on'); });
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
      JurisSession.verify(f.email.value.trim(), v).then(function () { btnState(vBtn, 'idle'); ins.forEach(function (x) { x.disabled = false; }); show('created'); }).catch(function () { badCode(); });
    });

    var rt, left = 0, rBtn = $('#resend'), rTxt = $('#resend-t');
    function startResend() {
      clearInterval(rt); left = 30; rBtn.disabled = true; rBtn.style.display = 'none'; rTxt.style.display = '';
      rTxt.textContent = 'Resend code in 30s';
      rt = setInterval(function () { left--; if (left <= 0) { clearInterval(rt); rTxt.style.display = 'none'; rBtn.style.display = ''; rBtn.disabled = false; } else rTxt.textContent = 'Resend code in ' + left + 's'; }, 1000);
    }
    rBtn.addEventListener('click', function(){JurisSession.api('/api/auth/resend-verification',{method:'POST',body:JSON.stringify({email:f.email.value.trim()})}).then(function(d){startResend();rTxt.textContent=d.devVerificationCode?'New code: '+d.devVerificationCode+' · resend in 30s':'New code sent · resend in 30s';}).catch(function(){JurisAuth.show('signup');});});
    rBtn.style.display = 'none';

  }

  return { initSignin: initSignin, initSignup: initSignup, show: show };
})();
