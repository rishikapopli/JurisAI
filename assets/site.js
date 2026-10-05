/* JURISAI — shared behaviour: icon sprite, sticky nav, reveal, scrollspy */
(function () {
  'use strict';

  /* ---- Icon sprite (one consistent 1.5px line set) ---- */
  var S = {
    'shield': '<path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z"/>',
    'shield-check': '<path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
    'lock': '<rect x="5" y="11" width="14" height="9" rx="1"/><path d="M8 11V8a4 4 0 018 0v3"/>',
    'file': '<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    'upload': '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
    'scan': '<path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M4 12h16"/>',
    'eye': '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    'eye-off': '<path d="M3 3l18 18M10.6 6.1A10 10 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3.2 4.1M6.6 6.7A17 17 0 002 12s3.5 7 10 7c1.7 0 3.2-.4 4.5-1M9.9 9.9a3 3 0 004.2 4.2"/>',
    'check': '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
    'arrow-down': '<path d="M12 5v14M6 13l6 6 6-6"/>',
    'scales': '<path d="M12 4v16M7 20h10M5 7h14"/><path d="M5 7l-3 7a3 3 0 006 0L5 7zM19 7l-3 7a3 3 0 006 0l-3-7z"/>',
    'search': '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    'link': '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
    'book': '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5z"/><path d="M4 19a2 2 0 012-2h13"/>',
    'message': '<path d="M4 5h16v11H9l-5 4V5z"/>',
    'alert': '<path d="M12 4l9 16H3L12 4z"/><path d="M12 10v4M12 17.5v.01"/>',
    'x': '<path d="M6 6l12 12M18 6L6 18"/>',
    'layers': '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
    'key': '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
    'menu': '<path d="M4 7h16M4 12h16M4 17h16"/>',
    'mail': '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 7l9 6 9-6"/>',
    'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    'building': '<path d="M4 21V4h10v17M14 9h6v12M8 8h2M8 12h2M8 16h2M2 21h20"/>',
    'compare': '<path d="M8 4H5a1 1 0 00-1 1v14a1 1 0 001 1h3M16 4h3a1 1 0 011 1v14a1 1 0 01-1 1h-3M12 3v18"/>',
    'globe': '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/>',
    'database': '<path d="M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3zM5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
    'quote': '<path d="M5 11c0-3 1.5-5 4-6M5 11h4v6H5zM14 11c0-3 1.5-5 4-6M14 11h4v6h-4z"/>',
    'user': '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    'fingerprint': '<path d="M6 11a6 6 0 0112 0c0 3 0 5-1 8M9 20c.7-2 1-4 1-7a2 2 0 014 0c0 2-.2 4-.8 6M3.5 14c.3-1 .5-2 .5-3M12 7a4 4 0 00-4 4"/>'
  };
  var sprite = '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><defs>';
  Object.keys(S).forEach(function (k) {
    sprite += '<symbol id="i-' + k + '" viewBox="0 0 24 24">' + S[k] + '</symbol>';
  });
  sprite += '</defs></svg>';
  document.body.insertAdjacentHTML('afterbegin', sprite);
  // Fill any <i data-i="name"> placeholders with an icon
  document.querySelectorAll('i[data-i]').forEach(function (el) {
    var cls = 'ico' + (el.dataset.size ? ' ico-' + el.dataset.size : '') + (el.className ? ' ' + el.className : '');
    el.outerHTML = '<svg class="' + cls + '" aria-hidden="true"><use href="#i-' + el.dataset.i + '"/></svg>';
  });

  /* ---- Sticky nav state ---- */
  var nav = document.querySelector('.nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 8); };
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
    var toggle = nav.querySelector('.nav-toggle'), menu = document.querySelector('.mobile-menu');
    if (toggle && menu) {
      toggle.addEventListener('click', function () {
        var open = menu.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open);
      });
      menu.addEventListener('click', function (e) { if (e.target.tagName === 'A') menu.classList.remove('open'); });
    }
  }

  /* ---- Reveal on scroll ---- */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }) : null;
  document.querySelectorAll('.reveal').forEach(function (el) { io ? io.observe(el) : el.classList.add('in'); });

  /* ---- Scrollspy for nav ---- */
  var links = [].slice.call(document.querySelectorAll('.nav-links a[href^="#"]'));
  if (links.length && 'IntersectionObserver' in window) {
    var map = {};
    links.forEach(function (a) { var t = document.querySelector(a.getAttribute('href')); if (t) map[t.id] = a; });
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && map[e.target.id]) {
          links.forEach(function (l) { l.classList.remove('active'); });
          map[e.target.id].classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { spy.observe(document.getElementById(id)); });
  }
})();
