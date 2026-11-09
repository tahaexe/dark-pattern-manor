import type { Suspect } from '../types';
import { roomOf } from '../patterns';
import { COUNTDOWN_RE, SELLING_WORDS, SIGNS } from '../words';
import { hasAny, text } from '../helpers';

const PATTERN = 'Fake urgency';

/**
 * How the detector observes whether a countdown's text changes. The default
 * samples the element's text now and again after ~3 s (returning a promise).
 * Tests inject a deterministic observer. Because the lantern must be
 * synchronous when it marks (the overlay draws at once), the live overlay
 * instead uses `findCountdownCandidates` and watches them for 3 s before
 * drawing the urgency marks (see overlay.ts). The pure detector below marks a
 * candidate immediately when `changed` says its text moved.
 */
export type Changed = (el: Element) => boolean;

/** Candidate countdown nodes near selling words (no change check yet). */
export function findCountdownCandidates(root: Element): Element[] {
  const out: Element[] = [];
  const all = Array.from(root.querySelectorAll('*'));
  for (const el of all) {
    // The element's own text (not a big ancestor) must look like a countdown.
    if (Array.from(el.children).some((c) => COUNTDOWN_RE.test(text(c)))) continue; // keep tightest
    const t = text(el);
    if (!COUNTDOWN_RE.test(t)) continue;
    // Selling words must be near: in this element or its parent's text.
    const near = `${t} ${text(el.parentElement)}`;
    if (!hasAny(near, SELLING_WORDS)) continue;
    out.push(el);
  }
  return out;
}

/**
 * The pure detector: a countdown near selling words whose text `changed` while
 * watched. Default `changed` returns false (so a still clock is never marked);
 * the overlay supplies a real 3 s watch, and tests supply a deterministic one.
 */
export function detectFakeUrgencyWith(root: Element, changed: Changed): Suspect[] {
  const out: Suspect[] = [];
  for (const el of findCountdownCandidates(root)) {
    if (!changed(el)) continue;
    out.push({ element: el, pattern: PATTERN, sign: SIGNS.fakeUrgency, room: roomOf(PATTERN) });
  }
  return out;
}

/**
 * The default export marks nothing on its own (a countdown must be watched to
 * be judged). The overlay calls `findCountdownCandidates` + a 3 s watch and
 * then `detectFakeUrgencyWith`. Kept as a Detector for the uniform registry;
 * it is a conservative no-op without a change observer.
 */
export default function detectFakeUrgency(root: Element): Suspect[] {
  return detectFakeUrgencyWith(root, () => false);
}
