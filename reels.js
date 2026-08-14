/* Reels auf den Projektseiten: laden und laufen erst, wenn sie im Bild
   sind. Vier Filme gleichzeitig zu starten kostet Rechenzeit und
   Datenvolumen fuer nichts — die meisten sieht man nie. */
(function () {
  const filme = [].slice.call(document.querySelectorAll('.reel video'));
  if (!filme.length) return;
  const sanft = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  if (!('IntersectionObserver' in window)) return;

  const auge = new IntersectionObserver(function (eintraege) {
    eintraege.forEach(function (e) {
      const v = e.target;
      if (e.isIntersecting) {
        if (v.preload === 'none') v.preload = 'auto';
        if (!sanft) { const p = v.play(); if (p && p.catch) p.catch(function () {}); }
      } else {
        v.pause();
      }
    });
  }, { threshold: .25 });

  filme.forEach(function (v) { auge.observe(v); });
})();
