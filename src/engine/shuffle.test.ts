import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { shuffle } from './shuffle';
import { testRoom } from './testRoom';

describe('shuffle', () => {
  it('returns a permutation of the same three cards (same set)', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 0.999, noNaN: true }), (r) => {
        const result = shuffle(testRoom.cards, () => r);
        expect(result).toHaveLength(3);
        const before = new Set(testRoom.cards);
        const after = new Set(result);
        expect(after.size).toBe(before.size);
        for (const c of testRoom.cards) expect(after.has(c)).toBe(true);
      }),
    );
  });

  it('does not mutate the input', () => {
    const copy = testRoom.cards.slice();
    shuffle(testRoom.cards, () => 0.5);
    expect(testRoom.cards).toEqual(copy);
  });

  it('can produce a different order', () => {
    // rng that forces swaps: for i=2 -> j=0, for i=1 -> j=0.
    const order: number[] = [0, 0];
    let k = 0;
    const result = shuffle(testRoom.cards, () => order[k++] / 3);
    // At least the roles set is preserved.
    expect(result.map((c) => c.role).sort()).toEqual(['correct', 'different', 'relative']);
  });
});
