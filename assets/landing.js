(function () {
  'use strict';
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var box=document.getElementById('heroVis');
  function fit(){if(!box)return;var k=Math.min(box.clientWidth/600,(window.innerHeight-120)/668,1.12);box.style.setProperty('--k',Math.max(k,.5).toFixed(3));}
  fit();window.addEventListener('resize',fit);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fit);
  document.querySelectorAll('a[href^="#"]').forEach(function(a){a.addEventListener('click',function(e){var t=document.querySelector(a.getAttribute('href'));if(t){e.preventDefault();t.scrollIntoView({behavior:reduce?'auto':'smooth'});}});});
})();
