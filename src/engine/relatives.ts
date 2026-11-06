import type { PatternName } from './types';

/**
 * The symmetric relatives table. Each unordered pair declares that two
 * patterns are close relatives. Read through `areRelatives` and `relativesOf`;
 * never index these pairs by position.
 *
 * A room is valid only if its `relative` card's pattern is a relative of the
 * room's pattern, and its `different` card's pattern is neither the room's
 * pattern nor a relative of it.
 */
export const RELATIVE_PAIRS: ReadonlyArray<readonly [PatternName, PatternName]> = Object.freeze([
  ['Visual interference', 'Trick wording'],
  ['Trick wording', 'Preselection'],
  ['Confirmshaming', 'Nagging'],
  ['Hidden subscription', 'Hidden costs'],
  ['Fake urgency', 'Fake scarcity'],
  ['Fake scarcity', 'Fake social proof'],
  ['Sneaking', 'Preselection'],
  ['Hidden costs', 'Sneaking'],
  ['Hard to cancel', 'Hidden subscription'],
  ['Hard to cancel', 'Obstruction'],
  ['Nagging', 'Forced action'],
  ['Nagging', 'Addictive design'],
  ['Visual interference', 'Disguised ads'],
  ['Hidden costs', 'Comparison prevention'],
  ['Hidden costs', 'Currency confusion'],
] as ReadonlyArray<readonly [PatternName, PatternName]>);

/** Symmetric lookup: true when `a` and `b` are a declared relative pair. */
export function areRelatives(a: PatternName, b: PatternName): boolean {
  return RELATIVE_PAIRS.some(
    ([x, y]) => (x === a && y === b) || (x === b && y === a),
  );
}

/** Every pattern declared a relative of `p`, in table order. */
export function relativesOf(p: PatternName): PatternName[] {
  const out: PatternName[] = [];
  for (const [x, y] of RELATIVE_PAIRS) {
    if (x === p) out.push(y);
    else if (y === p) out.push(x);
  }
  return out;
}
