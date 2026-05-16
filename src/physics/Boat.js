// State container — plain data, mutován physics moduly.
import * as THREE from 'three';

export class Boat {
  constructor() {
    this.position = new THREE.Vector3(0, 0, 0); // y = waterline
    // Heading je kolem osy Y (nahoru). 0 rad = +Z (forward konvence).
    this.heading = 0;
    this.velocity = new THREE.Vector3(); // ve světových souřadnicích
    this.angVelYaw = 0;
    this.heel = 0;       // rad, kolem osy +Z (po směru pohybu = naklonění doprava)
    this.angVelHeel = 0;
    this.rudderAngle = 0; // rad, +levobok, -pravobok (kormidlo doleva = pravý ráhno)
    this.lastForward = 0; // pro HUD
    this.lastSide = 0;
  }

  // Jednotkové vektory v rovině XZ (svět)
  forward() {
    // heading 0 -> (0,0,1)
    return new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
  }
  side() {
    // pravobok (right) — kolmý na forward, otočený o -90°
    return new THREE.Vector3(Math.cos(this.heading), 0, -Math.sin(this.heading));
  }
}
