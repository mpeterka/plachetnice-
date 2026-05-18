import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Boat } from '../src/physics/Boat.js';
import { Sails } from '../src/physics/Sails.js';
import { computeSailForces } from '../src/physics/SailForces.js';

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
