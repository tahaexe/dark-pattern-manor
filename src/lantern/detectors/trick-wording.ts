import type { Suspect } from '../types';
import { roomOf } from '../patterns';
import { NEGATIONS, SIGNS } from '../words';
import { labelFor, text } from '../helpers';

const PATTERN = 'Trick wording';

/** Count the negation tokens in a lowercased string. */
export function negationCount(label: string): number {
  let n = 0;
  for (const re of NEGATIONS) {
    const m = label.match(re);
    if (m) n += m.length;
  }
  return n;
}

/** True when the element contains a real checkbox/switch input. */
function hasRealCheckbox(el: Element): boolean {
  return !!el.querySelector('input[type="checkbox"], [role="checkbox"], [role="switch"]');
}

/** True when the element holds a custom (non-input) checkbox affordance. */
function hasCustomBox(el: Element): boolean {
  const boxy = el.querySelector('[class*="box" i], [class*="check" i], [class*="toggle" i]');
  return !!boxy;
}

/**
 * Trick wording: a checkbox whose label stacks two negations ("untick this box
 * if you do not want ... not"), so what ticking it does is unclear. The mark is
 * the checkbox (or the checkbox-like control); the sign names the double
 * negative.
 *
 * Covers both a real `input[type=checkbox]`/`[role=switch]`/`[role=checkbox]`
 * with a two-negation label, and a custom checkbox control (a button or
 * element that holds a styled box but no real input) whose own text stacks two
 * negations.
 */
export default function detectTrickWording(root: Element): Suspect[] {
  const out: Suspect[] = [];
  const seen = new Set<Element>();

  // Real checkbox/switch inputs with a two-negation label.
  const boxes = Array.from(
    root.querySelectorAll('input[type="checkbox"], [role="switch"], [role="checkbox"]'),
  );
  for (const box of boxes) {
    const label = labelFor(box);
    if (label && negationCount(label) >= 2 && !seen.has(box)) {
      seen.add(box);
      out.push({ element: box, pattern: PATTERN, sign: SIGNS.trickWording, room: roomOf(PATTERN) });
    }
  }

  // Custom checkbox controls: a control that holds a styled box (but NOT a real
  // input, which the pass above already covers) and whose own text stacks two
  // negations. Conservative: must both look like a checkbox and read like a
  // double negative.
  const candidates = Array.from(root.querySelectorAll('button, label, div, span'));
  for (const el of candidates) {
    if (seen.has(el)) continue;
    if (hasRealCheckbox(el)) continue; // handled by the input pass
    if (!hasCustomBox(el)) continue;
    const t = text(el);
    if (negationCount(t) < 2) continue;
    // Keep the tightest control: skip if a child candidate also qualifies.
    const childQualifies = Array.from(el.children).some(
      (c) => !hasRealCheckbox(c) && hasCustomBox(c) && negationCount(text(c)) >= 2,
    );
    if (childQualifies) continue;
    seen.add(el);
    out.push({ element: el, pattern: PATTERN, sign: SIGNS.trickWording, room: roomOf(PATTERN) });
  }

  return out;
}
