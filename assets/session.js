/* JURISAI — user session & profile store.
   Single source of truth for WHO is signed in. Loaded by signin.html, signup.html and app.html.

   Storage (localStorage, same `jurisai.` prefix as the app store):
     jurisai.users    -> { [userId]: { id, name, email, role, org } }
     jurisai.session  -> userId of the signed-in user
   No passwords are ever stored here. Authentication itself is still simulated in auth.js;
   when a real backend is added, replace signIn/register with the API response and keep the rest. */
window.JurisSession = (function () {
  'use strict';
  var PFX = 'jurisai.', mem = {};
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var DEFAULTS = { role: 'Legal researcher', org: 'Personal workspace' };
  var FIELDS = ['name', 'email', 'role', 'org'];

  function get(k, d) { try { var v = localStorage.getItem(PFX + k); if (v != null) return JSON.parse(v); } catch (e) {} return k in mem ? mem[k] : d; }
  function set(k, v) { mem[k] = v; try { localStorage.setItem(PFX + k, JSON.stringify(v)); } catch (e) {} }
  function del(k) { delete mem[k]; try { localStorage.removeItem(PFX + k); } catch (e) {} }
  function norm(e) { return String(e == null ? '' : e).trim().toLowerCase(); }
  function users() { var u = get('users', {}); return u && typeof u === 'object' ? u : {}; }
  function uid() { return 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function emit() { try { window.dispatchEvent(new CustomEvent('jurisai:user')); } catch (e) {} }
  function copy(u) { return u ? { id: u.id, name: u.name || '', email: u.email || '', role: u.role == null ? DEFAULTS.role : u.role, org: u.org == null ? DEFAULTS.org : u.org } : null; }

  function findByEmail(email, exceptId) {
    var n = norm(email); if (!n) return null; var all = users();
    for (var id in all) { if (id !== exceptId && norm(all[id].email) === n) return all[id]; }
    return null;
  }
  function startSession(id) { set('session', id); emit(); }

  /* The signed-in user, or null. */
  function current() { var id = get('session', null); var u = id && users()[id]; return u ? copy(u) : null; }

  /* Sign in: load the saved profile for this email (or start one if this browser has not seen it). */
  function signIn(email) {
    var all = users(), u = findByEmail(email);
    if (!u) { u = { id: uid(), name: '', email: String(email).trim(), role: DEFAULTS.role, org: DEFAULTS.org }; all[u.id] = u; set('users', all); }
    startSession(u.id); return copy(u);
  }

  /* Sign up: store name + email as the account profile and sign in. */
  function register(o) {
    var all = users(), u = findByEmail(o.email);
    if (u) { u.name = String(o.name || '').trim() || u.name; }
    else { u = { id: uid(), name: String(o.name || '').trim(), email: String(o.email || '').trim(), role: DEFAULTS.role, org: DEFAULTS.org }; }
    all[u.id] = u; set('users', all); startSession(u.id); return copy(u);
  }

  /* Edit the profile. Returns { ok, user } or { ok:false, error, field }. Valid fields: name, email, role, org. */
  function update(patch) {
    var all = users(), id = get('session', null), u = id && all[id];
    if (!u) { u = { id: uid(), name: '', email: '', role: DEFAULTS.role, org: DEFAULTS.org }; all[u.id] = u; } /* edits are never lost, even with no session */
    var next = {}; FIELDS.forEach(function (k) { if (patch && k in patch) next[k] = String(patch[k] == null ? '' : patch[k]).trim(); });
    if ('email' in next && next.email) {
      if (!EMAIL.test(next.email)) return { ok: false, field: 'email', error: 'Enter a valid email address.' };
      if (findByEmail(next.email, u.id)) return { ok: false, field: 'email', error: 'That email is already used by another account.' };
    }
    FIELDS.forEach(function (k) { if (k in next) u[k] = next[k]; });
    all[u.id] = u; set('users', all); set('session', u.id); emit();
    return { ok: true, user: copy(u) };
  }

  function signOut() { del('session'); emit(); }

  /* keep other open tabs in sync */
  window.addEventListener('storage', function (e) { if (e.key === PFX + 'users' || e.key === PFX + 'session') emit(); });

  return { current: current, signIn: signIn, register: register, update: update, signOut: signOut, isEmail: function (v) { return EMAIL.test(String(v || '').trim()); }, DEFAULTS: DEFAULTS };
})();
