/**
 * Small shared helpers for the detectors. Pure DOM reads only — no network, no
 * storage, no mutation of the page.
 */

import type { ControlStyle } from './types';

/** Normalize curly quotes/apostrophes to straight, so phrase lists match. */
function normalize(s: string): string {
  return s
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The visible, collapsed text of an element, lowercased and normalized. */
export function text(el: Element | null | undefined): string {
  if (!el) return '';
  return normalize(el.textContent || '').toLowerCase();
}

/** The accessible-ish name of a control: aria-label, else its text. */
export function controlName(el: Element): string {
  const label = el.getAttribute && el.getAttribute('aria-label');
  if (label) return normalize(label).toLowerCase();
  return text(el);
}

/** True when `haystack` contains any phrase in `list` (all lowercased). */
export function hasAny(haystack: string, list: readonly string[]): boolean {
  return list.some((p) => haystack.includes(p));
}

/** True when the element is a real button-like control (not a plain link). */
export function isButtonLike(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag === 'button') return true;
  if (tag === 'input') {
    const type = (el.getAttribute('type') || '').toLowerCase();
    return type === 'button' || type === 'submit';
  }
  const role = (el.getAttribute('role') || '').toLowerCase();
  if (role === 'button') return true;
  // An anchor styled as a button is still link-like unless it has role=button.
  return false;
}

/** True when the element is a plain link (anchor without a button role). */
export function isPlainLink(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  const role = (el.getAttribute('role') || '').toLowerCase();
  if (role === 'button') return false;
  return tag === 'a' || tag === 'span';
}

/** All interactive-ish controls under a root, in document order. */
export function controls(root: Element): Element[] {
  return Array.from(
    root.querySelectorAll(
      'button, a[href], [role="button"], input[type="button"], input[type="submit"]',
    ),
  );
}

/** The label text associated with a checkbox/switch input. */
export function labelFor(input: Element): string {
  // An id + <label for>.
  const id = input.getAttribute('id');
  if (id) {
    const root = input.ownerDocument;
    if (root) {
      const esc = id.replace(/["\\]/g, '\\$&');
      const lab = root.querySelector(`label[for="${esc}"]`);
      if (lab) return text(lab);
    }
  }
  // A wrapping <label>.
  let p: Element | null = input.parentElement;
  while (p) {
    if (p.tagName.toLowerCase() === 'label') return text(p);
    p = p.parentElement;
  }
  // aria-label / aria-labelledby, else the nearest row's text.
  const aria = input.getAttribute('aria-label');
  if (aria) return normalize(aria).toLowerCase();
  const labelledby = input.getAttribute('aria-labelledby');
  if (labelledby && input.ownerDocument) {
    const parts = labelledby
      .split(/\s+/)
      .map((ref) => input.ownerDocument!.getElementById(ref))
      .filter(Boolean) as Element[];
    if (parts.length) return parts.map(text).join(' ');
  }
  // Fall back to the parent's text (a row label beside the input).
  return text(input.parentElement);
}

/** True when a checkbox/switch is on at load. */
export function isChecked(input: Element): boolean {
  if (input instanceof HTMLInputElement) {
    // Reflect the author's default (the attribute), then the live property.
    return input.defaultChecked || input.checked || input.hasAttribute('checked');
  }
  const aria = (input.getAttribute('aria-checked') || '').toLowerCase();
  return aria === 'true';
}

/**
 * The alpha channel of a CSS colour string (0–1). Reads `rgb(…)`/`rgba(…)` and
 * the keywords `transparent`; any other opaque form (a named colour, a hex
 * value a browser would normally resolve to rgb) is treated as fully opaque.
 * Pure: it parses a string and touches no DOM.
 */
export function colorAlpha(color: string): number {
  const c = (color || '').trim().toLowerCase();
  if (c === '' || c === 'transparent' || c === 'none') return 0;
  const m = c.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(/[,/]/).map((p) => p.trim());
    // rgb(…) has three parts (alpha 1); rgba(…) / rgb(… / a) has a fourth.
    if (parts.length >= 4) {
      const a = parseFloat(parts[3]);
      return Number.isFinite(a) ? a : 1;
    }
    return 1;
  }
  // A non-rgb colour the browser did not resolve (e.g. a keyword): opaque.
  return 1;
}

/** True when a control has a visible fill: a solid-ish background or an image. */
export function hasVisibleFill(style: ControlStyle): boolean {
  if (style.backgroundImage && style.backgroundImage !== 'none') return true;
  return colorAlpha(style.backgroundColor) >= 0.5;
}

/** True when a control's fill is faint: no image and a near-transparent colour. */
export function hasFaintFill(style: ControlStyle): boolean {
  if (style.backgroundImage && style.backgroundImage !== 'none') return false;
  return colorAlpha(style.backgroundColor) < 0.1;
}

/** True when a control shows no visible border (width 0, style none, or clear). */
export function hasNoVisibleBorder(style: ControlStyle): boolean {
  const width = parseFloat(style.borderTopWidth || '0');
  if (!Number.isFinite(width) || width === 0) return true;
  if ((style.borderTopStyle || 'none').toLowerCase() === 'none') return true;
  return colorAlpha(style.borderTopColor) === 0;
}

/**
 * True when a control LOOKS like a plain link: faint (near-transparent) fill
 * and no visible border — regardless of its tag. This is how a `<button>`
 * dressed as a text link (the Foyer's "Reject all") reads to the eye.
 */
export function looksLikeLink(style: ControlStyle): boolean {
  return hasFaintFill(style) && hasNoVisibleBorder(style);
}

/**
 * True when a control LOOKS like a solid button: a visible fill (a solid-ish
 * background colour or a background image). A filled "Accept all" reads this
 * way whether it carries a border or not.
 */
export function looksLikeButton(style: ControlStyle): boolean {
  return hasVisibleFill(style);
}
