# KLARTEXT. — Entwurf

Einseitiger Auftritt im Stil „Playful Minimalism / Soft Pop": helles
Off-White, warmes Schwarz, Violett als einziger Akzent, grosse Radien,
Brush-Schrift als Akzent.

**Das ist ein Entwurf.** Alle Texte, Namen, Zahlen und Zitate sind
Platzhalter. Die Seite ist auf `noindex` gestellt.

## Technik

Statisches HTML/CSS/JS, keine Build-Schritte.

- `index.html` · `stil.css` · `bewegung.js`
- Lenis (sanftes Scrollen), GSAP + ScrollTrigger
- Schriften: Figtree (OFL), Rock Salt (OFL)

Bewegungswerte wurden an zwei Referenzseiten gemessen und übertragen:
Hover `cubic-bezier(.44, 0, .56, 1)` mit Farbe .4s / Fläche .3s /
Bild .6s / Bedienung .46s, Einblendung als ease-out mit
`opacity 0→1 · Skala 0.9→1 · y 20px→0` bei t98 ≈ 610 ms.

## Lokal ansehen

```bash
python3 -m http.server 8401
```
