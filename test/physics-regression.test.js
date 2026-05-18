import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Boat } from '../src/physics/Boat.js';
import { Sails } from '../src/physics/Sails.js';
import { computeSailForces } from '../src/physics/SailForces.js';
import { computeHullDrag } from '../src/physics/HullDrag.js';
import { stepLinear, stepYaw } from '../src/physics/Integrator.js';

function windFrom(deg, speed = 6) {
  const dir = (deg * Math.PI) / 180;
  return new THREE.Vector3(-Math.sin(dir) * speed, 0, -Math.cos(dir) * speed);
}

test('heeling load stays on leeward side across reaching angles', () => {
  const cases = [
    { windFromDeg: -150, expectedHeel: 1 },
    { windFromDeg: -110, expectedHeel: 1 },
    { windFromDeg: -90, expectedHeel: 1 },
    { windFromDeg: 90, expectedHeel: -1 },
    { windFromDeg: 110, expectedHeel: -1 },
    { windFromDeg: 150, expectedHeel: -1 },
  ];

  for (const { windFromDeg, expectedHeel } of cases) {
    const boat = new Boat();
    const sails = new Sails();
    const info = computeSailForces(boat, sails, windFrom(windFromDeg));

    assert.equal(
      Math.sign(info.F_heel),
      expectedHeel,
      `wind from ${windFromDeg}deg should heel ${expectedHeel > 0 ? 'starboard' : 'port'}`,
    );
  }
});

test('keel limits sideways drift in strong beam wind', () => {
  const boat = new Boat();
  const sails = new Sails();
  const wind = new THREE.Vector3(-16, 0, 0);
  const total = new THREE.Vector3();

  for (let i = 0; i < 60 * 20; i++) {
    const sailInfo = computeSailForces(boat, sails, wind);
    const hull = computeHullDrag(boat);
    total.copy(sailInfo.F).add(hull);
    stepLinear(boat, total, 1 / 60);
    stepYaw(boat, 1 / 60);
  }

  const fwd = Math.abs(boat.velocity.dot(boat.forward()));
  const side = Math.abs(boat.velocity.dot(boat.side()));
  const driftDeg = Math.atan2(side, fwd) * 180 / Math.PI;

  assert.ok(driftDeg < 20, `strong wind drift angle ${driftDeg.toFixed(1)}deg should stay under 20deg`);
});
