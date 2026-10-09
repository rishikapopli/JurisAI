/* JURISAI — API Client
   Connects the existing vanilla-JS frontend to the real FastAPI backend (/api/*).
   Handles session cookies, CSRF tokens, error envelopes, and typed endpoints. */
window.JurisAPI = (function () {
  'use strict';

  var BASE = '/api';
  var csrfToken = null;

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
    return match ? decodeURIComponent(match[3]) : null;
  }

  function fetchCsrf() {
    if (csrfToken) return Promise.resolve(csrfToken);
    var cookieCsrf = getCookie('jurisai_csrf');
    if (cookieCsrf) {
      csrfToken = cookieCsrf;
      return Promise.resolve(csrfToken);
    }
    return fetch(BASE + '/auth/csrf', { credentials: 'include' })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        csrfToken = data.token;
        return csrfToken;
      })
      .catch(function () { return ''; });
  }

  function request(endpoint, opts) {
    opts = opts || {};
    var url = endpoint.indexOf('http') === 0 ? endpoint : (BASE + (endpoint.indexOf('/') === 0 ? endpoint : '/' + endpoint));
    var method = (opts.method || 'GET').toUpperCase();
    var isMutating = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';

    var headers = Object.assign({}, opts.headers || {});
    var isFormData = opts.body instanceof FormData;

    if (!isFormData && opts.body && typeof opts.body === 'object') {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(opts.body);
    }

    opts.credentials = 'include';

    var p = isMutating ? fetchCsrf() : Promise.resolve('');
    return p.then(function (token) {
      if (token && isMutating) {
        headers['X-CSRF-Token'] = token;
      }
      opts.headers = headers;
      return fetch(url, opts);
    }).then(function (res) {
      if (res.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register') && !endpoint.includes('/users/me')) {
        if (!location.pathname.includes('signin.html') && !location.pathname.includes('signup.html') && !location.pathname.includes('index.html')) {
          location.href = 'signin.html';
        }
      }
      if (res.status === 204) return null;
      var contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return res.json().then(function (json) {
          if (!res.ok) {
            var err = new Error((json && json.detail && (json.detail.message || json.detail)) || 'Request failed');
            err.status = res.status;
            err.detail = json.detail;
            throw err;
          }
          return json;
        });
      }
      return res.text().then(function (txt) {
        if (!res.ok) {
          var err = new Error(txt || 'Request failed');
          err.status = res.status;
          throw err;
        }
        return txt;
      });
    });
  }

  return {
    request: request,
    get: function (url, params) {
      if (params) {
        var q = Object.keys(params).filter(function (k) { return params[k] != null && params[k] !== ''; }).map(function (k) {
          return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
        }).join('&');
        if (q) url += (url.includes('?') ? '&' : '?') + q;
      }
      return request(url, { method: 'GET' });
    },
    post: function (url, body) { return request(url, { method: 'POST', body: body }); },
    patch: function (url, body) { return request(url, { method: 'PATCH', body: body }); },
    del: function (url) { return request(url, { method: 'DELETE' }); },
    upload: function (url, formData) { return request(url, { method: 'POST', body: formData }); },

    // Auth
    auth: {
      login: function (email, password, remember) { return request('/auth/login', { method: 'POST', body: { email: email, password: password, remember: !!remember } }); },
      loginMfa: function (token, code) { return request('/auth/login/mfa', { method: 'POST', body: { mfa_token: token, code: code } }); },
      register: function (data) { return request('/auth/register', { method: 'POST', body: data }); },
      verifyEmail: function (email, code) { return request('/auth/verify-email', { method: 'POST', body: { email: email, code: code } }); },
      resendVerification: function (email) { return request('/auth/resend-verification', { method: 'POST', body: { email: email } }); },
      forgotPassword: function (email) { return request('/auth/password/forgot', { method: 'POST', body: { email: email } }); },
      resetPassword: function (token, newPassword) { return request('/auth/password/reset', { method: 'POST', body: { token: token, new_password: newPassword } }); },
      changePassword: function (curPw, newPw) { return request('/auth/password/change', { method: 'POST', body: { current_password: curPw, new_password: newPw } }); },
      logout: function () { return request('/auth/logout', { method: 'POST' }); },
      enroll2fa: function () { return request('/auth/2fa/enroll', { method: 'POST' }); },
      confirm2fa: function (code) { return request('/auth/2fa/confirm', { method: 'POST', body: { code: code } }); },
      disable2fa: function () { return request('/auth/2fa/disable', { method: 'POST' }); },
      sessions: function () { return request('/auth/sessions'); },
      revokeSession: function (id) { return request('/auth/sessions/' + id, { method: 'DELETE' }); },
      loginHistory: function () { return request('/auth/login-history'); }
    },

    // Users & Settings
    users: {
      me: function () { return request('/users/me'); },
      update: function (patch) { return request('/users/me', { method: 'PATCH', body: patch }); },
      getSettings: function () { return request('/users/me/settings'); },
      saveSettings: function (patch) { return request('/users/me/settings', { method: 'PATCH', body: patch }); },
      onboarded: function () { return request('/users/me/onboarded', { method: 'POST' }); },
      deleteAccount: function () { return request('/users/me', { method: 'DELETE' }); },
      inviteMember: function (email, role) { return request('/organizations/current/invitations', { method: 'POST', body: { email: email, role: role || 'MEMBER' } }); }
    },

    // Documents
    documents: {
      list: function (params) { return JurisAPI.get('/documents', params); },
      get: function (id) { return request('/documents/' + id); },
      upload: function (file, jurisdiction) {
        var fd = new FormData();
        fd.append('file', file);
        if (jurisdiction) fd.append('jurisdiction', jurisdiction);
        return request('/documents', { method: 'POST', body: fd });
      },
      delete: function (id) { return request('/documents/' + id, { method: 'DELETE' }); },
      archive: function (id) { return request('/documents/' + id + '/archive', { method: 'POST' }); },
      restore: function (id) { return request('/documents/' + id + '/restore', { method: 'POST' }); },
      decision: function (id, action, ack) { return request('/security/documents/' + id + '/decision', { method: 'POST', body: { action: action, acknowledged: !!ack } }); },
      pages: function (id) { return request('/documents/' + id + '/pages'); }
    },

    // Security Gate
    security: {
      overview: function () { return request('/security/overview'); },
      decision: function (id, action, ack) { return request('/security/documents/' + id + '/decision', { method: 'POST', body: { action: action, acknowledged: !!ack } }); },
      scanReport: function (id) { return request('/security/documents/' + id + '/report'); }
    },

    // Analysis
    analysis: {
      get: function (docId, lang) { return JurisAPI.get('/analysis/documents/' + docId, { lang: lang }); },
      run: function (docId) { return request('/analysis/documents/' + docId, { method: 'POST' }); },
      retry: function (docId, opts) { return request('/analysis/documents/' + docId + '/retry', { method: 'POST', body: opts || { ocr: true } }); },
      clause: function (docId, ref) { return request('/analysis/documents/' + docId + '/clauses/' + ref); }
    },

    // Comparison & Contradictions
    compare: {
      run: function (docIds) { return request('/compare', { method: 'POST', body: { document_ids: docIds } }); },
      get: function (a, b, c) { return JurisAPI.get('/compare', { a: a, b: b, c: c }); },
      graph: function (findingId) { return request('/contradictions/' + findingId + '/graph'); },
      review: function (findingId, action) { return request('/reviews', { method: 'POST', body: { target_id: findingId, action: action } }); },
      addNote: function (findingId, text) { return request('/reviews/' + findingId + '/notes', { method: 'POST', body: { text: text } }); }
    },

    // Human Reviews
    reviews: {
      list: function (status) { return JurisAPI.get('/reviews', { status: status }); },
      updateStatus: function (findingId, action) { return request('/reviews', { method: 'POST', body: { target_id: findingId, action: action } }); },
      addNote: function (findingId, text) { return request('/reviews/' + findingId + '/notes', { method: 'POST', body: { text: text } }); }
    },

    // Legal
    legal: {
      jurisdictions: function () { return request('/jurisdictions'); },
      requestJurisdiction: function (text) { return request('/jurisdictions/requests', { method: 'POST', body: { text: text } }); },
      clauses: function (docId, jur) { return JurisAPI.get('/legal/clauses', { document_id: docId, jurisdiction: jur }); },
      context: function (docId, ref, jur) { return request('/legal/context', { method: 'POST', body: { document_id: docId, clause_ref: ref, jurisdiction: jur } }); }
    },

    // Research
    research: {
      ask: function (data) { return request('/research/queries', { method: 'POST', body: data }); },
      threads: function () { return request('/research/threads'); },
      thread: function (id) { return request('/research/threads/' + id); },
      plain: function (queryId) { return request('/research/queries/' + queryId + '/plain', { method: 'POST' }); }
    },

    // Reports & Shares
    reports: {
      create: function (data) { return request('/reports', { method: 'POST', body: data }); },
      get: function (id) { return request('/reports/' + id); },
      createShare: function (type, id) { return request('/shares', { method: 'POST', body: { resource_type: type, resource_id: id } }); }
    },

    // Audit & System
    audit: {
      events: function (group, q) { return JurisAPI.get('/audit/events', { group: group, q: q }); },
      verify: function () { return request('/audit/verify'); }
    },
    notifications: {
      list: function () { return request('/notifications'); },
      markRead: function () { return request('/notifications/read', { method: 'POST' }); }
    },
    system: {
      status: function () { return request('/system/status'); },
      dashboard: function () { return request('/dashboard'); }
    },
    search: {
      query: function (q) { return JurisAPI.get('/search', { q: q }); }
    },
    translate: {
      texts: function (texts, lang) { return request('/translate', { method: 'POST', body: { texts: texts, lang: lang } }); }
    }
  };
})();
