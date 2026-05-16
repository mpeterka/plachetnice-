import { BOAT } from '../config.js';

// Semi-implicit Euler — pro herní fyziku ideální (stabilnější než explicit, levnější než RK4).

export function stepLinear(boat, F, dt) {
  // Síly působí jen v rovině XZ; y zůstává 0 (bez vln/buoyancy v MVP).
  boat.velocity.x += (F.x / BOAT.mass) * dt;
  boat.velocity.z += (F.z / BOAT.mass) * dt;
  boat.position.addScaledVector(boat.velocity, dt);
}

// Kormidlo: torque ∝ |v_fwd|² · sin(rudderAngle).
// Znaménko: rudderAngle > 0 (kormidlo doleva) má otáčet příď doleva = heading klesá v naší
// konvenci (heading roste po směru hodin). Proto -k v torque vzorci.
// Při couvání (v_fwd < 0) se torque obrátí — stejně jako u reálné lodi.
export function stepYaw(boat, dt) {
  const fwdSpeed = boat.velocity.dot(boat.forward());
  const speedSigned = fwdSpeed * Math.abs(fwdSpeed);
  const torque = -BOAT.k_rudder * speedSigned * Math.sin(boat.rudderAngle) * BOAT.rudderArm;
  boat.angVelYaw += (torque / BOAT.I_yaw) * dt;
  boat.angVelYaw *= Math.max(0, 1 - BOAT.yawDamping * dt);
  boat.heading += boat.angVelYaw * dt;
  // Normalizuj na (-π, π]
  while (boat.heading > Math.PI) boat.heading -= 2 * Math.PI;
  while (boat.heading <= -Math.PI) boat.heading += 2 * Math.PI;
  boat.updateBasis(); // heading se změnil → refresh cache pro další forces a render
}
