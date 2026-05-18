import assert from 'node:assert/strict';
import test from 'node:test';
import { createHullNamePlateConfigs } from '../src/world/FleetLabels.js';

test('creates mirrored hull name plates for both sides of the boat', () => {
  const plates = createHullNamePlateConfigs();

  assert.equal(plates.length, 2);
  assert.deepEqual(plates.map((plate) => plate.side), ['port', 'starboard']);
  assert(plates.every((plate) => Math.abs(plate.position.x) > 1.21));
  assert(plates.every((plate) => plate.position.y < 1.1));
  assert(plates.every((plate) => plate.position.z < 0.5 && plate.position.z > -2.5));
  assert.equal(plates[0].position.x, -plates[1].position.x);
  assert.equal(plates[0].rotationY, -plates[1].rotationY);
});
