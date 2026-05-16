import * as THREE from 'three';

// Placeholder loď: trup (taper box), paluba, stěžeň, ráhno. Plachty řeší SailMesh.
export class BoatMesh {
  constructor() {
    this.root = new THREE.Group();
    this.heelPivot = new THREE.Group(); // přijímá heel rotaci
    this.root.add(this.heelPivot);

    const hullColor = 0xffffff;
    const deckColor = 0x6e3a16;
    const trimColor = 0x222222;

    // Trup – zúžit přídu manipulací s vertexy
    const hullGeo = new THREE.BoxGeometry(2.4, 1.2, 8, 1, 1, 4);
    const pos = hullGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i);
      const x = pos.getX(i);
      const y = pos.getY(i);
      // zúžit přídu (z > 0): scale x and bottom y
      if (z > 2) {
        const f = 1 - Math.min(1, (z - 2) / 2) * 0.85;
        pos.setX(i, x * f);
      }
      // zaoblit spodek (V-shape)
      if (y < 0) {
        pos.setX(i, x * 0.6);
        pos.setY(i, y - 0.4);
      }
    }
    pos.needsUpdate = true;
    hullGeo.computeVertexNormals();
    const hull = new THREE.Mesh(hullGeo, new THREE.MeshStandardMaterial({ color: hullColor, roughness: 0.6 }));
    hull.position.y = 0.3;
    this.heelPivot.add(hull);

    // Paluba
    const deckGeo = new THREE.BoxGeometry(2.2, 0.1, 7.5);
    const deck = new THREE.Mesh(deckGeo, new THREE.MeshStandardMaterial({ color: deckColor, roughness: 0.85 }));
    deck.position.y = 0.85;
    this.heelPivot.add(deck);

    // Kokpit (zápustek)
    const cockpitGeo = new THREE.BoxGeometry(1.4, 0.5, 2);
    const cockpit = new THREE.Mesh(cockpitGeo, new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.9 }));
    cockpit.position.set(0, 0.7, -1.5);
    this.heelPivot.add(cockpit);

    // Stěžeň
    const mastGeo = new THREE.CylinderGeometry(0.08, 0.08, 9, 12);
    const mast = new THREE.Mesh(mastGeo, new THREE.MeshStandardMaterial({ color: 0xc8c8c8, metalness: 0.7, roughness: 0.3 }));
    mast.position.set(0, 0.85 + 4.5, 0.5);
    this.heelPivot.add(mast);

    // Ráhno (boom) – jeho rotaci řídí SailMesh
    this.boomPivot = new THREE.Group();
    this.boomPivot.position.set(0, 1.9, 0.5);
    const boomGeo = new THREE.CylinderGeometry(0.05, 0.05, 3.8, 8);
    const boom = new THREE.Mesh(boomGeo, new THREE.MeshStandardMaterial({ color: 0xc8c8c8, metalness: 0.7, roughness: 0.3 }));
    boom.rotation.x = Math.PI / 2;
    boom.position.z = -1.9; // ráhno směřuje dozadu
    this.boomPivot.add(boom);
    this.heelPivot.add(this.boomPivot);

    // Forestay – přední lano pro kosatku
    const forestayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.85 + 9, 0.5),
      new THREE.Vector3(0, 0.85, 3.8),
    ]);
    const stay = new THREE.Line(forestayGeo, new THREE.LineBasicMaterial({ color: 0x999999 }));
    this.heelPivot.add(stay);

    // Kormidlo
    this.rudderPivot = new THREE.Group();
    this.rudderPivot.position.set(0, 0.1, -3.9);
    const rudderGeo = new THREE.BoxGeometry(0.05, 1.2, 0.6);
    const rudder = new THREE.Mesh(rudderGeo, new THREE.MeshStandardMaterial({ color: 0x444444 }));
    rudder.position.set(0, -0.6, -0.3);
    this.rudderPivot.add(rudder);
    this.heelPivot.add(this.rudderPivot);
  }

  sync(boat) {
    this.root.position.copy(boat.position);
    this.root.rotation.y = boat.heading;
    // Heel kolem osy Z lodi (lokální dopředu)
    this.heelPivot.rotation.z = boat.heel;
    this.rudderPivot.rotation.y = boat.rudderAngle;
  }

  // Vrátí pivot a další body, na které se připíchnou plachty
  getRiggingAnchors() {
    return {
      boomPivot: this.boomPivot,
      mastTop: new THREE.Vector3(0, 0.85 + 9, 0.5),
      mastBase: new THREE.Vector3(0, 1.9, 0.5),
      bowstayBase: new THREE.Vector3(0, 0.85, 3.8),
      heelPivot: this.heelPivot,
    };
  }
}
