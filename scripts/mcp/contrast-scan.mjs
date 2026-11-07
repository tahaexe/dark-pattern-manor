// The contrast_scan tool: for each room's comparison at 0 (haunted) and 100
// (honest), screenshot the comparison box, draw it into a canvas inside the
// browser, and for every visible text node's box read its pixels and compute
// the WCAG contrast of the text colour against the box's background (the 70th
// percentile of per-pixel ratios). Flags below threshold are returned as JSON.
//
// The maths live in the pure contrast.mjs module; this file only gathers the
// pixels from the real browser and calls contrastOfBox.

import { setTimeout as sleep } from 'node:timers/promises';
import { parseRooms } from './rooms.mjs';
import { openSession, distReady, NO_DIST_MESSAGE } from './session.mjs';
import { freeRoom } from './walk.mjs';
import { parseColor, contrastOfBox } from './contrast.mjs';

// In-page: collect every *visible* text node inside .comparison with its
// colour, size, weight and box. The comparison box is scrolled into view
// first, and the box rect is returned in PAGE coordinates (viewport + scroll)
// so it matches the CDP screenshot clip, which is page-relative. Each text
// box is returned relative to the comparison box's top-left.
//
// Only text actually painted at the current slider state is kept: the
// clipped-away layer's text (the side the wipe has hidden) is skipped, so the
// scan measures what a player really sees. Each glyph box is padded by ~0.6x
// the font size per side (clamped to the comparison box) so the background is
// the majority and the 70th percentile lands on it, as the rule assumes.
const COLLECT_TEXTS = `(() => {
  const g = document.querySelector('.comparison');
  if (!g) return null;
  g.scrollIntoView({ block: 'center' });
  const gr = g.getBoundingClientRect();
  const visibleTop = (el, r) => {
    for (const [fx, fy] of [[0.5, 0.5], [0.25, 0.5], [0.75, 0.5], [0.5, 0.25]]) {
      const x = r.left + r.width * fx, y = r.top + r.height * fy;
      if (y < 0 || y > innerHeight) continue;
      const hit = document.elementFromPoint(x, y);
      if (hit && (hit === el || el.contains(hit) || hit.contains(el))) return true;
    }
    return false;
  };
  const out = [];
  const walker = document.createTreeWalker(g, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const t = walker.currentNode;
    if (!t.textContent.trim()) continue;
    const e = t.parentElement;
    if (!e || seen.has(e)) continue;
    seen.add(e);
    const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    if (e.closest('.comparison-tag')) continue; // decorative corner labels
    const rg = document.createRange();
    rg.selectNodeContents(t);
    const r = rg.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (!visibleTop(e, r)) continue; // clipped away or covered at this slider end
    const size = parseFloat(cs.fontSize) || 16;
    const pad = size * 0.6;
    const x = Math.max(r.left - pad, gr.left), y = Math.max(r.top - pad, gr.top);
    const right = Math.min(r.right + pad, gr.right), bottom = Math.min(r.bottom + pad, gr.bottom);
    if (right - x < 2 || bottom - y < 2) continue;
    out.push({
      text: t.textContent.trim().slice(0, 50),
      color: cs.color,
      size,
      weight: cs.fontWeight,
      // box relative to the comparison box's top-left, in CSS px
      bx: x - gr.left, by: y - gr.top, bw: right - x, bh: bottom - y,
    });
  }
  // The box in PAGE coordinates, for the (page-relative) screenshot clip.
  return {
    box: { x: gr.left + scrollX, y: gr.top + scrollY, width: gr.width, height: gr.height },
    texts: out,
  };
})()`;

/**
 * Draw a PNG data-URL into a canvas in the page, then read the pixels inside a
 * list of boxes. Returns, per box, a flat array of {r,g,b} sampled on a grid
 * (capped so the payload stays small). Runs entirely in the browser. clipW and
 * clipH are the comparison box's CSS dimensions, used to map CSS px to the
 * screenshot's pixel grid (device scale may differ).
 */
function readPixelsScript(dataUrl, boxes, clipW, clipH) {
  return `(async () => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = ${JSON.stringify(dataUrl)}; });
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const boxes = ${JSON.stringify(boxes)};
    const sx = c.width / ${clipW}, sy = c.height / ${clipH};
    const sample = (box) => {
      const px = [];
      const x0 = Math.max(0, Math.floor(box.bx * sx));
      const y0 = Math.max(0, Math.floor(box.by * sy));
      const x1 = Math.min(c.width, Math.ceil((box.bx + box.bw) * sx));
      const y1 = Math.min(c.height, Math.ceil((box.by + box.bh) * sy));
      if (x1 <= x0 || y1 <= y0) return px;
      const img2 = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
      const w = x1 - x0, h = y1 - y0;
      const stepX = Math.max(1, Math.floor(w / 32));
      const stepY = Math.max(1, Math.floor(h / 32));
      for (let yy = 0; yy < h; yy += stepY) for (let xx = 0; xx < w; xx += stepX) {
        const i = (yy * w + xx) * 4;
        px.push({ r: img2[i], g: img2[i + 1], b: img2[i + 2] });
      }
      return px;
    };
    return boxes.map(sample);
  })()`;
}

/** Scan one room at one slider end; push any flags. */
async function scanState(cdp, n, state, flags) {
  const data = await cdp.ev(COLLECT_TEXTS);
  if (!data || !data.texts || data.texts.length === 0) return;

  // Screenshot the comparison box (page coordinates, CSS px at scale 1,
  // capturing beyond the viewport so a tall box is caught whole).
  const clip = { x: data.box.x, y: data.box.y, width: data.box.width, height: data.box.height, scale: 1 };
  const shot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    clip,
    captureBeyondViewport: true,
  });
  if (!shot || !shot.data) return;
  const dataUrl = 'data:image/png;base64,' + shot.data;

  const boxes = data.texts.map((t) => ({ bx: t.bx, by: t.by, bw: t.bw, bh: t.bh }));
  const script = readPixelsScript(dataUrl, boxes, data.box.width, data.box.height);
  const pixelSets = await cdp.ev(script);
  if (!Array.isArray(pixelSets)) return;

  data.texts.forEach((t, i) => {
    const textColor = parseColor(t.color);
    if (!textColor) return; // transparent text is skipped
    const pixels = pixelSets[i];
    if (!Array.isArray(pixels) || pixels.length === 0) return;
    const { ratio, threshold, flagged } = contrastOfBox(textColor, pixels, {
      size: t.size,
      weight: t.weight,
    });
    if (flagged) {
      flags.push({
        room: n,
        state,
        text: t.text,
        color: t.color,
        size: t.size,
        weight: t.weight,
        ratio: Number(ratio.toFixed(2)),
        threshold,
      });
    }
  });
}

/** Set the slider to one end (0 = haunted, 100 = honest). */
async function setSlider(cdp, end) {
  await cdp.ev(
    "(() => { const i = document.querySelector('.comparison input[type=range], .split-range'); if (i) i.focus(); return !!i; })()",
  );
  await cdp.key(end === 0 ? 'Home' : 'End');
  await sleep(350);
}

/**
 * The contrast_scan tool entry point.
 * @param {{ rooms?: string, width?: number, height?: number }} args
 * @returns {Promise<string>} JSON text
 */
export async function runContrastScan(args = {}) {
  const rooms = parseRooms(args.rooms ?? '1-12');
  const width = Number(args.width ?? 1280);
  const height = Number(args.height ?? 720);

  if (!distReady()) return NO_DIST_MESSAGE;

  const session = await openSession({ width, height });
  const flags = [];
  try {
    for (const n of rooms) {
      // Reach the comparison by freeing the room (shared with the walk).
      await freeRoom(session.cdp, session.baseUrl, n);
      await sleep(400);

      await setSlider(session.cdp, 0);
      await scanState(session.cdp, n, 'haunted', flags);

      await setSlider(session.cdp, 100);
      await scanState(session.cdp, n, 'honest', flags);
    }
    return JSON.stringify({ rooms, width, height, flags }, null, 2);
  } finally {
    await session.teardown();
  }
}
