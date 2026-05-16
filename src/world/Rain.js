import * as THREE from 'three';

// Kapky deště jako LineSegments. Každá kapka = krátká úsečka orientovaná podle
// rychlostního vektoru (gravitace + drift od větru). Hráč vidí diagonální šrafu
// → úhel a směr přímo odhalují směr a sílu větru.
export class Rain {
  constructor(scene, camera, opts = {}) {
    this.count = opts.count ?? 900;
    this.radius = opts.radius ?? 55;     // hustější spawn okolo kamery
    this.ceiling = opts.ceiling ?? 35;   // strop spawnování
    this.tailLen = opts.tailLen ?? 1.6;  // delší šrafa
    this.dragFactor = opts.dragFactor ?? 0.7; // víc unášené větrem
    this.camera = camera;

    this.positions = new Float32Array(this.count * 6); // 2 endpointy × 3 floats
    this.fallSpeeds = new Float32Array(this.count);
    this.tailScales = new Float32Array(this.count);    // variace délky kapek
    this.colors = new Float32Array(this.count * 6);    // per-vertex barva (gradient head→tail)

    for (let i = 0; i < this.count; i++) {
      this._spawn(i, true);
      // Head (vertex 0) = jasná bílá, tail (vertex 1) = tmavá modrá
      // → vizuálně „komet": světlý konec ukazuje KAM kapka letí (= směr větru + dolů)
      this.colors[i * 6 + 0] = 1.0; this.colors[i * 6 + 1] = 1.0; this.colors[i * 6 + 2] = 1.0;
      this.colors[i * 6 + 3] = 0.25; this.colors[i * 6 + 4] = 0.35; this.colors[i * 6 + 5] = 0.55;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    this.mesh = new THREE.LineSegments(geo, mat);
    this.mesh.frustumCulled = false; // pozice se updateuje per-frame
    scene.add(this.mesh);
  }

  _spawn(i, initial) {
    const cx = this.camera.position.x;
    const cz = this.camera.position.z;
    const angle = Math.random() * Math.PI * 2;
    // sqrt → rovnoměrná hustota v kruhu
    const r = Math.sqrt(Math.random()) * this.radius;
    const x = cx + Math.cos(angle) * r;
    const z = cz + Math.sin(angle) * r;
    const y = initial ? Math.random() * this.ceiling : this.ceiling - 5 + Math.random() * 5;
    const i6 = i * 6;
    this.positions[i6 + 0] = x;
    this.positions[i6 + 1] = y;
    this.positions[i6 + 2] = z;
    this.positions[i6 + 3] = x;
    this.positions[i6 + 4] = y + this.tailLen;
    this.positions[i6 + 5] = z;
    this.fallSpeeds[i] = 8 + Math.random() * 6;
    // Variace délky kapek (0.6× až 1.4× této tailLen)
    this.tailScales[i] = 0.6 + Math.random() * 0.8;
  }

  update(dt, wind) {
    const wx = wind.vector.x;
    const wz = wind.vector.z;
    const drag = this.dragFactor;
    const tail = this.tailLen;
    for (let i = 0; i < this.count; i++) {
      const i6 = i * 6;
      const fall = this.fallSpeeds[i];
      const vx = wx * drag;
      const vy = -fall;
      const vz = wz * drag;
      this.positions[i6 + 0] += vx * dt;
      this.positions[i6 + 1] += vy * dt;
      this.positions[i6 + 2] += vz * dt;
      // Tail = ten konec úsečky proti směru pohybu → ukazuje odkud kapka přišla.
      const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
      if (speed > 0.001) {
        const inv = (tail * this.tailScales[i]) / speed;
        this.positions[i6 + 3] = this.positions[i6 + 0] - vx * inv;
        this.positions[i6 + 4] = this.positions[i6 + 1] - vy * inv;
        this.positions[i6 + 5] = this.positions[i6 + 2] - vz * inv;
      }
      // Respawn při dopadu na hladinu nebo při velkém drift mimo radius
      if (this.positions[i6 + 1] < 0.15) {
        this._spawn(i, false);
      }
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
  }
}
