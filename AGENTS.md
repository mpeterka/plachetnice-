# AGENTS.md

Pokyny pro AI agenty pracující na tomto repozitáři.

## Co je projekt

Plachetní simulátor v prohlížeči. Realistická plachetní fyzika
(apparent wind, heel angle, no-go zóna, point of sail), kamera ve 3.
osobě, HUD v češtině, touch ovládání pro mobil, ostrovy, déšť jako
indikátor směru větru, pěnová stopa + V-vlna od přídě, gust system se
4 obtížnostmi.

Stack: **Three.js + Vite + vanilla JS (ESM), žádné runtime deps navíc.**

## Spuštění

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # produkční bundle do dist/
npm run preview      # preview build
```

Deploy: GitHub Actions workflow `.github/workflows/pages.yml` buildí a
publikuje na GitHub Pages při pushi na `main` nebo aktuální feature
branch. Pages URL: `https://mpeterka.github.io/plachetnice-/`.

## Struktura

```
src/
├── main.js              # bootstrap: scéna, smyčka, drát propojení modulů
├── config.js            # konstanty, presety obtížnosti, jednotky, pomocné enum funkce
├── core/
│   ├── GameLoop.js      # fixed-step physics (60Hz) + variable render
│   └── EventBus.js      # pub/sub: gust, warning, jibFlipped
├── input/
│   ├── Keyboard.js      # raw key state, jednorázové onPress handlery
│   ├── Controls.js      # mapování kláves → sails/boat state (kontinuální + diskrétní)
│   └── TouchControls.js # touch overlay (slidery, tlačítka) pro mobil
├── physics/
│   ├── Boat.js          # plain-data state: pozice, heading, velocity, heel, rudder
│   ├── Sails.js         # state main+jib + sailAngle() s no-go capem + jib flip pro motýlka
│   ├── SailForces.js    # apparent wind, CL/CD křivky, aerodynamický stín hlavní na kosatku
│   ├── HullDrag.js      # kvadratický fwd drag + silná boční rezistence (kýl)
│   ├── Heel.js          # 1-DOF náklon, restoring moment přes GM, tlumení
│   └── Integrator.js    # semi-implicit Euler pro lineární pohyb a yaw
├── wind/
│   ├── Wind.js          # true wind base + noise modulace + gust scheduler
│   └── Gust.js          # envelope ramp up / hold / ramp down
├── render/
│   ├── Renderer.js      # WebGLRenderer setup + resize
│   ├── Camera.js        # ChaseCamera (3. osoba, smooth follow, zoom kolečkem, shake na gust)
│   ├── BoatMesh.js      # trup z 12 stanic, paluba, stěžeň, boom, forestay, backstay, kormidlo
│   └── SailMesh.js      # hlavní (bílá+červený pruh, vertex colors) + kosatka (krémová), bulge + flapping
├── world/
│   ├── Scene.js         # THREE.Scene + lights + fog
│   ├── Sky.js           # THREE.Sky + PMREM env mapa
│   ├── Water.js         # THREE.Water + procedurální FBM normal mapa
│   ├── Islands.js       # 28 ostrovů jako hemisféry s noise displacementem + pískové prstence
│   ├── Rain.js          # 900 LineSegments kapek s vertex colors (komet efekt → směr větru)
│   └── Wake.js          # 1000 bublinkových částic (custom ShaderMaterial + radial-gradient sprite)
└── ui/
    ├── HUD.js           # update všech HUD prvků každý frame
    ├── Compass.js       # SVG kompas: heading + true wind + apparent wind needle
    └── hud.css          # DOM overlay styly + responsive + touch overlay + safe-area-insets
```

## Konvence souřadnic a směrů

**World axes (Three.js default):**
- `+Z` = sever (forward při heading=0)
- `+X` = východ (starboard při heading=0)
- `+Y` = nahoru (vertikální)

**Heading:**
- Kolem osy Y, 0 rad = +Z (sever)
- Roste po směru hodinových ručiček v top-down pohledu (heading 90° = východ)

**Boat-local osy** (přes `Boat.forward()` a `Boat.side()`):
- `forward()` = (sin h, 0, cos h) — kam příď
- `side()` = (cos h, 0, -sin h) — pravobok (starboard)

**Heel:**
- Rotace kolem lokální Z osy (forward) v Three.js `heelPivot`
- Kladný heel = náklon na pravobok (po směru hodinových ručiček při pohledu zezadu)

**Wind vector:**
- `wind.vector` = "KAM vítr fouká" (3D vektor v m/s ve světových osách)
- `wind.dir` = úhel ODKUD vítr fouká (rad), tj. baseDir z presetu (270° = ze západu)
- Tyhle dvě reprezentace jsou ČÁRA: rozdíl o π. `wind.vector` se počítá jako `-speed · unit(dir)`

**AWA (apparent wind angle):**
- Úhel relativně k přídi, znaménko ±π
- Záporné AWA = vítr z **levoboku (portu)**
- Kladné AWA = vítr z **pravoboku (starboardu)**

**SailLocalAngle (chord plachty vůči lodi):**
- Záporné = chord na levoboku (port)
- Kladné = chord na pravoboku (starboard)
- Fyzika: `sailAngle = -awaSign · cappedMag` → plachta vždy padá na **leeward** stranu (opačně od větru)
- Vizuál: `boomPivot.rotation.y = -sailAngle` (Three.js +rotation.y otáčí -Z → -X, takže potřeba inverze)

## Klíčové fyzikální vzorce

V `SailForces.js`:

```
apparent  = trueWind - boatVelocity
AWS       = |apparent|
AWA       = wrap(atan2(-apparent.x, -apparent.z) - heading)

α (angle of attack) = wrap(windFromAngleWorld - chordAngleWorld)
  → reflektováno přes π/2 (chord je čára, ne šipka)

CL, CD = lookup table podle |α|:
  |α| < 10° → CL=0, CD=0.01 (luffing / flapping)
  10°–20°  → CL roste lineárně do 1.2, CD ~0.05–0.1
  20°–90°  → CL = 1.2·sin(2α) klesá, CD = 0.1 + 0.4·sin²α
  90°–180° → CL=0, CD = 1.2·sin²α (downwind drag-driven)

q (dynamic pressure) = 0.5 · ρ_air · AWS²
F_aero = q · A_eff · (CL · perp(apparent) + CD · dir(apparent))
A_eff = A_full · (1 - reefFraction) · max(0.2, cos(heel))    // spill při velkém heelu

Pokud jsou main a jib na stejné straně AND |AWA| > 130° → jib v aerodynamickém stínu,
  jib_A_eff *= 0.2  (= motivace vyklopit kosatku na motýlka)
```

V `HullDrag.js`:

```
F_fwd_drag = -k_drag · |v_fwd| · v_fwd       // kvadratický
F_lat      = -k_lat  · v_side · side         // kýl: silně linear lateral
```

V `Heel.js`:

```
M_heel    = F_side · h_CE                    // moment od plachet
M_restore = -m · g · GM · sin(heel)          // metacentrická výška
M_damp    = -c · ω_heel
α_heel    = (M_heel + M_restore + M_damp) / I_heel
```

V `Integrator.js`: semi-implicit Euler (`v += a·dt; x += v·dt`).

## Herní smyčka

`GameLoop` (core/GameLoop.js):
1. `accumulator += min(frameDelta, 0.25)`
2. Pokud nepauznuto: `while accumulator >= DT (1/60s)`:
   - `controls.update(dt)` (input → sails/boat state)
   - `wind.update(dt, t)` (noise + gust scheduler)
   - `computeSailForces()`, `computeHullDrag()` → integrovat → `stepHeel()`
3. Per frame:
   - `boatMesh.sync()`, `sailMesh.sync()`
   - `chase.update()`, `rain.update()`, `wake.update()`, `touchControls.update()`
   - `hud.update()`
   - `renderer.render()`

**Pravidlo:** physics moduly MUTUJÍ plain-data state (Boat, Sails). Render moduly state pouze ČTOU. UI moduly ČTOU + pošlou input do bus.

## Conventional commit style

```
<imperative summary, ≤ 70 chars>

Co/Proč ve 2–4 odstavcích. Vysvětli WHY (proč to děláme), ne WHAT (to vidí ze
codu). Zmiň jakýkoliv non-obvious tradeoff. Pokud opravuješ bug, popiš JAK
vznikl, ne jen že je opravený.
```

## Při úpravách buď opatrný

- **Konvence úhlů a znamének je delikátní** — Three.js rotation.y točí
  v rámci right-hand rule kolem +Y; world heading roste po směru hodin
  v top-down. Při změně rotace ráhna nebo kompasu vždy verify znaménko.
- **Per-frame alokace** v `update()` metodách = jank na mobilech. Pre-aloc
  Vector3 jako field a mutuj přes `.copy()` / `.set()`.
- **DOM queries** v HUD.update() musí být cachované v konstruktoru —
  60× za sekundu querySelector je drahé.
- **Touch + keyboard musí koexistovat** — TouchControls.spawn nastavuje
  `boat._rudderTouched`, který v `Controls.js` skipuje spring-back pro
  rudder. Nezruš tu signalizaci při refactoringu.
- **THREE.Water shader** interně sampluje normal texturu na 4 měřítkách
  (103, 107, 8907, 1091 jednotek). Pro vlnky vidíhené z lodi je důležitý
  parametr `size` (60 = perioda ~1-2m blízko).

## Testy

Aktuálně **žádné automatizované testy**. Manuální sanity check po změnách:
- Beam reach (vítr z boku) → loď se rozjede do ~5 kn
- No-go zóna (příď proti větru) → loď stojí, plachty luffují
- Tack: otoč přes vítr, plachty musí přehodit stranu
- Gust: očekávat camera shake + (Android) vibrace
- Mobilní touch: slidery, kormidlo se vrací do středu, tlačítka cyklí

Před commitem: `npm run build` (musí projít bez chyb).

## Co NEdělat

- **Nepřidávat backwards-compatibility shimy** — projekt je solo, žádné API
  konzumenti. Refaktoruj přímo.
- **Negenerovat dokumentaci souborů co neexistují** (README, CHANGELOG, …)
  bez explicitního požadavku uživatele.
- **Neimportovat další runtime deps** bez konzultace — momentálně jen `three`,
  velikost bundlu je hlídaná.
- **Nepřepisovat fyzikální vzorce** bez sanity testu — i drobná změna
  znaménka v `SailForces.js` dokáže rozhodit chování ve více scénářích.
