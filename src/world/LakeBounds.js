export const LAKE = {
  baseRadius: 850,
  boatMargin: 20,
  fleetMargin: 70,
};

export function lakeRadiusAtAngle(angle) {
  return LAKE.baseRadius
    + Math.sin(angle * 2.0 + 0.4) * 70
    + Math.sin(angle * 3.0 - 1.1) * 42
    + Math.sin(angle * 5.0 + 2.2) * 24;
}

export function isInsideLake(x, z, margin = 0) {
  const angle = Math.atan2(z, x);
  const limit = Math.max(1, lakeRadiusAtAngle(angle) - margin);
  return Math.hypot(x, z) <= limit;
}

export function clampToLake(x, z, margin = 0) {
  const dist = Math.hypot(x, z);
  if (dist < 0.001) return { x, z, hit: false, normalX: 0, normalZ: 0 };

  const normalX = x / dist;
  const normalZ = z / dist;
  const angle = Math.atan2(z, x);
  const limit = Math.max(1, lakeRadiusAtAngle(angle) - margin);
  if (dist <= limit) return { x, z, hit: false, normalX, normalZ };

  return {
    x: normalX * limit,
    z: normalZ * limit,
    hit: true,
    normalX,
    normalZ,
  };
}

export function applyLakeCollision(boat) {
  const clamped = clampToLake(boat.position.x, boat.position.z, LAKE.boatMargin);
  if (!clamped.hit) return false;

  boat.position.x = clamped.x;
  boat.position.z = clamped.z;

  const outwardSpeed = boat.velocity.x * clamped.normalX + boat.velocity.z * clamped.normalZ;
  if (outwardSpeed > 0) {
    boat.velocity.x -= outwardSpeed * clamped.normalX;
    boat.velocity.z -= outwardSpeed * clamped.normalZ;
  }
  return true;
}
