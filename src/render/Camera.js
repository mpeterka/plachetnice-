import * as THREE from 'three';

// Third-person smooth follow kamera. Pre-alokuje vektory aby update() nealokoval per-frame.
export class ChaseCamera {
  constructor(boat) {
    this.boat = boat;
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 5000);
    this.distance = 18;
    this.height = 7;
    this.lerpK = 4;
    this.shakeAmp = 0;
    this.shakeDecay = 4.0;
    this.camera.position.set(0, this.height, -this.distance);
    this.camera.lookAt(0, 2, 0);

    this._desired = new THREE.Vector3();
    this._lookAt = new THREE.Vector3();

    window.addEventListener('wheel', (e) => {
      this.distance = THREE.MathUtils.clamp(this.distance + e.deltaY * 0.02, 8, 60);
      this.height = this.distance * 0.4;
    }, { passive: true });
  }

  shake(amount) {
    this.shakeAmp = Math.min(1.5, Math.max(this.shakeAmp, amount));
  }

  update(dt) {
    const fwd = this.boat.forward();
    this._desired
      .copy(this.boat.position)
      .addScaledVector(fwd, -this.distance);
    this._desired.y += this.height;
    const alpha = 1 - Math.exp(-this.lerpK * dt);
    this.camera.position.lerp(this._desired, alpha);

    if (this.shakeAmp > 0.005) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeAmp;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeAmp * 0.6;
      this.camera.position.z += (Math.random() - 0.5) * this.shakeAmp;
      this.shakeAmp *= Math.exp(-this.shakeDecay * dt);
    } else {
      this.shakeAmp = 0;
    }

    this._lookAt.copy(this.boat.position);
    this._lookAt.y += 2;
    this.camera.lookAt(this._lookAt);
  }
}
