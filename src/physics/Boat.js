import * as THREE from 'three';

// State container — plain data, mutován physics moduly.
// Render moduly state pouze čtou, nikdy nemutují.
export class Boat {
  constructor() {
    this.position = new THREE.Vector3(0, 0, 0); // y = waterline
    // Heading kolem osy Y: 0 = +Z (sever), roste po směru hodin v top-down (90° = +X východ).
    this.heading = 0;
    this.velocity = new THREE.Vector3();
    this.angVelYaw = 0;
    this.heel = 0;            // rad, kolem lokální Z (forward); kladný = náklon na pravobok
    this.angVelHeel = 0;
    this.rudderAngle = 0;     // rad, +levobok (kormidlo doleva); ±π/4 max
    this._rudderTouched = false; // nastavuje TouchControls během držení; Controls.js podle něj skipuje spring-back

    // Pre-alokované basis vektory — mutují se v updateBasis(), čtou se mnohokrát za frame.
    this._forward = new THREE.Vector3();
    this._side = new THREE.Vector3();
    this.updateBasis();
  }

  // Přepočítej forward / side z aktuálního headingu. Volat 1× na začátku každého physics
  // kroku, ne při každém volání forward()/side(), jinak GC tlak v hot path.
  updateBasis() {
    const h = this.heading;
    this._forward.set(Math.sin(h), 0, Math.cos(h));
    this._side.set(Math.cos(h), 0, -Math.sin(h));
  }

  forward() { return this._forward; }
  side() { return this._side; }
}
