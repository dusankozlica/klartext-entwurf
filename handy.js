/* Das Handy im Kopfbereich: drei Aufnahmen, die sich abloesen.
   Bewusst ohne requestAnimationFrame — in eingebetteten Vorschauen
   steht der Bildtakt still, ein Zeitgeber laeuft weiter. */
(function () {
  const h = document.querySelector('.handy');
  if (!h) return;

  const filme = [].slice.call(h.querySelectorAll('.handy__film'));
  const text  = h.querySelector('.ig__text');
  if (filme.length < 2) return;

  const ruhe = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  let i = 0, uhr = null, sichtbar = true;

  function spiele(v) {
    if (ruhe) return;
    const p = v.play();
    if (p && p.catch) p.catch(function () {});   /* Autostart abgelehnt: Poster bleibt */
  }

  function zeige(n) {
    filme.forEach(function (v, k) {
      const an = k === n;
      v.classList.toggle('ist', an);
      if (an) { if (v.preload === 'none') v.preload = 'metadata'; spiele(v); }
      else v.pause();
    });
    const t = filme[n].dataset.text;
    if (t && text) text.textContent = t;
  }

  function weiter() { i = (i + 1) % filme.length; zeige(i); }

  function start() {
    if (uhr || ruhe) return;
    uhr = setInterval(weiter, 9000);
    spiele(filme[i]);
  }
  function halt() {
    if (uhr) { clearInterval(uhr); uhr = null; }
    filme.forEach(function (v) { v.pause(); });
  }

  /* Nur laufen lassen, solange das Geraet im Bild ist. */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      sichtbar = e[0].isIntersecting;
      sichtbar ? start() : halt();
    }, { threshold: .2 }).observe(h);
  } else {
    start();
  }

  zeige(0);
})();
