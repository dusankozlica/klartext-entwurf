/* Kostenrechner für Websites.
   Alle Beträge sind Richtwerte und stehen hier an einer Stelle, damit
   Dusan sie ohne Suchen anpassen kann. Der Rechner nennt bewusst eine
   Spanne statt einer Zahl: Eine einzelne Zahl liest sich wie ein
   Angebot, und das ist sie nicht. */
(function () {
  const R = document.getElementById('rechner');
  if (!R) return;

  const PREISE = {
    art:     { onepager: 4500, mehrseitig: 8000, shop: 16000 },
    umfang:  { klein: 0, mittel: 2500, gross: 6000, sehrgross: 11000 },
    design:  { vorlage: -1500, eigen: 0, motion: 3500 },
    inhalt:  { selbst: 0, texte: 2200, alles: 4800 },
    extra:   { sprachen: 2800, blog: 1400, termine: 2600, seo: 1800, anbindung: 2400 }
  };
  const STREUUNG = 0.15;   // Spanne nach unten und oben

  const franken = (n) => 'CHF ' + Math.round(n / 100) * 100
    .toLocaleString('de-CH').replace(/\B(?=(\d{3})+(?!\d))/g, '’');

  function rund(n) {
    const g = Math.round(n / 500) * 500;
    return g.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '’');
  }

  function wahl(gruppe) {
    const el = R.querySelector('input[name="' + gruppe + '"]:checked');
    return el ? el.value : null;
  }

  function rechne() {
    const art = wahl('art');
    let summe = PREISE.art[art] || 0;
    const posten = [];

    if (art) posten.push([R.querySelector('input[name="art"]:checked').dataset.wort, PREISE.art[art]]);

    // Umfang zählt nur, wo es mehrere Seiten gibt
    const umfangAn = art !== 'onepager';
    R.querySelector('[data-block="umfang"]').classList.toggle('rechner__block--aus', !umfangAn);
    if (umfangAn) {
      const u = wahl('umfang');
      if (u && PREISE.umfang[u]) {
        summe += PREISE.umfang[u];
        posten.push([R.querySelector('input[name="umfang"]:checked').dataset.wort, PREISE.umfang[u]]);
      }
    }

    ['design', 'inhalt'].forEach(function (g) {
      const v = wahl(g);
      if (v && PREISE[g][v]) {
        summe += PREISE[g][v];
        posten.push([R.querySelector('input[name="' + g + '"]:checked').dataset.wort, PREISE[g][v]]);
      }
    });

    R.querySelectorAll('input[name="extra"]:checked').forEach(function (e) {
      summe += PREISE.extra[e.value];
      posten.push([e.dataset.wort, PREISE.extra[e.value]]);
    });

    const von = Math.max(2500, summe * (1 - STREUUNG));
    const bis = summe * (1 + STREUUNG);

    R.querySelector('#rSpanne').textContent = 'CHF ' + rund(von) + ' – ' + rund(bis);
    R.querySelector('#rPosten').innerHTML = posten.map(function (p) {
      return '<li><span>' + p[0] + '</span><b>' +
             (p[1] < 0 ? '− ' : '+ ') + 'CHF ' + rund(Math.abs(p[1])) + '</b></li>';
    }).join('');

    // Anfrage-Knopf trägt die Auswahl mit
    const zeilen = posten.map(function (p) { return '• ' + p[0]; }).join('%0A');
    R.querySelector('#rAnfrage').href =
      'mailto:hallo@klartext-digital.ch?subject=' +
      encodeURIComponent('Anfrage Website') +
      '&body=' + encodeURIComponent('Guten Tag\n\nüber den Rechner auf eurer Seite habe ich folgende Auswahl getroffen:\n\n')
      .replace(/%0A/g, '%0A') + zeilen +
      '%0A%0A' + encodeURIComponent('Richtwert: ') + 'CHF ' + rund(von) + ' – ' + rund(bis) +
      '%0A%0A' + encodeURIComponent('Freundliche Grüsse\n');
  }

  R.addEventListener('change', rechne);
  rechne();
})();
