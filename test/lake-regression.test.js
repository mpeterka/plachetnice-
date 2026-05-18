import test from 'node:test';
import assert from 'node:assert/strict';
import { clampToLake, isInsideLake, LAKE } from '../src/world/LakeBounds.js';
import { createFleetState } from '../src/world/FleetState.js';

test('lake collision clamps an out-of-bounds position back onto water', () => {
  const outside = { x: LAKE.baseRadius * 2, z: 0 };
  const clamped = clampToLake(outside.x, outside.z, LAKE.boatMargin);

  assert.equal(clamped.hit, true);
  assert.ok(isInsideLake(clamped.x, clamped.z, LAKE.boatMargin));
  assert.ok(clamped.x < outside.x);
});

test('fleet random targets stay inside the safe lake area', () => {
  const fleet = createFleetState(['Paja'], 1234);
  const boat = fleet[0];

  for (let i = 0; i < 20; i++) {
    boat.chooseTarget();
    assert.ok(
      isInsideLake(boat.target.x, boat.target.z, LAKE.fleetMargin),
      `target ${i} should stay in navigable water`,
    );
  }
});
