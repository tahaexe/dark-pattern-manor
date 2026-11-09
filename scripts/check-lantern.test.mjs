import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkBundle,
  forbiddenTokensIn,
  bookmarkletFor,
  FORBIDDEN_TOKENS,
  SIZE_LIMIT_BYTES,
  BOOKMARKLET_LIMIT,
} from './check-lantern.mjs';

test('a small, clean bundle passes', () => {
  const src = '(function(){var a=1;a+=1;})();';
  const r = checkBundle(src, Buffer.byteLength(src));
  assert.equal(r.ok, true);
  assert.equal(r.problems.length, 0);
});

test('a forbidden token fails and is named', () => {
  const src = '(function(){fetch("/x");})();';
  const r = checkBundle(src, Buffer.byteLength(src));
  assert.equal(r.ok, false);
  assert.ok(r.problems.some((p) => p.includes('fetch')));
});

test('forbiddenTokensIn finds every listed token', () => {
  const src = FORBIDDEN_TOKENS.join(' ');
  assert.deepEqual(forbiddenTokensIn(src).sort(), [...FORBIDDEN_TOKENS].sort());
});

test('an oversize bundle fails', () => {
  const src = 'x'.repeat(SIZE_LIMIT_BYTES + 1);
  const r = checkBundle(src, SIZE_LIMIT_BYTES + 1);
  assert.equal(r.ok, false);
  assert.ok(r.problems.some((p) => p.includes('over the')));
});

test('the bookmarklet is javascript: plus the encoded bundle', () => {
  const src = 'a b();';
  assert.equal(bookmarkletFor(src), 'javascript:' + encodeURIComponent(src));
});

test('a bundle that would exceed the bookmarklet limit fails', () => {
  // A bundle of all percent-encoded chars triples in length when encoded.
  const src = '"'.repeat(BOOKMARKLET_LIMIT); // each " -> %22 (3 chars)
  const r = checkBundle(src, Buffer.byteLength(src));
  assert.equal(r.ok, false);
  assert.ok(r.problems.some((p) => p.includes('bookmarklet')));
});
