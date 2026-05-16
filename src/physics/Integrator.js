import * as THREE from 'three';
import { BOAT } from '../config.js';

// Semi-implicit Euler step pro lineární pohyb a yaw rotaci.
// Síly v rovině XZ (Y zůstává 0 — bez vln/buoyancy v MVP).
export function stepLinear(boat, F, dt) {
  // a = F/m
  const acc = new THREE.Vector3(F.x / BOAT.mass, 0, F.z / BOAT.mass);
  boat.velocity.add(acc.multiplyScalar(dt));
  // pos update
  boat.position.addScaledVector(boat.velocity, dt);
}

// Kormidlo: torque proporcionální |v|² · sin(angle), tlumený útlumem.
export function stepYaw(boat, dt) {
  const fwdSpeed = boat.velocity.dot(boat.forward());
  // Pozor na znaménko: kormidlo doleva (+rudderAngle) → příď doleva (yaw +).
  // Kladný yaw v naší konvenci (heading roste) odpovídá rotaci doprava? Záleží na konvenci.
  // heading 0 → fwd = +Z. heading +π/2 → fwd = +X (rotace „doprava" v top-down view kde Z je nahoru).
  // To je správně intuitivně (kompasově): heading roste po směru hodinových ručiček v top-down.
  // Kormidlo doleva by mělo otáčet loď proti směru ručiček (heading klesá).
  // Takže yawTorque = -k * |v|² * sin(rudderAngle) * (sign of fwdSpeed)
  const speedSq = fwdSpeed * Math.abs(fwdSpeed);
  const torque = -BOAT.k_rudder * speedSq * Math.sin(boat.rudderAngle) * BOAT.rudderArm;
  const angAcc = torque / BOAT.I_yaw;
  boat.angVelYaw += angAcc * dt;
  boat.angVelYaw *= Math.max(0, 1 - BOAT.yawDamping * dt);
  boat.heading += boat.angVelYaw * dt;
  // Normalizuj heading na (-π, π] pro stabilitu
  while (boat.heading > Math.PI) boat.heading -= 2 * Math.PI;
  while (boat.heading <= -Math.PI) boat.heading += 2 * Math.PI;
}
