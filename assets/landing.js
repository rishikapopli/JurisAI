/* JURISAI — landing interactions (all motion is slow and restrained) */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Hero: scale the document-intelligence visual to its column ---------- */
  (function () {
    var box = $('#heroVis'); if (!box) return;
    function fit() {
      var colW = box.clientWidth;
      var availH = window.innerHeight - 72 - (window.innerHeight <= 820 ? 36 : 70); /* nav + hero padding */
      var k = Math.min(colW / 600, availH / 668, 1.12);
      if (window.innerWidth <= 1080) k = Math.min(colW / 600, 1);
      box.style.setProperty('--k', Math.max(k, .5).toFixed(3));
    }
    fit(); window.addEventListener('resize', fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  })();

  /* ---------- Hero: verification pipeline ---------- */
  (function () {
    var rail = $('.rail'); if (!rail) return;
    var steps = $$('.step', rail), hl = $('.rail-hl', rail), i = -1, timer;
    function place(el) {
      hl.style.height = el.offsetHeight + 'px';
      hl.style.setProperty('--hl-h', el.offsetHeight + 'px');
      hl.style.transform = 'translateY(' + el.offsetTop + 'px)';
    }
    function tick() {
      if (i >= 0 && steps[i]) { steps[i].classList.remove('active'); steps[i].classList.add('done'); }
      i++;
      if (i >= steps.length) { // hold the finished state, then restart
        hl.style.opacity = '0';
        timer = setTimeout(function () {
          steps.forEach(function (s) { s.classList.remove('done', 'active'); });
          i = -1; hl.style.opacity = '1'; tick();
        }, 3200);
        return;
      }
      steps[i].classList.add('active'); place(steps[i]);
      timer = setTimeout(tick, 1500);
    }
    if (reduce) { steps.forEach(function (s) { s.classList.add('done'); }); hl.style.display = 'none'; return; }
    hl.style.transition = 'none'; place(steps[0]); hl.offsetHeight; hl.style.transition = '';
    setTimeout(tick, 700);
    window.addEventListener('resize', function () { if (steps[i]) place(steps[i]); });
  })();

  /* ---------- Security gateway ---------- */
  (function () {
    var root = $('#gateway'); if (!root) return;
    var tabs = $$('.gw-step', root), panels = $$('.gw-panel', root), prog = $('#gw-prog'), title = $('#gw-title');
    var idx = 0, timer, auto = true, visible = false, DUR = 5600;
    root.style.setProperty('--gw-t', DUR + 'ms');
    function show(n) {
      idx = (n + tabs.length) % tabs.length;
      tabs.forEach(function (t, k) { t.classList.toggle('on', k === idx); t.classList.toggle('past', k < idx); t.setAttribute('aria-selected', k === idx); });
      panels.forEach(function (p, k) {
        var on = k === idx;
        if (on && !p.classList.contains('on')) { p.classList.remove('on'); void p.offsetWidth; }
        p.classList.toggle('on', on);
      });
      title.textContent = 'STAGE 0' + (idx + 1);
      prog.classList.remove('run'); void prog.offsetWidth;
      if (auto && !reduce) prog.classList.add('run'); else prog.style.width = '100%';
    }
    function schedule() {
      clearTimeout(timer);
      if (!auto || reduce || !visible) return;
      timer = setTimeout(function () { show(idx + 1); schedule(); }, DUR);
    }
    tabs.forEach(function (t, k) {
      t.addEventListener('click', function () { auto = false; clearTimeout(timer); prog.classList.remove('run'); show(k); });
    });
    show(0);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible && auto) { show(idx); schedule(); } else clearTimeout(timer);
      }, { threshold: 0.35 }).observe(root);
    } else { visible = true; schedule(); }
  })();

  /* ---------- Clause anatomy: linked highlighting ---------- */
  (function () {
    var marks = $$('.clause mark'), terms = $$('.terms > div');
    function set(t, on) {
      marks.forEach(function (m) { if (m.dataset.t === t) m.classList.toggle('hl', on); });
      terms.forEach(function (d) { if (d.dataset.t === t) d.classList.toggle('hl', on); });
    }
    marks.concat(terms).forEach(function (el) {
      el.addEventListener('mouseenter', function () { set(el.dataset.t, true); });
      el.addEventListener('mouseleave', function () { set(el.dataset.t, false); });
    });
    // suggested questions jump to the Ask section
    $$('.qs button').forEach(function (b) { b.addEventListener('click', function () { var a = $('#ask'); if (a) a.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }); });
  })();

  /* ---------- Jurisdiction-aware law matching ---------- */
  (function () {
    var chain = $('#chain'); if (!chain) return;
    var D = {
      uk: {
        clause: '“Either party may terminate this Agreement upon thirty (30) days’ written notice.”', ref: 'Employment_Contract.pdf · §11.2',
        concept: 'Statutory minimum notice', juris: 'United Kingdom', sys: 'England & Wales · Statute',
        source: 'Employment Rights Act 1996, s.86', cite: 'legislation.gov.uk',
        expl: 'An employer must give at least one week’s notice for each full year of continuous service (once past one month), up to twelve weeks. A contract may give more, but not less than this minimum.'
      },
      'in': {
        clause: '“Either party may terminate this Agreement upon thirty (30) days’ written notice.”', ref: 'Employment_Contract.pdf · §11.2',
        concept: 'Retrenchment notice conditions', juris: 'India', sys: 'Union law · Statute',
        source: 'Industrial Disputes Act, 1947, s.25F', cite: 'indiacode.nic.in',
        expl: 'For a “workman” in a covered establishment, retrenchment requires one month’s written notice (or pay in lieu) and compensation. Whether it applies depends on the role and employer — state Shops & Establishments law may also apply.'
      },
      us: {
        clause: '“Either party may terminate this Agreement upon thirty (30) days’ written notice.”', ref: 'Employment_Contract.pdf · §11.2',
        concept: 'At-will employment and advance notice', juris: 'United States', sys: 'Federal · Statute',
        source: 'WARN Act, 29 U.S.C. §§ 2101–2109', cite: 'law.cornell.edu',
        expl: 'Most US employment is at-will, so contractual notice terms carry more weight. Federal law requires 60 days’ notice for qualifying mass layoffs and plant closings by covered employers; state law may add further rules.'
      }
    };
    function fill(k) {
      var d = D[k];
      $$('[data-f]', chain).forEach(function (el) { el.textContent = d[el.dataset.f]; });
    }
    fill('uk');
    $$('.seg button').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.classList.contains('on')) return;
        $$('.seg button').forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
        chain.classList.add('swap');
        setTimeout(function () { fill(b.dataset.j); chain.classList.remove('swap'); }, reduce ? 0 : 260);
      });
    });
  })();

  /* ---------- Ask: citations reveal their source ---------- */
  (function () {
    var cites = $$('.cite'); if (!cites.length) return;
    var S = {
      1: { kind: 'Document', title: 'Employment_Contract.pdf', loc: '§11.2 · p.4', q: '“Either party may terminate this Agreement upon thirty (30) days’ written notice, provided that the Company may, at its sole discretion, elect to pay salary in lieu of notice…”', note: 'Supports: 30 days’ written notice; payment instead of working the period is at the company’s option.' },
      2: { kind: 'Document', title: 'Employment_Contract.pdf', loc: '§9 · p.3', q: '“…the Employee shall not disclose Confidential Information or solicit the Company’s clients, during employment or after it ends.”', note: 'Supports: confidentiality and non-solicitation obligations that continue after termination. (Illustrative passage.)' },
      3: { kind: 'Document', title: 'Company_Policy.pdf', loc: '§4.3 · p.12', q: '“Employees must be given sixty (60) days’ notice prior to termination of employment.”', note: 'Conflicts with Employment Contract §11.2 — flagged for review.' },
      4: { kind: 'Legal source', title: 'Employment Rights Act 1996, s.86', loc: 'United Kingdom · Statute', q: 'Minimum notice: one week for each full year of continuous employment (once past one month), up to twelve weeks.', note: 'JURISAI summary of the statute. Verify against the current text before relying on it.' }
    };
    var el = { kind: $('#src-kind'), title: $('#src-title'), loc: $('#src-loc'), q: $('#src-quote'), note: $('#src-note') };
    function show(n) {
      var s = S[n]; if (!s) return;
      cites.forEach(function (c) { c.classList.toggle('on', c.dataset.s === String(n)); });
      el.q.style.opacity = 0;
      setTimeout(function () {
        el.kind.textContent = s.kind; el.title.textContent = s.title; el.loc.textContent = s.loc; el.q.textContent = s.q; el.note.textContent = s.note; el.q.style.opacity = 1;
      }, reduce ? 0 : 140);
    }
    cites.forEach(function (c) {
      c.addEventListener('click', function () { show(c.dataset.s); });
      c.addEventListener('mouseenter', function () { show(c.dataset.s); });
      c.addEventListener('focus', function () { show(c.dataset.s); });
    });
    show(1);
  })();
})();
