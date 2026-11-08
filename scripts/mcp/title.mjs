// Pure title-screen rule for the walk_rooms tool. No I/O, no browser — imported
// by the walk and by its node:test coverage.
//
// First screen: a newcomer at the door must see the primary "Enter the manor"
// button without scrolling, so one tap starts the game. The rule: the button's
// box is fully inside the viewport — its top and left are at or past the top-
// left corner, and its right and bottom are at or within the viewport's width
// and height. A button pushed below the fold (bottom past the viewport height)
// fails. Measured from the button's bounding box and the viewport size.

/**
 * The first-screen rule: true when the button's box sits fully inside the
 * viewport (within a sub-pixel tolerance, since getBoundingClientRect rounds).
 * @param {{left:number,top:number,right:number,bottom:number}} box
 * @param {number} vw viewport width
 * @param {number} vh viewport height
 * @param {number} [tolerance]
 * @returns {boolean}
 */
export function buttonFullyInViewport(box, vw, vh, tolerance = 0.5) {
  if (!box || typeof box.bottom !== 'number' || typeof box.right !== 'number') return false;
  return (
    box.top >= -tolerance &&
    box.left >= -tolerance &&
    box.right <= vw + tolerance &&
    box.bottom <= vh + tolerance
  );
}
