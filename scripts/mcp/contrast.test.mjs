// Tests for the pure WCAG contrast maths. No browser.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import {
  parseColor,
  contrastRatio,
  percentile,
  isLargeText,
  threshold,
  contrastOfBox,
} from './contrast.mjs';

const BLACK = { r: 0, g: 0, b: 0 };
const WHITE = { r: 255, g: 255, b: 255 };

test('black on white is 21:1', () => {
  assert.ok(Math.abs(contrastRatio(BLACK, WHITE) - 21) < 1e-9);
});

test('a colour on itself is 1:1', () => {
  for (const c of [BLACK, WHITE, { r: 123, g: 45, b: 200 }]) {
    assert.ok(Math.abs(contrastRatio(c, c) - 1) < 1e-9);
  }
});

test('parseColor reads rgb, rgba and hex; transparent is null', () => {
  assert.deepEqual(parseColor('rgb(0, 0, 0)'), { r: 0, g: 0, b: 0, a: 1 });
  assert.deepEqual(parseColor('#fff'), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepEqual(parseColor('#ff0000'), { r: 255, g: 0, b: 0, a: 1 });
  assert.equal(parseColor('transparent'), null);
  assert.equal(parseColor('rgba(0,0,0,0)'), null);
  assert.equal(parseColor(''), null);
});

test('the 70th percentile picks the background when 30% of the box is text', () => {
  // A box that is 70% white (background) and 30% black (the text glyphs).
  // Text colour is black: against white pixels the ratio is 21, against black
  // pixels it is 1. The 70th percentile must land on a white pixel → ~21.
  const pixels = [];
  for (let i = 0; i < 70; i++) pixels.push(WHITE);
  for (let i = 0; i < 30; i++) pixels.push(BLACK);
  const { ratio, flagged } = contrastOfBox(BLACK, pixels, { size: 16, weight: 400 });
  assert.ok(Math.abs(ratio - 21) < 1e-9, `expected ~21, got ${ratio}`);
  assert.equal(flagged, false);
});

test('a text colour equal to its background is flagged (no contrast)', () => {
  const grey = { r: 120, g: 120, b: 120 };
  const pixels = [];
  for (let i = 0; i < 70; i++) pixels.push(grey);
  for (let i = 0; i < 30; i++) pixels.push(grey);
  const { ratio, flagged } = contrastOfBox(grey, pixels, { size: 16, weight: 400 });
  assert.ok(Math.abs(ratio - 1) < 1e-9);
  assert.equal(flagged, true);
});

test('percentile is nearest-rank', () => {
  assert.equal(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.7), 7);
  assert.equal(percentile([5], 0.7), 5);
});

test('large-text thresholds: 24px and 18.66px bold use 3:1, else 4.5:1', () => {
  assert.equal(isLargeText(24, 400), true);
  assert.equal(threshold(24, 400), 3);
  assert.equal(isLargeText(18.66, 700), true);
  assert.equal(threshold(18.66, 'bold'), 3);
  assert.equal(isLargeText(18, 400), false);
  assert.equal(threshold(18, 400), 4.5);
  // 18.66 but not bold → still normal threshold.
  assert.equal(isLargeText(18.66, 400), false);
  assert.equal(threshold(23.9, 400), 4.5);
});

test('property: contrastRatio is symmetric and in [1, 21]', () => {
  const channel = fc.integer({ min: 0, max: 255 });
  const colour = fc.record({ r: channel, g: channel, b: channel });
  fc.assert(
    fc.property(colour, colour, (a, b) => {
      const ab = contrastRatio(a, b);
      const ba = contrastRatio(b, a);
      assert.ok(Math.abs(ab - ba) < 1e-9);
      assert.ok(ab >= 1 - 1e-9 && ab <= 21 + 1e-9);
    }),
    { numRuns: 400 },
  );
});

test('property: a colour against itself is always 1', () => {
  const channel = fc.integer({ min: 0, max: 255 });
  const colour = fc.record({ r: channel, g: channel, b: channel });
  fc.assert(
    fc.property(colour, (c) => {
      assert.ok(Math.abs(contrastRatio(c, c) - 1) < 1e-9);
    }),
  );
});
