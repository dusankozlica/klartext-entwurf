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
  addEventListener('mouseover', function (e) {
    const t = e.target;
    if (t && t.closest && t.closest(KLICKBAR)) ring.classList.add('zeigt');
    else ring.classList.remove('zeigt');
  }, { passive: true });

  /* Messhilfe: die Seite mit ?takt aufrufen, dann steht oben links,
     wie viele Bilder je Sekunde ankommen und wie weit der Ring
     zurueckliegt. Ohne den Zusatz in der Adresse laeuft nichts davon. */
  let anzeige = null, bilder = 0, tSek = 0;
  if (location.search.indexOf('takt') > -1) {
    anzeige = document.createElement('div');
    anzeige.style.cssText = 'position:fixed;left:12px;top:12px;z-index:999999;' +
      'background:#000;color:#0f0;font:12px/1.5 monospace;padding:8px 10px;' +
      'border-radius:6px;pointer-events:none;white-space:pre';
    document.body.appendChild(anzeige);
  }

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
      bilder++; tSek += dt;
      if (tSek >= 500) {
        const abstand = Math.round(Math.hypot(ziel.x - r.x, ziel.y - r.y));
        anzeige.textContent = 'Bilder/s ' + Math.round(bilder * 1000 / tSek) +
          '  ·  Ring zurueck ' + abstand + ' px';
        bilder = 0; tSek = 0;
      }
    }
    requestAnimationFrame(takt);
  })(letzt);
})();
