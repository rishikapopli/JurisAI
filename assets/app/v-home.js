/* HOME — workspace overview backed by persisted records only */
(function () {
  'use strict';
  var J=window.J,D=J.data,esc=J.esc,I=J.icon;
  function greet(){var h=new Date().getHours();return h<12?'Good morning':h<18?'Good afternoon':'Good evening';}
  function recentDocs(){
    var rows=D.docs.filter(function(d){return !d.archived;}).sort(function(a,b){return b.uploaded-a.uploaded;}).slice(0,5);
    return rows.length?'<table class="tbl tbl-tight"><tbody>'+rows.map(function(d){return '<tr class="row" data-act="doc-open" data-id="'+d.id+'"><td><div class="nm">'+J.fileIc(d)+'<div><b>'+esc(d.name)+'</b><small>'+esc(d.type)+' · '+J.fmt.rel(d.uploaded)+'</small></div></div></td><td>'+J.secChip(d.sec)+'</td><td class="hide-sm">'+J.anChip(d)+'</td></tr>';}).join('')+'</tbody></table>':J.empty({icon:'folder',title:'Your workspace is empty',text:'Uploaded documents will appear here. No sample files are included.',actions:'<a class="btn btn-primary btn-sm" href="#/documents/intake">'+I('upload','ico-sm')+'Upload a document</a>'});
  }
  function recentActivity(){
    var items=D.activity().slice(0,5);
    return items.length?'<ul class="ra">'+items.map(function(e){return '<li><span>'+I(e.type==='upload'?'upload':e.type==='scan'?'shield-check':'history','ico-sm')+'</span><span><b>'+esc(e.title)+'</b><small>'+esc(e.obj||'')+' · '+J.fmt.rel(e.t)+'</small></span></li>';}).join('')+'</ul>':J.empty({icon:'history',title:'No activity yet',text:'Real workspace events will appear here.'});
  }
  J.views.home={
    title:'Home',crumbs:function(){return ['Home'];},
    render:function(){
      var docs=D.docs.filter(function(d){return !d.archived;}),checked=docs.filter(function(d){return d.sec==='checked';}).length;
      return '<div class="home"><section class="home-ask"><div class="kicker-l">'+greet()+', '+esc(J.firstName())+'</div><h1>Your document <em>workspace.</em></h1><p class="home-q">Store and manage your own legal files.</p><p class="muted">Upload, validate, view, download, archive, or remove documents. Generated legal analysis is not enabled.</p><nav class="qa" aria-label="Quick actions"><a href="#/documents/intake">'+I('upload')+'<span>Upload document</span>'+I('arrow-right','ico-sm qa-arr')+'</a><a href="#/documents">'+I('folder')+'<span>Open library</span>'+I('arrow-right','ico-sm qa-arr')+'</a><a href="#/security">'+I('shield-check')+'<span>Review file checks</span>'+I('arrow-right','ico-sm qa-arr')+'</a></nav></section><div class="home-grid"><div class="home-main"><section><header class="sec-h"><h2>Recent documents</h2><a class="linkbtn" href="#/documents">All documents</a></header>'+recentDocs()+'</section><section><header class="sec-h"><h2>Recent activity</h2><a class="linkbtn" href="#/activity">Audit log</a></header>'+recentActivity()+'</section></div><aside class="home-rail"><section class="sec-gate"><header class="sec-h"><h2>File checks</h2></header><div class="mini-pipe"><div><b>'+docs.length+'</b><span>Documents</span></div><i></i><div class="ok"><b>'+checked+'</b><span>Basic checks passed</span></div></div><p class="gate-line">Type, signature, structure, and SHA-256 checks run on upload. Antivirus requires configured ClamAV.</p></section><section><header class="sec-h"><h2>Analysis status</h2></header>'+J.empty({icon:'sparkle',title:'Not enabled',text:'Comparison, legal research, AI answers, and generated reports are unavailable in this version.'})+'</section></aside></div></div>';
    }
  };
})();
