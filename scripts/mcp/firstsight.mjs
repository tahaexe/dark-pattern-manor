// Pure first-sight and target-size rules for the walk_rooms tool. No I/O, no
// browser — imported by the walk and by its node:test coverage.
//
// First sight: on entry, a room is playable only when the possessed element is
// actually on screen. The rule: at least half of the possessed element's box
// area is inside the viewport, AND at least 44 px of its height is inside the
// viewport (a tappable band). Measured from the element's bounding box and the
// viewport size.
//
// Frame top: on entry the top of the live haunted frame must sit within a
// per-size limit so the page's first interactive content is on the first
// screen — at most 150 px from the top at 1280 x 720, at most 210 px at
// 412 x 915. The limit is chosen by the viewport WIDTH: a narrow (phone)
// viewport uses the larger limit, because the bar's counter/dots and the
// instruction card's step line take a little more height there.
//
// Target size: every control the engine owns must be at least 44 x 44 CSS px;
// the possessed element's own tap area must be at least 24 x 24. Given a
// measured width and height and a minimum, the rule is a simple threshold.

/** The engine-control minimum, and the possessed-element minimum, in CSS px. */
export const TARGET_MIN = 44;
export const POSSESSED_MIN = 24;
/** At least this many pixels of the possessed element's height must show. */
export const FIRST_SIGHT_BAND = 44;

/** The frame-top limits, in CSS px, by viewport size. */
export const FRAME_TOP_LIMIT_WIDE = 150;
export const FRAME_TOP_LIMIT_NARROW = 210;
/** Below this viewport width the narrow (phone) frame-top limit applies. */
export const NARROW_WIDTH = 600;

/**
 * The visible fraction of a box inside the viewport, by area, in [0, 1].
 * @param {{left:number,top:number,width:number,height:number}} box
 * @param {number} vw viewport width
 * @param {number} vh viewport height
 * @returns {number}
 */
export function visibleFraction(box, vw, vh) {
  if (!box || !(box.width > 0) || !(box.height > 0)) return 0;
  const left = Math.max(box.left, 0);
  const top = Math.max(box.top, 0);
  const right = Math.min(box.left + box.width, vw);
  const bottom = Math.min(box.top + box.height, vh);
  const w = Math.max(0, right - left);
  const h = Math.max(0, bottom - top);
  const area = box.width * box.height;
  if (area <= 0) return 0;
  return (w * h) / area;
}

/** How many pixels of the box's height sit inside the viewport's height. */
export function visibleHeight(box, vh) {
  if (!box || !(box.height > 0)) return 0;
  const top = Math.max(box.top, 0);
  const bottom = Math.min(box.top + box.height, vh);
  return Math.max(0, bottom - top);
}

/**
 * The first-sight rule: true when at least half the possessed element's box is
 * in the viewport AND at least `band` px of its height shows.
 * @param {{left:number,top:number,width:number,height:number}} box
 * @param {number} vw
 * @param {number} vh
 * @param {number} [band]
 * @returns {boolean}
 */
export function possessedInFirstSight(box, vw, vh, band = FIRST_SIGHT_BAND) {
  return visibleFraction(box, vw, vh) >= 0.5 && visibleHeight(box, vh) >= band;
}

/** The frame-top limit in CSS px for a given viewport width. */
export function frameTopLimit(vw) {
  return vw < NARROW_WIDTH ? FRAME_TOP_LIMIT_NARROW : FRAME_TOP_LIMIT_WIDE;
}

/**
 * The frame-top rule: true when the live haunted frame's top is at or below the
 * per-width limit (within a sub-pixel tolerance, since getBoundingClientRect
 * rounds). A frame top of 0 or less (off the top) also passes — the content is
 * on screen; the limit is only an upper bound.
 * @param {number} top the frame's top in CSS px from the viewport top
 * @param {number} vw viewport width
 * @param {number} [tolerance]
 * @returns {boolean}
 */
export function frameTopWithinLimit(top, vw, tolerance = 0.5) {
  if (typeof top !== 'number' || Number.isNaN(top)) return false;
  return top <= frameTopLimit(vw) + tolerance;
}

/**
 * The target-size rule: true when both measured dimensions meet the minimum
 * (within a sub-pixel tolerance, since getBoundingClientRect rounds).
 * @param {number} width
 * @param {number} height
 * @param {number} [min]
 * @param {number} [tolerance]
 * @returns {boolean}
 */
export function meetsTargetSize(width, height, min = TARGET_MIN, tolerance = 0.5) {
  return width >= min - tolerance && height >= min - tolerance;
}
