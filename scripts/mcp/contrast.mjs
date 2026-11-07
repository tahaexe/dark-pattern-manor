// Pure WCAG contrast mathematics for the contrast_scan tool.
//
// Nothing here touches a browser or a DOM, so every piece is unit-tested by
// direct import. The browser side (contrast-scan.mjs) reads pixels from a
// canvas and feeds them to contrastOfBox; the test feeds synthetic pixel
// arrays. Colour parsing returns null for a fully transparent colour so the
// scan skips it.

/**
 * Parse a CSS colour string into { r, g, b, a } (channels 0–255, alpha 0–1),
 * or null when it is fully transparent or unrecognised.
 * Accepts rgb()/rgba(), #rgb/#rrggbb/#rgba/#rrggbbaa and the keyword
 * "transparent".
 * @param {string} css
 * @returns {{ r: number, g: number, b: number, a: number } | null}
 */
export function parseColor(css) {
  if (typeof css !== 'string') return null;
  const s = css.trim().toLowerCase();
  if (s === '' || s === 'transparent') return null;

  // rgb()/rgba()
  const rgb = s.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const parts = rgb[1].split(/[,\s/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const r = clampByte(parseChannel(parts[0]));
    const g = clampByte(parseChannel(parts[1]));
    const b = clampByte(parseChannel(parts[2]));
    const a = parts.length >= 4 ? parseAlpha(parts[3]) : 1;
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    if (a === 0) return null;
    return { r, g, b, a };
  }

  // #rgb / #rgba / #rrggbb / #rrggbbaa
  const hex = s.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    const h = hex[1];
    let r;
    let g;
    let b;
    let a = 1;
    if (h.length === 3 || h.length === 4) {
      r = parseInt(h[0] + h[0], 16);
      g = parseInt(h[1] + h[1], 16);
      b = parseInt(h[2] + h[2], 16);
      if (h.length === 4) a = parseInt(h[3] + h[3], 16) / 255;
    } else if (h.length === 6 || h.length === 8) {
      r = parseInt(h.slice(0, 2), 16);
      g = parseInt(h.slice(2, 4), 16);
      b = parseInt(h.slice(4, 6), 16);
      if (h.length === 8) a = parseInt(h.slice(6, 8), 16) / 255;
    } else {
      return null;
    }
    if (a === 0) return null;
    return { r, g, b, a };
  }

  return null;
}

function parseChannel(token) {
  const t = token.trim();
  if (t.endsWith('%')) {
    return Math.round((parseFloat(t) / 100) * 255);
  }
  return Math.round(parseFloat(t));
}

function parseAlpha(token) {
  const t = token.trim();
  if (t.endsWith('%')) return parseFloat(t) / 100;
  return parseFloat(t);
}

function clampByte(n) {
  if (Number.isNaN(n)) return NaN;
  return Math.max(0, Math.min(255, n));
}

/**
 * WCAG relative luminance of an sRGB colour.
 * @param {{ r: number, g: number, b: number }} c
 * @returns {number} 0–1
 */
export function relativeLuminance({ r, g, b }) {
  const lin = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * WCAG contrast ratio between two colours. Symmetric; always in [1, 21].
 * Black vs white is exactly 21; a colour vs itself is exactly 1.
 * @param {{ r, g, b }} a
 * @param {{ r, g, b }} b
 * @returns {number}
 */
export function contrastRatio(a, b) {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Nearest-rank percentile of a list of numbers. p in [0, 1].
 * @param {number[]} values
 * @param {number} p
 * @returns {number}
 */
export function percentile(values, p) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('percentile needs a non-empty array');
  }
  const sorted = [...values].sort((x, y) => x - y);
  const clampP = Math.max(0, Math.min(1, p));
  // Nearest-rank: rank = ceil(p * N), 1-based.
  const rank = Math.max(1, Math.ceil(clampP * sorted.length));
  return sorted[rank - 1];
}

/**
 * WCAG large-text test: >= 24 px, or >= 18.66 px when bold (weight >= 700).
 * @param {number} sizePx
 * @param {number|string} weight
 * @returns {boolean}
 */
export function isLargeText(sizePx, weight) {
  const w = normalizeWeight(weight);
  if (sizePx >= 24) return true;
  if (sizePx >= 18.66 && w >= 700) return true;
  return false;
}

/** The passing contrast threshold for a given text size/weight: 3 or 4.5. */
export function threshold(sizePx, weight) {
  return isLargeText(sizePx, weight) ? 3 : 4.5;
}

function normalizeWeight(weight) {
  if (typeof weight === 'number') return weight;
  if (typeof weight === 'string') {
    const t = weight.trim().toLowerCase();
    if (t === 'bold') return 700;
    if (t === 'normal') return 400;
    const n = Number.parseInt(t, 10);
    return Number.isNaN(n) ? 400 : n;
  }
  return 400;
}

/**
 * Judge one text box's contrast. The background is the majority of the box, so
 * the 70th percentile of the per-pixel contrast ratios is taken as the text's
 * contrast against its background: the few pixels that are the text itself
 * (near-1 ratios) fall below the 70th percentile and do not drive the result.
 *
 * @param {{ r, g, b }} textColor  the text's computed colour
 * @param {Array<{ r, g, b }>} pixels  pixels sampled inside the text box
 * @param {{ size: number, weight: number|string, percentile?: number }} meta
 * @returns {{ ratio: number, threshold: number, flagged: boolean }}
 */
export function contrastOfBox(textColor, pixels, meta) {
  if (!Array.isArray(pixels) || pixels.length === 0) {
    throw new Error('contrastOfBox needs at least one pixel');
  }
  const p = meta && typeof meta.percentile === 'number' ? meta.percentile : 0.7;
  const ratios = pixels.map((px) => contrastRatio(textColor, px));
  const ratio = percentile(ratios, p);
  const limit = threshold(meta.size, meta.weight);
  return { ratio, threshold: limit, flagged: ratio < limit };
}
