import * as THREE from 'three';

// Skutečný tvar trupu: postaveno z příčných řezů (stations) podél osy Z.
// Každý řez = uzavřená křivka v rovině XY, šířka a hloubka se mění z přídy
// k zádi. Mezi sousedními řezy triangulujeme stěny.
const STATIONS = [
  // z = pozice podél lodi (+Z = příď). halfWidth/depth/sheerY jsou v metrech.
  { z: -4.0, halfWidth: 0.55, depth: 0.55, sheerY: 1.08 }, // záď (transom)
  { z: -3.4, halfWidth: 0.85, depth: 0.75, sheerY: 1.02 },
  { z: -2.6, halfWidth: 1.02, depth: 0.92, sheerY: 0.96 },
  { z: -1.8, halfWidth: 1.13, depth: 1.05, sheerY: 0.92 },
  { z: -0.9, halfWidth: 1.18, depth: 1.10, sheerY: 0.89 },
  { z:  0.0, halfWidth: 1.20, depth: 1.12, sheerY: 0.88 }, // střed (max šířky)
  { z:  0.9, halfWidth: 1.17, depth: 1.08, sheerY: 0.88 },
  { z:  1.8, halfWidth: 1.08, depth: 1.00, sheerY: 0.91 },
  { z:  2.6, halfWidth: 0.88, depth: 0.88, sheerY: 0.96 },
  { z:  3.3, halfWidth: 0.58, depth: 0.70, sheerY: 1.04 },
  { z:  3.8, halfWidth: 0.25, depth: 0.45, sheerY: 1.16 },
  { z:  4.1, halfWidth: 0.02, depth: 0.18, sheerY: 1.28 }, // špička přídě
];

// Body na jednom řezu: půlkružnice od portu (levobok) přes kýl do startboardu (pravobok)
const HALF_POINTS = 9;                      // počet bodů na jedné straně
const RING_SIZE = 2 * HALF_POINTS + 1;      // 0..N=port→keel, N..2N=keel→starboard

// Vrátí 3D bod na řezu pro daný index 0..RING_SIZE-1.
// i=0 → port deck, i=HALF_POINTS → kýl (x=0), i=RING_SIZE-1 → starboard deck.
function stationPoint(station, i) {
  const t = (i / (RING_SIZE - 1)) * Math.PI; // 0..π
  const x = -station.halfWidth * Math.cos(t);
  // Křivka mezi sheer a kýlem: blend přes sin^0.85 dává oblý tvar trupu.
  const blend = Math.pow(Math.sin(t), 0.85);
  const y = station.sheerY * (1 - blend) + (-station.depth) * blend;
  return [x, y, station.z];
}

function makeHullGeometry() {
  const positions = [];
  const indices = [];

  // 1) Vygeneruj kruhy bodů na každé stanici
  for (const st of STATIONS) {
    for (let i = 0; i < RING_SIZE; i++) {
      positions.push(...stationPoint(st, i));
    }
  }

  // 2) Triangulace mezi sousedními kruhy (boky trupu)
  for (let s = 0; s < STATIONS.length - 1; s++) {
    const base = s * RING_SIZE;
    const next = (s + 1) * RING_SIZE;
    for (let i = 0; i < RING_SIZE - 1; i++) {
      const a = base + i;
      const b = base + i + 1;
      const c = next + i;
      const d = next + i + 1;
      // CCW při pohledu zvenku (normály ven). Wind: (a, b, c) a (b, d, c).
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  // 3) Záď (transom) — vyplnit fanem do středového bodu
  const transom = STATIONS[0];
  const centerY = (transom.sheerY - transom.depth) * 0.5;
  const centerIdx = positions.length / 3;
  positions.push(0, centerY, transom.z);
  for (let i = 0; i < RING_SIZE - 1; i++) {
    // Pohled zezadu (z -Z) — wind CCW
    indices.push(i, centerIdx, i + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// Paluba: tenký pás kopírující sheer line trupu.
function makeDeckGeometry() {
  const positions = [];
  const indices = [];
  // Pro každou stanici: dva body (port deck, starboard deck) na sheer výšce
  for (const st of STATIONS) {
    const w = st.halfWidth;
    const y = st.sheerY + 0.01; // mírně nad trupem, aby neflickoval
    positions.push(-w, y, st.z);   // port
    positions.push(+w, y, st.z);   // starboard
  }
  // Triangulace pásu
  for (let s = 0; s < STATIONS.length - 1; s++) {
    const p0 = s * 2;     // port s
    const p1 = s * 2 + 1; // stb s
    const p2 = (s + 1) * 2;
    const p3 = (s + 1) * 2 + 1;
    // Pohled shora — wind CCW (+Y normála nahoru)
    indices.push(p0, p2, p1);
    indices.push(p1, p2, p3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export class BoatMesh {
  constructor() {
    this.root = new THREE.Group();
    this.heelPivot = new THREE.Group();
    this.root.add(this.heelPivot);

    const hullColor = 0xf2f2f2;
    const deckColor = 0x7a4a1f;
    const trimColor = 0x2a2a2a;

    // Trup
    const hull = new THREE.Mesh(
      makeHullGeometry(),
      new THREE.MeshStandardMaterial({ color: hullColor, roughness: 0.55, flatShading: false }),
    );
    this.heelPivot.add(hull);

    // Paluba
    const deck = new THREE.Mesh(
      makeDeckGeometry(),
      new THREE.MeshStandardMaterial({ color: deckColor, roughness: 0.85 }),
    );
    this.heelPivot.add(deck);

    // Reference výška paluby uprostřed pro umístění kabinky/stěžně/forestay.
    // Stanice z=0: sheerY = 0.88, plus 0.01 offset → 0.89.
    const DECK_AT_MID = 0.89;
    const DECK_AT_BOW_STAY = 1.04;  // forestay anchor (interpolace okolo z≈3.0)

    // Kabinka (nad palubou)
    const cockpitGeo = new THREE.BoxGeometry(1.4, 0.32, 2.2);
    const cockpit = new THREE.Mesh(cockpitGeo, new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.9 }));
    cockpit.position.set(0, DECK_AT_MID + 0.16, -1.3);
    this.heelPivot.add(cockpit);

    // Stěžeň
    const mastGeo = new THREE.CylinderGeometry(0.08, 0.08, 9, 12);
    const mast = new THREE.Mesh(mastGeo, new THREE.MeshStandardMaterial({ color: 0xc8c8c8, metalness: 0.7, roughness: 0.3 }));
    mast.position.set(0, DECK_AT_MID + 4.5, 0.5);
    this.heelPivot.add(mast);

    // Ráhno
    this.boomPivot = new THREE.Group();
    this.boomPivot.position.set(0, DECK_AT_MID + 1.0, 0.5);
    const boomGeo = new THREE.CylinderGeometry(0.05, 0.05, 3.8, 8);
    const boom = new THREE.Mesh(boomGeo, new THREE.MeshStandardMaterial({ color: 0xc8c8c8, metalness: 0.7, roughness: 0.3 }));
    boom.rotation.x = Math.PI / 2;
    boom.position.z = -1.9;
    this.boomPivot.add(boom);
    this.heelPivot.add(this.boomPivot);

    // Forestay
    const mastTopY = DECK_AT_MID + 9;
    const forestayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, mastTopY, 0.5),
      new THREE.Vector3(0, DECK_AT_BOW_STAY, 3.6),
    ]);
    const stay = new THREE.Line(forestayGeo, new THREE.LineBasicMaterial({ color: 0x999999 }));
    this.heelPivot.add(stay);

    // Backstay – záďové lano pro doplnění siluety
    const backstayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, mastTopY, 0.5),
      new THREE.Vector3(0, 1.05, -3.9),
    ]);
    this.heelPivot.add(new THREE.Line(backstayGeo, new THREE.LineBasicMaterial({ color: 0x999999 })));

    // Kormidlo
    this.rudderPivot = new THREE.Group();
    this.rudderPivot.position.set(0, 0.1, -4.0);
    const rudderGeo = new THREE.BoxGeometry(0.05, 1.2, 0.6);
    const rudder = new THREE.Mesh(rudderGeo, new THREE.MeshStandardMaterial({ color: 0x444444 }));
    rudder.position.set(0, -0.6, -0.3);
    this.rudderPivot.add(rudder);
    this.heelPivot.add(this.rudderPivot);

    // Uložené hodnoty pro getRiggingAnchors (deckTop pro jib tack)
    this._deckTop = DECK_AT_BOW_STAY;
  }

  sync(boat) {
    this.root.position.copy(boat.position);
    this.root.rotation.y = boat.heading;
    this.heelPivot.rotation.z = boat.heel;
    this.rudderPivot.rotation.y = boat.rudderAngle;
  }

  getRiggingAnchors() {
    return {
      boomPivot: this.boomPivot,
      deckTop: this._deckTop,
      heelPivot: this.heelPivot,
    };
  }
}
