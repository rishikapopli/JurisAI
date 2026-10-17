(function () {
  'use strict';
  var J=window.J,D=J.data;
  D.jurs=[{id:'uk',name:'United Kingdom',sys:'England & Wales · common law'},{id:'in',name:'India',sys:'Union & State · common law'},{id:'us',name:'United States',sys:'Federal & State · common law'}];
  D.langs=[{id:'en',label:'English'},{id:'hi',label:'हिन्दी'},{id:'es',label:'Español'}];
  D.docs=[]; D.docById=function(id){return D.docs.find(function(d){return d.id===id;});};
  D.findings=[];
  D.kinds={
    contradiction:{label:'Potential Contradiction',short:'Conflict',icon:'alert',cls:'chip-risk',desc:'Direct substantive conflict between document terms or covenants.'},
    inconsistency:{label:'Inconsistency',short:'Inconsistency',icon:'alert',cls:'chip-warn',desc:'Differing terms, timelines, or procedures requiring alignment.'},
    update:{label:'Document Update',short:'Update',icon:'refresh',cls:'chip-slate',desc:'Subsequent policy superseding earlier provisions.'},
    legit:{label:'Legitimate Variation',short:'Variation',icon:'check',cls:'chip-ok',desc:'Acceptable distinction permitted by governing law or hierarchy.'}
  };
  D.findingState=function(id){ J.state.findings = J.state.findings || J.store.get('findings', {}); return J.state.findings[id]||{status:'open',notes:[]}; };
  D.setFindingState=function(id,patch){ J.state.findings = J.state.findings || J.store.get('findings', {}); var s=Object.assign({status:'open',notes:[]},J.state.findings[id],patch); J.state.findings[id]=s; J.store.set('findings',J.state.findings); return s; };
  D.law={}; D.lawConcept=function(){return null;}; D.notifs=[]; D.threads=[]; D.tr={}; D.userEvents=[];
  D.activity=function(){return (D.activityServer||[]).concat(D.userEvents||[]).sort(function(a,b){return b.t-a.t;});};
  D.addEvent=function(e){e.t=new Date();D.userEvents.unshift(e);if(J.api&&J.user().signedIn)J.api('/api/activity',{method:'POST',body:JSON.stringify({event:e.title||e.type||'Activity',object:e.obj||'',detail:e.meta||''})}).catch(function(){});};
  D.helpCats=[['account','Account','user'],['documents','Documents','file'],['security','Security','shield-check'],['preferences','Preferences','settings']];
  D.help=[];
})();
