import test from 'node:test';
import assert from 'node:assert/strict';
import { labelFontSize } from '../src/world/FleetLabels.js';

test('fleet sail labels shrink long names before they clip', () => {
  const measurements = new Map([
    ['Paja', 96],
    ['Eva', 72],
    ['Vojta', 120],
    ['Karolína', 238],
    ['Milda', 124],
    ['Martin', 142],
  ]);
  const ctx = {
    font: '',
    measureText(name) {
      const widthAt44 = measurements.get(name);
      const size = Number.parseFloat(this.font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? '44');
      return { width: widthAt44 * (size / 44) };
    },
  };

  const size = labelFontSize(ctx, 'Karolína', 188, 44, 24);
  ctx.font = `700 ${size}px system-ui, sans-serif`;

  assert.ok(ctx.measureText('Karolína').width <= 188);
  assert.ok(size >= 24);
});
