/* DOCUMENTS library + SECURE DOCUMENT INTAKE (security gate) */
(function () {
  'use strict';
  var J = window.J, D = J.data, esc = J.esc, I = J.icon, A = J.actions, $ = J.$;

  /* ---------- helpers shared with onboarding ---------- */
  var STAGES=[['File type and signature','Extension and header checked'],['Document structure','Basic parser validation'],['SHA-256','Digest recorded'],['Antivirus','ClamAV only when configured']];
  var JSTATE={pass:['Passed','ok','check'],flag:['Not configured','warn','alert'],run:['Checking','run','scan'],wait:['Queued','','clock'],fail:['Failed','risk','x']};
  J.gatePipeline=function(outcome,step,done,dark){var checks=J.state.welcome&&J.state.welcome.doc&&J.state.welcome.doc.scan||[],av=checks[2]&&checks[2][1]==='pass'?'pass':'flag';return '<ol class="gate'+(dark?' gate-dark':'')+'">'+STAGES.map(function(s,i){var state=done?(i<3?'pass':av):i===0?'run':'wait',info=JSTATE[state];var detail=done?(i===3?(checks[2]&&checks[2][2]||'No antivirus scanner is configured.'):s[1]):(i===0?'Upload and checks in progress…':'Queued');return '<li class="g-'+state+(i===3?' g-last':'')+'"><span class="g-mk">'+I(info[2],'ico-sm')+'</span><div class="g-b"><b>'+s[0]+'</b><small>'+esc(detail)+'</small></div><span class="g-st g-st-'+info[1]+'">'+(done?info[0]:i===0?'Working…':'Queued')+'</span></li>';}).join('')+'</ol>';};

  function humanDoc(d) { var sc=d.scan||{},b=d.size||0; return Object.assign({},d,{uploaded:new Date(d.created_at),updated:new Date(d.updated_at),sec:d.security,an:'not_started',sha:d.sha256,archived:!!d.archived,jur:J.settings.jur,type:d.name.split('.').pop().toUpperCase()+' document',pages:d.pages||0,size:b>=1048576?(b/1048576).toFixed(1)+' MB':Math.max(1,Math.round(b/1024))+' KB',mime:d.mime||d.type,scan:[['File type and signature','pass','Extension and file signature match.'],['Structure and text extraction',d.metadata&&d.metadata.extraction?'flag':'pass',d.metadata&&d.metadata.extraction||((d.extracted_text||'').length+' characters extracted.')],['Antivirus',sc.status==='clean'?'pass':sc.status==='not_configured'?'flag':'fail',sc.detail||'No scanner result.'],['SHA-256','pass',d.sha256]]}); }
  J.uploadDocument = async function(file) {
    var r=await fetch('/api/documents/upload',{method:'POST',credentials:'same-origin',headers:{'Content-Type':file.type||'application/octet-stream','X-Filename':encodeURIComponent(file.name)},body:file}); var d={}; try{d=await r.json();}catch(e){}
    if(!r.ok) throw new Error(d.error||'Upload failed.'); var doc=humanDoc(d.document); D.docs.unshift(doc); return doc;
  };
  A['doc-download']=function(el){window.location.href='/api/documents/'+encodeURIComponent(el.dataset.id)+'/download';};
  A['doc-view']=function(el){window.open('/api/documents/'+encodeURIComponent(el.dataset.id)+'/view','_blank','noopener');};
  A['doc-archive']=function(el){var d=D.docById(el.dataset.id);if(!d)return;var archived=!d.archived;J.api('/api/documents/'+encodeURIComponent(d.id)+'/archive',{method:'PATCH',body:JSON.stringify({archived:archived})}).then(function(){d.archived=archived;J.toast(archived?'Archived '+esc(d.name):'Restored '+esc(d.name));J.render(true);}).catch(function(e){J.toast(e.message||'Could not update archive status','warn');});};
  /* ---------- document drawer ---------- */
  function checksHTML(d) {
    var ic = { pass: ['check', 'ok'], flag: ['alert', 'warn'], hold: ['clock', 'warn'], fail: ['x', 'risk'], skip: ['x', ''], run: ['scan', 'run'], wait: ['clock', ''] };
    return '<ul class="checks">' + (d.scan || []).map(function (c) { return '<li class="c-' + c[1] + '"><span class="c-ic c-' + (ic[c[1]] || ic.wait)[1] + '">' + I((ic[c[1]] || ic.wait)[0], 'ico-sm') + '</span><div><b>' + c[0] + '</b><small>' + esc(c[2]) + '</small></div></li>'; }).join('') + '</ul>';
  }
  J.checksHTML = checksHTML;
  A['doc-open'] = function (el) {
    var d = D.docById(el.dataset.id); if (!d) return;
    var body = '<div class="dd-top">' + J.fileIc(d) + '<div><div class="dd-chips">' + J.secChip(d.sec) + J.anChip(d) + '</div><p class="muted">' + esc(d.type) + ' · ' + esc(d.size) + (d.pages ? ' · ' + d.pages + ' pages' : '') + '</p></div></div>' +
      '<dl class="dl dd-meta"><dt>Uploaded</dt><dd>' + J.fmt.dt(d.uploaded) + '</dd><dt>Size</dt><dd>' + esc(d.size) + '</dd><dt>SHA-256</dt><dd class="mono">' + esc(d.sha) + '</dd></dl>' +
      '<div class="banner">' + I('shield-check') + '<div><b>' + (d.sec==='legacy'?'Legacy file record':'File checks recorded') + '</b><p class="muted">' + (d.sec==='legacy'?'Detailed validation results were not stored for this older record. ':'File type, signature, structure, and SHA-256 were checked. ') + 'Antivirus: ' + esc(d.scan&&d.scan[2]?d.scan[2][2]:'No scanner result recorded.') + '. Advanced security analysis is not enabled.</p></div></div>' +
      '<h3 class="dd-h">Security checks</h3>' + checksHTML(d);
    var foot = '';
    foot = '<button class="btn btn-secondary btn-sm" data-act="doc-download" data-id="'+d.id+'">'+I('download','ico-sm')+'Download original</button><button class="btn btn-primary btn-sm" data-act="doc-view" data-id="'+d.id+'">'+I('eye','ico-sm')+'View document</button>';
    J.ui.drawer({ kicker: 'Document', title: esc(d.name), html: body, foot: foot });
  };

  /* ---------- row actions ---------- */
  A['doc-menu'] = function (el, e) {
    e.stopPropagation(); var d = D.docById(el.dataset.id), v = d.sec === 'checked';
    var items = [{ label: 'Open details', icon: 'eye', fn: function () { A['doc-open']({ dataset: { id: d.id } }); } }];
    items.push({ label: 'View document', icon: 'eye', fn: function () { A['doc-view']({ dataset: { id: d.id } }); } }, { label: 'Download original file', icon: 'download', fn: function () { A['doc-download']({ dataset: { id: d.id } }); } }, { divider: true },
      { label: d.archived ? 'Restore from archive' : 'Archive', icon: 'archive', fn: function () { A['doc-archive']({dataset:{id:d.id}}); } },
      { label: 'Remove from library', icon: 'trash', danger: true, fn: function () { A['doc-delete']({ dataset: { id: d.id } }); } });
    J.ui.menu(el, items, { align: 'right', width: 230 });
  };
  A['doc-delete'] = function (el) {
    var d = D.docById(el.dataset.id);
    J.ui.modal({ title: 'Remove from library?', html: '<p class="muted"><b>' + esc(d.name) + '</b> will be permanently removed together with its analysis. The audit log keeps a record that it existed.</p>', foot: '<button class="btn btn-secondary btn-sm" data-act="modal-close">Cancel</button><button class="btn btn-danger btn-sm" data-act="doc-delete-ok" data-id="' + d.id + '">Remove</button>' });
  };
  A['doc-delete-ok'] = function (el) { var i = D.docs.findIndex(function (x) { return x.id === el.dataset.id; }); if (i < 0) return; var n = D.docs[i].name; J.api('/api/documents/' + encodeURIComponent(el.dataset.id), {method:'DELETE'}).then(function(){ D.docs.splice(i,1); J.ui.closeModal(); J.toast('Removed ' + esc(n)); J.render(true); }).catch(function(e){ J.toast(e.message || 'Could not remove document','warn'); }); };

  /* ======================= DOCUMENTS LIBRARY ======================= */
  var FILTERS = [['all', 'All'], ['checked', 'Basic checks passed'], ['review', 'Review required'], ['blocked', 'Blocked'], ['processing', 'Processing'], ['archived', 'Archived']];
  function filtered(f, q) {
    return D.docs.filter(function (d) {
      if (f === 'archived') { if (!d.archived) return false; } else { if (d.archived) return false; if (f !== 'all' && d.sec !== f) return false; }
      return !q || (d.name + ' ' + d.type + ' ' + J.jurName(d.jur)).toLowerCase().indexOf(q.toLowerCase()) >= 0;
    });
  }
  function rows(f, q) {
    var list = filtered(f, q);
    if (!list.length) {
      var noq = !q && f === 'all';
      return '<tr><td colspan="7">' + J.empty(noq ? { icon: 'folder', title: 'Your library is empty', text: 'Upload a document to record its checks and open its real file. AI analysis is not available in this phase.', actions: '<a class="btn btn-primary btn-sm" href="#/documents/intake">' + I('upload', 'ico-sm') + 'Upload Document</a>' } : { icon: 'search', title: 'No matching documents', text: q ? 'Nothing matches “' + esc(q) + '” in this view.' : 'No documents have this status.', actions: '<button class="btn btn-secondary btn-sm" data-act="docs-clear">Clear search and filters</button>' }) + '</td></tr>';
    }
    return list.map(function (d) {
      return '<tr class="row" data-act="doc-open" data-id="' + d.id + '"><td><div class="nm">' + J.fileIc(d) + '<div><b>' + esc(d.name) + '</b><small>' + esc(d.size) + (d.pages ? ' · ' + d.pages + ' pages' : '') + '</small></div></div></td><td class="hide-md">' + esc(d.type) + '</td><td class="hide-md mono">' + J.fmt.date(d.uploaded) + '</td><td>' + J.secChip(d.sec) + '</td><td class="hide-sm">Not enabled</td><td class="hide-sm">—</td><td class="tr"><button class="icon-btn" data-act="doc-menu" data-id="' + d.id + '" aria-label="Actions for ' + esc(d.name) + '">' + I('more') + '</button></td></tr>';
    }).join('');
  }
  var dState = { f: 'all', q: '' };
  J.views.documents = {
    title: 'Documents', fixed: true, crumbs: function () { return ['Documents']; },
    render: function (r) {
      if (r.q.f) dState.f = r.q.f; if (r.q.q != null) dState.q = r.q.q; if (!r.q.f && !r.q.q && r.name === 'documents') { /* keep state */ }
      var all = D.docs.filter(function (d) { return !d.archived; });
      var cnt = function (k) { return k === 'archived' ? D.docs.filter(function (d) { return d.archived; }).length : k === 'all' ? all.length : all.filter(function (d) { return d.sec === k; }).length; };
      return '<header class="ph"><div><div class="kicker">Workspace</div><h1>Documents</h1><p class="sub">Type, signature, structure, and SHA-256 checks run on upload. Antivirus is optional and must be configured.</p></div><div class="ph-actions"><a class="btn btn-secondary btn-sm" href="#/documents/intake?mode=folder">' + I('folder-up', 'ico-sm') + 'Upload Folder</a><a class="btn btn-primary btn-sm" href="#/documents/intake">' + I('upload', 'ico-sm') + 'Upload Document</a></div></header>' +
        '<div class="lib-bar pad"><label class="lib-search">' + I('search', 'ico-sm') + '<input id="lib-q" type="search" placeholder="Search by name, type or jurisdiction" value="' + esc(dState.q) + '" aria-label="Search documents"></label>' +
        '<div class="tabs" role="tablist">' + FILTERS.map(function (f) { return '<button role="tab" class="' + (dState.f === f[0] ? 'on' : '') + '" data-act="docs-filter" data-f="' + f[0] + '">' + f[1] + ' <span class="n">' + cnt(f[0]) + '</span></button>'; }).join('') + '</div></div>' +
        '<div class="lib-scroll pad"><table class="tbl lib"><thead><tr><th>Document</th><th class="hide-md">Type</th><th class="hide-md">Uploaded</th><th>Security</th><th class="hide-sm">Analysis</th><th class="hide-sm">Jurisdiction</th><th></th></tr></thead><tbody id="lib-rows">' + rows(dState.f, dState.q) + '</tbody></table></div>';
    },
    mount: function () {
      $('#lib-q').addEventListener('input', function (e) { dState.q = e.target.value; $('#lib-rows').innerHTML = rows(dState.f, dState.q); });
    }
  };
  A['docs-filter'] = function (el) { dState.f = el.dataset.f; J.render(true); };
  A['docs-clear'] = function () { dState.f = 'all'; dState.q = ''; J.render(true); };

  /* ======================= SECURE DOCUMENT INTAKE ======================= */
  var queue = [], active = -1;
  function sizeLabel(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
  function addFiles(list) {
    list.forEach(function (f) {
      queue.push({name:f.name,size:f.size,file:f.file||null,done:false,running:false,doc:null,error:null});
    });
    active = queue.length - list.length; runNext();
  }
  async function runNext(){var idx=queue.findIndex(function(q){return !q.done&&!q.running;});if(idx<0||queue.some(function(q){return q.running;})){paint();return;}var it=queue[idx];it.running=true;active=idx;paint();try{it.doc=await J.uploadDocument(it.file);it.done=true;}catch(e){it.error=e.message||'Upload failed.';it.done=true;}it.running=false;paint();runNext();}
  function resultHTML(it){if(!it.done)return '';if(it.error)return '<div class="banner banner-risk">'+I('alert')+'<div><b>Upload failed.</b> '+esc(it.error)+'</div></div>';return '<div class="banner">'+I('shield-check')+'<div><b>Uploaded and stored.</b> '+esc(it.name)+'. Basic checks and SHA-256 are recorded; antivirus status: '+esc(it.doc.scan[2][2])+'.</div></div><div class="res-a"><button class="btn btn-secondary btn-sm" data-act="doc-view" data-id="'+it.doc.id+'">'+I('eye','ico-sm')+'View document</button><button class="btn btn-primary btn-sm" data-go="documents">'+I('folder','ico-sm')+'Open library</button></div>';}
  function paint(){var qh=$('#intake-queue'),gh=$('#gate-host');if(!qh||!gh)return;qh.innerHTML=queue.map(function(q,i){var chip=!q.done?'<span class="chip chip-gold"><i class="dot pulse"></i>Uploading</span>':q.error?J.chip('chip-risk','Failed','x'):J.chip('chip-ok','Stored','check');return '<button class="q-i'+(i===active?' on':'')+'" data-act="intake-pick" data-i="'+i+'"><span><b>'+esc(q.name)+'</b><small class="mono">'+sizeLabel(q.size)+'</small></span>'+chip+'</button>';}).join('')||'<p class="field-hint">Files you add appear here.</p>';var it=queue[active];if(!it){gh.innerHTML='<div class="gate-idle">'+I('lock','ico-lg')+'<h3>No document selected</h3><p>Add a real document from your computer to begin.</p></div>';return;}var stages=STAGES.map(function(st,i){var state=it.error?(i===0?'fail':'wait'):it.done?(i<3?'pass':it.doc.scan[2][1]):i===0?'run':'wait';return '<li class="g-'+state+(i===3?' g-last':'')+'"><span class="g-mk">'+I(state==='pass'?'check':state==='flag'?'alert':state==='fail'?'x':state==='run'?'scan':'clock','ico-sm')+'</span><div class="g-b"><b>'+st[0]+'</b><small>'+esc(it.error&&i===0?it.error:state==='pass'?(i===3?'Antivirus clean.':'Completed'):state==='flag'?it.doc.scan[2][2]:state==='run'?'Uploading and checking…':'Queued')+'</small></div><span class="g-st">'+(state==='pass'?'Complete':state==='flag'?'Not configured':state==='fail'?'Failed':state==='run'?'Working…':'Queued')+'</span></li>';}).join('');gh.innerHTML='<div class="gate-file">'+I('file')+'<div><b>'+esc(it.name)+'</b><small class="mono">'+sizeLabel(it.size)+(it.done?'':' · uploading')+'</small></div></div><ol class="gate">'+stages+'</ol><div class="res">'+resultHTML(it)+'</div>';}
  A['intake-pick'] = function (el) { active = +el.dataset.i; paint(); };
  A['intake-reset'] = function () { queue = []; active = -1; J.render(true); };
  A['intake-browse'] = function (el) { $(el.dataset.input).click(); };

  J.views.intake = {
    title: 'Secure intake', nav: 'documents', fixed: true, crumbs: function () { return [['Documents', '#/documents'], 'Secure intake']; },
    render: function (r) {
      var folder = r.q.mode === 'folder';
      return '<header class="ph"><div><div class="kicker">Document intake</div><h1>Secure document <em>intake</em></h1><p class="sub">Uploads are validated and hashed. Configure ClamAV to add antivirus scanning.</p></div><div class="ph-actions"><a class="linkbtn" href="#/help">Help &amp; Support</a></div></header>' +
        '<div class="intake pad"><div class="intake-l">' +
        '<div class="drop" id="drop" tabindex="0" role="button" data-act="intake-browse" data-input="#file-in"><div class="drop-ic">' + I(folder ? 'folder-up' : 'upload', 'ico-lg') + '</div><b>' + (folder ? 'Drop a folder here' : 'Drop documents here') + '</b><span>or <u>browse your computer</u> · PDF, DOCX, TXT, PNG, JPG, TIFF · up to 50 MB</span><small class="mono">' + I('lock', 'ico-xs') + ' Type, signature, and structure checks; antivirus only when configured</small></div>' +
        '<input type="file" id="file-in" multiple ' + (folder ? 'webkitdirectory' : '') + ' hidden>' +
        '' +
        '<div class="q-h"><span class="k">Intake queue</span></div><div id="intake-queue" class="queue"></div></div>' +
        '<div class="intake-r"><div class="gate-h"><span class="k">File checks</span><span class="chip chip-ok"><i class="dot dot-ok"></i>Available</span></div><div id="gate-host"></div></div></div>';
    },
    mount: function (host) {
      var inp = $('#file-in'), drop = $('#drop');
      inp.addEventListener('change', function () { var fs = [].slice.call(inp.files).filter(function (f) { return !/^\./.test(f.name); }); if (fs.length) addFiles(fs.map(function(f){return {name:f.name,size:f.size,file:f};})); inp.value = ''; });
      ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
      drop.addEventListener('drop', function (e) { var fs = [].slice.call(e.dataTransfer.files); if (fs.length) addFiles(fs.map(function(f){return {name:f.name,size:f.size,file:f};})); });
      drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } });
      /* resume any running items */
      queue.forEach(function (q) { if (q.running) q.running = false; });
      paint(); runNext();
    }
  };
})();



