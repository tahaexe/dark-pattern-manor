import type { PatternName } from './types';

/**
 * The 18 dark-pattern types the steering names: the 12 room patterns plus the
 * 6 wandering patterns that live only in the Ghost Guide. A spell card's
 * pattern may come only from this list; `check-rooms.mjs` and the room-data
 * property test reject any card whose pattern is not here.
 */
export const PATTERNS: readonly PatternName[] = Object.freeze([
  // 12 room patterns
  'Visual interference',
  'Trick wording',
  'Confirmshaming',
  'Hidden subscription',
  'Fake urgency',
  'Fake scarcity',
  'Fake social proof',
  'Sneaking',
  'Hidden costs',
  'Nagging',
  'Preselection',
  'Hard to cancel',
  // 6 wandering patterns
  'Disguised ads',
  'Forced action',
  'Obstruction',
  'Comparison prevention',
  'Addictive design',
  'Currency confusion',
]);

/** True when `name` is one of the 18 named pattern types. */
export function isPattern(name: string): boolean {
  return PATTERNS.includes(name);
}
