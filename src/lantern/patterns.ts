/**
 * The seven v1 patterns the Ghost Lantern detects, each mapped to the manor
 * room that teaches it. The labels match the manor's own pattern names exactly
 * (see src/engine/patterns.ts), so the panel's "Learn it in the manor" link
 * lands on the room that teaches each one.
 *
 * Not in v1 (the zero-count panel text covers them): Sneaking, Hidden costs,
 * Hidden subscription, Nagging, Hard to cancel.
 */
export const PATTERN_ROOM: Readonly<Record<string, number>> = {
  'Visual interference': 1,
  'Trick wording': 2,
  Confirmshaming: 3,
  'Fake urgency': 5,
  'Fake scarcity': 6,
  'Fake social proof': 7,
  Preselection: 11,
};

/** The room number that teaches a v1 pattern (1 if somehow unknown). */
export function roomOf(pattern: string): number {
  return PATTERN_ROOM[pattern] ?? 1;
}
