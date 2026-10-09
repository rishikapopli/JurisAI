/* SETTINGS — editorial layout, every control persists and takes effect */
(function () {
  'use strict';
  var J = window.J, D = J.data, esc = J.esc, I = J.icon, A = J.actions, $ = J.$, $$ = J.$$;
  var SECS = [['account', 'Account', 'user'], ['preferences', 'Preferences', 'sliders'], ['ai', 'AI & Research', 'sparkle'], ['voice', 'Voice & Language', 'volume'], ['security', 'Security', 'shield-check'], ['privacy', 'Documents & Privacy', 'lock'], ['notifications', 'Notifications', 'bell']];
  var sessions = [{ id: 's1', dev: 'Chrome on macOS', loc: 'Mumbai, India', last: 'Active now', cur: true }, { id: 's2', dev: 'Safari on iPhone', loc: 'Mumbai, India', last: '2 hours ago' }, { id: 's3', dev: 'Edge on Windows', loc: 'London, United Kingdom', last: '3 days ago' }];
  var history = [['Today 09:12', 'Sign in', 'Chrome on macOS', 'Success'], ['Yesterday 18:40', 'Sign in', 'Safari on iPhone', 'Success'], ['3 days ago', 'Sign in', 'Edge on Windows', 'Success'], ['5 days ago', 'Sign in', 'Unknown browser · Lagos', 'Blocked'], ['9 days ago', 'Password change', 'Chrome on macOS', 'Success']];
  var NOTIF = [['sec', 'Security events', 'Files blocked, review required, new sign-ins.'], ['rev', 'Findings requiring review', 'New potential contradictions and inconsistencies.'], ['ana', 'Analysis complete', 'When an analysis or comparison finishes.'], ['upd', 'Product updates', 'New jurisdictions and features.']];
  var nstate = J.store.get('notifCats', { sec: true, rev: true, ana: true, upd: false });

  var row = function (label, desc, ctl, id) { return '<div class="sr"><div class="sr-l"><label' + (id ? ' for="' + id + '"' : '') + '>' + label + '</label>' + (desc ? '<p>' + desc + '</p>' : '') + '</div><div class="sr-c">' + ctl + '</div></div>'; };
  /* profile fields (name, email, role, org) belong to the signed-in user, not to settings */
  var pinp = function (k, o) { o = o || {}; return '<input class="input in-sm" id="st-' + k + '" data-profile="' + k + '"' + (o.type ? ' type="' + o.type + '" autocomplete="email"' : '') + ' value="' + esc(J.user()[k]) + '">'; };
  var sel = function (k, opts, o) { return '<select class="input in-sm" id="st-' + k + '" data-set="' + k + '"' + (o && o.num ? ' data-num="1"' : '') + '>' + opts.map(function (x) { return '<option value="' + x[0] + '"' + (String(J.settings[k]) === String(x[0]) ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>'; };
  var sw = function (k, dis) { return '<input type="checkbox" class="switch" id="st-' + k + '" data-set="' + k + '" data-bool="1"' + (J.settings[k] ? ' checked' : '') + (dis ? ' disabled' : '') + ' role="switch">'; };
  var seg = function (k, opts) { return '<div class="seg" role="radiogroup">' + opts.map(function (x) { return '<button role="radio" aria-checked="' + (J.settings[k] === x[0]) + '" class="' + (J.settings[k] === x[0] ? 'on' : '') + '" data-act="set-seg" data-k="' + k + '" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>'; };
  var h = function (t, sub) { return '<h2 class="sh">' + t + '</h2>' + (sub ? '<p class="sh-s">' + sub + '</p>' : ''); };

  var PANES = {
    account: function () {
      return h('Profile', 'How you appear to colleagues and in reports.') + row('Full name', 'Shown in reports and the audit log.', pinp('name'), 'st-name') + row('Email', 'Used to sign in and for security notices.', pinp('email', { type: 'email' }) + '<span class="chip chip-ok">' + I('check', 'ico-xs') + 'Verified</span>', 'st-email') + row('Role', 'Helps tailor explanations.', pinp('role'), 'st-role') +
        h('Organization') + row('Organization', 'Appears on reports.', pinp('org'), 'st-org') + row('Members', 'You are the only member of this workspace.', '<button class="btn btn-secondary btn-sm" data-act="set-invite">' + I('users', 'ico-sm') + 'Invite colleague</button>') +
        h('Session') + row('Sign out of JURISAI', 'You will return to the sign-in page.', '<a class="btn btn-secondary btn-sm" href="signin.html" data-act="sign-out">' + I('logout', 'ico-sm') + 'Sign out</a>') + row('Delete account', 'Permanently removes your workspace, documents and analysis.', '<button class="btn btn-danger btn-sm" data-act="set-delete">Delete account…</button>');
    },
    preferences: function () {
      return h('Preferences', 'Defaults that apply across the workspace.') + row('Default jurisdiction', 'Used for Legal Context, Research and Reports.', sel('jur', D.jurs.map(function (j) { return [j.id, j.name]; })), 'st-jur') + row('Language', 'Language for explanations, summaries and reports.', sel('lang', D.langs.map(function (l) { return [l.id, l.label]; })), 'st-lang') +
        row('Theme', 'Ivory is the default. Paper is brighter, for long reading.', seg('theme', [['ivory', 'Ivory'], ['paper', 'Paper']])) + row('Date format', 'Example: ' + J.fmt.date(new Date()), sel('dateFmt', [['dmy', 'DD/MM/YYYY'], ['mdy', 'MM/DD/YYYY'], ['iso', 'YYYY-MM-DD'], ['long', '5 Oct 2026']]), 'st-dateFmt');
    },
    ai: function () {
      return h('AI & Research', 'Control how answers are presented and sourced.') + row('Citation style', 'Numbered markers link to the source inspector.', seg('cite', [['numbered', 'Numbered'], ['section', 'Section refs']])) + row('Source display', 'Where a source opens when you select a citation.', seg('sourceDisplay', [['panel', 'Side panel'], ['drawer', 'Drawer']])) +
        row('Research depth', 'How much supporting detail answers include.', seg('research', [['concise', 'Concise'], ['balanced', 'Balanced'], ['thorough', 'Thorough']])) + row('Show inferences', 'Show reasoned steps labelled Inference. Turn off to see only quoted evidence and explanations.', sw('showInference')) +
        '<div class="banner">' + I('flag') + '<div>Whatever you choose, legal-context output stays labelled <b>AI-assisted legal research</b> and <b>Review required</b>.</div></div>';
    },
    voice: function () {
      return h('Voice & Language', 'Listen to explanations and ask questions by voice.') + row('Preferred language', 'Used for translation and reading aloud.', sel('lang', D.langs.map(function (l) { return [l.id, l.label]; })), 'st-lang') +
        row('Voice', 'Voice used by Listen.', sel('voice', [['Neutral (UK)', 'Neutral (UK)'], ['Neutral (US)', 'Neutral (US)'], ['Warm (UK)', 'Warm (UK)']]), 'st-voice') +
        row('Speech speed', '<span id="spd-l">' + J.settings.speed + '×</span>', '<input type="range" class="range" id="st-speed" data-set="speed" data-num="1" min="0.75" max="1.5" step="0.25" value="' + J.settings.speed + '" aria-label="Speech speed"><button class="btn btn-secondary btn-sm" data-act="set-play">' + I('play', 'ico-sm') + 'Play sample</button>') +
        row('Voice input', 'Show the microphone in search and question fields.', sw('voiceInput'));
    },
    security: function () {
      return h('Security', 'Protect your account as carefully as JURISAI protects your documents.') + row('Password', 'Last changed 9 days ago.', '<button class="btn btn-secondary btn-sm" data-act="set-pw">' + I('key', 'ico-sm') + 'Change password</button>') + row('Two-factor authentication', 'Require a one-time code at sign-in.', sw('twofa')) + row('Security notifications', 'Email me about new sign-ins and security events.', sw('secNotify')) +
        h('Active sessions') + '<table class="tbl tbl-tight st-tbl"><tbody id="sess">' + sess() + '</tbody></table>' +
        h('Login history') + '<table class="tbl tbl-tight st-tbl"><tbody>' + history.map(function (x) { return '<tr><td class="mono nw">' + x[0] + '</td><td>' + x[1] + '</td><td class="muted">' + x[2] + '</td><td>' + (x[3] === 'Blocked' ? J.chip('chip-risk', 'Blocked') : J.chip('chip-ok', 'Success')) + '</td></tr>'; }).join('') + '</tbody></table>';
    },
    privacy: function () {
      return h('Documents & Privacy', 'You decide how long documents are kept.') + row('Document retention', 'Documents and analysis are deleted after this period.', sel('retention', [['3', '3 months'], ['6', '6 months'], ['12', '12 months'], ['24', '24 months']]), 'st-retention') + row('Auto-delete after analysis', 'Remove the original file once its analysis is stored. Audit records are kept.', sw('autoDelete')) +
        h('Data preferences') + row('Train models on my documents', 'JURISAI never uses your documents to train models.', sw('training', true)) + row('Product analytics', 'Share anonymous usage data (never document content).', sw('analytics')) +
        row('Export my data', 'Download your documents list, settings and audit log.', '<button class="btn btn-secondary btn-sm" data-act="set-export">' + I('download', 'ico-sm') + 'Export data</button>');
    },
    notifications: function () {
      return h('Notifications', 'Choose what reaches you, and where.') + row('Email notifications', 'Sent to <span data-user="email">' + esc(J.userEmail()) + '</span>.', sw('notifyEmail')) + row('Browser notifications', 'Alerts while JURISAI is open.', sw('notifyBrowser')) + row('Digest', 'How often to group non-urgent updates.', sel('notifyDigest', [['instant', 'Instantly'], ['daily', 'Daily'], ['weekly', 'Weekly']]), 'st-notifyDigest') +
        h('What to notify') + NOTIF.map(function (n) { return row(n[1], n[2], '<input type="checkbox" class="switch" data-ncat="' + n[0] + '"' + (nstate[n[0]] ? ' checked' : '') + ' role="switch" aria-label="' + n[1] + '">'); }).join('');
    }
  };
  function sess() { return sessions.map(function (s) { return '<tr><td><b>' + s.dev + '</b><small class="blk">' + s.loc + '</small></td><td class="muted">' + s.last + '</td><td class="tr">' + (s.cur ? J.chip('chip-ok', 'This device') : '<button class="btn btn-secondary btn-xs" data-act="set-revoke" data-id="' + s.id + '">Sign out</button>') + '</td></tr>'; }).join(''); }

  J.views.settings = {
    title: 'Settings', fixed: true, crumbs: function (r) { var s = SECS.filter(function (x) { return x[0] === (r.arg || 'account'); })[0] || SECS[0]; return [['Settings', '#/settings'], s[1]]; },
    render: function (r) {
      var cur = SECS.some(function (s) { return s[0] === r.arg; }) ? r.arg : 'account';
      return '<header class="ph"><div><div class="kicker">Account</div><h1>Settings</h1></div></header><div class="st-wrap pad"><nav class="st-nav" aria-label="Settings sections">' + SECS.map(function (s) { return '<a href="#/settings/' + s[0] + '" class="' + (cur === s[0] ? 'on' : '') + '">' + I(s[2], 'ico-sm') + s[1] + '</a>'; }).join('') + '<a href="#/states" class="st-aux">' + I('layers', 'ico-sm') + 'Interface states</a></nav><div class="st-pane" id="st-pane">' + PANES[cur]() + '</div></div>';
    },
    mount: function () {
      var pane = $('#st-pane'), tm;
      function saved() { clearTimeout(tm); tm = setTimeout(function () { J.toast('Saved'); }, 200); }
      pane.addEventListener('change', function (e) {
        var t = e.target;
        if (t.dataset.profile === 'email') {
          var r = t.value.trim() ? J.updateProfile({ email: t.value }) : { ok: false, error: 'Email cannot be empty.' };
          if (!r.ok) { J.toast(r.error, 'warn'); t.value = J.user().email; } else { t.value = J.user().email; saved(); }
          return;
        }
        if (t.dataset.profile) return;
        if (t.dataset.ncat) { nstate[t.dataset.ncat] = t.checked; J.store.set('notifCats', nstate); saved(); return; }
        var k = t.dataset.set; if (!k) return;
        var v = t.dataset.bool ? t.checked : t.dataset.num ? parseFloat(t.value) : t.value;
        J.set(k, v); saved();
        if (['jur', 'lang', 'dateFmt'].indexOf(k) >= 0) J.render(true);
        if (k === 'twofa') J.toast(v ? 'Two-factor authentication on' : 'Two-factor authentication off', v ? '' : 'warn');
      });
      pane.addEventListener('input', function (e) { var t = e.target; if (t.type === 'range') { $('#spd-l').textContent = t.value + '×'; } if (t.dataset.set && (t.type === 'text' || !t.type)) { J.set(t.dataset.set, t.value); } if (t.dataset.profile && t.dataset.profile !== 'email') { J.updateProfile(((function (o) { o[t.dataset.profile] = t.value; return o; })({}))); } });
      pane.addEventListener('blur', function (e) { if (e.target.dataset && (e.target.dataset.set || (e.target.dataset.profile && e.target.dataset.profile !== 'email')) && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox' && e.target.type !== 'range') saved(); }, true);
    }
  };
  A['set-seg'] = function (el) { J.set(el.dataset.k, el.dataset.v); J.toast('Saved'); J.render(true); };
  A['set-play'] = function (el) { J.speak('This is how JURISAI will read explanations aloud, at your chosen speed.', 'Sample', el); };
  A['set-revoke'] = function (el) {
    var id = el.dataset.id;
    if (window.JurisAPI && window.JurisAPI.auth) {
      JurisAPI.auth.revokeSession(id).catch(function () {});
    }
    sessions = sessions.filter(function (s) { return s.id !== id; });
    $('#sess').innerHTML = sess();
    J.toast('Session signed out');
  };
  A['set-invite'] = function () { J.ui.modal({ title: 'Invite a colleague', html: '<p class="muted">They get their own secure workspace login. Documents are only shared when you share them.</p><div class="field"><label for="inv">Email</label><input class="input in-sm" id="inv" type="email" placeholder="colleague@firm.com"></div>', foot: '<button class="btn btn-secondary btn-sm" data-act="modal-close">Cancel</button><button class="btn btn-primary btn-sm" data-act="set-invite-ok">Send invitation</button>' }); };
  A['set-invite-ok'] = function () {
    var v = $('#inv').value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { J.toast('Enter a valid email address', 'warn'); return; }
    if (window.JurisAPI && window.JurisAPI.users) {
      JurisAPI.users.inviteMember(v).catch(function () {});
    }
    J.ui.closeModal(); J.toast('Invitation sent to ' + esc(v));
  };
  A['set-pw'] = function () { J.ui.modal({ title: 'Change password', html: '<div class="field"><label for="pw0">Current password</label><input class="input in-sm" id="pw0" type="password" autocomplete="current-password"></div><div class="field"><label for="pw1">New password</label><input class="input in-sm" id="pw1" type="password" autocomplete="new-password" placeholder="At least 10 characters"></div>', foot: '<button class="btn btn-secondary btn-sm" data-act="modal-close">Cancel</button><button class="btn btn-primary btn-sm" data-act="set-pw-ok">Update password</button>' }); };
  A['set-pw-ok'] = function () {
    var pw0 = $('#pw0').value, pw1 = $('#pw1').value;
    if (!pw0 || pw1.length < 10) { J.toast('Enter your current password and a new one of 10+ characters', 'warn'); return; }
    if (window.JurisAPI && window.JurisAPI.auth) {
      JurisAPI.auth.changePassword(pw0, pw1).then(function () {
        J.ui.closeModal(); J.toast('Password updated. Other sessions were signed out.');
      }).catch(function (err) {
        J.toast(err.message || 'Password update failed', 'risk');
      });
    } else {
      J.ui.closeModal(); J.toast('Password updated. Other sessions were signed out.');
    }
  };
  A['set-delete'] = function () { J.ui.modal({ title: 'Delete account?', html: '<div class="banner banner-risk">' + I('alert') + '<div>This permanently removes your workspace, documents and analysis. It cannot be undone.</div></div><div class="field"><label for="del">Type DELETE to confirm</label><input class="input in-sm" id="del" autocomplete="off"></div>', foot: '<button class="btn btn-secondary btn-sm" data-act="modal-close">Cancel</button><button class="btn btn-danger btn-sm" data-act="set-delete-ok">Delete account</button>' }); };
  A['set-delete-ok'] = function () {
    if ($('#del').value !== 'DELETE') { J.toast('Type DELETE exactly to confirm', 'warn'); return; }
    if (window.JurisAPI && window.JurisAPI.users) {
      JurisAPI.users.deleteAccount().then(function () {
        location.href = 'signin.html';
      }).catch(function (err) {
        J.toast(err.message || 'Account deletion failed', 'risk');
      });
    } else {
      J.ui.closeModal(); J.toast('Deletion is disabled in this preview', 'warn');
    }
  };
  A['set-export'] = function () { J.download('jurisai_data_export.json', JSON.stringify({ exported: new Date().toISOString(), profile: (function (u) { return { name: u.name, email: u.email, role: u.role, org: u.org }; })(J.user()), settings: J.settings, documents: D.docs.map(function (d) { return { name: d.name, type: d.type, security: d.sec, analysis: d.an, sha256: d.sha }; }), audit: D.activity().map(function (e) { return { at: e.t, event: e.title, object: e.obj }; }) }, null, 2), 'application/json'); J.toast('Data export downloaded'); };
})();
