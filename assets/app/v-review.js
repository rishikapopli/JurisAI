/* REVIEW — Human Review Queue for uncertain legal findings and compliance flags */
(function () {
  'use strict';
  var J = window.J, D = J.data, esc = J.esc, I = J.icon, A = J.actions, $ = J.$, $$ = J.$$;
  var S = J.state.review = { filter: 'pending', items: [], loading: false, sel: null };

  async function loadReviewItems() {
    try {
      S.loading = true;
      var res = await Promise.all([
        J.api('/api/compliance').catch(function () { return { compliance: [] }; }),
        J.api('/api/reviews').catch(function () { return { reviews: [] }; })
      ]);
      var comp = res[0].compliance || [];
      var revs = res[1].reviews || [];
      var revMap = {};
      revs.forEach(function (r) { revMap[r.finding_id] = r; });

      // Build unified review items list
      var items = [];
      comp.forEach(function (c) {
        var existingRev = revMap[c.id];
        items.push({
          id: c.id,
          doc_id: c.doc_id,
          doc_name: c.doc_name,
          title: c.finding,
          clause_ref: c.clause_ref,
          clause_title: c.clause_title,
          quote: c.clause_quote,
          page: c.page,
          statute: c.statute,
          status: existingRev ? existingRev.status : (c.status === 'compliant' ? 'approved' : 'pending'),
          severity: c.severity,
          reasoning: c.reasoning,
          remedy: c.remedy,
          notes: existingRev ? existingRev.notes : '',
          reviewer: existingRev ? existingRev.reviewer : '',
          updated_at: existingRev ? existingRev.updated_at : null
        });
      });

      // Also add cross-document contradictions that need human decision
      (D.findings || []).forEach(function (f) {
        var st = D.findingState(f.id);
        items.push({
          id: f.id,
          doc_id: f.pair[0],
          doc_name: (D.docById(f.pair[0]) || {}).name || 'Document A',
          title: f.topic + ' (' + D.kinds[f.kind].label + ')',
          clause_ref: f.a.ref,
          clause_title: 'Conflicting Covenant',
          quote: 'Source A: ' + f.a.quote + '\n\nSource B: ' + f.b.quote,
          page: 1,
          statute: {
            act_name: 'Cross-Document Harmonization',
            short_title: 'Contract Precedence Rule',
            section_id: 'Covenant Conflict',
            source_url: 'https://www.legislation.gov.uk',
            statutory_rule: 'Where contracts and internal policies conflict, courts determine precedence based on express supremacy clauses and intention of the parties.'
          },
          status: st.status === 'reviewed' ? 'approved' : (st.status === 'dismissed' ? 'dismissed' : 'pending'),
          severity: f.sev,
          reasoning: f.why,
          remedy: f.review,
          notes: (st.notes && st.notes[0]) ? st.notes[0].t : '',
          reviewer: 'You',
          updated_at: null
        });
      });

      S.items = items;
      S.loading = false;
      if ($('#review-root')) renderReviewUI();
    } catch (e) {
      console.warn('Failed to load review items:', e);
      S.loading = false;
    }
  }

  function filterTabsHTML() {
    var total = S.items.length;
    var pending = S.items.filter(function (x) { return x.status === 'pending'; }).length;
    var approved = S.items.filter(function (x) { return x.status === 'approved'; }).length;
    var flagged = S.items.filter(function (x) { return x.status === 'flagged'; }).length;

    return '<div class="tabs tabs-sc pad" role="tablist">' +
      '<button role="tab" class="' + (S.filter === 'pending' ? 'on' : '') + '" data-act="rev-tab" data-f="pending">Pending Human Review <span class="n">' + pending + '</span></button>' +
      '<button role="tab" class="' + (S.filter === 'all' ? 'on' : '') + '" data-act="rev-tab" data-f="all">All Findings <span class="n">' + total + '</span></button>' +
      '<button role="tab" class="' + (S.filter === 'approved' ? 'on' : '') + '" data-act="rev-tab" data-f="approved">Approved as Compliant <span class="n">' + approved + '</span></button>' +
      '<button role="tab" class="' + (S.filter === 'flagged' ? 'on' : '') + '" data-act="rev-tab" data-f="flagged">Flagged as Risk <span class="n">' + flagged + '</span></button>' +
    '</div>';
  }

  function cardHTML(it) {
    var sevCls = it.severity === 'high' ? 'chip-risk' : it.severity === 'med' ? 'chip-warn' : 'chip-slate';
    var statusBadge = it.status === 'approved' ? '<span class="chip chip-ok">' + I('check', 'ico-xs') + 'Approved as Compliant</span>'
      : it.status === 'flagged' ? '<span class="chip chip-risk">' + I('x', 'ico-xs') + 'Flagged as Risk</span>'
      : '<span class="chip chip-warn">' + I('flag', 'ico-xs') + 'Human Review Required</span>';

    return '<article class="rev-card ' + (it.status !== 'pending' ? 'rev-done' : '') + '" id="rc-' + it.id + '">' +
      '<header class="rev-card-h">' +
        '<div>' +
          '<div class="rev-badges">' +
            '<span class="chip ' + sevCls + '">' + ({ high: 'High', med: 'Medium', low: 'Low' })[it.severity] + ' Priority</span>' +
            statusBadge +
          '</div>' +
          '<h3>' + esc(it.title) + '</h3>' +
          '<p class="muted">' + esc(it.doc_name) + ' &middot; ' + esc(it.clause_title) + ' &middot; Page ' + it.page + '</p>' +
        '</div>' +
        '<div class="rev-card-meta mono">' + esc(it.clause_ref) + '</div>' +
      '</header>' +

      '<div class="rev-body-grid">' +
        '<div class="rev-col">' +
          '<div class="k">Document Evidence ' + J.tag('evidence') + '</div>' +
          '<blockquote class="q q-sm">' + esc(it.quote) + '</blockquote>' +
          (it.clause_ref ? J.citeLink(it.clause_ref, 'Open §' + it.clause_ref.split(':')[1] + ' in document') : '') +
        '</div>' +
        '<div class="rev-col">' +
          '<div class="k">Statutory Rule (UK Legislation) ' + J.tag('law') + '</div>' +
          '<div class="rev-statute-box">' +
            '<b>' + esc(it.statute.act_name) + ' &mdash; ' + esc(it.statute.section_id) + '</b>' +
            '<p class="muted">' + esc(it.statute.statutory_rule) + '</p>' +
            '<a class="linkbtn" href="' + esc(it.statute.source_url) + '" target="_blank" rel="noopener">Verify at legislation.gov.uk ' + I('external', 'ico-xs') + '</a>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<dl class="rev-explain">' +
        '<div><dt>Deterministic Analysis ' + J.tag('ai') + '</dt><dd>' + esc(it.reasoning) + '</dd></div>' +
        '<div><dt>Recommended Remediation</dt><dd>' + esc(it.remedy) + '</dd></div>' +
        (it.notes ? '<div><dt>Auditor Notes</dt><dd class="mono">' + esc(it.notes) + ' <small class="muted">(' + esc(it.reviewer) + ')</small></dd></div>' : '') +
      '</dl>' +

      '<footer class="rev-card-f">' +
        '<div class="rev-actions">' +
          (it.status === 'approved'
            ? '<button class="btn btn-secondary btn-sm" data-act="rev-action" data-id="' + it.id + '" data-doc="' + it.doc_id + '" data-decision="pending">' + I('refresh', 'ico-sm') + 'Re-open Review</button>'
            : '<button class="btn btn-primary btn-sm" data-act="rev-action" data-id="' + it.id + '" data-doc="' + it.doc_id + '" data-decision="approved">' + I('check', 'ico-sm') + 'Approve as Compliant</button>') +
          (it.status === 'flagged'
            ? ''
            : '<button class="btn btn-secondary btn-sm" data-act="rev-action" data-id="' + it.id + '" data-doc="' + it.doc_id + '" data-decision="flagged">' + I('alert', 'ico-sm') + 'Flag as Breach / Non-Compliant</button>') +
          '<button class="btn btn-secondary btn-sm" data-act="rev-note" data-id="' + it.id + '" data-doc="' + it.doc_id + '">' + I('note', 'ico-sm') + 'Add Auditor Note</button>' +
        '</div>' +
        '<div class="rev-stamp"><span class="stamp stamp-rev">' + I('flag', 'ico-xs') + 'Human verification recorded</span></div>' +
      '</footer>' +
    '</article>';
  }

  function renderReviewUI() {
    var root = $('#review-root');
    if (!root) return;

    var list = S.items;
    if (S.filter === 'pending') list = list.filter(function (x) { return x.status === 'pending'; });
    else if (S.filter === 'approved') list = list.filter(function (x) { return x.status === 'approved'; });
    else if (S.filter === 'flagged') list = list.filter(function (x) { return x.status === 'flagged'; });

    root.innerHTML = filterTabsHTML() +
      '<div class="pad rev-list">' +
        (list.length ? list.map(cardHTML).join('') : '<div class="pad">' + J.empty({ icon: 'shield-check', title: 'Queue Clear', text: 'No findings match the current filter (' + S.filter + ').' }) + '</div>') +
      '</div>';
  }

  J.views.review = {
    title: 'Human Review Queue',
    nav: 'review',
    crumbs: function () { return ['Human Review Queue']; },
    render: function () {
      return '<header class="ph"><div>' +
        '<div class="kicker">Audit Governance</div>' +
        '<h1>Human Review <em>Queue</em></h1>' +
        '<p class="sub">Verify uncertain clauses, potential statutory gaps, and cross-document contradictions before relying on them.</p>' +
        '</div>' +
        '<div class="ph-actions">' +
          '<a class="btn btn-secondary btn-sm" href="#/dashboard">' + I('chart', 'ico-sm') + 'Risk Dashboard</a>' +
          '<a class="btn btn-secondary btn-sm" href="#/reports?type=audit">' + I('file', 'ico-sm') + 'Export Audit Report</a>' +
        '</div></header>' +
        '<div id="review-root">' +
          '<div class="pad cmp-load"><div class="ls"><div class="ls-t"><span class="label">Loading review queue…</span></div></div></div>' +
        '</div>';
    },
    mount: function () {
      loadReviewItems();
    }
  };

  A['rev-tab'] = function (el) {
    S.filter = el.dataset.f;
    $$('.tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.f === S.filter); });
    renderReviewUI();
  };

  A['rev-action'] = async function (el) {
    var fid = el.dataset.id;
    var did = el.dataset.doc;
    var decision = el.dataset.decision;

    try {
      await J.api('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          finding_id: fid,
          doc_id: did,
          decision: decision,
          notes: 'Decision set to ' + decision + ' via Human Review Queue.',
          reviewer: J.userName()
        })
      });
      J.toast('Finding marked as ' + decision.toUpperCase());
      // Update local state
      var item = S.items.find(function (x) { return x.id === fid; });
      if (item) {
        item.status = decision;
        item.reviewer = J.userName();
      }
      renderReviewUI();
    } catch (e) {
      J.toast('Could not save review decision: ' + e.message, 'warn');
    }
  };

  A['rev-note'] = function (el) {
    var fid = el.dataset.id;
    var did = el.dataset.doc;
    J.ui.modal({
      title: 'Add Auditor Decision Note',
      html: '<p class="muted">Notes are recorded into the immutable audit-ready output log.</p>' +
        '<div class="field"><label for="rev-note-text">Reasoning & Verification Note</label>' +
        '<textarea class="input" id="rev-note-text" rows="4" placeholder="e.g. Confirmed with employment legal counsel that statutory notice applies."></textarea></div>',
      foot: '<button class="btn btn-secondary btn-sm" data-act="modal-close">Cancel</button>' +
        '<button class="btn btn-primary btn-sm" data-act="rev-note-save" data-id="' + fid + '" data-doc="' + did + '">Save to Audit Log</button>'
    });
  };

  A['rev-note-save'] = async function (el) {
    var fid = el.dataset.id;
    var did = el.dataset.doc;
    var note = ($('#rev-note-text') || {}).value || '';
    if (!note.trim()) { J.toast('Write a note first', 'warn'); return; }

    try {
      await J.api('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          finding_id: fid,
          doc_id: did,
          decision: 'reviewed',
          notes: note.trim(),
          reviewer: J.userName()
        })
      });
      J.ui.closeModal();
      J.toast('Auditor note recorded in audit log');
      var item = S.items.find(function (x) { return x.id === fid; });
      if (item) {
        item.notes = note.trim();
        item.reviewer = J.userName();
      }
      renderReviewUI();
    } catch (e) {
      J.toast('Failed to save note: ' + e.message, 'warn');
    }
  };
})();
