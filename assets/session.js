/* JURISAI — user session & profile store.
   Connected to the real FastAPI backend (/api/*) with local caching for instant first-paint. */
window.JurisSession = (function () {
  'use strict';
  var PFX = 'jurisai.', mem = {};
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var DEFAULTS = { role: 'Legal researcher', org: 'Personal workspace' };
  var cachedUser = null;

  function get(k, d) { try { var v = localStorage.getItem(PFX + k); if (v != null) return JSON.parse(v); } catch (e) {} return k in mem ? mem[k] : d; }
  function set(k, v) { mem[k] = v; try { localStorage.setItem(PFX + k, JSON.stringify(v)); } catch (e) {} }
  function del(k) { delete mem[k]; try { localStorage.removeItem(PFX + k); } catch (e) {} }
  function norm(e) { return String(e == null ? '' : e).trim().toLowerCase(); }
  function emit() { try { window.dispatchEvent(new CustomEvent('jurisai:user')); } catch (e) {} }

  function copy(u) {
    return u ? {
      id: u.id,
      name: u.name || '',
      email: u.email || '',
      role: u.role || u.job_title || DEFAULTS.role,
      org: u.org || DEFAULTS.org,
      onboarded: !!u.onboarded
    } : null;
  }

  // Load profile from server on boot
  function syncWithServer() {
    if (window.JurisAPI) {
      return window.JurisAPI.users.me().then(function (u) {
        cachedUser = copy(u);
        set('user_cached', cachedUser);
        emit();
        return cachedUser;
      }).catch(function () {
        return cachedUser;
      });
    }
    return Promise.resolve(cachedUser);
  }

  // First paint reads cache, background sync updates server state
  cachedUser = get('user_cached', null);
  if (window.JurisAPI) {
    syncWithServer();
  }

  function current() {
    return cachedUser ? copy(cachedUser) : null;
  }

  function signIn(email, password, remember) {
    if (window.JurisAPI && password) {
      return window.JurisAPI.auth.login(email, password, remember).then(function (res) {
        if (res.user) {
          cachedUser = copy(res.user);
          set('user_cached', cachedUser);
          emit();
        }
        return res;
      });
    }
    // Fallback profile creation if called synchronously
    cachedUser = { id: 'u_' + Date.now().toString(36), name: '', email: String(email).trim(), role: DEFAULTS.role, org: DEFAULTS.org };
    set('user_cached', cachedUser);
    emit();
    return Promise.resolve({ user: cachedUser });
  }

  function register(o) {
    if (window.JurisAPI && o.password) {
      return window.JurisAPI.auth.register({
        name: o.name,
        email: o.email,
        password: o.password,
        org: o.org || DEFAULTS.org
      });
    }
    cachedUser = { id: 'u_' + Date.now().toString(36), name: o.name || '', email: o.email || '', role: DEFAULTS.role, org: o.org || DEFAULTS.org };
    set('user_cached', cachedUser);
    emit();
    return Promise.resolve({ user: cachedUser });
  }

  function update(patch) {
    if (!patch) return { ok: true, user: current() };
    if (patch.email && !EMAIL.test(patch.email)) {
      return { ok: false, field: 'email', error: 'Enter a valid email address.' };
    }
    if (cachedUser) {
      Object.assign(cachedUser, patch);
      set('user_cached', cachedUser);
      emit();
    }
    if (window.JurisAPI) {
      window.JurisAPI.users.update(patch).then(function (res) {
        if (res) {
          cachedUser = copy(res);
          set('user_cached', cachedUser);
          emit();
        }
      }).catch(function (err) {
        console.warn('Profile update error:', err);
      });
    }
    return { ok: true, user: current() };
  }

  function signOut() {
    cachedUser = null;
    del('user_cached');
    if (window.JurisAPI) {
      window.JurisAPI.auth.logout().finally(function () {
        emit();
      });
    } else {
      emit();
    }
  }

  window.addEventListener('storage', function (e) {
    if (e.key === PFX + 'user_cached') {
      cachedUser = get('user_cached', null);
      emit();
    }
  });

  return {
    current: current,
    signIn: signIn,
    register: register,
    update: update,
    signOut: signOut,
    syncWithServer: syncWithServer,
    isEmail: function (v) { return EMAIL.test(String(v || '').trim()); },
    DEFAULTS: DEFAULTS
  };
})();
