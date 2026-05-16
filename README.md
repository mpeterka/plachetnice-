# Plachetnice 🛥️

Plachetní simulátor v prohlížeči. Realistická fyzika apparent wind, heel, no-go zóny a body kursu. Funguje na desktopu i mobilu.

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

### Desktop (klávesnice)

| Klávesa | Akce |
|---|---|
| `A` / `D` | Kormidlo doleva / doprava (drží = vychýleno, pustí = spring-back) |
| `W` / `S` | Otěž hlavní povolit / dotáhnout |
| `↑` / `↓` | Otěž kosatky povolit / dotáhnout |
| `R` | Cyklus refu hlavní (0 → 1 → 2 → 3 → 0) |
| `F` / `Shift+F` | Svinout / rozvinout kosatku |
| `G` | Motýlek (vyklopit kosatku na opačnou stranu pro wing-on-wing) |
| `T` | Topenant on/off (blokuje setí hlavní, dokud je napnutý) |
| `H` / `J` | Fal hlavní / kosatky (set / strike) |
| `1` – `4` | Volba obtížnosti (Klid / Mírný / Čerstvý / Bouře) |
| `P` | Pauza |
| `` ` `` | Debug HUD (AWA, AWS, CL, CD, …) |
| Kolečko myši | Zoom kamery |

### Mobil (touch)

- **Vertikální slidery na bočích** — otěž hlavní (vlevo) a kosatky (vpravo). Drag prstem.
- **Horizontální slider dole** — kormidlo. Pustíš prst, vrátí se do středu.
- **Tlačítka:** Ref (cykluje), Kosatka − / + (svinout / rozvinout), Motýlek (toggle), obtížnost (cykluje), fullscreen (⛶).

iOS Safari neumožňuje Fullscreen API přes DOM — pro plné okno přidej hru na plochu (Safari Sdílet → **Přidat na plochu**) a spouštěj ji odtud.

## Co je ve hře

- **Realistická plachetní fyzika** — apparent wind, body kursu (close-hauled, beam reach, broad reach, running), no-go zóna, heel jako 1-DOF rovnice s restoring momentem přes metacentrickou výšku, aerodynamický stín hlavní na kosatku (= motivace vyklopit kosatku na motýlka při deep run).
- **4 obtížnosti větru** — od Klidu (6 kn, drobné gusty) po Bouři (32 kn, silné poryvy, kdy je potřeba refovat).
- **Procedurální svět** — 28 ostrovů s organickou geometrií, vlnitá voda přes vlastní FBM normal mapu (4 oktávy noise), obloha s atmosférickým rozptylem a env mapou pro odrazy.
- **Vizuální zpětná vazba** — pěnové bublinky za zádí (custom shader, per-particle velikost), V-vlna od přídě v Kelvinově úhlu (centrovaná podle skutečné dráhy lodi, ne headingu), déšť jako „comet" šrafy (jasná hlava → ukazuje směr větru).
- **Haptika** — vibrace při gustu (Android), camera shake jako vizuální nahrazka pro iOS / desktop.
- **HUD v češtině** — kompas se třemi šipkami (heading, true wind, apparent wind), rychloměr v uzlech, slidery otěží, heel meter, dynamická varování (luffing / náraz větru / hrozí převrhnutí).

## Stack

- [Three.js](https://threejs.org/) — WebGL rendering, `Water` a `Sky` shadery z `examples/jsm`
- [Vite](https://vitejs.dev/) — dev server + bundler
- Vanilla JS (ESM), žádné runtime deps navíc
- Žádný build framework, žádný state manager

## Struktura

```
src/
├── main.js              # bootstrap: scéna, smyčka, propojení modulů
├── config.js            # konstanty, presety obtížnosti
├── core/                # GameLoop (fixed-step 60 Hz), EventBus
├── input/               # Keyboard, Controls, TouchControls, sailActions
├── physics/             # Boat, Sails, SailForces, HullDrag, Heel, Integrator
├── wind/                # Wind, Gust
├── render/              # Renderer, Camera, BoatMesh, SailMesh
├── world/               # Scene, Sky, Water, Islands, Rain, Wake
└── ui/                  # HUD, Compass, hud.css
```

Podrobnější popis konvencí (heading, osy, znaménka rotací) a fyzikálních vzorců viz [`AGENTS.md`](./AGENTS.md).

## Deploy

`.github/workflows/pages.yml` buildí a publikuje na GitHub Pages při každém pushi. Pro vlastní deploy stačí v Settings → Pages přepnout Source na "GitHub Actions".

## Licence

MIT
