import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Sails } from '../src/physics/Sails.js';
import { cycleMainTension } from '../src/input/sailActions.js';
import { mainTensionFactors } from '../src/physics/SailForces.js';

describe('main sail tension', () => {
  it('cycles from normal to tight to loose and back to normal', () => {
    const sails = new Sails();

    assert.equal(sails.main.tension, 'normal');

    cycleMainTension(sails);
    assert.equal(sails.main.tension, 'tight');

    cycleMainTension(sails);
    assert.equal(sails.main.tension, 'loose');

    cycleMainTension(sails);
    assert.equal(sails.main.tension, 'normal');
  });

  it('keeps normal tension neutral', () => {
    assert.deepEqual(mainTensionFactors('normal'), {
      lift: 1,
      drag: 1,
      force: 1,
      luff: 1,
    });
  });

  it('de-powers loose main tension and slightly powers tight tension', () => {
    assert.deepEqual(mainTensionFactors('loose'), {
      lift: 0.72,
      drag: 1.08,
      force: 0.8,
      luff: 1.35,
    });
    assert.deepEqual(mainTensionFactors('tight'), {
      lift: 1.08,
      drag: 0.96,
      force: 1.08,
      luff: 0.8,
    });
  });
});
