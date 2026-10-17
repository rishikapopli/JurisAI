/* DASHBOARD — Risk Dashboard & Legal Timeline (live UK Legislation cross-check) */
(function () {
  'use strict';
  var J = window.J, D = J.data, esc = J.esc, I = J.icon, A = J.actions, $ = J.$, $$ = J.$$;
  var S = J.state.dash = { timelineFilter: 'all', data: null, loading: false };

  async function loadDashboardData() {
    try {
      S.loading = true;
      var res = await Promise.all([
        J.api('/api/dashboard/stats').catch(function () { return { ok: false }; }),
        J.api('/api/compliance').catch(function () { return { ok: false, compliance: [] }; }),
        J.api('/api/timeline').catch(function () { return { ok: false, timeline: [] }; }),
        J.api('/api/legislation/status').catch(function () { return { ok: false }; })
      ]);
      S.stats = res[0].ok ? res[0] : null;
      S.compliance = res[1].ok ? res[1].compliance : [];
      S.timeline = res[2].ok ? res[2].timeline : [];
      S.apiStatus = res[3].ok ? res[3].status : (S.stats ? S.stats.api_status : null);
      S.loading = false;
      if ($('#dash-root')) renderDashboardBody();
    } catch (e) {
      console.warn('Dashboard load failed:', e);
      S.loading = false;
    }
  }

  function apiStatusBadge() {
    var s = S.apiStatus;
    if (!s) return '<span class="chip"><i class="dot"></i> legislation.gov.uk checking…</span>';
    var isLive = s.mode === 'live_api';
    var cls = isLive ? 'chip-ok' : 'chip-gold';
    var dotCls = isLive ? 'dot-ok' : 'dot-warn';
    var label = isLive ? 'legislation.gov.uk Live (' + s.latency_ms + 'ms)' : 'legislation.gov.uk Active (Local Statutory Archive)';
    return '<span class="chip ' + cls + '" title="' + esc(s.message || '') + '"><i class="dot ' + dotCls + '"></i>' + esc(label) + '</span>';
  }

  function heroStatsHTML() {
    var st = S.stats || {};
    var docs = D.docs.filter(function (d) { return !d.archived && d.an === 'analyzed'; });
    var comp = S.compliance || [];
    var breaches = comp.filter(function (c) { return c.status === 'statutory_breach'; }).length;
    var reviews = comp.filter(function (c) { return c.human_review_required && (!c.review_status || c.review_status === 'pending'); }).length;
    var contra = D.findings ? D.findings.filter(function (f) { return f.kind === 'contradiction'; }).length : 0;
    var dates = S.timeline ? S.timeline.length : 0;

    return '<div class="dash-hero-grid">' +
      '<div class="dcard ' + (breaches ? 'dcard-risk' : 'dcard-ok') + '">' +
        '<div class="dcard-h"><span class="k">Statutory Breaches</span>' + (breaches ? I('alert', 'ico-sm') : I('shield-check', 'ico-sm')) + '</div>' +
        '<div class="dcard-v">' + breaches + '</div>' +
        '<p class="muted">' + (breaches ? 'Violations of mandatory UK statutes detected.' : 'No strict statutory breaches identified.') + '</p>' +
      '</div>' +
      '<div class="dcard ' + (reviews ? 'dcard-warn' : '') + '">' +
        '<div class="dcard-h"><span class="k">Human Review Queue</span>' + I('flag', 'ico-sm') + '</div>' +
        '<div class="dcard-v">' + reviews + '</div>' +
        '<p class="muted"><a class="linkbtn" href="#/review">Open Human Review Queue &rarr;</a></p>' +
      '</div>' +
      '<div class="dcard ' + (contra ? 'dcard-warn' : '') + '">' +
        '<div class="dcard-h"><span class="k">Document Contradictions</span>' + I('compare', 'ico-sm') + '</div>' +
        '<div class="dcard-v">' + (D.findings ? D.findings.length : 0) + '</div>' +
        '<p class="muted"><a class="linkbtn" href="#/compare">' + contra + ' direct conflict(s) &rarr;</a></p>' +
      '</div>' +
      '<div class="dcard">' +
        '<div class="dcard-h"><span class="k">Tracked Deadlines & Dates</span>' + I('calendar', 'ico-sm') + '</div>' +
        '<div class="dcard-v">' + dates + '</div>' +
        '<p class="muted">Chronological contractual milestones.</p>' +
      '</div>' +
    '</div>';
  }

  function complianceRadarHTML() {
    var comp = S.compliance || [];
    if (!comp.length) return '<p class="muted pad-s">No statutory compliance records available yet. Run analysis on your documents.</p>';

    // Group findings by statute
    var byStatute = {};
    comp.forEach(function (c) {
      var k = (c.statute && c.statute.short_title) || 'General UK Law';
      byStatute[k] = byStatute[k] || [];
      byStatute[k].push(c);
    });

    return '<div class="statute-grid">' + Object.keys(byStatute).map(function (k) {
      var items = byStatute[k];
      var hasBreach = items.some(function (x) { return x.status === 'statutory_breach'; });
      var hasReview = items.some(function (x) { return x.status === 'human_review' || x.status === 'potential_risk'; });
      var badgeCls = hasBreach ? 'chip-risk' : hasReview ? 'chip-warn' : 'chip-ok';
      var badgeTxt = hasBreach ? 'Statutory Breach' : hasReview ? 'Review Required' : 'Compliant';

      return '<div class="statute-card">' +
        '<div class="statute-card-h"><div><b>' + esc(k) + '</b><small class="muted">' + items.length + ' clause check(s)</small></div><span class="chip ' + badgeCls + '">' + badgeTxt + '</span></div>' +
        '<ul class="statute-items">' + items.slice(0, 3).map(function (it) {
          var dot = it.status === 'statutory_breach' ? 'dot-risk' : it.status === 'compliant' ? 'dot-ok' : 'dot-warn';
          return '<li><i class="dot ' + dot + '"></i><span><b>' + esc(it.statute.section_id) + ':</b> ' + esc(it.finding) + ' <a class="srcref mono" href="#/analyze/' + it.doc_id + '?ref=' + it.clause_ref.split(':')[1] + '">§' + it.clause_ref.split(':')[1] + '</a></span></li>';
        }).join('') + '</ul>' +
        '<div class="statute-card-f"><a class="linkbtn" href="' + esc(items[0].statute.source_url) + '" target="_blank" rel="noopener">Official legislation.gov.uk record ' + I('external', 'ico-xs') + '</a></div>' +
      '</div>';
    }).join('') + '</div>';
  }

  function timelineHTML() {
    var items = S.timeline || [];
    if (!items.length) return '<p class="muted pad-s">No contractual dates or deadlines identified yet.</p>';

    var f = S.timelineFilter;
    var filtered = items.filter(function (it) {
      if (f === 'deadlines') return it.label.toLowerCase().indexOf('deadline') >= 0 || it.label.toLowerCase().indexOf('review') >= 0 || it.label.toLowerCase().indexOf('window') >= 0;
      if (f === 'recurring') return it.label.toLowerCase().indexOf('recurring') >= 0 || it.label.toLowerCase().indexOf('monthly') >= 0;
      return true;
    });

    return '<div class="timeline-wrap">' +
      '<div class="timeline-filters">' +
        '<button class="kchip' + (f === 'all' ? ' on' : '') + '" data-act="tl-filter" data-f="all">All Dates (' + items.length + ')</button>' +
        '<button class="kchip' + (f === 'deadlines' ? ' on' : '') + '" data-act="tl-filter" data-f="deadlines">Deadlines & Reviews</button>' +
        '<button class="kchip' + (f === 'recurring' ? ' on' : '') + '" data-act="tl-filter" data-f="recurring">Recurring Settlement Dates</button>' +
      '</div>' +
      '<ol class="tl-stream">' + filtered.map(function (it) {
        var isIso = !!it.iso;
        var dateDisplay = isIso ? J.fmt.date(it.iso) : it.text;
        return '<li class="tl-node">' +
          '<div class="tl-badge' + (isIso ? ' tl-iso' : '') + '"><span class="mono">' + esc(dateDisplay) + '</span></div>' +
          '<div class="tl-card">' +
            '<div class="tl-card-h"><b>' + esc(it.label) + '</b><span class="mono muted">' + esc(it.doc_name) + '</span></div>' +
            '<p class="tl-txt">' + esc(it.text) + '</p>' +
            (it.ref ? J.citeLink(it.ref, 'Show in document') : '') +
          '</div>' +
        '</li>';
      }).join('') + '</ol>' +
    '</div>';
  }

  function contradictionsQuickHTML() {
    var fnd = D.findings || [];
    if (!fnd.length) {
      return '<div class="banner banner-ok">' + I('check') + '<div><b>No cross-document contradictions detected.</b> All analyzed document obligations appear harmonized.</div></div>';
    }

    return '<div class="contra-quick-list">' + fnd.slice(0, 4).map(function (f) {
      var k = D.kinds[f.kind] || { label: f.kind };
      var sevCls = f.sev === 'high' ? 'chip-risk' : f.sev === 'med' ? 'chip-warn' : 'chip-slate';
      return '<div class="cq-item">' +
        '<div class="cq-h"><span class="chip ' + sevCls + '">' + ({ high: 'High', med: 'Medium', low: 'Low' })[f.sev] + '</span><b>' + esc(f.topic) + '</b><span class="muted">' + k.label + '</span></div>' +
        '<p class="cq-what">' + esc(f.what) + '</p>' +
        '<div class="cq-vals mono"><span>' + esc(f.a.value) + '</span> &ne; <span>' + esc(f.b.value) + '</span></div>' +
        '<div class="cq-a"><a class="linkbtn" href="#/compare?f=' + f.id + '">Inspect in Comparison Graph &rarr;</a></div>' +
      '</div>';
    }).join('') + '</div>';
  }

  function renderDashboardBody() {
    var root = $('#dash-root');
    if (!root) return;
    root.innerHTML = heroStatsHTML() +
      '<div class="dash-split">' +
        '<section class="dash-sec">' +
          '<div class="sec-h"><h2>UK Statutory Compliance Radar</h2>' + J.tag('law') + '<a class="linkbtn" href="#/review">Open Review Queue</a></div>' +
          complianceRadarHTML() +
        '</section>' +
        '<section class="dash-sec">' +
          '<div class="sec-h"><h2>Cross-Document Conflicts</h2>' + J.tag('evidence') + '<a class="linkbtn" href="#/compare">Full Comparison</a></div>' +
          contradictionsQuickHTML() +
        '</section>' +
      '</div>' +
      '<section class="dash-sec mt-lg">' +
        '<div class="sec-h"><h2>Contractual & Legal Timeline</h2>' + J.tag('inference') + '<span class="muted">Chronological sequence of extracted obligations & deadlines</span></div>' +
        timelineHTML() +
      '</section>';
  }

  J.views.dashboard = {
    title: 'Risk Dashboard & Legal Timeline',
    nav: 'dashboard',
    crumbs: function () { return ['Risk Dashboard & Legal Timeline']; },
    render: function () {
      return '<header class="ph"><div>' +
        '<div class="kicker">Intelligence</div>' +
        '<h1>Risk Dashboard &amp; <em>Legal Timeline</em></h1>' +
        '<p class="sub">Dynamic legal risk monitoring, deterministic UK statutory cross-checks, and contractual timeline tracking.</p>' +
        '</div>' +
        '<div class="ph-actions">' +
          apiStatusBadge() +
          '<a class="btn btn-secondary btn-sm" href="#/review">' + I('flag', 'ico-sm') + 'Human Review Queue</a>' +
          '<a class="btn btn-secondary btn-sm" href="#/reports?type=audit">' + I('file', 'ico-sm') + 'Audit Report</a>' +
        '</div></header>' +
        '<div class="pad" id="dash-root">' +
          '<div class="cmp-load"><div class="ls"><div class="ls-t"><span class="label">Loading intelligence dashboard…</span></div></div></div>' +
        '</div>';
    },
    mount: function () {
      loadDashboardData();
    }
  };

  A['tl-filter'] = function (el) {
    S.timelineFilter = el.dataset.f;
    $$('.timeline-filters .kchip').forEach(function (b) { b.classList.toggle('on', b.dataset.f === S.timelineFilter); });
    var streamEl = $('.tl-stream');
    if (streamEl) {
      var wrap = $('.timeline-wrap');
      if (wrap) wrap.outerHTML = timelineHTML();
    }
  };
})();
