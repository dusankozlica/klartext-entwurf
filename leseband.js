/* ── Leseband ────────────────────────────────────────────────────
   Die Blogreihe auf der Startseite laeuft waagerecht aus dem Bild.
   Drei Dinge muss die Datei erledigen:

   1 · Wischen mit dem Trackpad. Lenis haengt am window und ruft bei
       JEDEM Wheel-Ereignis preventDefault — damit waere waagerechtes
       Wischen ueber dem Band tot. Ereignisse laufen vom Ziel nach
       oben, unser Hoerer sitzt am Band und kommt also VOR Lenis dran:
       ist die Bewegung waagerecht, halten wir sie hier an, dann
       scrollt der Browser das Band ganz von selbst. Ist sie
       senkrecht, lassen wir sie durch und die Seite scrollt weiter.

   2 · Ziehen mit der Maus. Ohne Trackpad gaebe es sonst keinen Weg,
       weil die Rollleiste ausgeblendet ist. Nach einem Zug wird der
       naechste Klick geschluckt, sonst oeffnet das Loslassen den
       Artikel unter dem Finger.

   3 · Der Strich darunter zeigt, wie weit die Reihe reicht.
   ──────────────────────────────────────────────────────────────── */
(function leseband() {
  const spur = document.getElementById('leseband');
  if (!spur) return;
  const band = spur.closest('.leseband');
  const leiste = band && band.querySelector('.leseband__leiste');
  const lauf = leiste && leiste.querySelector('.leseband__lauf');

  /* ── 1 · Waagerechtes Wischen an Lenis vorbei ── */
  spur.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) e.stopPropagation();
  }, { passive: true });

  /* ── 3 · Strich ── */
  const zeichne = () => {
    if (!leiste || !lauf) return;
    const weite = spur.scrollWidth - spur.clientWidth;
    if (weite < 4) { leiste.style.display = 'none'; return; }
    leiste.style.display = '';
    const voll = leiste.clientWidth;
    const breit = Math.max(48, voll * (spur.clientWidth / spur.scrollWidth));
    lauf.style.setProperty('--breit', breit + 'px');
    lauf.style.setProperty('--weg', (spur.scrollLeft / weite) * (voll - breit) + 'px');
  };
  spur.addEventListener('scroll', zeichne, { passive: true });
  addEventListener('resize', zeichne);
  zeichne();
  /* Die Bilder tragen loading="lazy" — die Breite steht erst, wenn
     sie da sind. Einmal nachrechnen, wenn die Seite fertig ist. */
  addEventListener('load', zeichne);

  /* ── 2 · Ziehen ── */
  let zeiger = null, startX = 0, startLinks = 0, weg = 0;

  spur.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.pointerType === 'touch') return;  // Touch kann der Browser selbst
    zeiger = e.pointerId; startX = e.clientX; startLinks = spur.scrollLeft; weg = 0;
    spur.setPointerCapture(zeiger);
    spur.classList.add('zieht');
  });

  spur.addEventListener('pointermove', (e) => {
    if (e.pointerId !== zeiger) return;
    const d = e.clientX - startX;
    if (Math.abs(d) > weg) weg = Math.abs(d);
    spur.scrollLeft = startLinks - d;
  });

  const loslassen = (e) => {
    if (e.pointerId !== zeiger) return;
    spur.releasePointerCapture(zeiger);
    zeiger = null;
    spur.classList.remove('zieht');
  };
  spur.addEventListener('pointerup', loslassen);
  spur.addEventListener('pointercancel', loslassen);

  /* Sechs Pixel Toleranz: darunter war es ein Klick, darueber ein Zug. */
  spur.addEventListener('click', (e) => {
    if (weg > 6) { e.preventDefault(); e.stopPropagation(); }
    weg = 0;
  }, true);

  spur.addEventListener('dragstart', (e) => e.preventDefault());
})();
