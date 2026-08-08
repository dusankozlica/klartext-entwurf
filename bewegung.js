/* ═══════════════════════════════════════════════════════════════
   KLARTEXT. — Bewegung
   Alle Werte stammen aus den Messungen an rama.framer.media und
   shinta.framer.media (beide VeloxThemes, gleiche Bewegungs-DNA):
     · Scroll   Lenis lerp 0.1 → t50 196 / t90 479 / t98 728 ms
     · HOVER    cubic-bezier(.44, 0, .56, 1)
                Farbe .4s · Fläche .3s · Bild .6s · Bedienung .46s
     · REVEAL   ease-out, opacity 0→1 · Skala 0.9→1 · y 20px→0
                t98 ≈ 610 ms, keine Staffelung innerhalb eines Blocks
     · Morph    Karten driften mit eigenem Faktor UND wachsen
   ═══════════════════════════════════════════════════════════════ */

gsap.registerPlugin(ScrollTrigger);

/* Kubische Bézier als GSAP-Ease (Newton, wie im Browser) */
function bezier(x1, y1, x2, y2) {
  const A = (a, b) => 1 - 3 * b + 3 * a;
  const B = (a, b) => 3 * b - 6 * a;
  const C = (a) => 3 * a;
  const calc = (t, a, b) => ((A(a, b) * t + B(a, b)) * t + C(a)) * t;
  const slope = (t, a, b) => 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a);
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const s = slope(t, x1, x2);
      if (s === 0) break;
      t -= (calc(t, x1, x2) - x) / s;
    }
    return calc(t, y1, y2);
  };
}
const KURVE = bezier(0.44, 0, 0.56, 1);             // Interaktion
const KURVE_REIN = bezier(0.23, 0.52, 0.42, 0.97);  // Einblendung

const T_FARBE = 0.4, T_FLAECHE = 0.3, T_BILD = 0.6;
const T_REIN = 0.74, WEG_REIN = 20, SKALA_REIN = 0.9;

/* ── Sanftes Scrollen ───────────────────────────────────────── */
const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, syncTouch: false });
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
lenis.on('scroll', ScrollTrigger.update);

/* Ankerlinks über Lenis führen, sonst springt es hart */
document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach((a) => {
  a.addEventListener('click', (e) => {
    const ziel = document.querySelector(a.getAttribute('href'));
    if (!ziel) return;
    e.preventDefault();
    lenis.scrollTo(ziel, { offset: -110 });
  });
});

/* ── Angeklickte Zeile unter dem Zeiger festhalten ──────────────
   Im Akkordeon bleibt immer nur eine Zeile offen. Klickt man eine
   Zeile an, während OBERHALB davon noch eine offen ist, schrumpft
   der Bereich darüber — die geklickte Zeile rutscht um die volle
   Panelhöhe nach oben und ihr Inhalt erscheint dort, wo vorher der
   alte war. Das liest sich, als ginge das Panel nach OBEN auf statt
   nach unten.

   Chrome hat dafür eine eingebaute Korrektur (Scroll-Anchoring),
   die hier aber nichts nützt: Lenis schreibt seinen eigenen Scroll-
   wert in jedem Bild zurück und macht die Korrektur sofort wieder
   zunichte. Deshalb halten wir die Zeile selbst fest — und zwar
   ÜBER Lenis, sonst wird auch unsere Korrektur überschrieben. */
function zeileHalten(el, dauerMs) {
  const ziel = el.getBoundingClientRect().top;
  const ende = performance.now() + dauerMs;
  const halten = (jetzt) => {
    const versatz = el.getBoundingClientRect().top - ziel;
    /* Unter einem halben Pixel lohnt die Korrektur nicht — sie würde
       nur unnötig gegen Lenis' eigene Bewegung arbeiten. */
    if (Math.abs(versatz) > 0.5) {
      lenis.scrollTo(lenis.animatedScroll + versatz, { immediate: true });
    }
    if (jetzt < ende) requestAnimationFrame(halten);
  };
  requestAnimationFrame(halten);
}

/* ── Knopf-Punkte einsetzen ─────────────────────────────────────
   Drei Punkte je Knopf, per Skript ergänzt — so bleibt das HTML
   sauber und jeder neue Knopf bekommt die Füllung automatisch. */
(function knopfPunkte() {
  document.querySelectorAll('.knopf').forEach((k) => {
    if (k.querySelector('.knopf__punkt')) return;
    /* Nackten Text erst einpacken. `.knopf > *` hebt nur ELEMENTE über
       die Füllung — ein blosser Textknoten bleibt darunter und wird
       von den Punkten zugedeckt. Genau das hat die Schrift auf zwei
       Knöpfen unsichtbar gemacht (Dropdown-Karte, Leistungen). */
    if ([...k.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) {
      const t = document.createElement('span');
      while (k.firstChild) t.appendChild(k.firstChild);
      k.appendChild(t);
    }
    for (let i = 0; i < 3; i++) {
      const s = document.createElement('span');
      s.className = 'knopf__punkt';
      s.setAttribute('aria-hidden', 'true');
      k.insertBefore(s, k.firstChild);
    }
  });
})();

/* ── Einblendung ────────────────────────────────────────────── */
(function reveals() {
  const rein = (ziele, ausloeser, verzug = 0) => {
    gsap.fromTo(ziele,
      { y: WEG_REIN, scale: SKALA_REIN, opacity: 0 },
      {
        y: 0, scale: 1, opacity: 1, duration: T_REIN, ease: KURVE_REIN, delay: verzug,
        clearProps: 'transform,opacity',
        scrollTrigger: { trigger: ausloeser, start: 'top 92%' },
      });
  };
  document.querySelectorAll('[data-rein]').forEach((el) => rein(el, el));
  document.querySelectorAll('[data-rein-zeilen]').forEach((block) => {
    const zeilen = [...block.children];
    zeilen.forEach((z) => (z.style.display = 'block'));
    rein(zeilen, block);            // ein Auslöser, keine Staffel
  });
})();

/* ── Handschrift: Schreib-Reveal und Drift ──────────────────────
   Die Brush-Akzente sind die zweite Stimme der Seite und standen
   bisher stumm da. Zwei Bewegungen, bewusst auf ZWEI Knoten verteilt,
   damit sich die Transformationen nicht gegenseitig überschreiben:
     · innen  Schreib-Reveal — das Wort wird von links nach rechts
              freigelegt, als würde es geschrieben (clip-path, .85 s)
     · aussen Drift mit dem Scroll, jede Zeile mit eigenem Ausschlag —
              dasselbe Muster wie beim Team-Morph. Driften alle gleich
              weit, wirkt es wie eine Tabelle, nicht wie Handschrift.
   Am Ende räumt GSAP den clip-path wieder weg: im Ruhezustand darf
   nichts beschnitten sein, sonst rasiert die Maske Unterlängen ab. */
(function handschrift() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const einwickeln = (el) => {
    const da = el.querySelector('.brush__t');
    if (da) return da;
    const t = document.createElement('span');
    t.className = 'brush__t';
    while (el.firstChild) t.appendChild(el.firstChild);
    el.appendChild(t);
    return t;
  };

  const schreiben = (el, verzug = 0) => {
    /* ZENTRIERTE Zeilen von der Mitte nach aussen freilegen. Ein
       Wischer von links legt bei zentriertem Text erst die linke
       Hälfte frei — die Zeile steht dann die ganze Animation lang
       sichtbar schief neben der Mitte und rutscht erst im letzten
       Bild hinein. Bei linksbündigen Zeilen ist der Wischer richtig,
       da wächst der Text aus seiner eigenen Kante. */
    const mittig = getComputedStyle(el).textAlign === 'center';
    gsap.fromTo(einwickeln(el),
      { clipPath: mittig ? 'inset(0% 50% 0% 50%)' : 'inset(0% 100% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.85, ease: KURVE_REIN,
        delay: verzug, clearProps: 'clipPath',
        scrollTrigger: { trigger: el, start: 'top 90%' } });
  };

  /* Dauerbewegung. Auf rama.framer.media — von dort stammt unser Rock
     Salt — hat die Graffiti-Schrift KEINE eigene Dauerbewegung, sie
     hängt nur am Scroll. Dusan will sie durchgehend leicht in Bewegung,
     also bauen wir es: winzige Ausschläge (2–3 px) über mehrere
     Sekunden, jedes Wort mit eigenem Takt und eigenem Start. Laufen
     alle gleich, wirkt es wie Wackeln statt wie Leben.
     Sitzt auf dem INNEREN Träger — die Scroll-Drift sitzt aussen,
     sonst überschreiben sich die beiden Transformationen. */
  const leben = (el, i) => {
    const t = einwickeln(el);
    gsap.fromTo(t, { y: -2.5 },
      { y: 2.5, duration: 3.4 + (i % 3) * 0.9, ease: 'sine.inOut',
        repeat: -1, yoyo: true, delay: i * 0.4 });
    gsap.fromTo(t, { x: -1.6 },
      { x: 1.6, duration: 4.7 + (i % 4) * 0.8, ease: 'sine.inOut',
        repeat: -1, yoyo: true, delay: i * 0.55 });
  };

  const driften = (el, von, bis, wo) => {
    gsap.fromTo(el, { y: von },
      { y: bis, ease: 'none',
        scrollTrigger: wo || { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
  };

  /* Die Zeile im Dropdown bleibt aussen vor: sie sitzt in der festen
     Kopfleiste, scrollt also nie — eine Scroll-Bindung würde dort auf
     einem willkürlichen Zwischenwert hängen bleiben. */
  [...document.querySelectorAll('p.brush')]
    .filter((el) => !el.closest('.nav'))
    .forEach((el, i) => {
      schreiben(el);
      leben(el, i);
      const w = i % 2 ? 11 : 17;
      driften(el, w, -w);
    });

  /* Das Wort in der Bühnenüberschrift steht schon beim Laden da — es
     wird erst geschrieben, wenn seine Zeile eingeblendet ist. Seine
     Drift hängt an der Bühne und startet bei null, sonst sässe es
     beim Laden schon verschoben in der Überschrift. */
  const heroWort = document.querySelector('h1 .brush');
  if (heroWort) {
    schreiben(heroWort, 0.4);
    leben(heroWort, 2);
    driften(heroWort, 0, -18,
      { trigger: '.buehne', start: 'top top', end: 'bottom top', scrub: 0.6 });
  }
})();

/* ── Leistungs-Dropdown ─────────────────────────────────────────
   Mechanik 1:1 aus der ersten KLARTEXT-Seite. Die drei Punkte, die
   damals das Problem waren und hier bewusst wieder drin sind:
     1. Öffnen NUR über den Auslöser, und erst nach 70 ms Verweilen —
        blosses Vorbeistreifen auf dem Weg zum CTA öffnet nichts.
        Waren 130 ms; zusammen mit der Aufklapp-Dauer fühlte sich das
        mit 268 ms bis zur Sichtbarkeit deutlich zu träge an.
     2. Schliessen mit 180 ms Nachlauf, damit man in Ruhe ins Panel
        fahren kann.
     3. Das Panel hält ein OFFENES Panel am Leben, löst aber nie
        selbst das Öffnen aus — und hat ohne .ist keine Zeigerfläche.
   Dazu: Escape schliesst, Fokus öffnet, Fokus nach draussen schliesst. */
(function dropdown() {
  const wurzel = document.querySelector('.ndd');
  if (!wurzel) return;
  const ausloeser = wurzel.querySelector('.ndd__ausloeser');
  const panel = document.querySelector('.ndd__panel');
  const zeilen = [...document.querySelectorAll('.ndd__liste a')];
  const bilder = [...document.querySelectorAll('.ndd__bild img')];
  const saetze = [...document.querySelectorAll('.ndd__satz')];
  const fuss = document.querySelector('.ndd__fuss');
  const leiste = document.querySelector('.nav');
  if (!panel || !leiste) return;

  let aufTimer = null, zuTimer = null, offen = false;
  const aufAb = () => { if (aufTimer) { clearTimeout(aufTimer); aufTimer = null; } };
  const zuAb = () => { if (zuTimer) { clearTimeout(zuTimer); zuTimer = null; } };

  // Ursprung der Aufklapp-Bewegung auf die Mitte des Auslösers legen:
  // das Panel läuft über die ganze Leiste, soll aber sichtbar AUS DEM
  // WORT kommen. Ohne das hovert man rechts und links geht etwas auf.
  const ursprungSetzen = () => {
    // Bezug ist die PILLE, nicht das Panel: das Panel ist im
    // geschlossenen Zustand auf 0.97 verkleinert, sein Rechteck sitzt
    // dadurch 20 px zu weit innen und der Ursprung wandert mit.
    const bezug = document.querySelector('.nav__pille');
    const a = ausloeser.getBoundingClientRect();
    const p = bezug.getBoundingClientRect();
    panel.style.setProperty('--ndd-x', Math.round(a.left - p.left + a.width / 2) + 'px');
  };

  const setze = (auf) => {
    if (auf === offen) return;
    offen = auf;
    if (auf) ursprungSetzen();
    wurzel.classList.toggle('ist', auf);
    leiste.classList.toggle('auf', auf);
    panel.setAttribute('aria-hidden', String(!auf));
    ausloeser.setAttribute('aria-expanded', String(auf));
    [...zeilen, fuss].forEach((el) => el && el.setAttribute('tabindex', auf ? '0' : '-1'));
  };

  ausloeser.addEventListener('pointerenter', () => {
    zuAb();
    if (offen) return;
    aufAb();
    aufTimer = setTimeout(() => setze(true), 70);    // Verweilzeit
  });
  ausloeser.addEventListener('pointerleave', () => { aufAb(); baldZu(); });
  function baldZu() { zuAb(); zuTimer = setTimeout(() => setze(false), 180); }

  // Das Panel darf nur HALTEN, nie öffnen
  panel.addEventListener('pointerenter', () => { if (offen) zuAb(); });
  panel.addEventListener('pointerleave', () => { if (offen) baldZu(); });

  ausloeser.addEventListener('focus', () => { zuAb(); setze(true); });
  leiste.addEventListener('focusout', (e) => {
    if (!leiste.contains(e.relatedTarget)) setze(false);
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && offen) setze(false); });
  addEventListener('resize', () => { if (offen) ursprungSetzen(); });

  // Vorschau folgt der überfahrenen Zeile
  const zeige = (i) => {
    bilder.forEach((b, k) => b.classList.toggle('ist', k === i));
    saetze.forEach((s, k) => s.classList.toggle('ist', k === i));
  };
  zeilen.forEach((z, i) => {
    z.addEventListener('pointerenter', () => zeige(i));
    z.addEventListener('focus', () => zeige(i));
  });

  // Anker im Panel über Lenis führen und dabei schliessen
  [...zeilen, fuss].forEach((el) => el && el.addEventListener('click', () => setze(false)));
  setze(false);
})();


/* ── Leistungs-Akkordeon ────────────────────────────────────────
   Höhe wird animiert (natives details springt), Inhalt fährt leicht
   gestaffelt heraus: Text, dann Schlagworte, dann Bild. Es bleibt
   immer nur eine Zeile offen. */
(function leistungen() {
  const zeilen = [...document.querySelectorAll('#lzliste .lz')];
  if (!zeilen.length) return;

  const zu = (lz) => {
    const h = lz.querySelector('.lz__huelle');
    h.style.height = h.scrollHeight + 'px';
    requestAnimationFrame(() => { h.style.height = '0px'; });
    lz.classList.remove('ist');
    lz.querySelector('.lz__kopf').setAttribute('aria-expanded', 'false');
  };
  const auf = (lz) => {
    const h = lz.querySelector('.lz__huelle');
    h.style.height = h.querySelector('.lz__leib').offsetHeight + 'px';
    lz.classList.add('ist');
    lz.querySelector('.lz__kopf').setAttribute('aria-expanded', 'true');
    const fertig = (e) => {
      if (e.propertyName !== 'height') return;
      if (lz.classList.contains('ist')) h.style.height = 'auto';
      h.removeEventListener('transitionend', fertig);
    };
    h.addEventListener('transitionend', fertig);
  };

  zeilen.forEach((lz) => {
    const kopf = lz.querySelector('.lz__kopf');
    kopf.addEventListener('click', () => {
      const offen = lz.classList.contains('ist');
      zeilen.forEach((a) => { if (a.classList.contains('ist')) zu(a); });
      if (!offen) auf(lz);
      /* 460 ms: Öffnen und Schliessen laufen 300 ms, das Schliessen
         startet ein Bild später — mit Reserve für den Ausklang. */
      zeileHalten(kopf, 460);
    });
  });
  /* Bewusst NICHTS offen zum Start — wie bei Redondo. Die Liste der
     fünf Namen ist die Aussage, das Aufklappen die Entscheidung des
     Lesers. */
})();

/* ── Leistungen: vollbreit, am Ende rund einlaufen ───────────────
   Der schwarze Block liegt über die ganze Breite. Beim Wegscrollen
   zieht er sich auf Containermass zusammen und bekommt runde Ecken.
   Gemacht mit clip-path statt mit width: eine echte Breitenänderung
   würde in jedem Bild das ganze Akkordeon neu umbrechen. clip-path
   verändert kein Layout — der Text bleibt, wo er ist. */
(function dienstePanel() {
  const sekt = document.querySelector('.dienste');
  const block = sekt && sekt.querySelector('.dienste__block');
  if (!block) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const stand = { t: 0 };
  const zeichne = () => {
    const breite = block.getBoundingClientRect().width;
    const rand = parseFloat(getComputedStyle(document.documentElement)
      .getPropertyValue('--pad')) || 40;
    /* Derselbe Weg wie --einzug im Stylesheet — dort steht der Text.
       Das Zusammenziehen hält 40 px davor an, sonst klebte der Text
       am Ende an der runden Kante. Mindestens 12 px, damit auf
       schmalen Bildschirmen überhaupt etwas zu sehen ist. */
    const einzug = Math.max(24, Math.max(rand, (breite - 1520) / 2) - 40);
    block.style.clipPath = 'inset(0 ' + (einzug * stand.t).toFixed(1) +
      'px round ' + (56 * stand.t).toFixed(1) + 'px)';
  };
  gsap.to(stand, {
    t: 1, ease: 'none', onUpdate: zeichne,
    scrollTrigger: { trigger: sekt, start: 'bottom bottom',
      end: 'bottom top+=25%', scrub: 0.5 },
  });
  addEventListener('resize', zeichne);
})();

/* ── Video-Referenzen ───────────────────────────────────────────
   Muster aus der ersten KLARTEXT-Seite: Vollbild-Video, Zitat in
   Guillemets, Chip-Leiste zum Umschalten. Das Video startet erst im
   Sichtbereich und läuft stumm — nie Ton, nie ausserhalb dekodieren. */
(function videoReferenzen() {
  const DATEN = [
    { zitat: 'Sie haben aus groben Ideen eine Marke gemacht, die klar und selbstbewusst wirkt.',
      rolle: 'Geschäftsführung', firma: 'Nordlicht', film: 'video/testimonial-01' },
    { zitat: 'Zum ersten Mal erklärt uns jemand nicht nur, was gemacht wird, sondern warum.',
      rolle: 'Marketing', firma: 'Volta', film: 'video/testimonial-02' },
    { zitat: 'Schnell, direkt, ohne Agentur-Nebel — und das Team kann alles selbst pflegen.',
      rolle: 'Gründung', firma: 'Meridian', film: 'video/testimonial-03' },
  ];
  const film = document.getElementById('vrefVideo');
  const zitat = document.getElementById('vrefZitat');
  const rolle = document.getElementById('vrefRolle');
  const firma = document.getElementById('vrefFirma');
  const chips = [...document.querySelectorAll('#vrefChips button')];
  if (!film || !chips.length) return;

  const sanft = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ist = -1;

  const setze = (i) => {
    if (i === ist) return;
    ist = i;
    const d = DATEN[i];
    chips.forEach((c, k) => c.classList.toggle('ist', k === i));
    gsap.to([zitat, '.vref__wer'], {
      opacity: 0, y: 12, duration: T_FLAECHE, ease: KURVE,
      onComplete: () => {
        zitat.textContent = '«' + d.zitat + '»';
        rolle.textContent = d.rolle; firma.textContent = d.firma;
        gsap.to([zitat, '.vref__wer'], { opacity: 1, y: 0, duration: T_FARBE, ease: KURVE });
      },
    });
    gsap.to(film, {
      opacity: 0, duration: T_FLAECHE, ease: KURVE,
      onComplete: () => {
        film.poster = d.film + '-poster.jpg';
        film.src = d.film + '.mp4';
        if (!sanft) film.play().catch(() => {});
        gsap.to(film, { opacity: 1, duration: T_BILD, ease: KURVE });
      },
    });
  };
  chips.forEach((c, i) => c.addEventListener('click', () => setze(i)));

  // erst im Sichtbereich laden und starten
  ScrollTrigger.create({
    trigger: '.vref', start: 'top 90%', once: true,
    onEnter: () => { film.preload = 'auto'; if (!sanft) film.play().catch(() => {}); },
  });
  setze(0);
})();

/* ── Fall-Studien: Inhalt wechselt beim Scrollen ────────────── */
(function faelle() {
  const FAELLE = [
    { titel: 'Eine klare Markenidentität für eine junge Energieplattform',
      jahr: '2025', dauer: '6 Wochen', pillen: ['Branding', 'Website', '3D'], bild: 'bilder/fall-1.jpg' },
    { titel: 'Ein Auftritt, der komplexe Technik verständlich macht',
      jahr: '2024', dauer: '9 Wochen', pillen: ['Branding', 'Motion', 'Content'], bild: 'bilder/fall-2.jpg' },
    { titel: 'Vom Nischenprodukt zur Marke mit Haltung',
      jahr: '2024', dauer: '12 Wochen', pillen: ['Strategie', 'Website', 'Performance'], bild: 'bilder/fall-3.jpg' },
  ];
  const inhalt = document.getElementById('fallInhalt');
  const bild = document.getElementById('fallBild');
  const liste = [...document.querySelectorAll('#fallListe li')];
  if (!inhalt) return;
  let ist = -1;

  const setze = (i) => {
    if (i === ist) return;
    ist = i;
    const f = FAELLE[i];
    liste.forEach((li, k) => li.classList.toggle('ist', k === i));
    gsap.to(inhalt, {
      opacity: 0, y: 14, duration: T_FLAECHE, ease: KURVE,
      onComplete: () => {
        inhalt.querySelector('[data-feld="titel"]').textContent = f.titel;
        inhalt.querySelector('[data-feld="jahr"]').textContent = f.jahr;
        inhalt.querySelector('[data-feld="dauer"]').textContent = f.dauer;
        inhalt.querySelector('[data-feld="pillen"]').innerHTML =
          f.pillen.map((p) => `<span>${p}</span>`).join('');
        gsap.to(inhalt, { opacity: 1, y: 0, duration: T_FARBE, ease: KURVE });
      },
    });
    gsap.to(bild, {
      opacity: 0, scale: 1.04, duration: T_FLAECHE, ease: KURVE,
      onComplete: () => {
        bild.src = f.bild;
        gsap.to(bild, { opacity: 1, scale: 1, duration: T_BILD, ease: KURVE });
      },
    });
  };

  document.querySelectorAll('.fall__ausloeser').forEach((t, i) => {
    ScrollTrigger.create({ trigger: t, start: 'top 60%', end: 'bottom 60%',
      onToggle: (s) => s.isActive && setze(i) });
  });
  liste.forEach((li, i) => li.addEventListener('click', () => setze(i)));
  setze(0);
})();

/* ── Team-Morph: driften UND wachsen ────────────────────────── */
(function team() {
  const karten = [...document.querySelectorAll('.karte')];
  const feld = document.querySelector('.team');
  if (!karten.length || !feld || innerWidth < 1100) return;
  const SKALA_JE_PX = 0.111 / 1000;     // gemessen
  const FAKTOR = [-0.074, -0.148];      // gemessen, wechselt je Spalte
  karten.forEach((k, i) => {
    const faktor = FAKTOR[i % 2];
    gsap.fromTo(k, { y: 0, scale: 0.8 }, {
      y: () => faktor * (feld.offsetHeight + innerHeight),
      scale: () => 0.8 + SKALA_JE_PX * (feld.offsetHeight + innerHeight),
      ease: 'none',
      scrollTrigger: { trigger: feld, start: 'top bottom', end: 'bottom top',
        scrub: 0.4, invalidateOnRefresh: true },
    });
  });
  gsap.to('.team__halt', { opacity: 0.4, ease: 'none',
    scrollTrigger: { trigger: feld, start: 'center center', end: 'bottom top', scrub: true } });
})();

/* ── Preise: Ziffernrolle (kein Hochzählen) ─────────────────── */
(function preise() {
  const knoepfe = [...document.querySelectorAll('#schalter button')];
  if (!knoepfe.length) return;
  const setze = (takt) => {
    knoepfe.forEach((k) => k.classList.toggle('ist', k.dataset.takt === takt));
    document.body.classList.toggle('langtakt', takt === 'lang');
  };
  knoepfe.forEach((k) => k.addEventListener('click', () => setze(k.dataset.takt)));
})();

/* ── Stimmen ────────────────────────────────────────────────── */
(function stimmen() {
  const DATEN = [
    { text: 'Sie haben verstanden, was wir wollten, und aus groben Ideen eine Marke gemacht, die klar und selbstbewusst wirkt.',
      name: 'Marc Baumann', rolle: 'CTO bei Nordlicht', bild: 'bilder/stimme-1.jpg' },
    { text: 'Zum ersten Mal erklärt uns jemand nicht nur, was gemacht wird, sondern warum. Nach drei Monaten sehen wir das in den Zahlen.',
      name: 'Anna Vogt', rolle: 'Marketing bei Volta', bild: 'bilder/stimme-2.jpg' },
    { text: 'Schnell, direkt, ohne Agentur-Nebel. Wir haben eine Website bekommen, die unser Team selbst pflegen kann.',
      name: 'David Lehmann', rolle: 'Gründer von Meridian', bild: 'bilder/stimme-3.jpg' },
  ];
  const text = document.getElementById('stimmeText');
  const name = document.getElementById('stimmeName');
  const rolle = document.getElementById('stimmeRolle');
  const bild = document.getElementById('stimmeBild');
  if (!text) return;
  let ist = 0;

  const zeige = (i) => {
    ist = (i + DATEN.length) % DATEN.length;
    const d = DATEN[ist];
    gsap.to([text, '.stimme__wer'], {
      opacity: 0, y: 12, duration: T_FLAECHE, ease: KURVE,
      onComplete: () => {
        text.textContent = d.text; name.textContent = d.name;
        rolle.textContent = d.rolle; bild.src = d.bild;
        gsap.to([text, '.stimme__wer'], { opacity: 1, y: 0, duration: T_FARBE, ease: KURVE });
      },
    });
  };
  document.getElementById('vor').addEventListener('click', () => zeige(ist + 1));
  document.getElementById('zurueck').addEventListener('click', () => zeige(ist - 1));
})();

/* ── FAQ-Akkordeon mit Höhen-Animation ──────────────────────── */
(function akkordeon() {
  const zeilen = [...document.querySelectorAll('#faq .fr')];
  if (!zeilen.length) return;
  const zu = (fr) => {
    const h = fr.querySelector('.fr__huelle');
    h.style.height = h.scrollHeight + 'px';
    requestAnimationFrame(() => { h.style.height = '0px'; });
    fr.classList.remove('ist');
    fr.querySelector('.fr__kopf').setAttribute('aria-expanded', 'false');
  };
  const auf = (fr) => {
    const h = fr.querySelector('.fr__huelle');
    h.style.height = h.querySelector('.fr__leib').offsetHeight + 'px';
    fr.classList.add('ist');
    fr.querySelector('.fr__kopf').setAttribute('aria-expanded', 'true');
    const fertig = (e) => {
      if (e.propertyName !== 'height') return;
      if (fr.classList.contains('ist')) h.style.height = 'auto';
      h.removeEventListener('transitionend', fertig);
    };
    h.addEventListener('transitionend', fertig);
  };
  zeilen.forEach((fr) => {
    const kopf = fr.querySelector('.fr__kopf');
    kopf.addEventListener('click', () => {
      const offen = fr.classList.contains('ist');
      zeilen.forEach((a) => { if (a.classList.contains('ist')) zu(a); });
      if (!offen) auf(fr);
      zeileHalten(kopf, 460);
    });
  });
})();

/* ── Bild-Hover: scale 1.1 (gemessen) ───────────────────────── */
(function bildhover() {
  document.querySelectorAll('.fall__bild').forEach((w) => {
    const img = w.querySelector('img');
    if (!img) return;
    w.addEventListener('pointerenter', () => gsap.to(img, { scale: 1.06, duration: T_BILD, ease: KURVE }));
    w.addEventListener('pointerleave', () => gsap.to(img, { scale: 1, duration: T_BILD, ease: KURVE }));
  });
})();

addEventListener('load', () => ScrollTrigger.refresh());
