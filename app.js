(function () {
  'use strict';

  /* ---- Horloge neutre ---- */
  var clock = document.getElementById('clock'), dateEl = document.getElementById('date');
  var fmtT = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
  var fmtD = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  function tick() { var n = new Date(); clock.textContent = fmtT.format(n); var d = fmtD.format(n); dateEl.textContent = d.charAt(0).toUpperCase() + d.slice(1); }
  tick(); setInterval(tick, 1000);

  /* ---- Menu caché ---- */
  var menu = document.getElementById('menu'), sheet = menu.querySelector('.sheet');
  var isOpen = false;
  function openMenu() {
    if (isOpen) return; isOpen = true;
    menu.hidden = false;
    void menu.offsetWidth;            // force reflow pour l'animation
    menu.classList.add('open');
    if (navigator.vibrate) { try { navigator.vibrate(10); } catch (e) {} }
  }
  function closeMenu() {
    if (!isOpen) return; isOpen = false;
    menu.classList.remove('open');
    sheet.style.transform = '';
    setTimeout(function () { if (!isOpen) menu.hidden = true; }, 330);
  }
  window.__menu = { open: openMenu, close: closeMenu, isOpen: function () { return isOpen; } };

  menu.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) { e.preventDefault(); closeMenu(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  /* ---- Geste d'ouverture : glissé diagonal depuis le coin haut-droit vers le bas-gauche ---- */
  var MIN_DIST = 100, MAX_MS = 600, MIN_AXIS = 35; // chaque axe doit bouger d'au moins 35px (diagonale)
  var hz = document.getElementById('hz');
  var g = null;

  function start(x, y, id) { g = { x: x, y: y, t: performance.now(), id: id }; }
  function end(x, y) {
    if (!g) return;
    var dx = x - g.x, dy = y - g.y, dt = performance.now() - g.t;
    g = null;
    if (dt <= MAX_MS && dx <= -MIN_AXIS && dy >= MIN_AXIS && Math.hypot(dx, dy) >= MIN_DIST) openMenu();
  }
  function findTouch(list, id) { for (var i = 0; i < list.length; i++) if (list[i].identifier === id) return list[i]; return null; }

  hz.addEventListener('touchstart', function (e) {
    if (isOpen || e.touches.length !== 1) { g = null; return; }
    e.preventDefault();               // pas de clic fantôme, pas de loupe, pas de défilement
    var t = e.changedTouches[0]; start(t.clientX, t.clientY, t.identifier);
  }, { passive: false });
  hz.addEventListener('touchmove', function (e) {
    e.preventDefault();               // bloque défilement / rebond pendant le geste
    if (g && e.touches.length > 1) g = null;
  }, { passive: false });
  hz.addEventListener('touchend', function (e) {
    if (!g) return;
    e.preventDefault();
    var t = findTouch(e.changedTouches, g.id); if (t) end(t.clientX, t.clientY); else g = null;
  }, { passive: false });
  hz.addEventListener('touchcancel', function () { g = null; });

  // Repli souris (ordinateur) – même geste au glisser-déposer
  hz.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse' && !isOpen) { start(e.clientX, e.clientY, 'm'); hz.setPointerCapture(e.pointerId); } });
  hz.addEventListener('pointerup', function (e) { if (e.pointerType === 'mouse' && g && g.id === 'm') end(e.clientX, e.clientY); });

  // Bloque tout rebond de la page en dehors du menu
  document.addEventListener('touchmove', function (e) { if (!isOpen) e.preventDefault(); }, { passive: false });

  /* ---- Fermeture par glissé vers le bas sur la feuille ---- */
  var s = null;
  sheet.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    s = { y: e.touches[0].clientY, t: performance.now(), dy: 0 };
  }, { passive: true });
  sheet.addEventListener('touchmove', function (e) {
    if (!s) return;
    e.preventDefault();
    s.dy = Math.max(0, e.touches[0].clientY - s.y);
    if (s.dy > 4) { sheet.classList.add('drag'); sheet.style.transform = 'translateY(' + s.dy + 'px)'; }
  }, { passive: false });
  function sheetEnd() {
    if (!s) return;
    var dy = s.dy, v = dy / Math.max(1, performance.now() - s.t);
    s = null; sheet.classList.remove('drag');
    if (dy > 80 || (dy > 30 && v > 0.5)) closeMenu(); else sheet.style.transform = '';
  }
  sheet.addEventListener('touchend', sheetEnd);
  sheet.addEventListener('touchcancel', sheetEnd);

  /* Volontairement AUCUN service worker : voir README. On désinscrit toute ancienne
     registration racine éventuelle (scope exactement "/") sans toucher aux sous-apps. */
  if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (r) { if (new URL(r.scope).pathname === '/') r.unregister(); });
    }).catch(function () {});
  }
})();
