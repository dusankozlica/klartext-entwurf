/* Eigener Mauszeiger — Bewegung 1:1 von chkstepan.com uebernommen.
   Gemessen im dortigen Quelltext:
     pos = pos + (maus - pos) * k, je Bild
     Punkt k = 0,2   Ring k = 0,1
   Das ist der ganze Trick an der Verzoegerung: zwei verschiedene
   Faktoren auf derselben Zielposition. Der Ring bleibt zurueck und
   zieht nach, der Punkt sitzt fast auf der Spitze. */
(function () {
  const grob = window.matchMedia('(hover:none),(pointer:coarse)').matches;
  if (grob) return;

  const wurzel = document.createElement('div');
  wurzel.className = 'zeiger';
  wurzel.setAttribute('aria-hidden', 'true');
  const punkt = document.createElement('div');
  const ring  = document.createElement('div');
  punkt.className = 'zeiger__punkt';
  ring.className  = 'zeiger__ring';
  wurzel.appendChild(punkt);
  wurzel.appendChild(ring);
  document.body.appendChild(wurzel);

  const sanft = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const K_PUNKT = sanft ? 1 : .2;
  const K_RING  = sanft ? 1 : .1;

  const mitte = { x: innerWidth / 2, y: innerHeight / 2 };
  const ziel = { x: mitte.x, y: mitte.y };
  const p = { x: mitte.x, y: mitte.y };
  const r = { x: mitte.x, y: mitte.y };
  let sichtbar = false;

  addEventListener('mousemove', function (e) {
    ziel.x = e.clientX; ziel.y = e.clientY;
    letzteBewegung = performance.now();
    if (!sichtbar) {
      sichtbar = true;
      punkt.classList.add('ist');
      ring.classList.add('ist');
    }
  }, { passive: true });

  /* Verlaesst der Zeiger das Fenster, blendet er aus statt am Rand
     kleben zu bleiben. */
  addEventListener('mouseout', function (e) {
    if (!e.relatedTarget && !e.toElement) {
      sichtbar = false;
      punkt.classList.remove('ist');
      ring.classList.remove('ist');
    }
  });

  /* Anklickbares wird nicht einzeln verdrahtet, sondern beim Zeigen
     geprueft — sonst haetten spaeter eingefuegte Elemente keinen
     Effekt (Ausklappmenue, Rechner, Filme). */
  const KLICKBAR = 'a,button,input,textarea,select,summary,[role="button"],' +
                   '.knopf,.kreis,.lamelle,.mlink,.fr__kopf,.ig__folgen';

  /* ── Farbe: sichtbar auf jedem Grund ──────────────────────────
     Eine feste Zeigerfarbe kann es nicht geben. Gemessen: das helle
     Bernstein verschwindet auf Creme (1.45:1), auf weissen Karten
     (1.56:1) und auf der gefaerbten Karte (1.31:1). Deshalb schaut
     der Zeiger nach, worauf er gerade liegt, und nimmt von drei
     Kandidaten den, der dort zu sehen ist. */
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;left:-9999px;top:0';
  document.body.appendChild(probe);
  const aufloesen = (v) => { probe.style.color = ''; probe.style.color = v;
    return getComputedStyle(probe).color; };

  const kanal = (c) => { c /= 255; return c <= .04045 ? c / 12.92
    : Math.pow((c + .055) / 1.055, 2.4); };
  const leuchten = (r, g, b) => .2126 * kanal(r) + .7152 * kanal(g) + .0722 * kanal(b);
  const ausText = (t) => {
    const m = String(t).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const z = m[1].split(/[,\s\/]+/).filter(Boolean).map(Number);
    if (z.length >= 4 && z[3] < .5) return null;
    return leuchten(z[0], z[1], z[2]);
  };
  const gegen = (a, b) => (Math.max(a, b) + .05) / (Math.min(a, b) + .05);

  const wz = getComputedStyle(wurzel);
  const KANDIDATEN = ['--zeiger-marke', '--zeiger-hell', '--zeiger-dunkel']
    .map((n) => {
      const roh = aufloesen(wz.getPropertyValue(n).trim() || 'currentColor');
      return { wert: roh, hell: ausText(roh) };
    })
    .filter((k) => k.hell !== null);

  /* Bilder und Filme tragen keine Hintergrundfarbe. Einmal je Element
     ein 16x16-Abzug, daraus die mittlere Helligkeit — das reicht, um
     hell von dunkel zu unterscheiden, und kostet nur beim ersten Mal. */
  const gemerkt = new WeakMap();
  const medienHelligkeit = (el) => {
    if (gemerkt.has(el)) return gemerkt.get(el);
    if (el.tagName === 'IMG' && (!el.complete || !el.naturalWidth)) return null;
    if (el.tagName === 'VIDEO' && el.readyState < 2) return null;
    let L = null;
    try {
      const c = document.createElement('canvas');
      c.width = 16; c.height = 16;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(el, 0, 0, 16, 16);
      const d = g.getImageData(0, 0, 16, 16).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 4) sum += leuchten(d[i], d[i + 1], d[i + 2]);
      L = sum / (d.length / 4);
    } catch (x) { L = null; }
    gemerkt.set(el, L);
    return L;
  };

  /* Verlaeufe an der STELLE des Zeigers auswerten, nicht mitteln.
     Der Lader laeuft von fast schwarz bis hell — der Mittelwert sagt
     "mittelhell" und waere an beiden Enden falsch. Der Punkt wird auf
     die Verlaufsachse projiziert, dann zwischen den beiden
     umliegenden Stopps gemischt. */
  const RICHTUNGEN = { 'to top': 0, 'to right': 90, 'to bottom': 180,
    'to left': 270, 'to top right': 45, 'to right top': 45,
    'to bottom right': 135, 'to right bottom': 135,
    'to bottom left': 225, 'to left bottom': 225,
    'to top left': 315, 'to left top': 315 };

  const stoppsLesen = (bild) => {
    const teile = bild.match(/rgba?\([^)]+\)(\s+[\d.]+%)?/g);
    if (!teile || teile.length < 2) return null;
    const stopps = teile.map((t) => {
      const farbe = ausText(t);
      const pos = t.match(/([\d.]+)%/);
      return { L: farbe, p: pos ? parseFloat(pos[1]) / 100 : null };
    });
    if (stopps.some((x) => x.L === null)) return null;
    /* Stopps ohne Angabe gleichmaessig verteilen */
    if (stopps[0].p === null) stopps[0].p = 0;
    if (stopps[stopps.length - 1].p === null) stopps[stopps.length - 1].p = 1;
    for (let i = 1; i < stopps.length - 1; i++)
      if (stopps[i].p === null) stopps[i].p = i / (stopps.length - 1);
    return stopps;
  };

  const verlaufHelligkeit = (bild, kasten, x, y) => {
    const stopps = stoppsLesen(bild);
    if (!stopps) return null;
    const mittel = () => stopps.reduce((a, b) => a + b.L, 0) / stopps.length;
    if (!kasten || bild.indexOf('linear-gradient') < 0) return mittel();

    let grad = null;
    const wGrad = bild.match(/linear-gradient\(\s*(-?[\d.]+)deg/);
    if (wGrad) grad = parseFloat(wGrad[1]);
    else {
      const wWort = bild.match(/linear-gradient\(\s*(to [a-z ]+?)\s*,/);
      grad = wWort ? RICHTUNGEN[wWort[1].trim()] : 180;   /* Vorgabe: nach unten */
    }
    if (grad === null || grad === undefined) return mittel();

    const bog = grad * Math.PI / 180;
    const sx = Math.sin(bog), cy = Math.cos(bog);
    const laenge = Math.abs(kasten.width * sx) + Math.abs(kasten.height * cy);
    if (!laenge) return mittel();
    const mx = kasten.left + kasten.width / 2, my = kasten.top + kasten.height / 2;
    /* Bildschirmachse zeigt nach unten, die Verlaufsachse nach oben */
    const weg = (x - mx) * sx + (y - my) * -cy;
    let t = .5 + weg / laenge;
    t = t < 0 ? 0 : t > 1 ? 1 : t;

    for (let i = 1; i < stopps.length; i++) {
      if (t <= stopps[i].p) {
        const a = stopps[i - 1], b = stopps[i];
        const spanne = b.p - a.p;
        const k = spanne > 0 ? (t - a.p) / spanne : 0;
        return a.L + (b.L - a.L) * k;
      }
    }
    return stopps[stopps.length - 1].L;
  };

  const grundHelligkeit = (el, x, y) => {
    let e = el;
    while (e && e.nodeType === 1) {
      if (e.tagName === 'IMG' || e.tagName === 'VIDEO') {
        const L = medienHelligkeit(e);
        if (L !== null) return L;
      }
      const st = getComputedStyle(e);
      if (st.backgroundImage && st.backgroundImage.indexOf('gradient') > -1) {
        const L = verlaufHelligkeit(st.backgroundImage, e.getBoundingClientRect(), x, y);
        if (L !== null) return L;
      }
      const L = ausText(st.backgroundColor);
      if (L !== null) return L;
      e = e.parentElement;
    }
    return leuchten(247, 247, 245);
  };

  let letzteFarbe = '';
  /* Die Schwelle liegt bewusst tief. Reiner Helligkeitskontrast misst
     den Farbunterschied nicht mit: Bernstein auf hellem Teal kommt auf
     1.20:1, ist aber als warmer Punkt auf kaltem Grund klar zu sehen —
     dazu die Haarlinie, die auf jedem Grund eine Kante zieht. Gewichen
     wird nur, wo der Grund praktisch dieselbe Farbe hat wie der Zeiger
     (Bernstein auf Bernstein: 1.0). Sonst bleibt die Markenfarbe. */
  const SCHWELLE = 1.15;
  const faerbe = (el, x, y) => {
    if (!el || !KANDIDATEN.length) return;
    const grund = grundHelligkeit(el, x, y);
    let beste = KANDIDATEN[0], bester = gegen(KANDIDATEN[0].hell, grund);
    if (bester < SCHWELLE) {
      for (let i = 1; i < KANDIDATEN.length; i++) {
        const k = gegen(KANDIDATEN[i].hell, grund);
        if (k > bester) { bester = k; beste = KANDIDATEN[i]; }
      }
    }
    if (beste.wert !== letzteFarbe) {
      letzteFarbe = beste.wert;
      wurzel.style.setProperty('--zeiger-farbe', beste.wert);
    }
  };

  /* Zweimal nachsehen: sofort, und noch einmal, wenn die Fuellung
     einer Karte durchgelaufen ist — sonst bliebe die Farbe von vorher
     stehen, waehrend der Grund schon gewechselt hat. */
  let letzteMessung = 0;
  const nachsehen = (el, x, y) => { faerbe(el, x, y);
    setTimeout(() => faerbe(el, x, y), 380); };

  addEventListener('mouseover', function (e) {
    const t = e.target;
    if (t && t.closest && t.closest(KLICKBAR)) ring.classList.add('zeigt');
    else ring.classList.remove('zeigt');
    nachsehen(t, e.clientX, e.clientY);
  }, { passive: true });

  /* Waehrend der Zeiger laeuft, hoechstens alle 120 ms nachrechnen —
     das reicht fuers Auge und belastet kein Bild. */
  addEventListener('mousemove', function (e) {
    const jetzt = performance.now();
    if (jetzt - letzteMessung < 120) return;
    letzteMessung = jetzt;
    faerbe(e.target, e.clientX, e.clientY);
  }, { passive: true });

  /* Messhilfe: die Seite mit ?takt aufrufen, dann steht oben links,
     wie viele Bilder je Sekunde ankommen und wie weit der Ring
     zurueckliegt. Ohne den Zusatz in der Adresse laeuft nichts davon. */
  let anzeige = null;
  let ruheB = 0, ruheT = 0, bewB = 0, bewT = 0, letzteBewegung = -9999;
  if (location.search.indexOf('takt') > -1) {
    anzeige = document.createElement('div');
    anzeige.style.cssText = 'position:fixed;left:12px;top:12px;z-index:999999;' +
      'background:#000;color:#0f0;font:12px/1.5 monospace;padding:8px 10px;' +
      'border-radius:6px;pointer-events:none;white-space:pre';
    document.body.appendChild(anzeige);
  }

  /* Schalter zum Eingrenzen: ?ohne=korn | film | mac | glas | alles
     Damit laesst sich einzeln abschalten, was Bilder kosten koennte,
     ohne dass ich raten muss, welcher Verdaechtige es ist. */
  (function () {
    const o = new URLSearchParams(location.search).get('ohne');
    if (!o) return;
    const aus = (w) => o === 'alles' || o === w;
    if (aus('korn')) document.querySelectorAll('.korn').forEach(e => e.remove());
    if (aus('film')) document.querySelectorAll('video').forEach(v => {
      v.pause(); v.removeAttribute('src'); v.load(); v.style.display = 'none';
    });
    if (aus('mac')) document.querySelectorAll('.mac').forEach(e => e.remove());
    if (aus('glas')) {
      const st = document.createElement('style');
      /* Grosse weiche Schatten und Verlaeufe kosten beim Neuzeichnen. */
      st.textContent = '*{box-shadow:none!important;filter:none!important}';
      document.head.appendChild(st);
    }
    if (aus('lenis') && window.__lenis) {
      /* Klasse entfernen reicht nicht — die Rechnerei laeuft weiter.
         Erst destroy() haelt den Takt wirklich an. */
      try { window.__lenis.destroy(); } catch (x) {}
      document.documentElement.classList.remove('lenis');
      document.documentElement.style.scrollBehavior = 'auto';
    }
    if (aus('zeiger')) { wurzel.remove(); }
  })();

  const misch = (a, b, k) => a + (b - a) * k;
  const setze = (e, x, y) =>
    e.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) +
                        'px,0) translate(-50%,-50%)';

  let letzt = performance.now();
  (function takt(jetzt) {
    /* Der Faktor gilt fuer 60 Bilder je Sekunde. Ohne diese Umrechnung
       haengt die Geschwindigkeit an der Bildrate: bei 30 Bildern zieht
       der Zeiger doppelt so lange nach, bei 120 halb so lange. */
    /* Nur echte Unterbrechungen abfangen (Tabwechsel), nicht langsame
       Bilder. Die alte Grenze von 64 ms war der eigentliche Fehler:
       braucht ein Bild 100 ms, rueckte der Zeiger nur um 64 ms vor —
       er fiel bei jedem langsamen Bild weiter zurueck. */
    const dt = Math.min(250, jetzt - letzt);
    letzt = jetzt;
    const s = dt / 16.667;
    const kp = 1 - Math.pow(1 - K_PUNKT, s);
    const kr = 1 - Math.pow(1 - K_RING, s);

    p.x = misch(p.x, ziel.x, kp);
    p.y = misch(p.y, ziel.y, kp);
    r.x = misch(r.x, ziel.x, kr);
    r.y = misch(r.y, ziel.y, kr);
    setze(punkt, p.x, p.y);
    setze(ring, r.x, r.y);

    if (anzeige) {
      /* Getrennt zaehlen: waehrend die Maus laeuft und wenn sie steht.
         Nur so laesst sich unterscheiden, ob die SEITE langsam ist
         oder ob der ZEIGER die Bilder kostet. */
      if (jetzt - letzteBewegung < 250) { bewB++; bewT += dt; }
      else { ruheB++; ruheT += dt; }
      if (ruheT + bewT >= 700) {
        const z1 = ruheT > 120 ? Math.round(ruheB * 1000 / ruheT) : '–';
        const z2 = bewT  > 120 ? Math.round(bewB  * 1000 / bewT)  : '–';
        anzeige.textContent = 'ruhig ' + z1 + ' B/s   beim Bewegen ' + z2 + ' B/s';
        ruheB = 0; ruheT = 0; bewB = 0; bewT = 0;
      }
    }
    requestAnimationFrame(takt);
  })(letzt);
})();
