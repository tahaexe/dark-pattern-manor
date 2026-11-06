import type { SpellCard, SpellCards } from './types';

/**
 * Return a shuffled permutation of the three spell cards. The result is a new
 * array holding the same three cards in a possibly different order; the input
 * is not mutated. A `rng` in [0, 1) may be supplied for deterministic tests.
 */
export function shuffle(
  cards: SpellCards,
  rng: () => number = Math.random,
): SpellCards {
  const out = cards.slice() as SpellCard[];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out as SpellCards;
}
