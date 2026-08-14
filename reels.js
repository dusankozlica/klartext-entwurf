/* Reels auf den Projektseiten.
   Zwei Aufgaben: laden und laufen erst im Bild — und Ton auf Zuruf.
   Ohne Klick spielt kein Browser Ton ab; der Klick ist die Erlaubnis. */
(function () {
  const reels = [].slice.call(document.querySelectorAll('.reel'));
  if (!reels.length) return;
  const sanft = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  function stumm(r) {
    const v = r.querySelector('video');
    v.muted = true;
    r.classList.remove('tont');
    const k = r.querySelector('.reel__ton');
    if (k) k.setAttribute('aria-label', 'Ton einschalten');
  }

  function laut(r) {
    /* Immer nur einer: zwei Tonspuren gleichzeitig sind unbrauchbar. */
    reels.forEach(function (a) { if (a !== r) stumm(a); });
    const v = r.querySelector('video');
    v.muted = false;
    v.volume = 1;
    const p = v.play();
    if (p && p.catch) p.catch(function () {});
    r.classList.add('tont');
    const k = r.querySelector('.reel__ton');
    if (k) k.setAttribute('aria-label', 'Ton ausschalten');
  }

  reels.forEach(function (r) {
    const v = r.querySelector('video');
    const k = r.querySelector('.reel__ton');
    const um = function (e) {
      e.preventDefault();
      v.muted ? laut(r) : stumm(r);
    };
    if (k) k.addEventListener('click', um);
    v.addEventListener('click', um);
  });

  if (!('IntersectionObserver' in window)) return;
  const auge = new IntersectionObserver(function (e) {
    e.forEach(function (x) {
      const r = x.target, v = r.querySelector('video');
      if (x.isIntersecting) {
        if (v.preload === 'none') v.preload = 'auto';
        if (!sanft) { const p = v.play(); if (p && p.catch) p.catch(function () {}); }
      } else {
        v.pause();
        /* Aus dem Bild heisst auch: Ton aus. Sonst redet eine Seite
           weiter, die man laengst verlassen hat. */
        if (!v.muted) stumm(r);
      }
    });
  }, { threshold: .25 });
  reels.forEach(function (r) { auge.observe(r); });
})();
