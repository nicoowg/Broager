# 🐍 Broager Snake

Et lille **slangespil til iPhone** — bygget som en web-app (PWA), så det kan
spilles direkte i Safari og lægges på hjemmeskærmen som en rigtig app. Ingen
App Store, ingen installation, ingen frameworks — bare HTML, CSS og JavaScript.

## Spil med det samme

Start en lille lokal server og åbn den i browseren:

```bash
python3 -m http.server 8099
# åbn derefter http://localhost:8099
```

Eller åbn `index.html` direkte (offline-cache via service worker virker dog
kun når siden serveres over http/https).

## Læg det på iPhone-hjemmeskærmen

1. Åbn siden i **Safari** på din iPhone.
2. Tryk på **Del-knappen** (firkant med pil op).
3. Vælg **"Føj til hjemmeskærm"**.
4. Nu ligger 🐍 Broager Snake som et app-ikon og åbner i fuldskærm.

> Tip: Læg filerne på GitHub Pages, så kan du åbne spillet fra hvor som helst
> på din iPhone uden en computer.

## Sådan spilles det

- **Swipe** på spillepladen for at styre slangen (op/ned/venstre/højre).
- Eller brug **styrekorset** nederst — eller piletasterne på en computer.
- Spis æblerne 🍎 for at vokse og få point. Spillet bliver hurtigere for hvert æble.
- Ram **ikke** kanten eller dig selv.
- Din **bedste score** gemmes på telefonen (også offline).
- **Tap** (eller mellemrum) for pause / fortsæt.

## Filer

| Fil | Beskrivelse |
|-----|-------------|
| `index.html` | Selve siden + iPhone/PWA-meta-tags |
| `style.css` | Layout, mørkt tema, safe-area til iPhone-hak |
| `game.js` | Hele spillet (canvas, touch, logik, lyd, haptik) |
| `manifest.webmanifest` | Gør appen installerbar |
| `sw.js` | Service worker — offline-cache |
| `icons/` | App-ikoner til hjemmeskærmen |
| `tools/make_icons.py` | Genererer ikonerne (kræver `pillow`) |
| `tools/test_logic.js` | Headless-test af spil-logikken |

## Udvikling

Kør logik-testene (ingen browser nødvendig):

```bash
node tools/test_logic.js
```

Regenerér ikoner:

```bash
pip install pillow
python3 tools/make_icons.py
```
