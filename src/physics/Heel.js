import { BOAT, PHYSICS } from '../config.js';

// 1-DOF náklon. Vstup: boční síla plachet (svět-osy projektovaná na side), výška CE.
export function stepHeel(boat, F_side, hCE, dt) {
  // Heeling moment z boční síly (kladná boční síla = naklání směrem od větru, tj. heel se zvětšuje doprava)
  const M_heel = F_side * hCE;
  // Restoring moment
  const M_restore = -BOAT.mass * PHYSICS.GRAVITY * BOAT.GM * Math.sin(boat.heel);
  // Tlumení
  const M_damp = -BOAT.heelDamping * boat.angVelHeel;

  const angAcc = (M_heel + M_restore + M_damp) / BOAT.I_heel;
  boat.angVelHeel += angAcc * dt;
  boat.heel += boat.angVelHeel * dt;

  // Clamp na ±70° pro vizuál (capsize není v MVP, jen omezíme)
  const limit = (70 * Math.PI) / 180;
  if (boat.heel > limit) { boat.heel = limit; boat.angVelHeel = 0; }
  if (boat.heel < -limit) { boat.heel = -limit; boat.angVelHeel = 0; }
}
