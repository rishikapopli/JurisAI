/* SETTINGS — editorial layout, every control persists and takes effect */
(function () {
  'use strict';
  var J = window.J, D = J.data, esc = J.esc, I = J.icon, A = J.actions, $ = J.$, $$ = J.$$;
  var SECS = [['account', 'Account', 'user'], ['preferences', 'Preferences', 'sliders'], ['ai', 'AI & Research', 'sparkle'], ['voice', 'Voice & Language', 'volume'], ['security', 'Security', 'shield-check'], ['privacy', 'Documents & Privacy', 'lock'], ['notifications', 'Notifications', 'bell']];
  var sessions = [{id:'current',dev:'Current browser session',loc:'This device',last:'Active now',cur:true}];
  function historyRows(){return D.activity().filter(function(e){return /signed in|password|profile/.test((e.title||'').toLowerCase());}).slice(0,10);}
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
      return h('Profile', 'Your account and workspace profile.') + row('Full name', 'Saved to your profile and audit events.', pinp('name'), 'st-name') + row('Email', 'Used to sign in. Email delivery is not configured.', pinp('email', { type: 'email' }) + '<span class="chip chip-ok">' + I('check', 'ico-xs') + 'Verified</span>', 'st-email') + row('Role', 'Saved to your profile.', pinp('role'), 'st-role') +
        h('Organization') + row('Organization', 'Saved to your profile.', pinp('org'), 'st-org') + row('Members', 'Invitation records can be created; email delivery and shared workspaces are not enabled.', '<button class="btn btn-secondary btn-sm" data-act="set-invite">' + I('users', 'ico-sm') + 'Create invitation record</button>') +
        h('Session') + row('Sign out of JURISAI', 'You will return to the sign-in page.', '<a class="btn btn-secondary btn-sm" href="signin.html" data-act="sign-out">' + I('logout', 'ico-sm') + 'Sign out</a>') + row('Delete account', 'Permanently removes your workspace, documents and analysis.', '<button class="btn btn-danger btn-sm" data-act="set-delete">Delete account…</button>');
    },
    preferences: function () {
      return h('Preferences', 'Defaults that apply across the workspace.') + row('Default jurisdiction', 'Used for Legal Context, Research and Reports.', sel('jur', D.jurs.map(function (j) { return [j.id, j.name]; })), 'st-jur') + row('Language', 'Language for explanations, summaries and reports.', sel('lang', D.langs.map(function (l) { return [l.id, l.label]; })), 'st-lang') +
        row('Theme', 'Ivory is the default. Paper is brighter, for long reading.', seg('theme', [['ivory', 'Ivory'], ['paper', 'Paper']])) + row('Date format', 'Example: ' + J.fmt.date(new Date()), sel('dateFmt', [['dmy', 'DD/MM/YYYY'], ['mdy', 'MM/DD/YYYY'], ['iso', 'YYYY-MM-DD'], ['long', '5 Oct 2026']]), 'st-dateFmt');
    },
    ai: function () {
      return h('AI & Research', 'The research engine is not enabled in this version.') + J.empty({icon:'sparkle',title:'No AI settings to configure',text:'Citation style, research depth, generated answers, and AI source display will be available when the analysis engine is implemented.'});
    },
    voice: function () {
      return h('Voice & Language', 'Listen to explanations and ask questions by voice.') + row('Preferred language', 'Used for translation and reading aloud.', sel('lang', D.langs.map(function (l) { return [l.id, l.label]; })), 'st-lang') +
        row('Voice', 'Voice used by Listen.', sel('voice', [['Neutral (UK)', 'Neutral (UK)'], ['Neutral (US)', 'Neutral (US)'], ['Warm (UK)', 'Warm (UK)']]), 'st-voice') +
        row('Speech speed', '<span id="spd-l">' + J.settings.speed + '×</span>', '<input type="range" class="range" id="st-speed" data-set="speed" data-num="1" min="0.75" max="1.5" step="0.25" value="' + J.settings.speed + '" aria-label="Speech speed"><button class="btn btn-secondary btn-sm" data-act="set-play">' + I('play', 'ico-sm') + 'Play sample</button>') +
        row('Voice input', 'Show the microphone in search and question fields.', sw('voiceInput'));
    },
    security: function () {
      return h('Security', 'Manage the account controls available in this release.') + row('Password', 'Change it whenever you need to.', '<button class="btn btn-secondary btn-sm" data-act="set-pw">' + I('key', 'ico-sm') + 'Change password</button>') + row('Two-factor authentication', 'Not enabled in this version.', '<span class="chip">Not enabled</span>') + row('Security notifications', 'Preference saved; email delivery is not configured.', '<span class="chip">Email unavailable</span>') +
        h('Active sessions') + '<table class="tbl tbl-tight st-tbl"><tbody id="sess">' + sess() + '</tbody></table>' +
        h('Login & account history') + '<table class="tbl tbl-tight st-tbl"><tbody>' + (historyRows().map(function(e){return '<tr><td class="mono nw">'+J.fmt.dt(e.t)+'</td><td>'+esc(e.title)+'</td><td class="muted">'+esc(e.obj)+'</td><td>'+J.chip('chip-ok','Recorded')+'</td></tr>';}).join('') || '<tr><td colspan="4" class="muted">No account events recorded yet.</td></tr>') + '</tbody></table>';
    },
    privacy: function () {
      return h('Documents & Privacy', 'Retention automation is not enabled in this version.') + row('Document retention', 'No automatic deletion is performed.', '<span class="chip">Not enabled</span>') + row('Auto-delete after analysis', 'Analysis is not enabled, so original-file auto-delete is unavailable.', '<span class="chip">Not enabled</span>') +
        h('Data preferences') + row('Train models on my documents', 'No model is connected to this release.', '<span class="chip">Not enabled</span>') + row('Product analytics', 'Analytics collection is not connected.', '<span class="chip">Not enabled</span>') +
        row('Export my data', 'Download your documents list, settings and audit log.', '<button class="btn btn-secondary btn-sm" data-act="set-export">' + I('download', 'ico-sm') + 'Export data</button>');
    },
    notifications: function () {
      return h('Notifications', 'Notification delivery is not connected in this version.') + row('Email notifications', 'No email service is configured.', '<span class="chip">Unavailable</span>') + row('Browser notifications', 'Browser notification delivery is not enabled.', '<span class="chip">Unavailable</span>') + row('Digest', 'Notification schedules are not implemented.', '<span class="chip">Unavailable</span>') +
        h('What to notify') + '<p class="muted">No notification categories are active.</p>';
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
  A['set-revoke'] = function () { J.toast('Session management for other devices will be enabled with multi-device sessions.','warn'); };
  A['set-invite'] = function () { J.ui.modal({ title: 'Create invitation record', html: '<p class="muted">This saves an invitation record. Email delivery, shared workspaces, and document sharing are not enabled in this release.</p><div class="field"><label for="inv">Email</label><input class="input in-sm" id="inv" type="email" placeholder="colleague@firm.com"></div>', foot: '<button class="btn btn-secondary btn-sm" data-act="modal-close">Cancel</button><button class="btn btn-primary btn-sm" data-act="set-invite-ok">Create record</button>' }); };
  A['set-invite-ok'] = function () { var v=$('#inv').value.trim(); if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)){J.toast('Enter a valid email address','warn');return;} J.api('/api/invitations',{method:'POST',body:JSON.stringify({email:v})}).then(function(){J.ui.closeModal();J.toast('Invitation record created. No email was sent.');}).catch(function(e){J.toast(e.message||'Could not create invitation','warn');}); };
  A['set-pw'] = function () { J.ui.modal({ title: 'Change password', html: '<div class="field"><label for="pw0">Current password</label><input class="input in-sm" id="pw0" type="password" autocomplete="current-password"></div><div class="field"><label for="pw1">New password</label><input class="input in-sm" id="pw1" type="password" autocomplete="new-password" placeholder="At least 10 characters"></div>', foot: '<button class="btn btn-secondary btn-sm" data-act="modal-close">Cancel</button><button class="btn btn-primary btn-sm" data-act="set-pw-ok">Update password</button>' }); };
  A['set-pw-ok'] = function(){var old=$('#pw0').value,nw=$('#pw1').value;if(!old||nw.length<10){J.toast('Enter your current password and a new one of 10+ characters','warn');return;}J.api('/api/auth/change-password',{method:'POST',body:JSON.stringify({currentPassword:old,newPassword:nw})}).then(function(){J.ui.closeModal();J.toast('Password updated.');}).catch(function(e){J.toast(e.message||'Could not update password','warn');});};
  A['set-delete'] = function () { J.ui.modal({ title: 'Delete account?', html: '<div class="banner banner-risk">' + I('alert') + '<div>This permanently removes your workspace, documents and analysis. It cannot be undone.</div></div><div class="field"><label for="del">Type DELETE to confirm</label><input class="input in-sm" id="del" autocomplete="off"></div>', foot: '<button class="btn btn-secondary btn-sm" data-act="modal-close">Cancel</button><button class="btn btn-danger btn-sm" data-act="set-delete-ok">Delete account</button>' }); };
  A['set-delete-ok'] = function(){if($('#del').value!=='DELETE'){J.toast('Type DELETE exactly to confirm','warn');return;}J.api('/api/account',{method:'DELETE'}).then(function(){J.ui.closeModal();location.href='signin.html';}).catch(function(e){J.toast(e.message||'Could not delete account','warn');});};
  A['set-export'] = function () { J.download('jurisai_data_export.json', JSON.stringify({ exported: new Date().toISOString(), profile: (function (u) { return { name: u.name, email: u.email, role: u.role, org: u.org }; })(J.user()), settings: J.settings, documents: D.docs.map(function (d) { return { name: d.name, type: d.type, security: d.sec, analysis: d.an, sha256: d.sha }; }), audit: D.activity().map(function (e) { return { at: e.t, event: e.title, object: e.obj }; }) }, null, 2), 'application/json'); J.toast('Data export downloaded'); };
})();
