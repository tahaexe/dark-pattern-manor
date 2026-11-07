// Tests for the pure divider geometry rule (scripts/mcp/divider.mjs).

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DIVIDER_TOLERANCE,
  expectedSplitX,
  dividerOffset,
  dividerAtSplit,
} from './divider.mjs';

test('expectedSplitX places the edge across the box', () => {
  // A 1000px box starting at x=100.
  assert.equal(expectedSplitX(100, 1000, 0), 100);
  assert.equal(expectedSplitX(100, 1000, 50), 600);
  assert.equal(expectedSplitX(100, 1000, 100), 1100);
  assert.equal(expectedSplitX(100, 1000, 25), 350);
  assert.equal(expectedSplitX(100, 1000, 75), 850);
});

test('dividerOffset is the absolute distance from the target', () => {
  assert.equal(dividerOffset(0, 400, 50, 200), 0);
  assert.equal(dividerOffset(0, 400, 50, 201), 1);
  assert.equal(dividerOffset(0, 400, 50, 198), 2);
});

test('dividerAtSplit passes an edge within tolerance at every split', () => {
  const boxLeft = 100;
  const boxWidth = 1000;
  for (const split of [0, 25, 50, 75, 100]) {
    const x = expectedSplitX(boxLeft, boxWidth, split);
    assert.equal(dividerAtSplit(boxLeft, boxWidth, split, x), true, `exact at ${split}`);
    assert.equal(dividerAtSplit(boxLeft, boxWidth, split, x + 2), true, `+2 at ${split}`);
    assert.equal(dividerAtSplit(boxLeft, boxWidth, split, x - 2), true, `-2 at ${split}`);
  }
});

test('dividerAtSplit fails an edge beyond tolerance', () => {
  // 3px off at the default 2px tolerance fails.
  assert.equal(dividerAtSplit(100, 1000, 50, 603), false);
  assert.equal(dividerAtSplit(100, 1000, 50, 597), false);
});

test('dividerAtSplit catches the translateX(percent) bug', () => {
  // The broken CSS moved the 2px divider by translateX(split%) of its OWN
  // width: at split=50 that is 1px, at split=100 that is 2px — so the edge
  // stays pinned ~1px left of the box, far from where the split says it is.
  const boxLeft = 100;
  const boxWidth = 1000;
  // Edge centre with the bug: boxLeft - 1 (left: -1px) + split% * 2px.
  const buggyEdge = (split) => boxLeft - 1 + (split / 100) * 2;
  // At 0 the bug happens to agree with the correct position (both at the box
  // left), so the real failures show at the inner splits and the right end.
  assert.equal(dividerAtSplit(boxLeft, boxWidth, 25, buggyEdge(25)), false);
  assert.equal(dividerAtSplit(boxLeft, boxWidth, 50, buggyEdge(50)), false);
  assert.equal(dividerAtSplit(boxLeft, boxWidth, 75, buggyEdge(75)), false);
  assert.equal(dividerAtSplit(boxLeft, boxWidth, 100, buggyEdge(100)), false);
});

test('dividerAtSplit rejects a zero or negative box width', () => {
  assert.equal(dividerAtSplit(0, 0, 50, 0), false);
  assert.equal(dividerAtSplit(0, -10, 50, 0), false);
});

test('dividerAtSplit rejects non-finite inputs', () => {
  assert.equal(dividerAtSplit(NaN, 1000, 50, 500), false);
  assert.equal(dividerAtSplit(0, 1000, NaN, 500), false);
  assert.equal(dividerAtSplit(0, 1000, 50, NaN), false);
});

test('DIVIDER_TOLERANCE is the documented 2px default', () => {
  assert.equal(DIVIDER_TOLERANCE, 2);
  assert.equal(dividerAtSplit(0, 100, 50, 52), true);
  assert.equal(dividerAtSplit(0, 100, 50, 53), false);
});
