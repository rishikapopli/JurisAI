/* HELP & SUPPORT  +  INTERFACE STATES reference */
(function () {
  'use strict';
  var J = window.J, D = J.data, esc = J.esc, I = J.icon, A = J.actions, $ = J.$, $$ = J.$$;
  var Hs = J.state.help = { q: '', cat: '' };
  var POP = ['sec1', 'sec2', 'co1', 'lc1', 'lc2'];
  function art(id) { return D.help.filter(function (a) { return a.id === id; })[0]; }
  function cat(id) { return D.helpCats.filter(function (c) { return c[0] === id; })[0]; }
  function search(q, c) {
    q = q.toLowerCase().trim();
    return D.help.filter(function (a) { return (!c || a.cat === c) && (!q || (a.title + ' ' + a.text).toLowerCase().indexOf(q) >= 0); });
  }
  function list(items) {
    if (!items.length) return J.empty({ icon: 'search', title: 'No articles found', text: 'Try different words, or ask our team.', actions: '<button class="btn btn-secondary btn-sm" data-act="help-contact">Contact support</button><button class="btn btn-secondary btn-sm" data-act="help-clear">Clear search</button>' });
    return '<ul class="ha">' + items.map(function (a) { return '<li><a href="#/help/' + a.id + '"><span><b>' + esc(a.title) + '</b><small>' + esc(cat(a.cat)[1]) + '</small></span>' + I('chev-right', 'ico-sm') + '</a></li>'; }).join('') + '</ul>';
  }

  J.views.help = {
    title: 'Help & Support', fixed: false,
    crumbs: function (r) { var a = art(r.arg); return a ? [['Help & Support', '#/help'], [cat(a.cat)[1], '#/help?cat=' + a.cat], a.title] : ['Help & Support']; },
    render: function (r) {
      if (!D.help.length) return '<header class="ph"><div><div class="kicker">Support</div><h1>Help &amp; Support</h1><p class="sub">Help articles are not available in this version.</p></div></header><div class="pad">'+J.empty({icon:'help',title:'Support content unavailable',text:'Use the document library to upload, view, download, archive, or remove your files.',actions:'<a class="btn btn-primary btn-sm" href="#/documents">Open documents</a>'})+'</div>';
      if (r.arg && art(r.arg)) return article(art(r.arg));
      if (r.q.cat !== undefined) Hs.cat = r.q.cat;
      var items = search(Hs.q, Hs.cat), searching = Hs.q || Hs.cat;
      return '<header class="ph"><div><div class="kicker">Support</div><h1>How can we <em>help?</em></h1><p class="sub">Answers about security, analysis, jurisdictions and how JURISAI reaches its conclusions.</p></div><div class="ph-actions"><button class="btn btn-secondary btn-sm" data-act="help-contact">' + I('mail', 'ico-sm') + 'Contact support</button></div></header>' +
        '<div class="hp pad"><label class="hp-search">' + I('search') + '<input id="hp-q" type="search" placeholder="Search help articles" value="' + esc(Hs.q) + '" aria-label="Search help articles"></label>' +
        '<div class="hp-cols"><nav class="hp-cats" aria-label="Categories"><button class="' + (!Hs.cat ? 'on' : '') + '" data-act="help-cat" data-c="">All topics<span class="mono">' + D.help.length + '</span></button>' + D.helpCats.map(function (c) { return '<button class="' + (Hs.cat === c[0] ? 'on' : '') + '" data-act="help-cat" data-c="' + c[0] + '">' + I(c[2], 'ico-sm') + c[1] + '<span class="mono">' + D.help.filter(function (a) { return a.cat === c[0]; }).length + '</span></button>'; }).join('') + '</nav>' +
        '<div class="hp-main"><h2 class="sh">' + (searching ? (Hs.cat ? cat(Hs.cat)[1] : 'Results') : 'Popular articles') + '</h2><div id="hp-list">' + list(searching ? items : POP.map(art)) + '</div>' +
        '<div class="hp-more"><div><b>Take the welcome tour again</b><p>A five-step walkthrough of secure intake and your first analysis.</p></div><a class="btn btn-secondary btn-sm" href="#/welcome">' + I('play', 'ico-sm') + 'Replay tour</a></div>' +
        '<div class="hp-more"><div><b>Interface states reference</b><p>See how loading, empty and error states look across JURISAI.</p></div><a class="btn btn-secondary btn-sm" href="#/states">' + I('layers', 'ico-sm') + 'View states</a></div></div></div></div>';
    },
    mount: function () { var q = $('#hp-q'); if (q) q.addEventListener('input', function (e) { Hs.q = e.target.value; var items = search(Hs.q, Hs.cat); $('#hp-list').innerHTML = list(Hs.q || Hs.cat ? items : POP.map(art)); }); }
  };
  function article(a) {
    var rel = D.help.filter(function (x) { return x.cat === a.cat && x.id !== a.id; }).slice(0, 3);
    return '<div class="hp pad hp-art"><a class="back" href="#/help?cat=' + a.cat + '">' + I('chev-left', 'ico-sm') + cat(a.cat)[1] + '</a><article><div class="kicker-l">' + esc(cat(a.cat)[1]) + '</div><h1>' + esc(a.title) + '</h1>' +
      a.paras.map(function (p) { return '<p class="lead-p">' + esc(p) + '</p>'; }).join('') + (a.bullets.length ? '<ul class="hp-b">' + a.bullets.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>' : '') +
      (a.id === 'lc2' || a.id === 'sec1' ? '<div class="banner">' + I('scales') + '<div>JURISAI provides AI-assisted legal research and document analysis. It does not provide legal advice.</div></div>' : '') +
      '<div class="hp-fb"><span>Was this helpful?</span><button class="btn btn-secondary btn-xs" data-act="help-fb" data-v="yes">Yes</button><button class="btn btn-secondary btn-xs" data-act="help-fb" data-v="no">No</button><button class="linkbtn" data-act="help-contact">Contact support</button></div></article>' +
      (rel.length ? '<aside><div class="k pane-k">Related articles</div>' + list(rel) + '</aside>' : '') + '</div>';
  }
  A['help-cat'] = function (el) { Hs.cat = el.dataset.c; Hs.q = ''; location.hash.indexOf('/help/') > 0 ? J.go('help') : J.render(true); };
  A['help-clear'] = function () { Hs.q = ''; Hs.cat = ''; J.render(true); };
  A['help-fb'] = function (el) { J.toast(el.dataset.v === 'yes' ? 'Thanks — glad it helped' : 'Thanks. We will improve this article.'); };
  A['help-contact'] = function () {
    J.ui.drawer({ kicker: 'Support', title: 'Contact support', html: '<p class="muted">Tell us what happened. Please do not paste confidential document text — we can see audit details without it.</p><div class="field"><label for="sp-s">Topic</label><select class="input in-sm" id="sp-s">' + D.helpCats.map(function (c) { return '<option>' + c[1] + '</option>'; }).join('') + '</select></div><div class="field"><label for="sp-m">Message</label><textarea class="input" id="sp-m" rows="6" placeholder="What were you trying to do?"></textarea></div>', foot: '<button class="btn btn-secondary btn-sm" data-act="drawer-close">Cancel</button><button class="btn btn-primary btn-sm" data-act="help-send">Send message</button>' });
  };
  A['help-send'] = function () { if (!$('#sp-m').value.trim()) { J.toast('Please describe the problem first', 'warn'); return; } J.ui.closeDrawer(); J.toast('Message sent. We reply within one business day.'); };

  /* ---------- Interface states ---------- */
  J.views.states = {
    title: 'Interface states', nav: 'help', fixed: false, crumbs: function () { return [['Help & Support', '#/help'], 'Interface states']; },
    render: function () {
      var errs = [['scan', 'Failed security scan'], ['corrupt', 'Corrupted file'], ['unsupported', 'Unsupported file'], ['analysis', 'Analysis failure'], ['research', 'Research unavailable'], ['evidence', 'Insufficient evidence'], ['network', 'Network error']];
      return '<header class="ph"><div><div class="kicker">Reference</div><h1>Interface <em>states</em></h1><p class="sub">How JURISAI behaves when things are loading, empty, or go wrong. It never invents certainty.</p></div></header><div class="sx pad">' +
        '<h2 class="sh">Loading</h2><div class="sx-grid">' + [['Security gate', 'sg'], ['Document analysis', 'an'], ['Contradiction analysis', 'cx'], ['Legal research', 'lr']].map(function (x) { return '<div id="sx-' + x[1] + '"></div>'; }).join('') + '</div>' +
        '<h2 class="sh">Empty</h2><div class="sx-grid">' + '<div class="sx-box">' + J.empty({ icon: 'folder', title: 'Your library is empty', text: 'Upload your first document. Every file passes the security gateway first.', actions: '<a class="btn btn-primary btn-sm" href="#/documents/intake">Upload Document</a>' }) + '</div><div class="sx-box">' + J.empty({ icon: 'shield-check', title: 'Nothing needs review', text: 'Every finding has been reviewed.' }) + '</div><div class="sx-box">' + J.empty({ icon: 'compare', title: 'No overlapping obligations', text: 'Try documents that cover the same subject.' }) + '</div></div>' +
        '<h2 class="sh">Errors</h2><div class="sx-errs">' + errs.map(function (e) { return '<div><span class="k">' + e[1] + '</span>' + J.errorState(e[0], { doc: 'sett' }) + '</div>'; }).join('') + '</div>' +
        '<h2 class="sh">AI transparency</h2><div class="sx-tags">' + ['evidence', 'law', 'ai', 'inference', 'review'].map(function (t) { return '<div>' + J.tag(t) + '<p>' + ({ evidence: 'Quoted from a verified document.', law: 'A named statute, rule or case.', ai: 'Plain-language reading by JURISAI.', inference: 'A reasoned step the sources do not state.', review: 'Needs a qualified person before reliance.' })[t] + '</p></div>'; }).join('') + '</div></div>';
    },
    mount: function () {
      var run = function (id, t, steps) { var h = $('#sx-' + id); if (h) J.runSteps(h, t, steps, 800, function () { J.later(function () { run(id, t, steps); }, 1400); }); };
      run('sg', 'Security gate', ['Checking integrity…', 'Scanning embedded content…', 'Inspecting sensitive data…', 'Verifying document…']);
      run('an', 'Document analysis', ['Extracting structure…', 'Identifying clauses…', 'Building document map…']);
      run('cx', 'Contradiction analysis', ['Matching related clauses…', 'Comparing obligations…', 'Detecting inconsistencies…']);
      run('lr', 'Legal research', ['Identifying legal concept…', 'Checking jurisdiction…', 'Finding relevant sources…']);
    }
  };
})();
