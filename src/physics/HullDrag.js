import * as THREE from 'three';
import { BOAT } from '../config.js';

// Drag trupu: kvadratický odpor podél pohybu + silná boční rezistence (kýl).
// Lehký isotropní drag navíc tlumí drift při nízkých rychlostech (jinak loď „klouže").
const ISO_DRAG = 0.25;

export function computeHullDrag(boat) {
  const v = boat.velocity;
  const speed = v.length();
  const fwd = boat.forward();
  const side = boat.side();
  const v_fwd = v.dot(fwd);
  const v_side = v.dot(side);

  const F = new THREE.Vector3();
  F.addScaledVector(fwd, -BOAT.k_drag * Math.abs(v_fwd) * v_fwd);
  F.addScaledVector(side, -BOAT.k_lat * v_side);
  F.addScaledVector(v, -ISO_DRAG * speed);
  return F;
}
