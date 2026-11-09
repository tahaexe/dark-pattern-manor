/**
 * The Ghost Lantern's detector contract. A detector is a pure function over a
 * root element that returns the suspects of one dark pattern found under that
 * root. It reads only the DOM it is given; it calls no network or storage API
 * and allocates nothing outside the array it returns.
 */

/** One marked element: what it is, the pattern it shows, and the sign seen. */
export interface Suspect {
  /** The element to mark. */
  element: Element;
  /** The v1 pattern label (matches the manor's pattern names). */
  pattern: string;
  /** A short plain sentence of what the detector saw. */
  sign: string;
  /** The manor room that teaches this pattern (1–12). */
  room: number;
}

/**
 * How a detector measures a box. Pure and injectable so detectors stay
 * testable in jsdom (which has no layout): the default reads
 * getBoundingClientRect, and tests may pass a stub.
 */
export type Measure = (el: Element) => { width: number; height: number };

/** The default box measurer: the live getBoundingClientRect. */
export const domMeasure: Measure = (el) => {
  const r = el.getBoundingClientRect();
  return { width: r.width, height: r.height };
};

/**
 * The few computed-style fields a detector needs to tell a control dressed as
 * a button from one dressed as a plain link: its fill (background colour and
 * any background image) and its border (width, style and colour). Injectable
 * beside `Measure` so the visual-interference look rule stays testable in
 * jsdom, which has no real layout or cascade: the default reads
 * getComputedStyle, and tests may pass a stub keyed by an attribute.
 */
export interface ControlStyle {
  /** The computed background colour (e.g. `rgb(…)` / `rgba(…)`). */
  backgroundColor: string;
  /** The computed background image (`none` when there is none). */
  backgroundImage: string;
  /** The computed border width on one side (e.g. `0px`, `1px`). */
  borderTopWidth: string;
  /** The computed border style on one side (e.g. `none`, `solid`). */
  borderTopStyle: string;
  /** The computed border colour on one side (e.g. `rgba(…)`). */
  borderTopColor: string;
}

/** How a detector reads a control's look. Pure and injectable (see above). */
export type Style = (el: Element) => ControlStyle;

/** The default look reader: the live getComputedStyle. */
export const domStyle: Style = (el) => {
  const cs = typeof getComputedStyle === 'function' ? getComputedStyle(el) : null;
  return {
    backgroundColor: cs ? cs.backgroundColor : '',
    backgroundImage: cs ? cs.backgroundImage : 'none',
    borderTopWidth: cs ? cs.borderTopWidth : '0px',
    borderTopStyle: cs ? cs.borderTopStyle : 'none',
    borderTopColor: cs ? cs.borderTopColor : 'rgba(0, 0, 0, 0)',
  };
};

/** A pure detector over a root element. */
export type Detector = (root: Element) => Suspect[];
