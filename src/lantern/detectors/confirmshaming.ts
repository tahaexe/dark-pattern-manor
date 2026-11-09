import type { Suspect } from '../types';
import { roomOf } from '../patterns';
import { PLAIN_DECLINE, SHAMING_PATTERNS, SIGNS } from '../words';
import { controlName, controls } from '../helpers';

const PATTERN = 'Confirmshaming';

/**
 * Confirmshaming: a decline control whose words shame the user ("No thanks, I
 * don't want ...", "I'd rather pay full price", "I don't like saving"). A plain
 * "No thanks" / "No" / "Decline" / "Cancel" is never marked.
 */
export default function detectConfirmshaming(root: Element): Suspect[] {
  const out: Suspect[] = [];
  for (const c of controls(root)) {
    const name = controlName(c);
    if (!name) continue;
    if (PLAIN_DECLINE.some((re) => re.test(name))) continue; // a plain decline
    if (SHAMING_PATTERNS.some((re) => re.test(name))) {
      out.push({ element: c, pattern: PATTERN, sign: SIGNS.confirmshaming, room: roomOf(PATTERN) });
    }
  }
  return out;
}
