// Pure motion rules for the walk_rooms and contrast_scan tools: reading the
// optional reducedMotion argument, the cumulative-layout-shift gate, and the
// "animations are at rest" rule. No I/O, no browser — imported directly by the
// motion tests and by walk.mjs / contrast-scan.mjs.

/**
 * Read `reducedMotion` from tool arguments. Defaults to false; a non-boolean
 * value (string, number, missing) is treated as false so only an explicit
 * `true` emulates reduced motion.
 * @param {{ reducedMotion?: unknown }} [args]
 * @returns {boolean}
 */
export function wantsReducedMotion(args = {}) {
  return args && args.reducedMotion === true;
}

/** The cumulative-layout-shift limit a room must stay at or below. */
export const CLS_LIMIT = 0.01;

/**
 * The CLS gate: true when the room PASSES (its cumulative layout shift is at or
 * below the limit). A non-finite or negative value is treated as 0 (a pass),
 * since a missing measurement is not evidence of a shift.
 * @param {number} cls
 * @param {number} [limit]
 * @returns {boolean}
 */
export function clsWithinLimit(cls, limit = CLS_LIMIT) {
  const value = Number.isFinite(cls) && cls > 0 ? cls : 0;
  return value <= limit;
}

/**
 * The animations-at-rest rule: true when there are no animations, or every
 * animation's play state is `finished` or `paused`. A single `running` (or
 * `pending`) animation fails the rule.
 * @param {string[]} playStates
 * @returns {boolean}
 */
export function animationsAtRest(playStates) {
  if (!Array.isArray(playStates)) return false;
  if (playStates.length === 0) return true;
  return playStates.every((s) => s === 'finished' || s === 'paused' || s === 'idle');
}
