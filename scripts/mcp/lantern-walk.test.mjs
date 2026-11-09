import { test } from 'node:test';
import assert from 'node:assert/strict';
import { marksOverElements } from './lantern-walk.mjs';

test('marksOverElements is true when every mark sits on its suspect', () => {
  const marks = [
    {
      suspect: { left: 10, top: 20, width: 100, height: 40 },
      mark: { left: 10, top: 20, width: 100, height: 40 },
    },
    {
      suspect: { left: 0, top: 0, width: 50, height: 50 },
      mark: { left: 1, top: 2, width: 50, height: 50 },
    },
  ];
  assert.equal(marksOverElements(marks), true);
});

test('marksOverElements is false when a mark is far from its suspect', () => {
  const marks = [
    {
      suspect: { left: 10, top: 20, width: 100, height: 40 },
      mark: { left: 200, top: 300, width: 100, height: 40 },
    },
  ];
  assert.equal(marksOverElements(marks), false);
});

test('marksOverElements is false for an empty or zero-size mark', () => {
  assert.equal(marksOverElements([]), false);
  assert.equal(
    marksOverElements([
      {
        suspect: { left: 0, top: 0, width: 10, height: 10 },
        mark: { left: 0, top: 0, width: 0, height: 0 },
      },
    ]),
    false,
  );
});
