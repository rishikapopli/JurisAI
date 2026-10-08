/* RESEARCH — clearly unavailable until a real research engine is connected */
(function () {
  'use strict';
  var J=window.J,I=J.icon;
  J.views.research={title:'Research',nav:'research',fixed:true,crumbs:function(){return ['Research'];},render:function(){return '<header class="ph"><div><div class="kicker">Research</div><h1>JURISAI <em>Research</em></h1><p class="sub">Document-grounded research is not enabled in this version.</p></div></header><div class="pad">'+J.empty({icon:'sparkle',title:'Research engine unavailable',text:'This version does not generate answers, comparisons, legal findings, or conclusions. No example conversations are shown.',actions:'<a class="btn btn-primary btn-sm" href="#/documents">Open documents</a>'})+'</div>';}};
})();
