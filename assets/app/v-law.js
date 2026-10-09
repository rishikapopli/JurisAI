/* LEGAL CONTEXT — connect clauses to potentially relevant law, by jurisdiction */
(function () {
  'use strict';
  var J = window.J, D = J.data, esc = J.esc, I = J.icon, A = J.actions, $ = J.$, $$ = J.$$;
  var L = J.state.law = { doc: 'emp', c: '11.2', done: {} };

  function mapped(docId) { return Object.keys(D.law).filter(function (k) { return k.split(':')[0] === docId; }).map(function (k) { return k.split(':')[1]; }); }
  function docsWithLaw() { return D.docs.filter(function (d) { return d.content && d.sec === 'verified' && mapped(d.id).length; }); }
  function strengthChip(s) { return J.chip(s === 'Strong' ? 'chip-ok' : s === 'Moderate' ? 'chip-gold' : 'chip-warn', s + ' match'); }
  function typeChip(t) { return '<span class="chip">' + esc(t) + '</span>'; }
  function listHTML(d) {
    var jur = J.settings.jur;
    return mapped(d.id).map(function (ref) {
      var info = J.refInfo(d.id + ':' + ref), e = D.law[d.id + ':' + ref], x = e[jur];
      return '<button class="ll-i' + (L.c === ref ? ' on' : '') + '" data-act="law-pick" data-c="' + ref + '"><span class="mono">§' + ref + '</span><span><b>' + esc(info.clause.title) + '</b><small>' + esc((x && !x.unavailable ? x.concept : e.concept)) + '</small></span><i class="' + (x && !x.unavailable ? 'cov cov-on' : 'cov') + '" title="' + (x && !x.unavailable ? 'Sources available' : 'No verified sources yet') + '"></i></button>';
    }).join('');
  }
  function chain(d, ref) {
    var jur = J.settings.jur, e = D.law[d.id + ':' + ref], x = e[jur], info = J.refInfo(d.id + ':' + ref), jn = D.jurs.filter(function (j) { return j.id === jur; })[0];
    if (x.unavailable) {
      var alts = D.jurs.filter(function (j) { return e[j.id] && !e[j.id].unavailable && j.id !== jur; });
      return J.errorState('research', { text: 'JURISAI does not have verified legal sources for “' + e.concept.toLowerCase() + '” in ' + jn.name + ' yet, so it will not guess. You can see how another jurisdiction treats it, or continue with what the document itself says.', acts: alts.map(function (j) { return '<button class="btn btn-secondary btn-sm" data-act="law-jur" data-j="' + j.id + '">View ' + j.name + '</button>'; }).join('') + '<button class="btn btn-secondary btn-sm" data-go="analyze/' + d.id + '?ref=' + ref + '">Read the clause</button>' });
    }
    var foreign = jur !== d.content.law.jur && d.content.law.jur;
    var step = function (n, label, body, last) { return '<li class="ch-s"><span class="ch-n">' + n + '</span><div class="ch-b"><div class="k">' + label + '</div>' + body + '</div></li>'; };
    return '<ol class="chain" data-speak>' +
      step(1, 'Document clause', '<blockquote class="q q-sm">' + esc(info.para.text) + '</blockquote>' + J.citeLink(d.id + ':' + ref)) +
      step(2, 'Legal concept', '<div class="ch-big">' + esc(x.concept) + '</div>' + strengthChip(x.strength)) +
      step(3, 'Jurisdiction', '<div class="ch-big">' + jn.name + '</div><p class="muted">' + jn.sys + '</p>' + (foreign ? '<div class="banner banner-warn">' + I('info') + '<div>This document is governed by <b>' + J.jurName(d.content.law.jur) + '</b> law. You are viewing <b>' + jn.name + '</b> for comparison.</div></div>' : '')) +
      step(4, 'Potentially relevant legal sources ' + J.tag('law'), '<div class="srcs-l">' + x.sources.map(function (s) {
        return '<div class="ls-src"><div class="ls-top"><b>' + esc(s.name) + '</b>' + typeChip(s.type) + '</div><div class="mono">' + esc(s.cite) + '</div><p>' + esc(s.rel) + '</p>' + (s.url ? '<a class="linkbtn" href="' + esc(s.url) + '" target="_blank" rel="noopener">Verify at source ' + I('external', 'ico-xs') + '</a>' : '<span class="field-hint">No public link on file — check an authoritative legal database.</span>') + '</div>';
      }).join('') + '</div>') +
      step(5, 'Why it may be relevant ' + J.tag('ai'), '<p class="plain">' + esc(x.why) + '</p><div class="verify"><span class="k">Verify before relying on this</span><ul>' + x.verify.map(function (v) { return '<li>' + esc(v) + '</li>'; }).join('') + '</ul></div>') +
      '</ol>';
  }
  function detail(d, ref) {
    var info = J.refInfo(d.id + ':' + ref), key = d.id + ':' + ref + ':' + J.settings.jur, e = D.law[d.id + ':' + ref];
    return '<div class="ld-h"><div><div class="ld-badges"><span class="stamp">' + I('scales', 'ico-xs') + 'AI-assisted legal research</span><span class="stamp stamp-rev">' + I('flag', 'ico-xs') + 'Review required</span></div><h2><span class="mono">§' + ref + '</span> ' + esc(info.clause.title) + '</h2></div>' +
      '<div class="ld-a"><button class="btn btn-secondary btn-xs" data-act="listen" data-target="#law-chain" data-label="Legal context for §' + ref + '">' + I('volume', 'ico-sm') + 'Listen</button><button class="btn btn-secondary btn-xs" data-go="research?doc=' + d.id + '&q=' + encodeURIComponent('What law may apply to ' + info.clause.title.toLowerCase() + ' in ' + J.jurName(J.settings.jur) + '?') + '">' + I('sparkle', 'ico-sm') + 'Ask JURISAI</button><button class="btn btn-secondary btn-xs" data-go="reports?type=law&doc=' + d.id + '">' + I('file', 'ico-sm') + 'Include in report</button></div></div>' +
      '<div id="law-chain">' + (L.done[key] ? chain(d, ref) : '<div id="law-ls"></div>') + '</div>' +
      '<p class="law-disc">' + I('info', 'ico-xs') + 'JURISAI provides AI-assisted legal research, not legal advice. Sources are suggestions for a qualified person to verify; how law applies depends on facts, role and recent changes.</p>';
  }

  J.views.law = {
    title: 'Legal Context', nav: 'law', fixed: true, crumbs: function () { return ['Legal Context']; },
    render: function (r) {
      var docs = docsWithLaw(), pre = r.q.doc;
      if (pre && D.docById(pre) && mapped(pre).length) { L.doc = pre; if (!r.q.c) L.c = mapped(pre)[0]; }
      if (r.q.c && mapped(L.doc).indexOf(r.q.c) >= 0) L.c = r.q.c;
      if (!docs.some(function (x) { return x.id === L.doc; })) L.doc = docs[0] && docs[0].id;
      var d = D.docById(L.doc);
      if (mapped(L.doc).indexOf(L.c) < 0) L.c = mapped(L.doc)[0];
      var unmapped = D.docs.filter(function (x) { return x.content && x.sec === 'verified' && !mapped(x.id).length; }).length;
      return '<header class="ph"><div><div class="kicker">Workspace</div><h1>Legal <em>Context</em></h1><p class="sub">See which law may be relevant to a clause — by jurisdiction, with sources you can verify.</p></div><div class="ph-actions"><button class="btn btn-secondary btn-sm" data-go="reports?type=law&doc=' + L.doc + '">' + I('file', 'ico-sm') + 'Legal context report</button></div></header>' +
        '<div class="law-bar pad"><div class="field"><label for="law-doc">Document</label><select class="input in-sm" id="law-doc">' + docs.map(function (x) { return '<option value="' + x.id + '"' + (x.id === L.doc ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><span class="field-label">Jurisdiction</span><div class="seg" role="tablist">' + D.jurs.map(function (j) { return '<button role="tab" class="' + (j.id === J.settings.jur ? 'on' : '') + '" data-act="law-jur" data-j="' + j.id + '">' + j.name + '</button>'; }).join('') + '<button data-act="law-add" title="Request another jurisdiction" aria-label="Request another jurisdiction">' + I('plus', 'ico-sm') + '</button></div></div>' +
        '<div class="law-badges"><span class="stamp">' + I('scales', 'ico-xs') + 'AI-assisted legal research</span><span class="stamp stamp-rev">' + I('flag', 'ico-xs') + 'Review required</span></div></div>' +
        '<div class="law-body pad"><nav class="ll" aria-label="Mapped clauses"><div class="k pane-k">Clauses mapped to law</div><div id="ll">' + listHTML(d) + '</div>' + (unmapped ? '<p class="field-hint ll-foot">' + unmapped + ' verified document' + (unmapped > 1 ? 's have' : ' has') + ' no mapped concepts yet.</p>' : '') + '<p class="ll-leg"><i class="cov cov-on"></i> sources available <i class="cov"></i> not yet available</p></nav>' +
        '<section class="ld" id="ld">' + detail(d, L.c) + '</section></div>';
    },
    mount: function () {
      var d = D.docById(L.doc); $('#law-doc').addEventListener('change', function (e) { L.doc = e.target.value; L.c = mapped(L.doc)[0]; J.render(true); });
      reveal(d);
    }
  };
  function reveal(d) {
    var key = d.id + ':' + L.c + ':' + J.settings.jur;
    if (L.done[key]) return;
    var h = $('#law-ls'); if (!h) return;
    if (window.JurisAPI && window.JurisAPI.legal) {
      J.runSteps(h, 'Legal research', ['Identifying legal concept…', 'Checking jurisdiction…', 'Finding relevant sources…'], 350, function () {});
      JurisAPI.legal.context(d.id, L.c, J.settings.jur).then(function (res) {
        L.done[key] = true;
        if (res && res.concept) {
          if (!D.law[d.id + ':' + L.c]) D.law[d.id + ':' + L.c] = {};
          D.law[d.id + ':' + L.c][J.settings.jur] = res;
        }
        if ($('#ld')) {
          $('#ld').innerHTML = detail(d, L.c);
          var info = J.refInfo(d.id + ':' + L.c);
          D.addEvent({ type: 'legal', title: 'Legal context researched', obj: '§' + L.c + ' ' + (info ? info.clause.title : 'Clause') + ' · ' + J.jurName(J.settings.jur), doc: d.id, go: 'law?doc=' + d.id + '&c=' + L.c, who: 'JURISAI', meta: 'Review required' });
        }
      }).catch(function () {
        L.done[key] = true;
        if ($('#ld')) {
          $('#ld').innerHTML = detail(d, L.c);
          D.addEvent({ type: 'legal', title: 'Legal context researched', obj: '§' + L.c + ' ' + J.refInfo(d.id + ':' + L.c).clause.title + ' · ' + J.jurName(J.settings.jur), doc: d.id, go: 'law?doc=' + d.id + '&c=' + L.c, who: 'JURISAI', meta: 'Review required' });
        }
      });
      return;
    }
    J.runSteps(h, 'Legal research', ['Identifying legal concept…', 'Checking jurisdiction…', 'Finding relevant sources…'], 420, function () { L.done[key] = true; if ($('#ld')) { $('#ld').innerHTML = detail(d, L.c); D.addEvent({ type: 'legal', title: 'Legal context researched', obj: '§' + L.c + ' ' + J.refInfo(d.id + ':' + L.c).clause.title + ' · ' + J.jurName(J.settings.jur), doc: d.id, go: 'law?doc=' + d.id + '&c=' + L.c, who: 'JURISAI', meta: 'Review required' }); } });
  }
  A['law-pick'] = function (el) { L.c = el.dataset.c; var d = D.docById(L.doc); $('#ll').innerHTML = listHTML(d); $('#ld').innerHTML = detail(d, L.c); reveal(d); $('#ld').scrollTop = 0; };
  A['law-jur'] = function (el) { J.set('jur', el.dataset.j); J.toast('Jurisdiction set to ' + J.jurName(el.dataset.j)); J.render(true); };
  A['law-switch'] = function (el) { J.jurMenu(el); };
  A['law-add'] = function () { J.requestJurisdiction(); };
})();
