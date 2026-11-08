import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buttonFullyInViewport } from './title.mjs';

test('a button fully inside the viewport passes', () => {
  const box = { left: 528, top: 600, right: 752, bottom: 663 };
  assert.equal(buttonFullyInViewport(box, 1280, 720), true);
});

test('a button pushed below the fold fails', () => {
  // The measured regression: bottom at 758 of a 720-tall viewport.
  const box = { left: 528, top: 695, right: 752, bottom: 758 };
  assert.equal(buttonFullyInViewport(box, 1280, 720), false);
});

test('a button flush with the edges (within tolerance) passes', () => {
  const box = { left: 0, top: 0, right: 1280, bottom: 720 };
  assert.equal(buttonFullyInViewport(box, 1280, 720), true);
});

test('a button past the right edge fails', () => {
  const box = { left: 1100, top: 100, right: 1300, bottom: 163 };
  assert.equal(buttonFullyInViewport(box, 1280, 720), false);
});

test('a null or malformed box fails', () => {
  assert.equal(buttonFullyInViewport(null, 1280, 720), false);
  assert.equal(buttonFullyInViewport({}, 1280, 720), false);
});
