# Plachetnice 🛥️

Plachetnicový simulátor v prohlížeči s realistickou aerodynamikou plachet — zdánlivý vítr (apparent wind), náklon, mrtvý úhel proti větru, body větru (close-hauled, půl větru, zadoboční, po větru). Běží na desktopu i na telefonu.

🌐 **Live: https://mpeterka.github.io/plachetnice-/**

## Spuštění lokálně

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # produkční bundle do dist/
npm run preview      # preview produkčního buildu
```

Vyžaduje Node ≥ 18.

## Ovládání

### Desktop (klávesnice + myš)

| Klávesa | Akce |
|---|---|
| `A` / `D` | Kormidlo na levobok / pravobok (drží = vychýleno, pustí = vrací se do středu) |
| `W` / `S` | Otěž hlavní povolit / dotáhnout |
| `↑` / `↓` | Otěž kosatky povolit / dotáhnout |
| `R` | Cyklus refů hlavní (0 → 1 → 2 → 3 → 0) |
| `F` / `Shift+F` | Svinout / rozvinout kosatku |
| `G` | Motýlek (přehození kosatky na návětrnou stranu pro plavbu po větru) |
| `T` | Topenant na/dolů (drží ráhno; musí být uvolněn před hisováním hlavní) |
| `H` / `J` | Fal hlavní / kosatky (hisovat / vesovat) |
| `1` – `4` | Bezvětří / Mírný vítr / Čerstvý vítr / Bouře |
| `P` | Pauza |
| `` ` `` | Debug HUD (AWA, AWS, CL, CD, …) |
| Kolečko myši | Zoom kamery |
| Drag myší | Otočení kamery kolem lodi (orbit) |

### Mobil (touch)

- **Vertikální posuvníky na bocích** — otěž hlavní (vlevo) a kosatky (vpravo). Drag prstem nahoru = dotáhnout.
- **Vodorovný posuvník dole** — kormidlo. Pustíš prst, vrátí se do středu.
- **Drag prstem v ploše scény** — natočení kamery kolem lodi.
- **Pinch dvěma prsty** — zoom kamery.
- **Tlačítka:** Ref (cykluje), Kosatka − / + (svinout / rozvinout), Motýlek (toggle), obtížnost (cykluje), fullscreen (⛶).

iOS Safari neumožňuje Fullscreen API přes DOM — pro plné okno přidej hru na plochu (Safari Sdílet → **Přidat na plochu**) a spouštěj ji odtud.

## Co je ve hře

- **Realistická aerodynamika plachet** — zdánlivý vítr (apparent wind), body větru (close-hauled, půl větru, zadoboční vítr, po větru), mrtvý úhel proti větru (~±40°), náklon lodi modelovaný jako rovnice s vratným momentem přes metacentrickou výšku, aerodynamický stín hlavní plachty na kosatku (motivace k přehození kosatky na motýlka při plavbě po větru).
- **4 stupně síly větru** — od bezvětří (6 uzlů, drobné poryvy) po bouři (32 uzlů, silné poryvy, kdy je nutné refovat).
- **Procedurální svět** — 28 ostrovů s organickou geometrií, vlnitá hladina přes vlastní FBM normal mapu (4 oktávy noise), obloha s atmosférickým rozptylem a env mapou pro odrazy.
- **Vizuální zpětná vazba** — pěnové bublinky v brázdě (custom shader, per-particle velikost), V-vlna od přídě v Kelvinově úhlu (centrovaná podle skutečné dráhy lodi, ne podle kursu), déšť jako „cometové" šrafy (jasná hlava → ukazuje směr větru).
- **Haptika** — vibrace při poryvu (Android), camera shake jako vizuální nahrazka pro iOS / desktop.
- **HUD v češtině** — windrose s boat-up orientací (loď je vždy nahoře, kardinály se otáčí s kursem), zvýrazněný mrtvý úhel, šipky pravého i zdánlivého větru, rychloměr v uzlech, posuvníky otěží, ukazatel náklonu, dynamická varování (luffing / poryv / hrozí převrhnutí).

## Stack

- [Three.js](https://threejs.org/) — WebGL rendering, `Water` a `Sky` shadery z `examples/jsm`
- [Vite](https://vitejs.dev/) — dev server + bundler
- Vanilla JS (ESM), žádné runtime deps navíc
- Žádný framework, žádný state manager

## Struktura

```
src/
├── main.js              # bootstrap: scéna, smyčka, propojení modulů
├── config.js            # konstanty, presety síly větru
├── core/                # GameLoop (fixed-step 60 Hz), EventBus
├── input/               # Keyboard, Controls, TouchControls, sailActions
├── physics/             # Boat, Sails, SailForces, HullDrag, Heel, Integrator
├── wind/                # Wind, Gust
├── render/              # Renderer, Camera, BoatMesh, SailMesh
├── world/               # Scene, Sky, Water, Islands, Rain, Wake
└── ui/                  # HUD, Compass, hud.css
```

Detailní popis konvencí (kurs, osy, znaménka rotací) a fyzikálních vzorců viz [`AGENTS.md`](./AGENTS.md).

## Deploy

`.github/workflows/pages.yml` buildí a publikuje na GitHub Pages při každém pushi. Pro vlastní deploy stačí v Settings → Pages přepnout Source na „GitHub Actions".

## Licence

MIT
