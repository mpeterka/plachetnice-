import { clampToLake, isInsideLake, LAKE, lakeRadiusAtAngle } from './LakeBounds.js';

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function wrapPi(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a <= -Math.PI) a += Math.PI * 2;
  return a;
}

function randomPointInLake(rng, margin) {
  for (let i = 0; i < 20; i++) {
    const angle = rng() * Math.PI * 2;
    const radius = Math.sqrt(rng()) * (lakeRadiusAtAngle(angle) - margin);
    const point = {
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
    };
    if (isInsideLake(point.x, point.z, margin)) return point;
  }
  return { x: 0, z: 0 };
}

function initialPoint(index) {
  const angle = index * 1.05 + 0.6;
  const radius = 130 + index * 48;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  if (isInsideLake(x, z, LAKE.fleetMargin)) return { x, z };
  return { x: 0, z: 0 };
}

class FleetBoatState {
  constructor(name, seed, index) {
    this.name = name;
    this.rng = makeRng(seed + index * 9973);
    const start = initialPoint(index);
    this.x = start.x;
    this.z = start.z;
    this.heading = this.rng() * Math.PI * 2 - Math.PI;
    this.speed = 0;
    this.targetSpeed = 2.2 + this.rng() * 1.6;
    this.turnRate = 0.32 + this.rng() * 0.18;
    this.target = { x: 0, z: 0 };
    this.targetAge = 0;
    this.targetMaxAge = 18 + this.rng() * 12;
    this.chooseTarget();
  }

  chooseTarget() {
    this.target = randomPointInLake(this.rng, LAKE.fleetMargin);
    this.targetAge = 0;
    this.targetMaxAge = 18 + this.rng() * 12;
  }

  update(dt) {
    this.targetAge += dt;
    const dx = this.target.x - this.x;
    const dz = this.target.z - this.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 35 || this.targetAge > this.targetMaxAge) this.chooseTarget();

    const desiredHeading = Math.atan2(dx, dz);
    const delta = wrapPi(desiredHeading - this.heading);
    const maxTurn = this.turnRate * dt;
    this.heading = wrapPi(this.heading + Math.max(-maxTurn, Math.min(maxTurn, delta)));

    this.speed += (this.targetSpeed - this.speed) * Math.min(1, dt * 0.7);
    this.x += Math.sin(this.heading) * this.speed * dt;
    this.z += Math.cos(this.heading) * this.speed * dt;

    const clamped = clampToLake(this.x, this.z, LAKE.fleetMargin * 0.55);
    if (clamped.hit) {
      this.x = clamped.x;
      this.z = clamped.z;
      this.heading = wrapPi(Math.atan2(-clamped.normalX, -clamped.normalZ) + (this.rng() - 0.5) * 0.8);
      this.chooseTarget();
    }
  }
}

export function createFleetState(names, seed = 0x5a17) {
  return names.map((name, index) => new FleetBoatState(name, seed, index));
}
