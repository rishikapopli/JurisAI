/* HOME — workspace overview with live Risk Dashboard & Legal Timeline integration */
(function () {
  'use strict';
  var J = window.J, D = J.data, esc = J.esc, I = J.icon;

  function greet() {
    var h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }

  function recentDocs() {
    var rows = D.docs.filter(function (d) { return !d.archived; }).sort(function (a, b) { return b.uploaded - a.uploaded; }).slice(0, 5);
    return rows.length ? '<table class="tbl tbl-tight"><tbody>' + rows.map(function (d) {
      return '<tr class="row" data-act="doc-open" data-id="' + d.id + '">' +
        '<td><div class="nm">' + J.fileIc(d) + '<div><b>' + esc(d.name) + '</b><small>' + esc(d.type) + ' · ' + J.fmt.rel(d.uploaded) + '</small></div></div></td>' +
        '<td>' + J.secChip(d.sec) + '</td>' +
        '<td class="hide-sm">' + J.anChip(d) + '</td>' +
        '</tr>';
    }).join('') + '</tbody></table>' : J.empty({ icon: 'folder', title: 'Your workspace is empty', text: 'Uploaded documents will appear here.', actions: '<a class="btn btn-primary btn-sm" href="#/documents/intake">' + I('upload', 'ico-sm') + 'Upload a document</a>' });
  }

  function recentActivity() {
    var items = D.activity().slice(0, 5);
    return items.length ? '<ul class="ra">' + items.map(function (e) {
      return '<li><span>' + I(e.type === 'upload' ? 'upload' : e.type === 'scan' ? 'shield-check' : e.type === 'review' ? 'flag' : 'history', 'ico-sm') + '</span><span><b>' + esc(e.title) + '</b><small>' + esc(e.obj || '') + ' · ' + J.fmt.rel(e.t) + '</small></span></li>';
    }).join('') + '</ul>' : J.empty({ icon: 'history', title: 'No activity yet', text: 'Real workspace events will appear here.' });
  }

  function intelligenceCards() {
    var analyzed = D.docs.filter(function (d) { return !d.archived && d.an === 'analyzed'; }).length;
    var contra = D.findings ? D.findings.length : 0;

    return '<div class="home-intel-grid">' +
      '<div class="h-card">' +
        '<div class="h-card-top"><span class="k">UK Statutory Cross-Check</span>' + I('scales', 'ico-sm') + '</div>' +
        '<b>legislation.gov.uk API</b>' +
        '<p class="muted">Live statutory retrieval & deterministic compliance checking.</p>' +
        '<a class="linkbtn" href="#/dashboard">Open Risk Dashboard &rarr;</a>' +
      '</div>' +
      '<div class="h-card">' +
        '<div class="h-card-top"><span class="k">Contradiction Engine</span>' + I('compare', 'ico-sm') + '</div>' +
        '<b>' + contra + ' Differences Detected</b>' +
        '<p class="muted">Notice periods, working hours & contractual conflicts.</p>' +
        '<a class="linkbtn" href="#/compare">Cross-Document Compare &rarr;</a>' +
      '</div>' +
      '<div class="h-card">' +
        '<div class="h-card-top"><span class="k">Human Review Queue</span>' + I('flag', 'ico-sm') + '</div>' +
        '<b>Audit Governance</b>' +
        '<p class="muted">Verify uncertain findings before final reliance.</p>' +
        '<a class="linkbtn" href="#/review">Open Review Queue &rarr;</a>' +
      '</div>' +
    '</div>';
  }

  J.views.home = {
    title: 'Home',
    crumbs: function () { return ['Home']; },
    render: function () {
      var docs = D.docs.filter(function (d) { return !d.archived; });
      var verified = docs.filter(function (d) { return d.sec === 'verified' || d.sec === 'checked'; }).length;
      var analyzed = docs.filter(function (d) { return d.an === 'analyzed'; }).length;

      return '<div class="home">' +
        '<section class="home-ask">' +
          '<div class="kicker-l">' + greet() + ', ' + esc(J.firstName()) + '</div>' +
          '<h1>Your legal intelligence <em>workspace.</em></h1>' +
          '<p class="home-q">Deterministic legal cross-checking & cross-document contradiction detection.</p>' +
          '<p class="muted">Connected to legislation.gov.uk developer API for explainable, audit-ready compliance analysis.</p>' +
          '<nav class="qa" aria-label="Quick actions">' +
            '<a href="#/dashboard">' + I('chart') + '<span>Risk Dashboard &amp; Timeline</span>' + I('arrow-right', 'ico-sm qa-arr') + '</a>' +
            '<a href="#/compare">' + I('compare') + '<span>Compare Documents</span>' + I('arrow-right', 'ico-sm qa-arr') + '</a>' +
            '<a href="#/review">' + I('flag') + '<span>Human Review Queue</span>' + I('arrow-right', 'ico-sm qa-arr') + '</a>' +
            '<a href="#/reports?type=audit">' + I('file') + '<span>Audit-Ready Report</span>' + I('arrow-right', 'ico-sm qa-arr') + '</a>' +
            '<a href="#/documents/intake">' + I('upload') + '<span>Upload Document</span>' + I('arrow-right', 'ico-sm qa-arr') + '</a>' +
          '</nav>' +
        '</section>' +

        intelligenceCards() +

        '<div class="home-grid">' +
          '<div class="home-main">' +
            '<section>' +
              '<header class="sec-h"><h2>Recent documents</h2><a class="linkbtn" href="#/documents">All documents</a></header>' +
              recentDocs() +
            '</section>' +
            '<section>' +
              '<header class="sec-h"><h2>Recent activity &amp; audit trail</h2><a class="linkbtn" href="#/activity">Audit log</a></header>' +
              recentActivity() +
            '</section>' +
          '</div>' +
          '<aside class="home-rail">' +
            '<section class="sec-gate">' +
              '<header class="sec-h"><h2>Security &amp; Analysis Pipeline</h2></header>' +
              '<div class="mini-pipe">' +
                '<div><b>' + docs.length + '</b><span>Ingested</span></div>' +
                '<i></i>' +
                '<div class="ok"><b>' + verified + '</b><span>Verified</span></div>' +
                '<i></i>' +
                '<div class="ok"><b>' + analyzed + '</b><span>Analyzed</span></div>' +
              '</div>' +
              '<p class="gate-line">Zero prompt injection firewall &middot; Deterministic UK statutory checks &middot; Audit trail recorded.</p>' +
            '</section>' +
            '<section class="sec-gate">' +
              '<header class="sec-h"><h2>Live Legislation API</h2></header>' +
              '<div class="banner banner-ok">' + I('shield-check') +
                '<div><b>legislation.gov.uk API Connected</b><p class="muted">Live statutory retrieval active with persistent caching.</p></div>' +
              '</div>' +
              '<div class="res-a"><a class="btn btn-secondary btn-sm btn-block" href="#/dashboard">View Statutory Radar</a></div>' +
            '</section>' +
          '</aside>' +
        '</div>' +
      '</div>';
    }
  };
})();
