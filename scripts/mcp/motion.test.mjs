// Tests for the pure motion rules.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import {
  wantsReducedMotion,
  clsWithinLimit,
  animationsAtRest,
  labelWithinClip,
  CLS_LIMIT,
  CLIP_TOLERANCE,
} from './motion.mjs';

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

// --- labelWithinClip ------------------------------------------------------

const box = (left, top, right, bottom) => ({ left, top, right, bottom });

test('a label with no clip ancestors always passes', () => {
  assert.equal(labelWithinClip(box(0, 0, 100, 20), []), true);
});

test('a label fully inside its one clip ancestor passes', () => {
  const clip = box(0, 0, 200, 200);
  assert.equal(labelWithinClip(box(10, 10, 110, 30), [clip]), true);
});

test('a label that overflows the clip ancestor on the right is cut', () => {
  const clip = box(0, 0, 100, 200);
  // The label runs from x=60 to x=180, well past the clip's right edge at 100.
  assert.equal(labelWithinClip(box(60, 10, 180, 30), [clip]), false);
});

test('a label cut on any side fails', () => {
  const clip = box(0, 0, 100, 100);
  assert.equal(labelWithinClip(box(-20, 10, 40, 30), [clip]), false); // left
  assert.equal(labelWithinClip(box(10, -20, 40, 10), [clip]), false); // top
  assert.equal(labelWithinClip(box(10, 90, 40, 140), [clip]), false); // bottom
});

test('a label must sit inside every clip ancestor', () => {
  const outer = box(0, 0, 300, 300);
  const inner = box(0, 0, 80, 300);
  // Inside the outer box but past the inner (narrower) box's right edge.
  assert.equal(labelWithinClip(box(40, 10, 140, 30), [outer, inner]), false);
  assert.equal(labelWithinClip(box(10, 10, 70, 30), [outer, inner]), true);
});

test('overflow within the tolerance is allowed (sub-pixel rounding)', () => {
  const clip = box(0, 0, 100, 100);
  // Just over the right edge by less than the tolerance.
  assert.equal(labelWithinClip(box(10, 10, 100 + CLIP_TOLERANCE - 0.01, 30), [clip]), true);
  assert.equal(labelWithinClip(box(10, 10, 100 + CLIP_TOLERANCE + 1, 30), [clip]), false);
});

test('a missing label or non-array clips fails safe', () => {
  assert.equal(labelWithinClip(null, []), false);
  assert.equal(labelWithinClip(box(0, 0, 10, 10), null), false);
});

test('property: a label contained in a clip (within tolerance) always passes', () => {
  fc.assert(
    fc.property(
      fc.record({
        cl: fc.integer({ min: 0, max: 100 }),
        ct: fc.integer({ min: 0, max: 100 }),
        cw: fc.integer({ min: 50, max: 300 }),
        ch: fc.integer({ min: 20, max: 300 }),
        padL: fc.integer({ min: 0, max: 40 }),
        padT: fc.integer({ min: 0, max: 10 }),
        lw: fc.integer({ min: 1, max: 20 }),
        lh: fc.integer({ min: 1, max: 10 }),
      }),
      ({ cl, ct, cw, ch, padL, padT, lw, lh }) => {
        const clip = box(cl, ct, cl + cw, ct + ch);
        // A label well inside the clip (guarding against exceeding the right/bottom).
        const left = cl + Math.min(padL, cw - lw - 1);
        const top = ct + Math.min(padT, ch - lh - 1);
        const label = box(left, top, left + lw, top + lh);
        assert.equal(labelWithinClip(label, [clip]), true);
      },
    ),
  );
});
