import type { Measure, Style, Suspect } from '../types';
import { domMeasure, domStyle } from '../types';
import { roomOf } from '../patterns';
import { ACCEPT_WORDS, CONSENT_WORDS, MANAGE_WORDS, REFUSE_WORDS, SIGNS } from '../words';
import {
  controlName,
  controls,
  hasAny,
  isButtonLike,
  isPlainLink,
  looksLikeButton,
  looksLikeLink,
  text,
} from '../helpers';

const PATTERN = 'Visual interference';

/** The cookie/consent boxes under a root (a container whose text says so). */
function consentBoxes(root: Element): Element[] {
  const all = Array.from(root.querySelectorAll('*'));
  const boxes: Element[] = [];
  for (const el of all) {
    // Only consider a reasonably small container (not the whole body).
    const own = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => (n.textContent || '').toLowerCase())
      .join(' ');
    const deep = text(el);
    if (!hasAny(deep, CONSENT_WORDS)) continue;
    // Prefer the tightest container that still holds a control.
    if (controls(el).length === 0) continue;
    // Skip if a descendant is also a consent box with controls (keep tightest).
    const childIsBox = Array.from(el.children).some(
      (c) => hasAny(text(c), CONSENT_WORDS) && controls(c).length > 0,
    );
    if (childIsBox) continue;
    void own;
    boxes.push(el);
  }
  return boxes;
}

/**
 * Visual interference inside a cookie / consent box: a refuse control that is a
 * faint link beside a solid accept button, or DRESSED as a faint link (no
 * visible fill, no visible border) next to a solid accept button even when it
 * is a `<button>`, or far smaller than accept, or no plain refuse in the first
 * layer at all (only "Manage"/"Settings"). Not marked when both accept and
 * refuse look like buttons, or both look like links, or are buttons of a
 * similar size.
 *
 * `measure` and `style` are injectable so the rules are testable in jsdom (no
 * layout and no real cascade there); they default to getBoundingClientRect and
 * getComputedStyle.
 */
export function detectVisualInterferenceWith(
  root: Element,
  measure: Measure,
  style: Style = domStyle,
): Suspect[] {
  const out: Suspect[] = [];
  for (const box of consentBoxes(root)) {
    const ctrls = controls(box);
    const accept = ctrls.find((c) => hasAny(controlName(c), ACCEPT_WORDS));
    if (!accept) continue; // no accept-everything control: not this trick
    const refuse = ctrls.find((c) => hasAny(controlName(c), REFUSE_WORDS));
    const manageOnly = ctrls.find((c) => hasAny(controlName(c), MANAGE_WORDS));

    if (!refuse) {
      // No plain refuse in the first layer — only "Manage"/"Settings".
      if (manageOnly) {
        out.push({
          element: box,
          pattern: PATTERN,
          sign: SIGNS.visualInterferenceHidden,
          room: roomOf(PATTERN),
        });
      }
      continue;
    }

    // A refuse that is a plain link (by tag) beside a button accept (by tag).
    if (isPlainLink(refuse) && isButtonLike(accept)) {
      out.push({
        element: refuse,
        pattern: PATTERN,
        sign: SIGNS.visualInterferenceLink,
        room: roomOf(PATTERN),
      });
      continue;
    }

    // The LOOK rule: a refuse dressed as a faint link (no visible fill, no
    // visible border) next to an accept with a visible fill — even when the
    // refuse is a <button>. Conservative: only when the refuse clearly looks
    // like a link AND the accept clearly looks like a button, so a box where
    // both look like buttons or both like links is left alone.
    const refuseStyle = style(refuse);
    const acceptStyle = style(accept);
    if (looksLikeLink(refuseStyle) && looksLikeButton(acceptStyle)) {
      out.push({
        element: refuse,
        pattern: PATTERN,
        sign: SIGNS.visualInterferenceDisguised,
        room: roomOf(PATTERN),
      });
      continue;
    }

    // Both look alike (both buttons or both links): compare sizes. Only mark a
    // clearly smaller refuse.
    const a = measure(accept);
    const r = measure(refuse);
    const areaA = a.width * a.height;
    const areaR = r.width * r.height;
    if (areaA > 0 && areaR > 0 && areaR < areaA * 0.5) {
      out.push({
        element: refuse,
        pattern: PATTERN,
        sign: SIGNS.visualInterferenceSmall,
        room: roomOf(PATTERN),
      });
    }
    // Similar sizes and similar looks → honest, not marked.
  }
  return out;
}

/** The default detector, measuring with getBoundingClientRect and getComputedStyle. */
export default function detectVisualInterference(root: Element): Suspect[] {
  return detectVisualInterferenceWith(root, domMeasure, domStyle);
}
