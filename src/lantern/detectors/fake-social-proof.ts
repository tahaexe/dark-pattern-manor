import type { Suspect } from '../types';
import { roomOf } from '../patterns';
import { SIGNS, SOCIAL_PROOF_PATTERNS } from '../words';
import { text } from '../helpers';

const PATTERN = 'Fake social proof';

/**
 * Fake social proof: "N people are viewing", "N bought today". The lantern
 * marks the tightest element whose own text matches, and its sign says it
 * cannot know the real numbers.
 */
export default function detectFakeSocialProof(root: Element): Suspect[] {
  const out: Suspect[] = [];
  const seen = new Set<Element>();
  for (const el of Array.from(root.querySelectorAll('*'))) {
    if (Array.from(el.children).some((c) => SOCIAL_PROOF_PATTERNS.some((re) => re.test(text(c)))))
      continue;
    const t = text(el);
    if (!SOCIAL_PROOF_PATTERNS.some((re) => re.test(t))) continue;
    if (seen.has(el)) continue;
    seen.add(el);
    out.push({ element: el, pattern: PATTERN, sign: SIGNS.fakeSocialProof, room: roomOf(PATTERN) });
  }
  return out;
}
