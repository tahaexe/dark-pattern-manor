import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  visibleFraction,
  visibleHeight,
  possessedInFirstSight,
  frameTopLimit,
  frameTopWithinLimit,
  meetsTargetSize,
  TARGET_MIN,
  POSSESSED_MIN,
  FIRST_SIGHT_BAND,
  FRAME_TOP_LIMIT_WIDE,
  FRAME_TOP_LIMIT_NARROW,
  NARROW_WIDTH,
} from './firstsight.mjs';

test('visibleFraction: a fully on-screen box is 1', () => {
  assert.equal(visibleFraction({ left: 10, top: 10, width: 100, height: 50 }, 1280, 720), 1);
});

test('visibleFraction: a box half below the fold is ~0.5', () => {
  // 100 tall, top at 670 in a 720 viewport → 50 of 100 visible.
  const f = visibleFraction({ left: 0, top: 670, width: 100, height: 100 }, 1280, 720);
  assert.ok(Math.abs(f - 0.5) < 1e-9);
});

test('visibleFraction: a box entirely off-screen is 0', () => {
  assert.equal(visibleFraction({ left: 0, top: 800, width: 100, height: 100 }, 1280, 720), 0);
  assert.equal(visibleFraction({ left: 0, top: 0, width: 0, height: 0 }, 1280, 720), 0);
});

test('visibleHeight: pixels of height inside the viewport', () => {
  assert.equal(visibleHeight({ top: 700, height: 100 }, 720), 20);
  assert.equal(visibleHeight({ top: 10, height: 44 }, 720), 44);
});

test('possessedInFirstSight: on screen with a tall-enough band passes', () => {
  assert.equal(
    possessedInFirstSight({ left: 100, top: 300, width: 200, height: 48 }, 1280, 720),
    true,
  );
});

test('possessedInFirstSight: mostly below the fold fails the band even if >50% area shows', () => {
  // A short element just peeking: only 20px of height, under the 44px band.
  assert.equal(
    possessedInFirstSight({ left: 0, top: 700, width: 300, height: 20 }, 1280, 720),
    false,
  );
});

test('possessedInFirstSight: less than half on screen fails', () => {
  assert.equal(
    possessedInFirstSight({ left: 0, top: 690, width: 100, height: 100 }, 1280, 720),
    false,
  );
});

test('frameTopLimit: wide uses 150, narrow uses 210', () => {
  assert.equal(frameTopLimit(1280), FRAME_TOP_LIMIT_WIDE);
  assert.equal(frameTopLimit(412), FRAME_TOP_LIMIT_NARROW);
  // The boundary: NARROW_WIDTH itself is "wide" (not below), so uses 150.
  assert.equal(frameTopLimit(NARROW_WIDTH), FRAME_TOP_LIMIT_WIDE);
  assert.equal(frameTopLimit(NARROW_WIDTH - 1), FRAME_TOP_LIMIT_NARROW);
});

test('frameTopWithinLimit: within the wide limit passes, over fails', () => {
  assert.equal(frameTopWithinLimit(130, 1280), true);
  assert.equal(frameTopWithinLimit(150, 1280), true);
  assert.equal(frameTopWithinLimit(151, 1280), false);
  assert.equal(frameTopWithinLimit(327, 1280), false);
});

test('frameTopWithinLimit: within the narrow limit passes, over fails', () => {
  assert.equal(frameTopWithinLimit(195, 412), true);
  assert.equal(frameTopWithinLimit(210, 412), true);
  assert.equal(frameTopWithinLimit(211, 412), false);
  assert.equal(frameTopWithinLimit(447, 412), false);
});

test('frameTopWithinLimit: a frame scrolled off the top (top <= 0) passes', () => {
  assert.equal(frameTopWithinLimit(0, 1280), true);
  assert.equal(frameTopWithinLimit(-50, 412), true);
});

test('frameTopWithinLimit: a non-number never passes', () => {
  assert.equal(frameTopWithinLimit(null, 1280), false);
  assert.equal(frameTopWithinLimit(NaN, 1280), false);
});

test('meetsTargetSize: 44x44 passes, 43x44 fails', () => {
  assert.equal(meetsTargetSize(44, 44), true);
  assert.equal(meetsTargetSize(60, 44), true);
  assert.equal(meetsTargetSize(43, 44), false);
  assert.equal(meetsTargetSize(44, 20), false);
});

test('meetsTargetSize: possessed minimum of 24 can be passed explicitly', () => {
  assert.equal(meetsTargetSize(24, 24, POSSESSED_MIN), true);
  assert.equal(meetsTargetSize(23, 24, POSSESSED_MIN), false);
});

test('the constants are the documented thresholds', () => {
  assert.equal(TARGET_MIN, 44);
  assert.equal(POSSESSED_MIN, 24);
  assert.equal(FIRST_SIGHT_BAND, 44);
  assert.equal(FRAME_TOP_LIMIT_WIDE, 150);
  assert.equal(FRAME_TOP_LIMIT_NARROW, 210);
  assert.equal(NARROW_WIDTH, 600);
});
