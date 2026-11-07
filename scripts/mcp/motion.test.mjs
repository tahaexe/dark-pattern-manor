// Tests for the pure motion rules.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { wantsReducedMotion, clsWithinLimit, animationsAtRest, CLS_LIMIT } from './motion.mjs';

// --- wantsReducedMotion (P8) ---------------------------------------------

test('wantsReducedMotion defaults to false when absent', () => {
  assert.equal(wantsReducedMotion(), false);
  assert.equal(wantsReducedMotion({}), false);
});

test('wantsReducedMotion reads an explicit boolean true', () => {
  assert.equal(wantsReducedMotion({ reducedMotion: true }), true);
  assert.equal(wantsReducedMotion({ reducedMotion: false }), false);
});

test('wantsReducedMotion treats non-boolean values as false', () => {
  assert.equal(wantsReducedMotion({ reducedMotion: 'true' }), false);
  assert.equal(wantsReducedMotion({ reducedMotion: 1 }), false);
  assert.equal(wantsReducedMotion({ reducedMotion: null }), false);
});

test('property: only an explicit true yields true', () => {
  fc.assert(
    fc.property(fc.anything(), (v) => {
      assert.equal(wantsReducedMotion({ reducedMotion: v }), v === true);
    }),
  );
});

// --- clsWithinLimit (P6) --------------------------------------------------

test('CLS passes at or below 0.01', () => {
  assert.equal(clsWithinLimit(0), true);
  assert.equal(clsWithinLimit(0.005), true);
  assert.equal(clsWithinLimit(CLS_LIMIT), true);
});

test('CLS fails above 0.01', () => {
  assert.equal(clsWithinLimit(0.0101), false);
  assert.equal(clsWithinLimit(0.1), false);
  assert.equal(clsWithinLimit(1), false);
});

test('a missing or negative CLS is a pass (no evidence of a shift)', () => {
  assert.equal(clsWithinLimit(NaN), true);
  assert.equal(clsWithinLimit(undefined), true);
  assert.equal(clsWithinLimit(-5), true);
});

test('clsWithinLimit honours a custom limit', () => {
  assert.equal(clsWithinLimit(0.05, 0.1), true);
  assert.equal(clsWithinLimit(0.2, 0.1), false);
});

test('property: the gate is exactly cls <= limit for positive finite cls', () => {
  fc.assert(
    fc.property(fc.double({ min: 0, max: 1, noNaN: true }), (cls) => {
      assert.equal(clsWithinLimit(cls), cls <= CLS_LIMIT);
    }),
  );
});

// --- animationsAtRest (P7) ------------------------------------------------

test('no animations is at rest', () => {
  assert.equal(animationsAtRest([]), true);
});

test('all finished or paused is at rest', () => {
  assert.equal(animationsAtRest(['finished']), true);
  assert.equal(animationsAtRest(['paused', 'finished']), true);
  assert.equal(animationsAtRest(['idle', 'finished', 'paused']), true);
});

test('any running or pending animation is NOT at rest', () => {
  assert.equal(animationsAtRest(['running']), false);
  assert.equal(animationsAtRest(['finished', 'running']), false);
  assert.equal(animationsAtRest(['pending']), false);
});

test('a non-array is treated as not at rest', () => {
  assert.equal(animationsAtRest(null), false);
  assert.equal(animationsAtRest(undefined), false);
});
