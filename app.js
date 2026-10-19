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
    if (e.target.closest('[data-close]')) { e.preventDefault(); if (performance.now() - openedAt < 400) return; closeMenu(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  /* ---- Geste d'ouverture : double tap sur l'horloge ----
     iOS ne déclenche pas dblclick de façon fiable : on détecte deux "taps" (touchend / pointerup souris)
     à moins de 350 ms d'intervalle, chacun avec un mouvement < 20 px, proches l'un de l'autre. */
  var MAX_GAP = 350, MOVE_TOL = 20, NEAR = 60;
  var tapZone = document.getElementById('tap');
  var down = null, last = null, openedAt = 0;

  function tapDown(x, y) { down = { x: x, y: y }; }
  function tapUp(x, y, ev) {
    if (!down || isOpen) { down = null; return; }
    var moved = Math.hypot(x - down.x, y - down.y); down = null;
    if (moved > MOVE_TOL) { last = null; return; }
    var now = performance.now();
    if (last && now - last.t <= MAX_GAP && Math.hypot(x - last.x, y - last.y) <= NEAR) {
      last = null;
      if (ev && ev.cancelable) ev.preventDefault();   // pas de clic synthétique sur le fond du menu
      openedAt = now; openMenu();
    } else {
      last = { x: x, y: y, t: now };               // 1er tap : ne fait rien
    }
  }
  tapZone.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { down = null; last = null; return; }
    var t = e.touches[0]; tapDown(t.clientX, t.clientY);
  }, { passive: true });
  tapZone.addEventListener('touchmove', function (e) {
    if (!down) return; var t = e.touches[0];
    if (Math.hypot(t.clientX - down.x, t.clientY - down.y) > MOVE_TOL) { down = null; last = null; }
  }, { passive: true });
  tapZone.addEventListener('touchend', function (e) {
    var t = e.changedTouches[0]; tapUp(t.clientX, t.clientY, e);
  }, { passive: false });
  tapZone.addEventListener('touchcancel', function () { down = null; last = null; });
  // Souris / stylet (ordinateur) : les pointeurs tactiles sont déjà gérés par touch*
  tapZone.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'touch') tapDown(e.clientX, e.clientY); });
  tapZone.addEventListener('pointerup', function (e) { if (e.pointerType !== 'touch') tapUp(e.clientX, e.clientY, null); });
  tapZone.addEventListener('dblclick', function (e) { e.preventDefault(); });

  // Bloque tout rebond de la page en dehors du menu
  document.addEventListener('touchmove', function (e) { if (!isOpen) e.preventDefault(); }, { passive: false });

  /* ---- Fermeture par glissé vers le bas sur la feuille ---- */
  var grip = menu.querySelector('.grip');
  var s = null;
  grip.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    s = { y: e.touches[0].clientY, t: performance.now(), dy: 0 };
  }, { passive: true });
  grip.addEventListener('touchmove', function (e) {
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
  grip.addEventListener('touchend', sheetEnd);
  grip.addEventListener('touchcancel', sheetEnd);

  /* Volontairement AUCUN service worker : voir README. On désinscrit toute ancienne
     registration racine éventuelle (scope exactement "/") sans toucher aux sous-apps. */
  if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (r) { if (new URL(r.scope).pathname === '/') r.unregister(); });
    }).catch(function () {});
  }
})();
