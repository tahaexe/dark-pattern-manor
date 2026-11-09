import type { Suspect } from '../types';
import { roomOf } from '../patterns';
import { SCARCITY_PATTERNS, SIGNS } from '../words';
import { text } from '../helpers';

const PATTERN = 'Fake scarcity';

/**
 * Fake scarcity: "only N left", "selling fast", "almost gone", "in high
 * demand". The lantern marks the tightest element whose own text matches, and
 * its sign says it cannot know the real stock.
 */
export default function detectFakeScarcity(root: Element): Suspect[] {
  const out: Suspect[] = [];
  const seen = new Set<Element>();
  for (const el of Array.from(root.querySelectorAll('*'))) {
    // Keep the tightest match: skip if a child also matches.
    if (Array.from(el.children).some((c) => SCARCITY_PATTERNS.some((re) => re.test(text(c)))))
      continue;
    const t = text(el);
    if (!SCARCITY_PATTERNS.some((re) => re.test(t))) continue;
    if (seen.has(el)) continue;
    seen.add(el);
    out.push({ element: el, pattern: PATTERN, sign: SIGNS.fakeScarcity, room: roomOf(PATTERN) });
  }
  return out;
}
