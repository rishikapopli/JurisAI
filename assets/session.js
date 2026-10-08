/* JURISAI — server-backed user session/profile store. */
window.JurisSession = (function () {
  'use strict';
  var mem = {}, EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var DEFAULTS = { role: 'Legal researcher', org: 'Personal workspace' };
  var FIELDS = ['name', 'email', 'role', 'org'];
  function emit() { try { window.dispatchEvent(new CustomEvent('jurisai:user')); } catch (e) {} }
  function copy(u) { return u ? { id:u.id,name:u.name||'',email:u.email||'',role:u.role==null?DEFAULTS.role:u.role,org:u.org==null?DEFAULTS.org:u.org } : null; }
  function cache(u) { mem.user = copy(u); try { if (u) localStorage.setItem('jurisai.user', JSON.stringify(mem.user)); else localStorage.removeItem('jurisai.user'); } catch(e) {} }
  try { var old = localStorage.getItem('jurisai.user'); if (old) mem.user = JSON.parse(old); } catch(e) {}
  async function api(path, opts) {
    var r = await fetch(path, Object.assign({ credentials:'same-origin', headers:{'Content-Type':'application/json'} }, opts||{}));
    var d = {}; try { d = await r.json(); } catch(e) {}
    if (!r.ok) { var err = new Error(d.error || 'Request failed.'); err.field=d.field; err.status=r.status; throw err; }
    return d;
  }
  async function restore() { try { var d=await api('/api/auth/me',{headers:{}}); cache(d.authenticated ? d.user : null); emit(); return mem.user; } catch(e) { return mem.user || null; } }
  function current() { return mem.user || null; }
  async function signIn(email,password) { var d=await api('/api/auth/login',{method:'POST',body:JSON.stringify({email:email,password:password})}); cache(d.user); emit(); return copy(d.user); }
  async function register(o) { var d=await api('/api/auth/register',{method:'POST',body:JSON.stringify(o)}); return d; }
  async function verify(email,code) { var d=await api('/api/auth/verify',{method:'POST',body:JSON.stringify({email:email,code:code})}); cache(d.user); emit(); return copy(d.user); }
  function update(patch) {
    var u=current(); if(!u) return {ok:false,error:'You are not signed in.'};
    var next=Object.assign({},u); FIELDS.forEach(function(k){if(patch&&k in patch) next[k]=String(patch[k]==null?'':patch[k]).trim();});
    if ('email' in next && (!next.email || !EMAIL.test(next.email))) return {ok:false,field:'email',error:'Enter a valid email address.'};
    cache(next); emit();
    api('/api/me',{method:'PATCH',body:JSON.stringify(patch||{})}).then(function(d){cache(d.user);emit();}).catch(function(e){cache(u);emit();});
    return {ok:true,user:copy(next)};
  }
  async function signOut() { try { await api('/api/auth/logout',{method:'POST',body:'{}'}); } catch(e) {} cache(null); emit(); }
  return { api:api, current:current, restore:restore, signIn:signIn, register:register, verify:verify, update:update, signOut:signOut, isEmail:function(v){return EMAIL.test(String(v||'').trim());}, DEFAULTS:DEFAULTS };
})();
