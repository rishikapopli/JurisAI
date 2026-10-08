/* REPORTS — preview + export (PDF via print, Markdown), translated on demand */
(function () {
  'use strict';
  var J = window.J, D = J.data, esc = J.esc, I = J.icon, A = J.actions, $ = J.$, $$ = J.$$;
  var P = J.state.rp = { type: 'summary', doc: 'emp', a: 'emp', b: 'pol', lang: null, sources: true, notes: true, id: null };
  var TYPES = [['summary', 'Summary', 'One page: purpose, key facts, issues and dates.'], ['detail', 'Detailed analysis', 'Clause-by-clause explanations, obligations, definitions.'], ['contra', 'Contradiction report', 'Differences between two documents, by type.'], ['law', 'Legal context report', 'Clauses mapped to relevant law by jurisdiction.']];

  function eligible() { return D.docs.filter(function (d) { return d.sec === 'verified' && d.content && !d.archived; }); }
  function trl(key, fb) { var l = P.lang || J.settings.lang; if (l === 'en') return fb; return (D.tr[l] && D.tr[l][key]) || fb; }
  function val(v) { return v && v.iso ? J.fmt.date(v.iso) : String(v); }
  function rid() { if (!P.id) { var n = new Date(); P.id = 'JR-' + n.getFullYear() + String(n.getMonth() + 1).padStart(2, '0') + String(n.getDate()).padStart(2, '0') + '-' + Math.floor(1000 + Math.random() * 9000); } return P.id; }

  /* ---------- the model (one source for HTML, print and Markdown) ---------- */
  function build() {
    var used = [], sec = [], jur = J.settings.jur, jn = J.jurName(jur), d = D.docById(P.doc);
    var src = function (ref) { if (used.indexOf(ref) < 0) used.push(ref); return '[' + (used.indexOf(ref) + 1) + ']'; };
    var title, docs, status;
    if (P.type === 'contra') {
      var da = D.docById(P.a), db = D.docById(P.b); docs = [da, db]; title = 'Contradiction report';
      var list = D.findings.filter(function (f) { return (f.pair.indexOf(P.a) >= 0 && f.pair.indexOf(P.b) >= 0); });
      var cnt = {}; list.forEach(function (f) { cnt[f.kind] = (cnt[f.kind] || 0) + 1; });
      sec.push({ h: 'Overview', blocks: [{ p: list.length ? list.length + ' differences were found between ' + da.name + ' and ' + db.name + '. Not every difference is a contradiction: they are classified as potential contradictions, inconsistencies, document updates and legitimate changes.' : 'No overlapping obligations were found between these documents, so there is nothing to compare reliably.' }, { kv: Object.keys(D.kinds).map(function (k) { return [D.kinds[k].label, String(cnt[k] || 0)]; }) }] });
      list.forEach(function (f) {
        var st = D.findingState(f.id);
        sec.push({ h: f.topic + ' — ' + D.kinds[f.kind].label, sub: ({ high: 'High', med: 'Medium', low: 'Low' })[f.sev] + ' priority · ' + (st.status === 'reviewed' ? 'Reviewed' : st.status === 'dismissed' ? 'Dismissed' : 'Review required'), blocks: [
          { kv: [['Source A', da.name.replace(/\.[^.]+$/, '') + ' — ' + f.a.value + ' ' + src(f.a.ref)], ['Source B', db.name.replace(/\.[^.]+$/, '') + ' — ' + f.b.value + ' ' + src(f.b.ref)]] },
          { q: f.a.quote, src: J.refInfo(f.a.ref).full }, { q: f.b.quote, src: J.refInfo(f.b.ref).full },
          { kv: [['What conflicts', f.what], ['Why it may matter', trl(f.id + '.why', f.why)], ['Potential impact', f.impact], ['Review required', f.review]] }].concat(st.notes.length ? [{ ul: st.notes.map(function (n) { return 'Note (' + J.fmt.dt(n.at) + '): ' + n.t; }) }] : []) });
      });
    } else if (P.type === 'law') {
      docs = [d]; title = 'Legal context report';
      var keys = Object.keys(D.law).filter(function (k) { return k.split(':')[0] === d.id; });
      sec.push({ h: 'Overview', blocks: [{ p: 'AI-assisted legal research connecting clauses of ' + d.name + ' to potentially relevant law in ' + jn + '. This is research for a qualified person to verify, not legal advice.' }] });
      if (!keys.length) sec.push({ h: 'No mapped concepts', blocks: [{ p: 'No clauses in this document have been mapped to legal concepts yet.' }] });
      keys.forEach(function (k) {
        var ref = k.split(':')[1], info = J.refInfo(k), x = D.lawConcept(d.id, ref, jur);
        var blocks = [{ q: info.para.text, src: info.full }];
        if (x.unavailable) blocks.push({ p: 'Research unavailable: JURISAI has no verified legal sources for this concept in ' + jn + ' yet and will not guess.' });
        else blocks.push({ kv: [['Legal concept', x.concept], ['Match', x.strength], ['Jurisdiction', jn]] }, { ul: x.sources.map(function (s) { return s.name + ' — ' + s.cite + ' (' + s.type + '). ' + s.rel + (s.url ? ' ' + s.url : ''); }) }, { p: x.why }, { h4: 'Verify before relying on this', ul: x.verify });
        sec.push({ h: '§' + ref + ' ' + info.clause.title, sub: 'AI-assisted legal research · Review required', blocks: blocks });
        used.push(k);
      });
      used = []; keys.forEach(function (k) { used.push(k); });
    } else {
      docs = [d]; title = P.type === 'detail' ? 'Detailed analysis' : 'Summary report';
      var c = d.content;
      sec.push({ h: 'Executive summary', sub: 'AI explanation', blocks: [{ p: trl(d.id + '.summary', c.summary) }] });
      sec.push({ h: 'Key facts', blocks: [{ kv: c.facts.map(function (f) { return [f[0], val(f[1])]; }) }] });
      if (P.type === 'detail') {
        sec.push({ h: 'Clause analysis', sub: 'Original clause, then JURISAI’s explanation', blocks: [].concat.apply([], c.clauses.map(function (cl) {
          return cl.paras.filter(function (p) { return c.notes[p.ref]; }).map(function (p) { var n = c.notes[p.ref]; return { clause: '§' + p.ref + ' ' + cl.title, q: p.text, src: J.refInfo(d.id + ':' + p.ref).full + ' ' + src(d.id + ':' + p.ref), p: trl(d.id + '.' + p.ref, n.explain) }; });
        })) });
        sec.push({ h: 'Obligations', blocks: [{ ul: c.obligations.map(function (o) { return o.who + ': ' + o.text + ' ' + src(o.ref); }) }] });
        sec.push({ h: 'Definitions', blocks: [{ kv: c.defs.map(function (x) { return [x.t, x.d]; }) }] });
      }
      sec.push({ h: 'Issues requiring review', sub: 'Review required', blocks: [c.issues.length ? { ul: c.issues.map(function (i) { return i.title + ' — ' + i.text + ' ' + src(i.ref); }) } : { p: 'No issues were flagged.' }] });
      sec.push({ h: 'Important dates', blocks: [{ kv: c.dates.map(function (x) { return [x.iso ? J.fmt.date(x.iso) : x.text, x.label + ' ' + src(x.ref)]; }) }] });
    }
    docs = docs.filter(Boolean);
    status = docs.every(function (x) { return x.sec === 'verified'; }) ? 'VERIFIED' : 'REVIEW REQUIRED';
    return { title: title, docs: docs, jur: jn, status: status, sha: docs.map(function (x) { return x.sha; }).join(' · '), when: new Date(), id: rid(), sections: sec, used: used };
  }

  function blockHTML(b) {
    if (b.clause) return '<div class="rp-cl"><b>' + esc(b.clause) + '</b><blockquote class="q q-sm">' + esc(b.q) + '</blockquote><p class="rp-src">' + esc(b.src) + '</p><p>' + esc(b.p) + '</p></div>';
    if (b.q) return '<blockquote class="q q-sm">' + esc(b.q) + (b.src ? '<cite>' + esc(b.src) + '</cite>' : '') + '</blockquote>';
    if (b.kv) return '<dl class="rp-kv">' + b.kv.map(function (x) { return '<div><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></div>'; }).join('') + '</dl>';
    if (b.ul) return (b.h4 ? '<h4>' + esc(b.h4) + '</h4>' : '') + '<ul>' + b.ul.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
    return '<p>' + esc(b.p) + '</p>';
  }
  function paperHTML(m) {
    var lang = P.lang || J.settings.lang, ln = D.langs.filter(function (x) { return x.id === lang; })[0].label;
    return '<article class="rp-paper" id="rp-paper" data-speak><header class="rp-head"><div class="rp-brand"><img src="assets/logo-mark.png" alt=""><img src="assets/logo-wordmark.png" alt="JURISAI"></div><div class="rp-id mono">' + m.id + '</div></header>' +
      '<div class="rp-title"><span class="k">AI-assisted legal intelligence</span><h2>' + esc(m.title) + '</h2><p>' + esc(m.docs.map(function (x) { return x.name; }).join('  ·  ')) + '</p></div>' +
      '<dl class="rp-meta"><div><dt>Security status</dt><dd class="' + (m.status === 'VERIFIED' ? 'ok' : 'warn') + '">' + I(m.status === 'VERIFIED' ? 'shield-check' : 'alert', 'ico-xs') + m.status + '</dd></div><div><dt>Jurisdiction</dt><dd>' + esc(m.jur) + '</dd></div><div><dt>Generated</dt><dd class="mono">' + J.fmt.dt(m.when) + '</dd></div><div><dt>Language</dt><dd>' + ln + '</dd></div><div class="wide"><dt>Integrity (SHA-256)</dt><dd class="mono">' + esc(m.sha) + '</dd></div></dl>' +
      m.sections.map(function (s, i) { return '<section class="rp-s"><h3><span class="mono">' + (i + 1) + '</span>' + esc(s.h) + '</h3>' + (s.sub ? '<p class="rp-sub">' + esc(s.sub) + '</p>' : '') + s.blocks.map(blockHTML).join('') + '</section>'; }).join('') +
      (P.sources && m.used.length && P.type !== 'law' && P.type !== 'contra' || (P.sources && P.type === 'contra' && m.used.length) ? '<section class="rp-s"><h3><span class="mono">' + (m.sections.length + 1) + '</span>Sources</h3><ol class="rp-srcs">' + m.used.map(function (r) { return '<li>' + esc(J.refInfo(r).full) + '</li>'; }).join('') + '</ol></section>' : '') +
      '<footer class="rp-foot"><div class="stamp stamp-rev">' + I('flag', 'ico-xs') + 'Review required</div><p><b>Disclaimer.</b> This report was produced by JURISAI, an AI-assisted legal research and document analysis tool. It is not legal advice and is not a substitute for a qualified legal professional. AI output may contain errors; verify all sources before relying on it. Original clause text is reproduced from verified documents.</p></footer></article>';
  }
  function md(m) {
    var o = '# JURISAI — ' + m.title + '\n\n' + m.docs.map(function (x) { return '**' + x.name + '**'; }).join(' · ') + '\n\n- Security status: ' + m.status + '\n- Jurisdiction: ' + m.jur + '\n- Generated: ' + m.when.toISOString() + '\n- Report ID: ' + m.id + '\n- Integrity: ' + m.sha + '\n\n';
    m.sections.forEach(function (s, i) {
      o += '## ' + (i + 1) + '. ' + s.h + '\n' + (s.sub ? '_' + s.sub + '_\n' : '') + '\n';
      s.blocks.forEach(function (b) {
        if (b.clause) o += '**' + b.clause + '**\n\n> ' + b.q + '\n\n' + b.p + '\n\n';
        else if (b.q) o += '> ' + b.q + (b.src ? ' — ' + b.src : '') + '\n\n';
        else if (b.kv) o += b.kv.map(function (x) { return '- **' + x[0] + ':** ' + x[1]; }).join('\n') + '\n\n';
        else if (b.ul) o += (b.h4 ? '**' + b.h4 + '**\n' : '') + b.ul.map(function (x) { return '- ' + x; }).join('\n') + '\n\n';
        else o += b.p + '\n\n';
      });
    });
    if (m.used.length && P.type !== 'law') o += '## Sources\n' + m.used.map(function (r, i) { return (i + 1) + '. ' + J.refInfo(r).full; }).join('\n') + '\n\n';
    return o + '---\n_Review required. AI-assisted analysis, not legal advice. Verify all sources before relying on it._\n';
  }

  J.views.reports = {
    title: 'Reports', nav: 'documents', fixed: true, crumbs: function () { return ['Reports']; },
    render: function (r) {
      if (!D.docs.some(function(d){return !!d.content;})) return '<header class="ph"><div><div class="kicker">Export</div><h1>Reports</h1><p class="sub">Generated reports are not enabled yet.</p></div></header><div class="pad">'+J.empty({icon:'file',title:'Report generator unavailable',text:'This version does not create summaries, comparisons, or legal analysis reports.',actions:'<a class="btn btn-primary btn-sm" href="#/documents">Open documents</a>'})+'</div>';
      if (!D.docs.length) return '<header class="ph"><div><div class="kicker">Export</div><h1>Reports</h1><p class="sub">Reports are generated from real workspace documents.</p></div></header><div class="pad">'+J.empty({icon:'file',title:'No reportable documents',text:'Upload a document before generating a report.',actions:'<a class="btn btn-primary btn-sm" href="#/documents/intake">Upload document</a>'})+'</div>';
      if (r.q.type && TYPES.some(function (t) { return t[0] === r.q.type || (r.q.type === 'contra' && t[0] === 'contra'); })) P.type = r.q.type;
      if (r.q.doc && D.docById(r.q.doc)) P.doc = r.q.doc;
      if (r.q.a) P.a = r.q.a; if (r.q.b) P.b = r.q.b;
      if (P.lang == null) P.lang = J.settings.lang;
      var el = eligible(), m = build();
      return '<header class="ph"><div><div class="kicker">Export</div><h1>Report <em>preview</em></h1><p class="sub">Branded, timestamped and sourced. Every report carries its security status and a disclaimer.</p></div><div class="ph-actions"><button class="btn btn-secondary btn-sm" data-act="rp-md">' + I('download', 'ico-sm') + 'Markdown</button><button class="btn btn-secondary btn-sm" data-act="rp-listen">' + I('volume', 'ico-sm') + 'Listen</button><button class="btn btn-primary btn-sm" data-act="rp-pdf">' + I('printer', 'ico-sm') + 'Export PDF</button></div></header>' +
        '<div class="rp pad"><aside class="rp-opts"><div class="k pane-k">Report type</div><div class="rp-types">' + TYPES.map(function (t) { return '<label class="rp-t' + (P.type === t[0] ? ' on' : '') + '"><input type="radio" name="rt" value="' + t[0] + '"' + (P.type === t[0] ? ' checked' : '') + '><span><b>' + t[1] + '</b><small>' + t[2] + '</small></span></label>'; }).join('') + '</div>' +
        '<div class="k pane-k">Scope</div>' + (P.type === 'contra' ? '<div class="field"><label for="rp-a">Document A</label><select class="input in-sm" id="rp-a">' + el.map(function (x) { return '<option value="' + x.id + '"' + (x.id === P.a ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select></div><div class="field"><label for="rp-b">Document B</label><select class="input in-sm" id="rp-b">' + el.map(function (x) { return '<option value="' + x.id + '"' + (x.id === P.b ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select></div>' : '<div class="field"><label for="rp-d">Document</label><select class="input in-sm" id="rp-d">' + el.map(function (x) { return '<option value="' + x.id + '"' + (x.id === P.doc ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select></div>') +
        '<div class="field"><label for="rp-l">Language <span class="opt">Translate report</span></label><select class="input in-sm" id="rp-l">' + D.langs.map(function (l) { return '<option value="' + l.id + '"' + (l.id === P.lang ? ' selected' : '') + '>' + l.label + '</option>'; }).join('') + '</select><span class="field-hint">Quoted clauses stay in their original language.</span></div>' +
        '<div class="k pane-k">Include</div><label class="check"><input type="checkbox" id="rp-src" ' + (P.sources ? 'checked' : '') + '> Sources and citations</label><label class="check"><input type="checkbox" checked disabled> Security status and timestamp</label><label class="check"><input type="checkbox" checked disabled> Disclaimer (always included)</label>' +
        '<button class="btn btn-secondary btn-sm btn-block" data-act="rp-share">' + I('share', 'ico-sm') + 'Share report link</button></aside>' +
        '<div class="rp-stage" id="rp-stage">' + paperHTML(m) + '</div></div>';
    },
    mount: function () {
      var rerender = function () { P.id = null; J.render(true); };
      $$('input[name=rt]').forEach(function (i) { i.addEventListener('change', function () { P.type = i.value; P.id = null; J.render(true); }); });
      ['rp-d', 'rp-a', 'rp-b'].forEach(function (id) { var e = $('#' + id); if (e) e.addEventListener('change', function () { if (id === 'rp-d') P.doc = e.value; if (id === 'rp-a') P.a = e.value; if (id === 'rp-b') P.b = e.value; rerender(); }); });
      $('#rp-l').addEventListener('change', function (e) { P.lang = e.target.value; J.render(true); });
      $('#rp-src').addEventListener('change', function (e) { P.sources = e.target.checked; J.render(true); });
    }
  };
  function log(kind) { var m = build(); D.addEvent({ type: 'report', title: 'Report exported', obj: m.title + ' · ' + m.docs.map(function (x) { return x.name; }).join(' vs '), doc: m.docs[0].id, go: 'reports?type=' + P.type + '&doc=' + P.doc, who: 'You', meta: kind }); }
  A['rp-pdf'] = function () { log('PDF'); J.toast('Preparing PDF — choose “Save as PDF” in the print dialog'); setTimeout(function () { try { window.print(); } catch (e) {} }, 350); };
  A['rp-md'] = function () { var m = build(); log('Markdown'); J.download('JURISAI_' + m.title.replace(/\s+/g, '_') + '_' + m.id + '.md', md(m), 'text/markdown'); J.toast('Markdown downloaded'); };
  A['rp-listen'] = function (el) { var t = $('#rp-paper').innerText.replace(/\s+/g, ' '); J.speak(t.slice(0, 1200), 'Report', el); };
  A['rp-share'] = function () { var m = build(); J.ui.modal({ title: 'Share report', html: '<p class="muted">Anyone in your workspace with the link can open this report. Sharing is recorded in the audit log.</p><div class="field"><label for="rps">Link</label><input class="input in-sm" id="rps" readonly value="https://app.jurisai.example/r/' + m.id + '"></div>', foot: '<button class="btn btn-secondary btn-sm" data-act="modal-close">Close</button><button class="btn btn-primary btn-sm" data-act="rp-copy">' + I('copy', 'ico-sm') + 'Copy link</button>' }); };
  A['rp-copy'] = function () { try { navigator.clipboard.writeText($('#rps').value); } catch (e) {} J.ui.closeModal(); J.toast('Report link copied'); log('Shared link'); };
})();
