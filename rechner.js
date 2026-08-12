/* Kostenrechner für Websites.
   Alle Beträge stehen hier oben an einer Stelle, damit sie ohne
   Suchen anpassbar sind. Der Rechner nennt eine Spanne statt einer
   Zahl: Eine einzelne Zahl liest sich wie ein Angebot.
   Unten und oben ist hart begrenzt — unter 2'499 macht es niemand,
   über 20'000 gehört es ins Gespräch und nicht in einen Rechner. */
(function () {
  const R = document.getElementById('rechner');
  if (!R) return;

  const UNTEN = 2499;
  const OBEN  = 20000;

  const PREISE = {
    art:    { onepager: 2499, mehrseitig: 4200, shop: 7500 },
    seite:  180,          // je Unterseite über die dritte hinaus
    design: { vorlage: -600, eigen: 0, motion: 1900 },
    inhalt: { selbst: 0, texte: 1100, alles: 2400 },
    extra:  { sprachen: 1500, blog: 700, termine: 1200, seo: 900, anbindung: 1300 }
  };

  /* Auf 100 runden, aber die beiden Eckwerte exakt stehen lassen —
     2'499 ist eine Aussage, 2'500 waere eine andere. */
  const chf = (n) => {
    const g = (Math.abs(n - UNTEN) < 60 || Math.abs(n - OBEN) < 60)
      ? Math.round(n) : Math.round(n / 100) * 100;
    return (g + '').replace(/\B(?=(\d{3})+(?!\d))/g, '’');
  };

  const wahl = (g) => {
    const el = R.querySelector('input[name="' + g + '"]:checked');
    return el ? el : null;
  };

  /* Zahl weich hochzählen statt springen lassen */
  let laeuft = null;
  function zeigeSpanne(von, bis) {
    const feld = R.querySelector('#rSpanne');
    const startVon = +feld.dataset.von || von, startBis = +feld.dataset.bis || bis;
    const t0 = performance.now(), dauer = 420;
    if (laeuft) cancelAnimationFrame(laeuft);
    (function schritt(t) {
      const p = Math.min(1, (t - t0) / dauer);
      const e = 1 - Math.pow(1 - p, 3);            // weich auslaufend
      const a = startVon + (von - startVon) * e;
      const b = startBis + (bis - startBis) * e;
      /* Fallen beide Enden zusammen, ist eine Spanne eine Luege */
      feld.textContent = (chf(a) === chf(b))
        ? 'ab CHF ' + chf(a)
        : 'CHF ' + chf(a) + ' – ' + chf(b);
      if (p < 1) laeuft = requestAnimationFrame(schritt);
      else { feld.dataset.von = von; feld.dataset.bis = bis; }
    })(t0);
  }

  function rechne() {
    const art = wahl('art');
    const artWert = art ? art.value : 'mehrseitig';
    let summe = PREISE.art[artWert];
    const posten = [[art ? art.dataset.wort : '', PREISE.art[artWert]]];

    /* Seitenregler zählt nur, wo es mehrere Seiten gibt */
    const mehrseitig = artWert !== 'onepager';
    const reglerBlock = R.querySelector('[data-block="seiten"]');
    reglerBlock.classList.toggle('rechner__block--aus', !mehrseitig);

    const regler = R.querySelector('#rSeiten');
    const seiten = +regler.value;
    R.querySelector('#rSeitenWert').textContent = seiten >= 30 ? '30+' : seiten;
    R.querySelector('#rSeitenSpur').style.setProperty('--anteil',
      ((seiten - regler.min) / (regler.max - regler.min) * 100) + '%');

    if (mehrseitig && seiten > 3) {
      const auf = (seiten - 3) * PREISE.seite;
      summe += auf;
      posten.push([seiten + (seiten >= 30 ? '+' : '') + ' Unterseiten', auf]);
    }

    ['design', 'inhalt'].forEach(function (g) {
      const el = wahl(g);
      if (el && PREISE[g][el.value]) {
        summe += PREISE[g][el.value];
        posten.push([el.dataset.wort, PREISE[g][el.value]]);
      }
    });

    R.querySelectorAll('input[name="extra"]:checked').forEach(function (e) {
      summe += PREISE.extra[e.value];
      posten.push([e.dataset.wort, PREISE.extra[e.value]]);
    });

    /* Beide Enden in denselben Rahmen klemmen. Nur das obere zu
       deckeln reichte nicht: bei sehr grossem Umfang schob sich die
       Untergrenze ueber die gedeckelte Obergrenze. */
    const klemm = (n) => Math.min(OBEN, Math.max(UNTEN, n));
    const von = klemm(summe * 0.9);
    const bis = klemm(summe * 1.15);

    zeigeSpanne(von, bis);

    /* Hinweis, wenn die Obergrenze greift */
    R.querySelector('#rDeckel').hidden = summe * 1.15 <= OBEN;

    R.querySelector('#rPosten').innerHTML = posten.map(function (p) {
      return '<li><span>' + p[0] + '</span><b>' +
             (p[1] < 0 ? '− ' : '+ ') + 'CHF ' + chf(Math.abs(p[1])) + '</b></li>';
    }).join('');

    const zeilen = posten.map((p) => '• ' + p[0]).join('\n');
    R.querySelector('#rAnfrage').href = 'mailto:hallo@klartext-digital.ch?subject=' +
      encodeURIComponent('Anfrage Website') + '&body=' +
      encodeURIComponent('Guten Tag\n\nüber den Rechner auf eurer Seite habe ich folgende Auswahl getroffen:\n\n' +
        zeilen + '\n\nRichtwert: CHF ' + chf(von) + ' – ' + chf(bis) + '\n\nFreundliche Grüsse\n');
  }

  R.addEventListener('change', rechne);
  R.addEventListener('input', rechne);     // Regler läuft mit, nicht erst beim Loslassen
  rechne();
})();
