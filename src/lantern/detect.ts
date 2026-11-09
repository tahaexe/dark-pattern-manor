import type { Measure, Style, Suspect } from './types';
import { domMeasure, domStyle } from './types';
import detectPreselection from './detectors/preselection';
import { detectVisualInterferenceWith } from './detectors/visual-interference';
import { detectFakeUrgencyWith, type Changed } from './detectors/fake-urgency';
import detectFakeScarcity from './detectors/fake-scarcity';
import detectFakeSocialProof from './detectors/fake-social-proof';
import detectConfirmshaming from './detectors/confirmshaming';
import detectTrickWording from './detectors/trick-wording';

/** Options that let the live overlay supply layout, look and timing observers. */
export interface DetectOptions {
  /** Measure a box (defaults to getBoundingClientRect). */
  measure?: Measure;
  /** Read a control's look (defaults to getComputedStyle). */
  style?: Style;
  /** Did a countdown's text change while watched? (defaults to false). */
  changed?: Changed;
}

/**
 * Run every v1 detector over `root`, drop any suspect that is `host` or inside
 * it (so the lantern never marks itself), de-dupe by element (first wins), and
 * return the suspects in document order. Each detector is wrapped so one bad
 * detector on a page the lantern did not write cannot stop the rest.
 */
export function runAllDetectors(
  root: Element,
  host?: Element,
  opts: DetectOptions = {},
): Suspect[] {
  const measure = opts.measure ?? domMeasure;
  const style = opts.style ?? domStyle;
  const changed = opts.changed ?? (() => false);

  const runners: Array<() => Suspect[]> = [
    () => detectPreselection(root),
    () => detectVisualInterferenceWith(root, measure, style),
    () => detectFakeUrgencyWith(root, changed),
    () => detectFakeScarcity(root),
    () => detectFakeSocialProof(root),
    () => detectConfirmshaming(root),
    () => detectTrickWording(root),
  ];

  const found: Suspect[] = [];
  for (const run of runners) {
    try {
      found.push(...run());
    } catch {
      /* a page the lantern did not write; skip this detector */
    }
  }

  // Drop anything inside the lantern's own host, and de-dupe by element.
  const byElement = new Map<Element, Suspect>();
  for (const s of found) {
    if (host && (s.element === host || host.contains(s.element))) continue;
    if (!byElement.has(s.element)) byElement.set(s.element, s);
  }

  // Return in document order.
  const all = [...byElement.values()];
  all.sort((a, b) => {
    if (a.element === b.element) return 0;
    const pos = a.element.compareDocumentPosition(b.element);
    return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });
  return all;
}
