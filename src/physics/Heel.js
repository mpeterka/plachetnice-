import { BOAT, PHYSICS } from '../config.js';

// 1-DOF rovnice náklonu kolem podélné osy lodi.
// F_side > 0 (síla na pravobok = leeward při větru z levoboku) vytváří heeling moment,
// který naklání loď doprava (heel roste). Restoring moment přes metacentrickou výšku GM
// loď vrací zpět, tlumení útlumí kmitání.
export function stepHeel(boat, F_side, hCE, dt) {
  const M_heel = F_side * hCE;
  const M_restore = -BOAT.mass * PHYSICS.GRAVITY * BOAT.GM * Math.sin(boat.heel);
  const M_damp = -BOAT.heelDamping * boat.angVelHeel;

  const angAcc = (M_heel + M_restore + M_damp) / BOAT.I_heel;
  boat.angVelHeel += angAcc * dt;
  boat.heel += boat.angVelHeel * dt;

  // Clamp na ±70° (capsize není v MVP).
  const limit = (70 * Math.PI) / 180;
  if (boat.heel > limit) { boat.heel = limit; boat.angVelHeel = 0; }
  if (boat.heel < -limit) { boat.heel = -limit; boat.angVelHeel = 0; }
}
