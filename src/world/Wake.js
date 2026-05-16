import * as THREE from 'three';

// Pěna za lodí a od přídě. Stopa indikuje rychlost — pomalá loď žádný wake,
// rychlá loď výrazný stěr za zádí + V od přídě (Kelvin angle ~19.5°).
export class Wake {
  constructor(scene, opts = {}) {
    this.max = opts.max ?? 600;
    this.positions = new Float32Array(this.max * 3);
    this.velocities = new Float32Array(this.max * 3);
    this.ages = new Float32Array(this.max);
    this.lifetimes = new Float32Array(this.max);
    this.next = 0;

    for (let i = 0; i < this.max; i++) {
      // Mrtvé: pod hladinou + lifetime nastavena tak, že je „expired"
      this.positions[i * 3 + 1] = -1000;
      this.ages[i] = 1;
      this.lifetimes[i] = 1;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.4,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });

    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);

    this._sternSpawnAcc = 0;
    this._bowSpawnAcc = 0;
  }

  _spawn(x, z, vx, vz, lifetime) {
    const i = this.next;
    this.next = (this.next + 1) % this.max;
    this.positions[i * 3 + 0] = x;
    this.positions[i * 3 + 1] = 0.06;       // těsně nad hladinou
    this.positions[i * 3 + 2] = z;
    this.velocities[i * 3 + 0] = vx;
    this.velocities[i * 3 + 2] = vz;
    this.ages[i] = 0;
    this.lifetimes[i] = lifetime;
  }

  update(dt, boat) {
    const speed = boat.velocity.length();
    const fwd = boat.forward();
    const side = boat.side();

    // === Stěr za zádí ===
    // Rate roste lineárně s rychlostí. Akumulátor → respektuje malé dt.
    const sternRate = speed * 6;
    this._sternSpawnAcc += sternRate * dt;
    const sternPos = new THREE.Vector3()
      .copy(boat.position)
      .addScaledVector(fwd, -4.0);
    while (this._sternSpawnAcc >= 1) {
      this._sternSpawnAcc -= 1;
      const offset = (Math.random() - 0.5) * 1.8; // rozmístění napříč zádí
      const px = sternPos.x + side.x * offset;
      const pz = sternPos.z + side.z * offset;
      // Lehký drift bočně + mírně dozadu (v souřadnicích světa stojí, loď ujede)
      const vx = side.x * offset * 0.4 - fwd.x * 0.5;
      const vz = side.z * offset * 0.4 - fwd.z * 0.5;
      this._spawn(px, pz, vx, vz, 4.5);
    }

    // === V-vlna od přídě (Kelvin angle ~19.5°, sin/cos pevně) ===
    if (speed > 1.2) {
      const bowRate = speed * 10;
      this._bowSpawnAcc += bowRate * dt;
      const bowPos = new THREE.Vector3()
        .copy(boat.position)
        .addScaledVector(fwd, 4.0);
      const kelvinSin = Math.sin(0.34);
      const kelvinCos = Math.cos(0.34);
      // Rychlost vlny — ~0.7 × rychlost lodi (vlna je o trochu pomalejší)
      const wakeSpeed = speed * 0.7;
      while (this._bowSpawnAcc >= 1) {
        this._bowSpawnAcc -= 1;
        const sideSign = Math.random() < 0.5 ? -1 : 1;
        // Velocity: dopředu kelvinCos × wakeSpeed, do strany kelvinSin × wakeSpeed
        const vx = fwd.x * wakeSpeed * kelvinCos + side.x * sideSign * wakeSpeed * kelvinSin;
        const vz = fwd.z * wakeSpeed * kelvinCos + side.z * sideSign * wakeSpeed * kelvinSin;
        // Spawn poblíž přídě, mírně do strany
        const startOff = sideSign * 0.15;
        const px = bowPos.x + side.x * startOff;
        const pz = bowPos.z + side.z * startOff;
        this._spawn(px, pz, vx, vz, 3.0);
      }
    }

    // === Update particles ===
    for (let i = 0; i < this.max; i++) {
      if (this.ages[i] >= this.lifetimes[i]) continue;
      this.ages[i] += dt;
      this.positions[i * 3 + 0] += this.velocities[i * 3 + 0] * dt;
      this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;
      // Vertikální „bublání" malou amplitudou pro živý vzhled
      this.positions[i * 3 + 1] = 0.05 + Math.sin(this.ages[i] * 5 + i) * 0.04;
      // Tlumení rychlosti
      this.velocities[i * 3 + 0] *= Math.exp(-0.5 * dt);
      this.velocities[i * 3 + 2] *= Math.exp(-0.5 * dt);
      if (this.ages[i] >= this.lifetimes[i]) {
        this.positions[i * 3 + 1] = -1000;
      }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}
