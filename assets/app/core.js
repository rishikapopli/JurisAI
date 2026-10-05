/* ==========================================================================
   JURISAI APP — core: namespace, store, router, UI kit, shell, speech/voice
   One cohesive application. Views register themselves on J.views.
   ========================================================================== */
(function () {
  'use strict';
  var J = window.J = { data: {}, views: {}, actions: {}, ui: {}, fmt: {}, state: {} };
  var $ = J.$ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = J.$$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  J.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var esc = J.esc;

  /* ---------- storage (guarded) ---------- */
  var mem = {};
  J.store = {
    get: function (k, d) { try { var v = localStorage.getItem('jurisai.' + k); if (v != null) return JSON.parse(v); } catch (e) {} return k in mem ? mem[k] : d; },
    set: function (k, v) { mem[k] = v; try { localStorage.setItem('jurisai.' + k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- settings ---------- */
  var DEFAULTS = {
    jur: 'uk', lang: 'en', theme: 'ivory', dateFmt: 'dmy', collapsed: false,
    cite: 'numbered', sourceDisplay: 'panel', research: 'balanced', showInference: true,
    speed: 1, voice: 'Neutral (UK)', voiceInput: true,
    retention: '12', autoDelete: false, analytics: false, training: false,
    twofa: true, secNotify: true, notifyEmail: true, notifyBrowser: false, notifyDigest: 'daily'
  };
  J.settings = Object.assign({}, DEFAULTS, J.store.get('settings', {}));
  /* Identity (name, email, role, organisation) is NOT a setting: it belongs to the signed-in user (JurisSession).
     Drop any copies that older versions saved into settings so stale/hardcoded values can never resurface. */
  var PROFILE = ['name', 'email', 'role', 'org'], legacy = false;
  PROFILE.forEach(function (k) { if (k in J.settings) { delete J.settings[k]; legacy = true; } });
  J.saveSettings = function () { J.store.set('settings', J.settings); };
  if (legacy) J.saveSettings();
  J.set = function (k, v) { J.settings[k] = v; J.saveSettings(); };

  /* ---------- signed-in user: single source of truth ---------- */
  var SESSION = function () { return window.JurisSession || null; };
  J.user = function () {
    var S = SESSION(), u = S && S.current(), d = (S && S.DEFAULTS) || { role: '', org: '' };
    return u ? { signedIn: true, id: u.id, name: u.name, email: u.email, role: u.role, org: u.org }
             : { signedIn: false, id: '', name: '', email: '', role: d.role, org: d.org };
  };
  J.userName = function () { return J.user().name || 'User'; };
  J.userEmail = function () { return J.user().email || 'No email provided'; };
  J.firstName = function () { return J.userName().split(/\s+/)[0]; };
  J.initials = function (n) { return (n || '?').split(/\s+/).filter(Boolean).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase() || '?'; };
  /* Update the profile (name / email / role / org). Returns {ok, error?}. Everything on screen refreshes. */
  J.updateProfile = function (patch) {
    var S = SESSION(); if (!S) return { ok: false, error: 'Account service unavailable.' };
    var r = S.update(patch); if (r.ok) J.refreshUser(); return r;
  };
  /* Re-paint every element bound to the user: <el data-user="name|initials|email|role|org"> */
  J.refreshUser = function () {
    var u = J.user(), v = { name: J.userName(), initials: J.initials(J.userName()), email: J.userEmail(), role: u.role, org: u.org };
    $$('[data-user]').forEach(function (el) { var k = el.dataset.user; if (k in v) el.textContent = v[k]; });
  };
  J.signOut = function () { var S = SESSION(); if (S) S.signOut(); };

  /* ---------- icons ---------- */
  var X = {
    'home': '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-6h4v6"/>',
    'folder': '<path d="M3 6a1 1 0 011-1h5l2 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V6z"/>',
    'folder-up': '<path d="M3 6a1 1 0 011-1h5l2 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V6z"/><path d="M12 16v-5M9.5 13l2.5-2.5 2.5 2.5"/>',
    'analyze': '<path d="M13 3H7a2 2 0 00-2 2v14a2 2 0 002 2h4"/><path d="M13 3v5h5"/><circle cx="16.5" cy="16.5" r="3"/><path d="M19 19l2 2"/>',
    'history': '<path d="M3.5 12a8.5 8.5 0 108.5-8.5A8.5 8.5 0 005.6 6.3L3.5 8.5"/><path d="M3.5 3.5v5h5M12 7.5V12l3 2"/>',
    'sliders': '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    'help': '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.6a2.5 2.5 0 015 .4c0 1.6-2.5 2-2.5 3.5M12 17v.01"/>',
    'bell': '<path d="M6 16v-5a6 6 0 0112 0v5l2 2H4l2-2z"/><path d="M10 21h4"/>',
    'download': '<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>',
    'translate': '<path d="M4 6h9M8.5 4v2M6 6c.5 3 2.5 5.5 5.5 7M12 6c-.5 3-3 6-7 8"/><path d="M13 20l4-9 4 9M14.5 17h5"/>',
    'volume': '<path d="M4 10v4h4l5 4V6L8 10H4z"/><path d="M16.5 9a4 4 0 010 6M19 7a7 7 0 010 10"/>',
    'share': '<circle cx="6" cy="12" r="2.2"/><circle cx="17.5" cy="6" r="2.2"/><circle cx="17.5" cy="18" r="2.2"/><path d="M8 11l7.5-4M8 13l7.5 4"/>',
    'more': '<circle cx="5.5" cy="12" r="1.1"/><circle cx="12" cy="12" r="1.1"/><circle cx="18.5" cy="12" r="1.1"/>',
    'mic': '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>',
    'plus': '<path d="M12 5v14M5 12h14"/>',
    'filter': '<path d="M4 5h16l-6 7v6l-4 2v-8L4 5z"/>',
    'chev-down': '<path d="M6 9l6 6 6-6"/>',
    'chev-up': '<path d="M6 15l6-6 6 6"/>',
    'chev-right': '<path d="M9 6l6 6-6 6"/>',
    'chev-left': '<path d="M15 6l-6 6 6 6"/>',
    'calendar': '<rect x="4" y="5" width="16" height="15" rx="1"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    'external': '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/>',
    'copy': '<rect x="8" y="8" width="12" height="12" rx="1"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/>',
    'trash': '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
    'archive': '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10h14V9M10 13h4"/>',
    'refresh': '<path d="M20 11a8 8 0 00-14-4L4 9M4 4v5h5M4 13a8 8 0 0014 4l2-2M20 20v-5h-5"/>',
    'info': '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
    'note': '<path d="M5 4h14v12l-5 5H5z"/><path d="M14 21v-5h5M8 9h8M8 13h4"/>',
    'sparkle': '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/><path d="M19 17v4M17 19h4"/>',
    'flag': '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    'send': '<path d="M12 19V5M6 11l6-6 6 6"/>',
    'logout': '<path d="M10 4H5a1 1 0 00-1 1v14a1 1 0 001 1h5M15 8l4 4-4 4M19 12H9"/>',
    'sidebar': '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M9 4v16"/>',
    'pause': '<path d="M8 5v14M16 5v14"/>',
    'stop': '<rect x="6" y="6" width="12" height="12"/>',
    'play': '<path d="M8 5l11 7-11 7z"/>',
    'wifi-off': '<path d="M3 3l18 18M5 12.5a10 10 0 015-2.6M8.5 16a5 5 0 016.6-.4M12 20v.01M19 12.5a10 10 0 00-4.5-2.5M2 9a15 15 0 018-4"/>',
    'printer': '<path d="M7 9V4h10v5M7 17H5a1 1 0 01-1-1v-6a1 1 0 011-1h14a1 1 0 011 1v6a1 1 0 01-1 1h-2M7 14h10v6H7z"/>',
    'list': '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
    'file-x': '<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"/><path d="M14 3v5h5M10 12l4 4M14 12l-4 4"/>',
    'cloud-off': '<path d="M3 3l18 18M8 6.5A6 6 0 0118 10a4 4 0 012.4 7.2M17 19H7a4 4 0 01-.6-8"/>',
    'zap': '<path d="M13 3L5 13h6l-1 8 8-10h-6l1-8z"/>',
    'unlock': '<rect x="5" y="11" width="14" height="9" rx="1"/><path d="M8 11V8a4 4 0 017.5-2"/>',
    'edit': '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
    'tag': '<path d="M3 12V4h8l10 10-8 8L3 12z"/><path d="M7.5 8h.01"/>',
    'type': '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
    'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
    'users': '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6M16 5a3.5 3.5 0 010 7M18 14c2.2.6 3.5 2.6 3.5 5"/>'
  };
  (function inject() {
    var s = '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><defs>';
    Object.keys(X).forEach(function (k) { s += '<symbol id="i-' + k + '" viewBox="0 0 24 24">' + X[k] + '</symbol>'; });
    document.body.insertAdjacentHTML('afterbegin', s + '</defs></svg>');
  })();
  /* The site.js sprite (shield, lock, file …) is shared with the landing page. */
  J.icon = function (n, cls) { return '<svg class="ico ' + (cls || '') + '" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; };
  var I = J.icon;

  /* ---------- timers scoped to a view ---------- */
  var timers = [];
  J.later = function (fn, ms) { var id = setTimeout(function () { try { fn(); } catch (e) { console.error(e); } }, ms); timers.push(id); return id; };
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  /* ---------- formatting ---------- */
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
  J.fmt.date = function (d) {
    d = new Date(d); var f = J.settings.dateFmt;
    if (f === 'mdy') return p2(d.getMonth() + 1) + '/' + p2(d.getDate()) + '/' + d.getFullYear();
    if (f === 'iso') return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
    if (f === 'long') return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear();
    return p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear();
  };
  J.fmt.time = function (d) { d = new Date(d); return p2(d.getHours()) + ':' + p2(d.getMinutes()); };
  J.fmt.dt = function (d) { return J.fmt.date(d) + ' · ' + J.fmt.time(d); };
  J.fmt.rel = function (d) {
    var s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago'; if (s < 172800) return 'yesterday';
    return Math.floor(s / 86400) + ' days ago';
  };
  J.ago = function (min) { return new Date(Date.now() - min * 60000); };

  /* ---------- router ---------- */
  J.parseHash = function () {
    var h = location.hash.replace(/^#\/?/, ''), q = {}, i = h.indexOf('?');
    if (i >= 0) { h.slice(i + 1).split('&').forEach(function (p) { if (!p) return; var kv = p.split('='); q[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' ')); }); h = h.slice(0, i); }
    var parts = h.split('/').filter(Boolean), name = parts[0] || 'home', arg = parts[1] || '';
    if (name === 'documents' && arg === 'intake') { name = 'intake'; arg = ''; }
    return { name: name, arg: arg, q: q, parts: parts };
  };
  J.go = function (path) { var t = '#/' + String(path).replace(/^#?\/?/, ''); if (location.hash === t) J.render(true); else location.hash = t; };
  J.href = function (path) { return '#/' + path; };

  J.render = function (keep) {
    var r = J.parseHash(), v = J.views[r.name];
    if (!v) { r = { name: 'home', arg: '', q: {}, parts: ['home'] }; v = J.views.home; }
    clearTimers(); J.stopSpeak && J.stopSpeak(true); J.ui.closeMenu();
    if (J._curName && J._curName !== r.name && J.views[J._curName] && J.views[J._curName].leave) J.views[J._curName].leave();
    J._curName = r.name; J.route = r;
    var host = $('#view'), sc = host.scrollTop;
    document.body.classList.toggle('bare', !!v.bare);
    host.className = 'view ' + (v.fixed ? 'view--fixed' : 'view--scroll') + ' v-' + r.name;
    host.innerHTML = v.render(r);
    if (v.mount) v.mount(host, r);
    host.scrollTop = keep ? sc : 0;
    J.chrome(r, v);
  };

  J.chrome = function (r, v) {
    var nav = v.nav || r.name;
    $$('.sb-item').forEach(function (a) { a.classList.toggle('active', a.dataset.nav === nav); });
    var crumbs = (v.crumbs ? v.crumbs(r) : [v.title]);
    $('#crumbs').innerHTML = crumbs.map(function (c, i) {
      var last = i === crumbs.length - 1;
      return (typeof c === 'string' ? '<span class="' + (last ? 'cur' : '') + '">' + esc(c) + '</span>' : '<a href="' + c[1] + '">' + esc(c[0]) + '</a>');
    }).join('<span class="sep">/</span>');
    $('#tb-jur').textContent = J.jurName(J.settings.jur);
    $('#tb-lang').textContent = (J.data.langs.filter(function (l) { return l.id === J.settings.lang; })[0] || {}).label || 'English';
    document.title = (crumbs[crumbs.length - 1] || 'JURISAI') + ' — JURISAI';
    var sbd = J.data.docs.filter(function (d) { return d.sec === 'verified' && !d.archived; }).length;
    $('#sb-gate-n').textContent = sbd + ' verified';
    var nc = J.data.docs.filter(function (d) { return d.sec === 'review' || d.sec === 'blocked'; }).length;
    var b = $('#sb-docs-n'); if (b) { b.textContent = nc ? nc : ''; b.style.display = nc ? '' : 'none'; }
    $('#bell-dot').style.display = J.data.notifs.some(function (n) { return !n.read; }) ? '' : 'none';
    var offline = J.state.offline || !navigator.onLine;
    $('#offline-bar').classList.toggle('on', !!offline);
    document.documentElement.setAttribute('data-theme', J.settings.theme);
    document.getElementById('app').classList.toggle('collapsed', !!J.settings.collapsed);
  };

  J.jurName = function (id) { var j = J.data.jurs.filter(function (x) { return x.id === id; })[0]; return j ? j.name : id; };

  /* ---------- UI kit ---------- */
  var layers;
  function L() { return layers || (layers = $('#layers')); }

  J.toast = function (msg, kind) {
    var t = document.createElement('div');
    t.className = 'toast ' + (kind || '');
    t.innerHTML = I(kind === 'warn' ? 'alert' : kind === 'risk' ? 'x' : 'check', 'ico-sm') + '<span>' + msg + '</span>';
    $('#toasts').appendChild(t);
    requestAnimationFrame(function () { t.classList.add('in'); });
    setTimeout(function () { t.classList.remove('in'); setTimeout(function () { t.remove(); }, 300); }, 3400);
  };

  var menuEl = null, menuOff = null;
  J.ui.closeMenu = function () { if (menuEl) { menuEl.remove(); menuEl = null; } if (menuOff) { document.removeEventListener('mousedown', menuOff, true); menuOff = null; } };
  /* items: {label, icon, fn, danger, divider, header, checked, meta} ; opts: {align:'right', width, html} */
  J.ui.menu = function (anchor, items, opts) {
    opts = opts || {}; J.ui.closeMenu();
    var m = document.createElement('div'); m.className = 'menu' + (opts.cls ? ' ' + opts.cls : ''); m.setAttribute('role', 'menu');
    if (opts.width) m.style.width = opts.width + 'px';
    m.innerHTML = (opts.html || '') + items.map(function (it, i) {
      if (it.divider) return '<div class="menu-div"></div>';
      if (it.header) return '<div class="menu-h">' + esc(it.header) + '</div>';
      return '<button class="menu-i' + (it.danger ? ' danger' : '') + (it.checked ? ' checked' : '') + '" role="menuitem" data-i="' + i + '">' +
        (it.icon ? I(it.icon, 'ico-sm') : '<span class="menu-sp"></span>') + '<span class="menu-l">' + esc(it.label) + (it.sub ? '<small>' + esc(it.sub) + '</small>' : '') + '</span>' +
        (it.checked ? I('check', 'ico-sm menu-ck') : '') + (it.meta ? '<span class="menu-m">' + esc(it.meta) + '</span>' : '') + '</button>';
    }).join('');
    L().appendChild(m); menuEl = m;
    var r = anchor.getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight;
    var left = opts.align === 'right' ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    var top = r.bottom + 6; if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
    m.style.left = left + 'px'; m.style.top = top + 'px';
    m.addEventListener('click', function (e) {
      var b = e.target.closest('.menu-i'); if (!b) return;
      var it = items[+b.dataset.i]; if (!opts.keep) J.ui.closeMenu(); it.fn && it.fn(b);
    });
    menuOff = function (e) { if (menuEl && !menuEl.contains(e.target) && !anchor.contains(e.target)) J.ui.closeMenu(); };
    setTimeout(function () { document.addEventListener('mousedown', menuOff, true); }, 0);
    if (opts.onMount) opts.onMount(m);
    return m;
  };

  J.ui.drawer = function (o) {
    J.ui.closeDrawer();
    var d = document.createElement('div'); d.className = 'drawer-wrap'; d.id = 'drawer';
    d.innerHTML = '<div class="drawer-scrim" data-act="drawer-close"></div><aside class="drawer' + (o.wide ? ' wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(o.title) + '">' +
      '<header class="drawer-h"><div>' + (o.kicker ? '<div class="label">' + o.kicker + '</div>' : '') + '<h2>' + o.title + '</h2></div><button class="icon-btn" data-act="drawer-close" aria-label="Close">' + I('x') + '</button></header>' +
      '<div class="drawer-b">' + o.html + '</div>' + (o.foot ? '<footer class="drawer-f">' + o.foot + '</footer>' : '') + '</aside>';
    L().appendChild(d); requestAnimationFrame(function () { d.classList.add('open'); });
    if (o.onMount) o.onMount(d);
    var f = $('.drawer-h .icon-btn', d); f && f.focus({ preventScroll: true });
    return d;
  };
  J.ui.closeDrawer = function () { var d = $('#drawer'); if (d) { d.classList.remove('open'); setTimeout(function () { d.remove(); }, 220); d.id = ''; } };

  J.ui.modal = function (o) {
    J.ui.closeModal();
    var d = document.createElement('div'); d.className = 'modal-wrap'; d.id = 'modal';
    d.innerHTML = '<div class="drawer-scrim" data-act="modal-close"></div><section class="modal" role="dialog" aria-modal="true" aria-label="' + esc(o.title) + '">' +
      '<header><h2>' + o.title + '</h2><button class="icon-btn" data-act="modal-close" aria-label="Close">' + I('x') + '</button></header>' +
      '<div class="modal-b">' + o.html + '</div>' + (o.foot ? '<footer>' + o.foot + '</footer>' : '') + '</section>';
    L().appendChild(d); requestAnimationFrame(function () { d.classList.add('open'); });
    if (o.onMount) o.onMount(d);
    var f = $('input,textarea,select', d); f && f.focus({ preventScroll: true });
    return d;
  };
  J.ui.closeModal = function () { var d = $('#modal'); if (d) { d.classList.remove('open'); setTimeout(function () { d.remove(); }, 200); d.id = ''; } };

  /* ---------- shared fragments ---------- */
  J.chip = function (cls, text, icon) { return '<span class="chip ' + (cls || '') + '">' + (icon ? I(icon, 'ico-xs') : '') + text + '</span>'; };
  J.secChip = function (s) {
    return { verified: J.chip('chip-ok', 'Verified', 'shield-check'), review: J.chip('chip-warn', 'Review required', 'alert'), blocked: J.chip('chip-risk', 'Blocked', 'lock'), processing: J.chip('chip-gold', 'Scanning', 'scan') }[s] || '';
  };
  J.anChip = function (d) {
    var a = d.an;
    if (d.sec === 'blocked' || d.sec === 'review') return '<span class="st st-lock">' + I('lock', 'ico-xs') + 'Held</span>';
    if (d.sec === 'processing') return '<span class="st st-run">Waiting for gate</span>';
    return { analyzed: '<span class="st st-ok"><i class="dot dot-ok"></i>Analyzed</span>', pending: '<span class="st"><i class="dot"></i>Not analyzed</span>', failed: '<span class="st st-bad"><i class="dot dot-risk"></i>Analysis failed</span>', running: '<span class="st st-run"><i class="dot pulse"></i>Analyzing</span>' }[a] || '';
  };
  J.tag = function (kind) {
    var m = { evidence: ['tag-evid', 'Document evidence', 'file'], law: ['tag-law', 'Legal source', 'scales'], ai: ['tag-ai', 'AI explanation', 'sparkle'], inference: ['tag-inf', 'Inference', 'zap'], review: ['tag-rev', 'Review required', 'flag'] }[kind];
    return '<span class="tag ' + m[0] + '">' + I(m[2], 'ico-xs') + m[1] + '</span>';
  };
  J.empty = function (o) {
    return '<div class="empty ' + (o.cls || '') + '"><div class="empty-ic">' + I(o.icon || 'file', 'ico-lg') + '</div><h3>' + o.title + '</h3><p>' + (o.text || '') + '</p>' +
      (o.actions ? '<div class="empty-a">' + o.actions + '</div>' : '') + '</div>';
  };
  /* error states: failed scan, corrupted, unsupported, analysis failure, research unavailable, insufficient evidence, network */
  J.errorState = function (kind, ctx) {
    ctx = ctx || {};
    var E = {
      scan: { icon: 'lock', tone: 'risk', code: 'GATE-403', title: 'This file failed the security scan', text: 'JURISAI found content that could manipulate or harm downstream systems. The file has been quarantined and was never opened by any AI component.', acts: '<button class="btn btn-primary btn-sm" data-act="scan-report" data-doc="' + (ctx.doc || '') + '">' + I('download', 'ico-sm') + 'Download scan report</button><button class="btn btn-secondary btn-sm" data-go="documents">Back to library</button>' },
      corrupt: { icon: 'file-x', tone: 'warn', code: 'INT-210', title: 'This file appears to be corrupted', text: 'The file structure could not be read, so its integrity cannot be verified. Nothing was passed to the analysis stage.', acts: '<button class="btn btn-primary btn-sm" data-act="intake-reset">Upload a different copy</button><button class="btn btn-secondary btn-sm" data-go="help/sec2">What can I do?</button>' },
      unsupported: { icon: 'file-x', tone: 'warn', code: 'TYPE-415', title: 'This file type is not supported', text: 'JURISAI accepts PDF, DOCX, TXT and scanned images (PNG, JPG, TIFF). Executable and archive formats are never accepted.', acts: '<button class="btn btn-primary btn-sm" data-act="intake-reset">Choose another file</button><button class="btn btn-secondary btn-sm" data-go="help/up1">Supported formats</button>' },
      analysis: { icon: 'alert', tone: 'warn', code: 'ANL-502', title: 'Analysis could not be completed', text: 'The document passed the security gate, but its text layer could not be read reliably (likely a scanned image). No partial results are shown, to avoid incorrect summaries.', acts: '<button class="btn btn-primary btn-sm" data-act="retry-analysis" data-doc="' + (ctx.doc || '') + '">' + I('refresh', 'ico-sm') + 'Retry with OCR</button><button class="btn btn-secondary btn-sm" data-go="documents">Back to library</button>' },
      research: { icon: 'scales', tone: 'warn', code: 'LAW-503', title: 'Legal research is unavailable for this concept', text: ctx.text || 'JURISAI does not have verified sources for this concept in the selected jurisdiction yet. It will not guess. You can switch jurisdiction or continue with document evidence only.', acts: ctx.acts || '<button class="btn btn-secondary btn-sm" data-act="law-switch">Choose another jurisdiction</button>' },
      evidence: { icon: 'search', tone: '', code: 'EVD-204', title: 'Not enough evidence to answer', text: ctx.text || 'Your verified documents do not contain enough information to answer this reliably. JURISAI will not infer an answer it cannot trace to a source.', acts: ctx.acts || '' },
      network: { icon: 'wifi-off', tone: 'risk', code: 'NET-000', title: 'Connection lost', text: 'JURISAI cannot reach the secure service. Your documents are unchanged and nothing was sent. Check your connection and try again.', acts: '<button class="btn btn-primary btn-sm" data-act="net-retry">' + I('refresh', 'ico-sm') + 'Try again</button>' }
    }[kind];
    return '<div class="errstate ' + E.tone + '" role="alert"><div class="errstate-ic">' + I(E.icon, 'ico-lg') + '</div><div class="errstate-b"><div class="mono errstate-code">' + E.code + '</div><h3>' + E.title + '</h3><p>' + E.text + '</p>' + (E.acts ? '<div class="errstate-a">' + E.acts + '</div>' : '') + '</div></div>';
  };

  /* progress steps instead of spinners */
  J.runSteps = function (host, title, lines, ms, done) {
    host.innerHTML = '<div class="ls"><div class="ls-t"><span class="label">' + esc(title) + '</span><span class="mono ls-p">0/' + lines.length + '</span></div><ol>' +
      lines.map(function (l) { return '<li><span class="ls-ic"></span><span>' + esc(l) + '</span></li>'; }).join('') + '</ol><div class="ls-bar"><i></i></div></div>';
    var li = $$('li', host), i = 0, bar = $('.ls-bar i', host), pc = $('.ls-p', host);
    (function tick() {
      if (!host.isConnected) return;
      if (i > 0) li[i - 1].className = 'done';
      pc.textContent = i + '/' + lines.length; bar.style.width = (i / lines.length * 100) + '%';
      if (i < li.length) { li[i].className = 'run'; i++; J.later(tick, ms); } else { bar.style.width = '100%'; done && done(); }
    })();
  };

  /* ---------- citations / refs ---------- */
  J.refInfo = function (ref) {
    var p = String(ref).split(':'), d = J.data.docById(p[0]); if (!d || !d.content) return null;
    var para = p[1], found = null;
    d.content.clauses.forEach(function (c) { c.paras.forEach(function (q) { if (q.ref === para) found = { doc: d, clause: c, para: q }; }); });
    if (!found) return null;
    found.label = '§' + para + ' · p.' + found.clause.page; found.full = d.name + ' · ' + found.label;
    return found;
  };
  J.cite = function (ref, n) { return '<button class="cite" data-act="cite" data-ref="' + ref + '" title="Open source: ' + esc((J.refInfo(ref) || {}).full || ref) + '">' + n + '</button>'; };
  J.citeLink = function (ref, text) { var i = J.refInfo(ref); return '<button class="srcref" data-act="cite" data-ref="' + ref + '">' + I('file', 'ico-xs') + esc(text || (i ? i.full : ref)) + '</button>'; };
  J.openRef = function (ref, opts) {
    var p = ref.split(':'), r = J.route;
    if (opts && opts.panel && J.views.research && r.name === 'research') { J.views.research.showSource(ref); return; }
    if (r.name === 'analyze' && r.arg === p[0] && J.views.analyze.focusRef) { J.views.analyze.focusRef(p[1]); return; }
    J.go('analyze/' + p[0] + '?ref=' + p[1]);
  };

  /* ---------- speech & voice ---------- */
  var spkTimer = null;
  J.stopSpeak = function (silent) {
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
    clearTimeout(spkTimer); var b = $('#listenbar'); if (b) b.classList.remove('on');
    $$('.is-listening').forEach(function (e) { e.classList.remove('is-listening'); });
  };
  J.speak = function (text, label, btn) {
    J.stopSpeak(true);
    var lang = J.settings.lang, bar = $('#listenbar');
    $('#listen-l', bar).textContent = label || 'Reading aloud';
    $('#listen-t', bar).textContent = text.length > 140 ? text.slice(0, 137) + '…' : text;
    bar.classList.add('on'); btn && btn.classList.add('is-listening');
    var secs = Math.max(3, Math.min(60, text.length / 14 / (J.settings.speed || 1)));
    $('.listen-prog i', bar).style.animationDuration = secs + 's';
    try {
      if ('speechSynthesis' in window && window.SpeechSynthesisUtterance) {
        var u = new SpeechSynthesisUtterance(text); u.lang = { en: 'en-GB', hi: 'hi-IN', es: 'es-ES' }[lang] || 'en-GB'; u.rate = J.settings.speed || 1;
        u.onend = function () { J.stopSpeak(true); }; window.speechSynthesis.speak(u);
      }
    } catch (e) {}
    spkTimer = setTimeout(function () { J.stopSpeak(true); }, secs * 1000 + 800);
  };
  J.voice = function (input, btn, after) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!J.settings.voiceInput) { J.toast('Voice input is turned off in Settings → Voice & Language', 'warn'); return; }
    btn.classList.add('rec'); var old = input.placeholder; input.placeholder = 'Listening…';
    function end(txt) { btn.classList.remove('rec'); input.placeholder = old; if (txt) { input.value = txt; input.dispatchEvent(new Event('input')); after && after(txt); } }
    if (SR) {
      try {
        var r = new SR(); r.lang = { en: 'en-GB', hi: 'hi-IN', es: 'es-ES' }[J.settings.lang] || 'en-GB'; r.interimResults = false;
        r.onresult = function (e) { end(e.results[0][0].transcript); }; r.onerror = function (e) { end(); J.toast('Microphone unavailable (' + e.error + '). You can type your question instead.', 'warn'); }; r.onend = function () { btn.classList.remove('rec'); input.placeholder = old; };
        r.start(); return;
      } catch (e) {}
    }
    J.later(function () { end('Does the termination clause conflict with the company policy?'); J.toast('Voice input is simulated in this preview'); }, 1700);
  };

  /* ---------- translation lookup ---------- */
  J.tr = function (key, fallback) {
    var l = J.settings.lang; if (l === 'en') return { t: fallback, tr: false };
    var t = J.data.tr[l] && J.data.tr[l][key];
    return t ? { t: t, tr: true } : { t: fallback, tr: false, miss: true };
  };

  /* ---------- global actions ---------- */
  var A = J.actions;
  A['drawer-close'] = function () { J.ui.closeDrawer(); };
  A['modal-close'] = function () { J.ui.closeModal(); };
  A['cite'] = function (el) { J.openRef(el.dataset.ref, { panel: el.closest('[data-cite-panel]') }); };
  A['sb-logo'] = function (el, e) {
    if (window.innerWidth <= 1000) return; /* mobile: logo stays a home link, drawer has its own controls */
    if (e) e.preventDefault();
    A['sb-toggle']();
    var c = J.settings.collapsed; el.setAttribute('aria-expanded', String(!c)); el.title = c ? 'Expand sidebar' : 'Collapse sidebar';
  };
  A['sb-toggle'] = function () { J.set('collapsed', !J.settings.collapsed); $('#app').classList.toggle('collapsed', J.settings.collapsed); };
  A['sb-open'] = function () { $('#app').classList.add('sb-open'); };
  A['sb-close'] = function () { $('#app').classList.remove('sb-open'); };
  A['net-retry'] = function () { if (J.state.offline) { J.state.offline = false; J.toast('Connection restored'); } J.render(true); };
  A['copy'] = function (el) { var t = el.dataset.text || ''; try { navigator.clipboard.writeText(t); } catch (e) {} J.toast('Copied to clipboard'); };
  A['toast'] = function (el) { J.toast(el.dataset.msg || 'Done', el.dataset.kind); };
  A['listen'] = function (el) {
    if (el.classList.contains('is-listening')) { J.stopSpeak(); return; }
    var src = el.dataset.target ? $(el.dataset.target) : el.closest('[data-speak]'); var txt = el.dataset.text || (src ? src.innerText : '');
    J.speak(txt.replace(/\s+/g, ' ').trim(), el.dataset.label, el);
  };
  A['listen-stop'] = function () { J.stopSpeak(); };
  A['translate-menu'] = function (el) { J.langMenu(el, 'Translate to'); };
  A['back'] = function () { history.length > 1 ? history.back() : J.go('home'); };

  J.langMenu = function (anchor, heading) {
    J.ui.menu(anchor, [{ header: heading || 'Language' }].concat(J.data.langs.map(function (l) {
      return { label: l.label, sub: l.id === 'en' ? 'Original' : 'Explanations & reports', checked: l.id === J.settings.lang, fn: function () { J.set('lang', l.id); J.render(true); if (l.id !== 'en') J.toast('Translated to ' + l.label + '. Source text stays in its original language.'); } };
    })), { align: 'right', width: 260 });
  };
  J.jurMenu = function (anchor) {
    J.ui.menu(anchor, [{ header: 'Jurisdiction' }].concat(J.data.jurs.map(function (j) {
      return { label: j.name, sub: j.sys, checked: j.id === J.settings.jur, fn: function () { J.set('jur', j.id); J.toast('Jurisdiction set to ' + j.name); J.render(true); } };
    })).concat([{ divider: true }, { label: 'Request another jurisdiction', icon: 'plus', fn: function () { J.requestJurisdiction(); } }]), { width: 300 });
  };
  J.requestJurisdiction = function () {
    J.ui.modal({ title: 'Request a jurisdiction', html: '<p class="muted">JURISAI only researches law it can ground in verified sources. Tell us which jurisdiction you need and we will notify you when coverage is added.</p><div class="field"><label for="rj">Jurisdiction</label><input class="input in-sm" id="rj" placeholder="e.g. Singapore, Canada (Ontario), Germany"></div>', foot: '<button class="btn btn-secondary btn-sm" data-act="modal-close">Cancel</button><button class="btn btn-primary btn-sm" data-act="rj-send">Send request</button>' });
  };
  A['rj-send'] = function () { var v = ($('#rj') || {}).value; J.ui.closeModal(); J.toast(v ? 'Request logged for ' + esc(v) : 'Request logged'); };
  A['jur-menu'] = function (el) { J.jurMenu(el); };
  A['lang-menu'] = function (el) { J.langMenu(el); };
  A['session-info'] = function (el) {
    J.ui.menu(el, [], { align: 'right', width: 300, html: '<div class="sess"><div class="label">Secure session</div><dl><dt>Transport</dt><dd class="mono">TLS 1.3 · AES-256-GCM</dd><dt>Workspace</dt><dd class="mono">Isolated · single tenant</dd><dt>Idle timeout</dt><dd class="mono">30 min</dd><dt>Gateway</dt><dd class="mono">Online · enforcing</dd></dl><button class="btn btn-secondary btn-sm btn-block" data-go="security">Open Security Center</button></div>' });
  };
  A['notif'] = function (el) {
    var n = J.data.notifs;
    var html = '<div class="np-h"><span class="label">Notifications</span><button class="linkbtn" data-act="notif-read">Mark all read</button></div>' +
      n.map(function (x, i) { return '<button class="np-i' + (x.read ? '' : ' unread') + '" data-act="notif-open" data-i="' + i + '"><span class="np-ic np-' + x.kind + '">' + I(x.icon, 'ico-sm') + '</span><span><b>' + x.title + '</b><small>' + x.text + '</small><em class="mono">' + J.fmt.rel(x.at) + '</em></span></button>'; }).join('');
    J.ui.menu(el, [], { align: 'right', width: 380, cls: 'np', html: html, keep: true });
  };
  A['notif-read'] = function () { J.data.notifs.forEach(function (x) { x.read = true; }); J.ui.closeMenu(); J.chrome(J.route, J.views[J.route.name]); J.toast('All notifications marked as read'); };
  A['notif-open'] = function (el) { var x = J.data.notifs[+el.dataset.i]; x.read = true; J.ui.closeMenu(); J.go(x.go); };
  A['profile'] = function (el) {
    var u = J.user();
    J.ui.menu(el, [
      { label: 'Profile & account', icon: 'user', fn: function () { J.go('settings/account'); } },
      { label: 'Security settings', icon: 'shield', fn: function () { J.go('settings/security'); } },
      { label: 'Help & Support', icon: 'help', fn: function () { J.go('help'); } },
      { label: 'Replay welcome tour', icon: 'play', fn: function () { J.go('welcome'); } },
      { divider: true },
      { label: 'Sign out', icon: 'logout', fn: function () { J.signOut(); location.href = 'signin.html'; } }
    ], { align: 'right', width: 260, html: '<div class="pm-h"><b data-user="name">' + esc(J.userName()) + '</b><small data-user="email">' + esc(J.userEmail()) + '</small><small data-user="org">' + esc(u.org) + '</small></div>' });
  };
  A['sign-out'] = function () { J.signOut(); }; /* the link's own href then returns to signin.html */
  A['go'] = function (el) { J.go(el.dataset.to); };

  /* ---------- global search ---------- */
  var gsIdx = -1, gsItems = [];
  function gsBuild(q) {
    q = q.trim().toLowerCase(); var out = [];
    if (q) {
      J.data.docs.forEach(function (d) { if ((d.name + ' ' + d.type).toLowerCase().indexOf(q) >= 0) out.push({ g: 'Documents', icon: 'file', t: d.name, s: d.type + ' · ' + J.jurName(d.jur), go: d.content && d.sec === 'verified' ? 'analyze/' + d.id : 'documents?q=' + encodeURIComponent(d.name) }); });
      J.data.docs.forEach(function (d) { if (!d.content) return; d.content.clauses.forEach(function (c) { c.paras.forEach(function (p) { if (out.filter(function (o) { return o.g === 'Clauses'; }).length < 4 && (c.title + ' ' + p.text).toLowerCase().indexOf(q) >= 0) out.push({ g: 'Clauses', icon: 'quote', t: '§' + p.ref + ' ' + c.title, s: d.name, go: 'analyze/' + d.id + '?ref=' + p.ref }); }); }); });
      J.data.help.forEach(function (a) { if (out.filter(function (o) { return o.g === 'Help'; }).length < 2 && (a.title + ' ' + a.text).toLowerCase().indexOf(q) >= 0) out.push({ g: 'Help', icon: 'help', t: a.title, s: 'Help article', go: 'help/' + a.id }); });
      out.push({ g: 'Ask JURISAI', icon: 'sparkle', t: 'Ask: “' + q + '”', s: 'Grounded research across your verified documents', go: 'research?q=' + encodeURIComponent(q) });
    } else {
      out = [{ g: 'Jump to', icon: 'upload', t: 'Upload a document', s: 'Secure intake', go: 'documents/intake' }, { g: 'Jump to', icon: 'compare', t: 'Compare documents', s: 'Detect contradictions', go: 'compare' }, { g: 'Jump to', icon: 'scales', t: 'Legal Context', s: J.jurName(J.settings.jur), go: 'law' }, { g: 'Jump to', icon: 'sparkle', t: 'Ask JURISAI', s: 'Grounded research', go: 'research' }];
    }
    return out;
  }
  function gsRender() {
    var pop = $('#gs-pop'), inp = $('#gs'); gsItems = gsBuild(inp.value); gsIdx = -1; var g = '';
    pop.innerHTML = gsItems.map(function (it, i) {
      var h = it.g !== g ? '<div class="menu-h">' + it.g + '</div>' : ''; g = it.g;
      return h + '<button class="gs-i" data-i="' + i + '">' + I(it.icon, 'ico-sm') + '<span><b>' + esc(it.t) + '</b><small>' + esc(it.s) + '</small></span></button>';
    }).join('');
    pop.classList.add('on');
  }
  function gsPick(i) { var it = gsItems[i]; if (!it) return; $('#gs-pop').classList.remove('on'); $('#gs').value = ''; $('#gs').blur(); J.go(it.go); }
  function wireSearch() {
    var inp = $('#gs'), pop = $('#gs-pop');
    inp.addEventListener('focus', gsRender); inp.addEventListener('input', gsRender);
    inp.addEventListener('keydown', function (e) {
      var els = $$('.gs-i', pop);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); gsIdx = (gsIdx + (e.key === 'ArrowDown' ? 1 : -1) + els.length) % els.length; els.forEach(function (x, i) { x.classList.toggle('on', i === gsIdx); }); }
      else if (e.key === 'Enter') { e.preventDefault(); gsPick(gsIdx >= 0 ? gsIdx : gsItems.length - 1 >= 0 && inp.value.trim() ? gsItems.length - 1 : 0); }
      else if (e.key === 'Escape') { pop.classList.remove('on'); inp.blur(); }
    });
    pop.addEventListener('mousedown', function (e) { var b = e.target.closest('.gs-i'); if (b) { e.preventDefault(); gsPick(+b.dataset.i); } });
    document.addEventListener('mousedown', function (e) { if (!e.target.closest('.gs-wrap')) pop.classList.remove('on'); });
    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      if ((e.key === '/' && tag !== 'input' && tag !== 'textarea') || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); inp.focus(); }
    });
  }

  /* ---------- shell ---------- */
  var NAV = [
    ['Workspace', [['home', 'Home', 'home'], ['documents', 'Documents', 'folder'], ['analyze', 'Analyze', 'analyze'], ['compare', 'Compare', 'compare'], ['law', 'Legal Context', 'scales'], ['research', 'AI Research', 'sparkle']]],
    ['Intelligence', [['activity', 'Activity', 'history'], ['security', 'Security', 'shield-check']]]
  ];
  function shell() {
    var u = J.user();
    return '<div class="app" id="app">' +
      '<aside class="sb" id="sb" aria-label="Primary">' +
      '<div class="sb-brand"><a href="#/home" class="sb-logo" data-act="sb-logo" role="button" aria-label="Toggle sidebar" title="Toggle sidebar"><img class="mk" src="assets/logo-mark-light.png" alt=""><img class="wd" src="assets/logo-wordmark-light.png" alt="JURISAI"></a>' +
      '<button class="sb-collapse" data-act="sb-toggle" title="Collapse sidebar" aria-label="Collapse sidebar">' + I('sidebar', 'ico-sm') + '</button><button class="sb-x" data-act="sb-close" aria-label="Close menu">' + I('x') + '</button></div>' +
      '<nav class="sb-scroll">' + NAV.map(function (g) {
        return '<div class="sb-label"><span>' + g[0] + '</span></div>' + g[1].map(function (n) {
          return '<a class="sb-item" data-nav="' + n[0] + '" href="#/' + n[0] + '" title="' + n[1] + '">' + I(n[2]) + '<span class="sb-text">' + n[1] + '</span>' + (n[0] === 'documents' ? '<span class="sb-count" id="sb-docs-n"></span>' : '') + '</a>';
        }).join('');
      }).join('') + '</nav>' +
      '<a class="sb-gate" href="#/security" title="Security gateway"><span class="dot dot-ok pulse"></span><span class="sb-text"><b>Security gateway</b><small class="mono" id="sb-gate-n">online</small></span></a>' +
      '<div class="sb-foot"><a class="sb-item" data-nav="settings" href="#/settings" title="Settings">' + I('sliders') + '<span class="sb-text">Settings</span></a>' +
      '<a class="sb-item" data-nav="help" href="#/help" title="Help & Support">' + I('help') + '<span class="sb-text">Help &amp; Support</span></a>' +
      '<button class="sb-user" data-act="profile" title="Profile"><span class="av" data-user="initials">' + esc(J.initials(J.userName())) + '</span><span class="sb-text"><b data-user="name">' + esc(J.userName()) + '</b><small data-user="role">' + esc(u.role) + '</small></span></button></div>' +
      '</aside><div class="main"><header class="topbar">' +
      '<button class="icon-btn sb-burger" data-act="sb-open" aria-label="Open menu">' + I('menu') + '</button>' +
      '<nav class="crumbs" id="crumbs" aria-label="Breadcrumb"></nav>' +
      '<div class="gs-wrap"><label class="gs" for="gs">' + I('search', 'ico-sm') + '<input id="gs" type="search" autocomplete="off" placeholder="Search documents, clauses, law…" aria-label="Global search"><kbd>/</kbd></label><div class="gs-pop" id="gs-pop"></div></div>' +
      '<div class="tb-right">' +
      '<button class="tb-btn" data-act="jur-menu" aria-label="Jurisdiction">' + I('globe', 'ico-sm') + '<span class="tb-k">Jurisdiction</span><span class="tb-v" id="tb-jur"></span>' + I('chev-down', 'ico-xs') + '</button>' +
      '<button class="tb-btn" data-act="lang-menu" aria-label="Language">' + I('translate', 'ico-sm') + '<span class="tb-v" id="tb-lang"></span>' + I('chev-down', 'ico-xs') + '</button>' +
      '<button class="icon-btn bell" data-act="notif" aria-label="Notifications">' + I('bell') + '<i class="bell-dot" id="bell-dot"></i></button>' +
      '<button class="secure" data-act="session-info" title="Secure session"><i class="dot dot-ok pulse"></i><span>Secure session</span></button>' +
      '<button class="av av-top" data-act="profile" aria-label="Profile menu" data-user="initials">' + esc(J.initials(J.userName())) + '</button></div></header>' +
      '<div class="offline-bar" id="offline-bar" role="status">' + I('wifi-off', 'ico-sm') + '<span>You are offline. Documents are safe; new uploads and research are paused.</span><button class="linkbtn" data-act="net-retry">Retry</button></div>' +
      '<main class="view" id="view" tabindex="-1"></main>' +
      '<div class="listenbar" id="listenbar" role="status"><span class="listen-ic">' + I('volume', 'ico-sm') + '</span><div><b id="listen-l">Reading aloud</b><small id="listen-t"></small><div class="listen-prog"><i></i></div></div><button class="btn btn-secondary btn-sm" data-act="listen-stop">' + I('stop', 'ico-xs') + 'Stop</button></div>' +
      '</div><div class="scrim" data-act="sb-close"></div></div><div id="layers"></div><div id="toasts" aria-live="polite"></div>';
  }

  J.boot = function () {
    document.body.classList.add('app-body');
    document.body.insertAdjacentHTML('beforeend', shell());
    wireSearch();
    document.addEventListener('click', function (e) {
      var g = e.target.closest('[data-go]'); if (g && !e.target.closest('[data-act]')) { e.preventDefault(); J.ui.closeDrawer(); J.ui.closeModal(); J.go(g.dataset.go); $('#app').classList.remove('sb-open'); return; }
      var t = e.target.closest('[data-act]');
      if (t && A[t.dataset.act]) { if (t.tagName === 'A' && !t.getAttribute('href')) e.preventDefault(); A[t.dataset.act](t, e); return; }
      if (t && !A[t.dataset.act]) console.warn('No handler for', t.dataset.act);
      if (e.target.closest('.sb-item,.sb-gate')) $('#app').classList.remove('sb-open');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { if ($('#modal')) J.ui.closeModal(); else if ($('#drawer')) J.ui.closeDrawer(); else J.ui.closeMenu(); }
    });
    window.addEventListener('jurisai:user', function () { J.refreshUser(); }); /* profile edited here or in another tab */
    window.addEventListener('hashchange', function () { J.ui.closeDrawer(); J.ui.closeModal(); $('#app').classList.remove('sb-open'); J.render(); });
    window.addEventListener('offline', function () { J.chrome(J.route, J.views[J.route.name]); });
    window.addEventListener('online', function () { J.chrome(J.route, J.views[J.route.name]); });
    J.render();
  };
})();
