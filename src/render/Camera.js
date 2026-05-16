import * as THREE from 'three';

// Third-person smooth follow kamera.
export class ChaseCamera {
  constructor(boat) {
    this.boat = boat;
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 5000);
    this.distance = 18;
    this.height = 7;
    this.lerpK = 4; // vyšší = rychlejší následování
    this.lookAhead = 0;
    // Init position
    this.camera.position.set(0, this.height, -this.distance);
    this.camera.lookAt(0, 2, 0);

    window.addEventListener('wheel', (e) => {
      this.distance = THREE.MathUtils.clamp(this.distance + e.deltaY * 0.02, 8, 60);
      this.height = this.distance * 0.4;
    }, { passive: true });
  }

  update(dt) {
    const fwd = this.boat.forward();
    const desired = new THREE.Vector3()
      .copy(this.boat.position)
      .addScaledVector(fwd, -this.distance)
      .add(new THREE.Vector3(0, this.height, 0));
    const alpha = 1 - Math.exp(-this.lerpK * dt);
    this.camera.position.lerp(desired, alpha);
    const lookAt = new THREE.Vector3()
      .copy(this.boat.position)
      .add(new THREE.Vector3(0, 2, 0))
      .addScaledVector(fwd, this.lookAhead);
    this.camera.lookAt(lookAt);
  }
}
