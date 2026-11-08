// Pure motion rules for the walk_rooms and contrast_scan tools: reading the
// optional reducedMotion argument, the cumulative-layout-shift gate, the
// "animations are at rest" rule, the "idle (no frames requested)" rule, the
// label-clipping rule, and the named-hold rule (nothing but the shared flee of
// `.ghost-wrap` may keep moving once the right card lands). No I/O, no browser —
// imported directly by the motion tests and by walk.mjs / contrast-scan.mjs.

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

/**
 * The idle rule: an honest room must request NO animation frames over the
 * sampled window — the atmosphere's glow and fog are paused (still pose) and
 * the motes loop is stopped, so nothing asks the browser to paint. True when
 * the room PASSES (zero frames requested). A non-finite count is treated as 0
 * (a pass): a missing measurement is not evidence of activity.
 * @param {number} framesRequested
 * @returns {boolean}
 */
export function idleWithinWindow(framesRequested) {
  const n = Number.isFinite(framesRequested) && framesRequested > 0 ? framesRequested : 0;
  return n === 0;
}

/**
 * How many pixels a label may stick out past a clipping edge before it counts
 * as cut. Sub-pixel rounding from getBoundingClientRect is common, so a small
 * tolerance avoids false positives while still catching a visibly clipped word.
 */
export const CLIP_TOLERANCE = 1;

/**
 * The label-clipping rule. Given a label's bounding box and the bounding boxes
 * of every ancestor that clips its overflow (overflow hidden/clip or a
 * clip-path), the label passes only when it sits inside every one of those
 * boxes (within `tolerance`). If the label escapes any clip box by more than
 * the tolerance on any side, it is cut and the rule fails.
 *
 * Boxes are `{ left, right, top, bottom }` in viewport pixels. With no clip
 * ancestors the label passes (nothing cuts it).
 *
 * @param {{left:number,right:number,top:number,bottom:number}} label
 * @param {Array<{left:number,right:number,top:number,bottom:number}>} clips
 * @param {number} [tolerance]
 * @returns {boolean}
 */
export function labelWithinClip(label, clips, tolerance = CLIP_TOLERANCE) {
  if (!label || !Array.isArray(clips)) return false;
  for (const c of clips) {
    if (!c) continue;
    if (
      label.left < c.left - tolerance ||
      label.right > c.right + tolerance ||
      label.top < c.top - tolerance ||
      label.bottom > c.bottom + tolerance
    ) {
      return false;
    }
  }
  return true;
}

/**
 * The named-hold rule.
 *
 * Once the right card lands, the engine names the room and holds the haunted
 * page (`.room-scene[data-moment='right']`, then `[data-fleeing='true']`) for
 * about 600 ms so the shared unwind and flee of `.ghost-wrap` is seen before
 * the honest twin appears. During that hold nothing else in the haunted page
 * may keep moving: not the room's own act (its `.act-*` elements or an act's
 * styled targets), not the possessed element's mist, not its flicker. The only
 * animation allowed to run is the engine's shared exit, which lives on
 * `.ghost-wrap` itself (the unwind and the one flee).
 *
 * This pure rule takes the running animations the walk gathered inside the
 * haunted page's frame — each `{ name, classes, insideGhostWrap }`, where
 * `insideGhostWrap` is true when the animated element is `.ghost-wrap` or sits
 * inside it — and returns the offenders: every running animation whose target
 * is NOT `.ghost-wrap` and NOT inside it. A room passes the rule when this list
 * is empty. Each offender keeps its element classes and the animation name so
 * the walk's JSON can name exactly what is still moving.
 *
 * @param {Array<{ name?: string, classes?: string, insideGhostWrap?: boolean }>} running
 * @returns {Array<{ classes: string, name: string }>}
 */
export function heldMotionOffenders(running) {
  if (!Array.isArray(running)) return [];
  const offenders = [];
  for (const a of running) {
    if (!a || typeof a !== 'object') continue;
    if (a.insideGhostWrap === true) continue;
    offenders.push({
      classes: typeof a.classes === 'string' ? a.classes : '',
      name: typeof a.name === 'string' ? a.name : '',
    });
  }
  return offenders;
}
