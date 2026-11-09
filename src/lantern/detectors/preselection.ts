import type { Suspect } from '../types';
import { roomOf } from '../patterns';
import { GATE_WORDS, OFFER_WORDS, SIGNS } from '../words';
import { hasAny, isChecked, labelFor } from '../helpers';

const PATTERN = 'Preselection';

/**
 * Preselection: a checkbox or switch already on at load whose label speaks of
 * offers, newsletters, partners, sharing, insurance, protection, donations or
 * "add" — and that is not a gate the user must accept to continue (terms,
 * privacy, age). Conservative: only a checked extra is marked.
 */
export default function detectPreselection(root: Element): Suspect[] {
  const out: Suspect[] = [];
  const boxes = Array.from(
    root.querySelectorAll('input[type="checkbox"], [role="switch"], [role="checkbox"]'),
  );
  for (const box of boxes) {
    if (!isChecked(box)) continue;
    const label = labelFor(box);
    if (!label) continue;
    if (hasAny(label, GATE_WORDS)) continue; // a gate, not an extra
    if (!hasAny(label, OFFER_WORDS)) continue; // not clearly an offer/extra
    out.push({ element: box, pattern: PATTERN, sign: SIGNS.preselection, room: roomOf(PATTERN) });
  }
  return out;
}
