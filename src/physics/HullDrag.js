import * as THREE from 'three';
import { BOAT } from '../config.js';

// Drag trupu: kvadratický odpor podél pohybu + silná boční rezistence (kýl).
export function computeHullDrag(boat) {
  const v = boat.velocity;
  const speed = v.length();
  const fwd = boat.forward();
  const side = boat.side();

  // Forward drag (kvadratický)
  const v_fwd = v.dot(fwd);
  const v_side = v.dot(side);

  const F = new THREE.Vector3();
  // Forward kvadratický odpor (proti směru pohybu lodi dopředu)
  F.addScaledVector(fwd, -BOAT.k_drag * Math.abs(v_fwd) * v_fwd);
  // Boční odpor — kýl, lineární s rychlostí v rychlosti, ale silný
  F.addScaledVector(side, -BOAT.k_lat * v_side);

  // Lehký isotropní drag, aby loď nestála na místě věčně
  F.addScaledVector(v, -5 * speed * 0.05);
  return F;
}
