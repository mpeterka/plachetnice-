import * as THREE from 'three';

// Procedurální textura bubliny: měkký bílý disk + jemný off-center highlight.
function makeBubbleTexture(size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  // Hlavní tělo
  const body = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  body.addColorStop(0.00, 'rgba(255,255,255,0.95)');
  body.addColorStop(0.45, 'rgba(245,250,255,0.7)');
  body.addColorStop(0.78, 'rgba(220,235,250,0.25)');
  body.addColorStop(1.00, 'rgba(200,220,240,0)');
  ctx.fillStyle = body;
  ctx.fillRect(0, 0, size, size);
  // Highlight (specular vlevo nahoře) → 3D dojem
  const hx = cx - size * 0.2;
  const hy = cx - size * 0.22;
  const hl = ctx.createRadialGradient(hx, hy, 0, hx, hy, size * 0.18);
  hl.addColorStop(0, 'rgba(255,255,255,0.85)');
  hl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hl;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

const VERT = /* glsl */`
  attribute float size;
  attribute float alpha;
  varying float vAlpha;
  uniform float sizeScale;
  void main() {
    vAlpha = alpha;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (sizeScale / -mvPos.z);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const FRAG = /* glsl */`
  uniform sampler2D map;
  varying float vAlpha;
  void main() {
    vec4 c = texture2D(map, gl_PointCoord);
    if (c.a < 0.02) discard;
    gl_FragColor = vec4(c.rgb, c.a * vAlpha);
  }
`;

// Pěna za lodí a vlna od přídě — pomalá loď žádná pěna, rychlá loď výrazný stěr.
export class Wake {
  constructor(scene, opts = {}) {
    this.max = opts.max ?? 1000;
    this.positions = new Float32Array(this.max * 3);
    this.velocities = new Float32Array(this.max * 3);
    this.ages = new Float32Array(this.max);
    this.lifetimes = new Float32Array(this.max);
    this.sizes = new Float32Array(this.max);
    this.alphas = new Float32Array(this.max);

    for (let i = 0; i < this.max; i++) {
      this.positions[i * 3 + 1] = -1000;
      this.ages[i] = 1;
      this.lifetimes[i] = 1;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: makeBubbleTexture() },
        sizeScale: { value: 280.0 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
    });

    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);

    this._sternSpawnAcc = 0;
    this._bowSpawnAcc = 0;
  }

  _spawn(x, z, vx, vz, lifetime, size) {
    const i = (this._next = (this._next ?? 0));
    this._next = (i + 1) % this.max;
    this.positions[i * 3 + 0] = x;
    this.positions[i * 3 + 1] = 0.08;
    this.positions[i * 3 + 2] = z;
    this.velocities[i * 3 + 0] = vx;
    this.velocities[i * 3 + 2] = vz;
    this.ages[i] = 0;
    this.lifetimes[i] = lifetime;
    this.sizes[i] = size;
    this.alphas[i] = 1.0;
  }

  update(dt, boat) {
    const speed = boat.velocity.length();
    const fwd = boat.forward();
    const side = boat.side();

    // === Stěr za zádí: hodně malých bublinek + občas velká ===
    const sternRate = speed * 18; // vyšší rate pro hustou pěnu
    this._sternSpawnAcc += sternRate * dt;
    const sternPos = new THREE.Vector3()
      .copy(boat.position)
      .addScaledVector(fwd, -4.0);
    while (this._sternSpawnAcc >= 1) {
      this._sternSpawnAcc -= 1;
      const offset = (Math.random() - 0.5) * 2.0;
      const px = sternPos.x + side.x * offset + (Math.random() - 0.5) * 0.4;
      const pz = sternPos.z + side.z * offset + (Math.random() - 0.5) * 0.4;
      const vx = side.x * offset * 0.5 - fwd.x * (0.3 + Math.random() * 0.4);
      const vz = side.z * offset * 0.5 - fwd.z * (0.3 + Math.random() * 0.4);
      // Občasná velká bublina (15%), zbytek malé
      const isBig = Math.random() < 0.15;
      const size = isBig ? 1.6 + Math.random() * 0.8 : 0.35 + Math.random() * 0.8;
      const life = isBig ? 4.0 : 2.5 + Math.random() * 1.2;
      this._spawn(px, pz, vx, vz, life, size);
    }

    // === V-vlna od přídě (Kelvin ~19.5°) ===
    if (speed > 1.2) {
      const bowRate = speed * 14;
      this._bowSpawnAcc += bowRate * dt;
      const bowPos = new THREE.Vector3()
        .copy(boat.position)
        .addScaledVector(fwd, 4.0);
      const kSin = Math.sin(0.34);
      const kCos = Math.cos(0.34);
      const wakeSpeed = speed * 0.75;
      while (this._bowSpawnAcc >= 1) {
        this._bowSpawnAcc -= 1;
        const sideSign = Math.random() < 0.5 ? -1 : 1;
        const vx = fwd.x * wakeSpeed * kCos + side.x * sideSign * wakeSpeed * kSin;
        const vz = fwd.z * wakeSpeed * kCos + side.z * sideSign * wakeSpeed * kSin;
        const startOff = sideSign * (0.1 + Math.random() * 0.3);
        const px = bowPos.x + side.x * startOff;
        const pz = bowPos.z + side.z * startOff;
        const size = 0.8 + Math.random() * 1.2;
        this._spawn(px, pz, vx * 0.6, vz * 0.6, 2.8, size);
      }
    }

    // === Update particles: expanze + alpha fade + drift ===
    for (let i = 0; i < this.max; i++) {
      const life = this.lifetimes[i];
      if (this.ages[i] >= life) continue;
      this.ages[i] += dt;
      this.positions[i * 3 + 0] += this.velocities[i * 3 + 0] * dt;
      this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;
      // Lehké bublání v Y
      this.positions[i * 3 + 1] = 0.05 + Math.sin(this.ages[i] * 4 + i * 0.7) * 0.05;
      // Tlumení rychlosti — voda bublinu zpomalí
      const damping = Math.exp(-0.8 * dt);
      this.velocities[i * 3 + 0] *= damping;
      this.velocities[i * 3 + 2] *= damping;
      // Bublina rovnoměrně narůstá
      this.sizes[i] *= (1 + 0.4 * dt);
      // Quadratic fade: pomalu na startu, rychle ke konci
      const t = this.ages[i] / life;
      this.alphas[i] = (1 - t * t) * 0.9;
      if (this.ages[i] >= life) {
        this.positions[i * 3 + 1] = -1000;
        this.alphas[i] = 0;
      }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.size.needsUpdate = true;
    this.points.geometry.attributes.alpha.needsUpdate = true;
  }
}
