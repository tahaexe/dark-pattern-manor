// Pure geometry rule for the Before/After comparison divider, shared by the
// walk_rooms tool and its node:test cases. No I/O, no browser.
//
// The reveal edge (the visible divider line, drawn as the track's ::before)
// and the round grip must sit at the split across the comparison box: at
// `split` percent the expected x in viewport coordinates is
//   boxLeft + (split / 100) * boxWidth.
// A measured x passes when it is within `tolerance` CSS pixels of that target.
//
// This is the check that would have caught the translateX(percent) bug, where
// the percentage resolved against the 2px divider's own width instead of the
// box, pinning the edge and grip at the left edge whatever the slider said.

/** The default tolerance in CSS pixels (sub-pixel rounding + the 2px edge). */
export const DIVIDER_TOLERANCE = 2;

/**
 * The expected x of the divider edge for a split across a box.
 * @param {number} boxLeft  the comparison box's left edge, viewport px
 * @param {number} boxWidth the comparison box's width, px
 * @param {number} split    the reveal, 0–100
 * @returns {number} the target x in viewport coordinates
 */
export function expectedSplitX(boxLeft, boxWidth, split) {
  return boxLeft + (split / 100) * boxWidth;
}

/**
 * How far a measured x is from where the split should put the divider edge.
 * @param {number} boxLeft
 * @param {number} boxWidth
 * @param {number} split
 * @param {number} edgeX the measured x (edge centre, or grip centre), px
 * @returns {number} the absolute offset in CSS pixels
 */
export function dividerOffset(boxLeft, boxWidth, split, edgeX) {
  return Math.abs(edgeX - expectedSplitX(boxLeft, boxWidth, split));
}

/**
 * True when a measured divider edge sits at the split, within tolerance.
 * A non-finite box width (0 or less) can never place the edge, so it fails.
 * @param {number} boxLeft
 * @param {number} boxWidth
 * @param {number} split    the reveal, 0–100
 * @param {number} edgeX    the measured x of the visible edge or grip, px
 * @param {number} [tolerance] allowed slop in CSS pixels
 * @returns {boolean}
 */
export function dividerAtSplit(boxLeft, boxWidth, split, edgeX, tolerance = DIVIDER_TOLERANCE) {
  if (!Number.isFinite(boxLeft) || !Number.isFinite(boxWidth) || boxWidth <= 0) return false;
  if (!Number.isFinite(split) || !Number.isFinite(edgeX)) return false;
  return dividerOffset(boxLeft, boxWidth, split, edgeX) <= tolerance;
}
