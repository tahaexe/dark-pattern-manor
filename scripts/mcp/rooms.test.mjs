// Tests for the pure room-range parser.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { parseRooms, roomReadiness } from './rooms.mjs';

test('"1-12" is 1..12', () => {
  assert.deepEqual(parseRooms('1-12'), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});

test('"3" is [3]', () => {
  assert.deepEqual(parseRooms('3'), [3]);
});

test('"1,4,7" is [1,4,7]', () => {
  assert.deepEqual(parseRooms('1,4,7'), [1, 4, 7]);
});

test('mixes ranges and singles, sorted and de-duplicated', () => {
  assert.deepEqual(parseRooms('7,1-3,2,7'), [1, 2, 3, 7]);
});

test('whitespace is tolerated', () => {
  assert.deepEqual(parseRooms(' 1 , 2 - 4 '), [1, 2, 3, 4]);
});

test('out-of-range numbers are clamped out', () => {
  assert.deepEqual(parseRooms('0,1,12,13'), [1, 12]);
});

test('an empty spec throws', () => {
  assert.throws(() => parseRooms(''));
  assert.throws(() => parseRooms('   '));
});

test('a reversed range throws', () => {
  assert.throws(() => parseRooms('5-2'));
});

test('a non-numeric token throws', () => {
  assert.throws(() => parseRooms('a'));
  assert.throws(() => parseRooms('1-x'));
});

test('a spec fully outside the range throws', () => {
  assert.throws(() => parseRooms('13-20'));
});

test('property: every number is in 1..12, sorted ascending, unique', () => {
  const token = fc.integer({ min: 1, max: 12 });
  const spec = fc.array(token, { minLength: 1, maxLength: 12 }).map((xs) => xs.join(','));
  fc.assert(
    fc.property(spec, (s) => {
      const out = parseRooms(s);
      assert.ok(out.length >= 1);
      for (const n of out) assert.ok(n >= 1 && n <= 12);
      for (let i = 1; i < out.length; i++) assert.ok(out[i] > out[i - 1]); // sorted + unique
    }),
  );
});

test('property: a range "a-b" yields exactly the integers a..b', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 1, max: 12 }),
      (a, b) => {
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        const out = parseRooms(`${lo}-${hi}`);
        const expected = [];
        for (let n = lo; n <= hi; n++) expected.push(n);
        assert.deepEqual(out, expected);
      },
    ),
  );
});

// Room readiness after a navigation (the room-12-at-412 finding, 7 Nov: a fixed
// 1800 ms pause was sometimes shorter than the room chunk's dynamic import).
const page = (over = {}) => ({
  hash: '#/room/5',
  loading: false,
  error: false,
  title: 'The Conservatory',
  lantern: true,
  ...over,
});

test('a loaded room whose title is new is ready', () => {
  assert.equal(roomReadiness(page(), 5, 'The Parlour'), 'ready');
});

test('the first room of a session (no previous title) is ready once loaded', () => {
  assert.equal(roomReadiness(page(), 5, ''), 'ready');
});

test('waiting while the hash still names another room', () => {
  assert.equal(roomReadiness(page({ hash: '#/room/4' }), 5, ''), 'waiting');
});

test('waiting while the loading placeholder is on the page', () => {
  assert.equal(roomReadiness(page({ loading: true, title: null, lantern: false }), 5, 'The Parlour'), 'waiting');
});

test('waiting while the previous room is still rendered under the new hash', () => {
  assert.equal(roomReadiness(page({ title: 'The Parlour' }), 5, 'The Parlour'), 'waiting');
});

test('waiting while the task bar has no lantern yet', () => {
  assert.equal(roomReadiness(page({ lantern: false }), 5, 'The Parlour'), 'waiting');
});

test('the load-error panel is reported at once, not waited out', () => {
  assert.equal(roomReadiness(page({ error: true, title: null, lantern: false }), 5, 'The Parlour'), 'error');
});

test('a missing page state is waiting, never ready', () => {
  assert.equal(roomReadiness(undefined, 5, ''), 'waiting');
  assert.equal(roomReadiness(null, 5, ''), 'waiting');
});
