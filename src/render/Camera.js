import * as THREE from 'three';

// Third-person follow kamera se sférickou orbitou kolem lodi.
// Vstupy:
//   desktop: kolečko = zoom, drag myší = orbit (yaw + pitch)
//   mobil:   single-finger drag = orbit, pinch dvěma prsty = zoom
// HUD elementy mají pointer-events:auto a zachytí svoje tapy dřív než canvas.
const PITCH_MIN = 0.05;   // ~3° — nikdy nepadnout na horizont nebo pod vodu
const PITCH_MAX = 1.4;    // ~80° — nikdy zcela shora
const DIST_MIN = 8;
const DIST_MAX = 70;
const DRAG_THRESHOLD = 4; // px — drobnější pohyby pokládáme za tapy, ne drag

export class ChaseCamera {
  constructor(boat, canvas) {
    this.boat = boat;
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 5000);

    this.distance = 20;
    this.yaw = 0;
    this.pitch = 0.32; // ~18° nad horizont
    this.lerpK = 4;
    this.shakeAmp = 0;
    this.shakeDecay = 4.0;

    this._desired = new THREE.Vector3();
    this._lookAt = new THREE.Vector3();
    this._pointers = new Map();
    this._lastPinchDist = null;

    this._installInput(canvas);

    this._updateDesired();
    this.camera.position.copy(this._desired);
    this.camera.lookAt(boat.position);
  }

  shake(amount) {
    this.shakeAmp = Math.min(1.5, Math.max(this.shakeAmp, amount));
  }

  _installInput(canvas) {
    canvas.addEventListener('wheel', (e) => {
      this.distance = THREE.MathUtils.clamp(this.distance + e.deltaY * 0.02, DIST_MIN, DIST_MAX);
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('pointerdown', (e) => {
      this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, dragged: false });
      this._lastPinchDist = null;
    });

    canvas.addEventListener('pointermove', (e) => {
      const prev = this._pointers.get(e.pointerId);
      if (!prev) return;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      prev.x = e.clientX;
      prev.y = e.clientY;

      if (this._pointers.size === 2) {
        // Pinch zoom
        const [p1, p2] = [...this._pointers.values()];
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        if (this._lastPinchDist !== null && dist > 0) {
          this.distance = THREE.MathUtils.clamp(this.distance * (this._lastPinchDist / dist), DIST_MIN, DIST_MAX);
        }
        this._lastPinchDist = dist;
        return;
      }
      // Single-finger drag = orbit. Threshold zabrání jiskření kamery při jediném tapu.
      if (!prev.dragged && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
      prev.dragged = true;
      // Až teď zachytíme pointer — zbytek gesture jde do canvasu, i kdyby uživatel
      // přejel přes HUD overlay.
      try { canvas.setPointerCapture(e.pointerId); } catch {}
      this.yaw -= dx * 0.005;
      this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.005, PITCH_MIN, PITCH_MAX);
    });

    const release = (e) => {
      this._pointers.delete(e.pointerId);
      if (this._pointers.size < 2) this._lastPinchDist = null;
      try { canvas.releasePointerCapture(e.pointerId); } catch {}
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('pointerleave', release);
  }

  // Sférická orbita kolem lodi. yaw=0 = za lodí, pitch=0 = horizont, pitch=π/2 = shora.
  _updateDesired() {
    const fwd = this.boat.forward();
    const bx = -fwd.x;
    const bz = -fwd.z;
    const cy = Math.cos(this.yaw);
    const sy = Math.sin(this.yaw);
    const orbitX = bx * cy + bz * sy;
    const orbitZ = -bx * sy + bz * cy;

    const cp = Math.cos(this.pitch);
    const sp = Math.sin(this.pitch);

    this._desired.copy(this.boat.position);
    this._desired.x += orbitX * this.distance * cp;
    this._desired.y += this.distance * sp + 2.0; // +2 m bezpečnostní offset nad hladinou
    this._desired.z += orbitZ * this.distance * cp;
  }

  update(dt) {
    this._updateDesired();
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
