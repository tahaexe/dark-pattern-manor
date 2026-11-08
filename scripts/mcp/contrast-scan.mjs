// The contrast_scan tool: for each room's comparison at 0 (haunted) and 100
// (honest), screenshot the comparison box, draw it into a canvas inside the
// browser, and for every visible text node's box read its pixels and compute
// the WCAG contrast of the text colour against the box's background (the 70th
// percentile of per-pixel ratios). Flags below threshold are returned as JSON.
//
// The maths live in the pure contrast.mjs module; this file only gathers the
// pixels from the real browser and calls contrastOfBox.
//
// Motion QA: with reducedMotion true the session emulates
// prefers-reduced-motion: reduce before each page loads, so the scan can
// measure the reduced-motion rendering. The scan itself is unchanged (it
// measures pixels, not motion); the flag is echoed in the result.

import { setTimeout as sleep } from 'node:timers/promises';
import { parseRooms } from './rooms.mjs';
import { openSession, distReady, NO_DIST_MESSAGE } from './session.mjs';
import { freeRoom } from './walk.mjs';
import { parseColor, contrastOfBox } from './contrast.mjs';
import { wantsReducedMotion } from './motion.mjs';

// In-page: collect every *visible* text node inside the comparison with its
// colour, size, weight and box. The comparison box is scrolled into view
// first, and the box rect is returned in PAGE coordinates (viewport + scroll)
// so it matches the CDP screenshot clip, which is page-relative. Each text
// box is returned relative to the comparison box's top-left.
//
// The two cells (haunted and honest) overlap in the same grid area and are
// revealed by the wipe. We only ever measure the cell that is actually shown
// at this slider end — `cellSel` is `.comparison-haunted` at the haunted end
// (slider 0) and `.comparison-honest` at the honest end (slider 100). The two
// cells carry structurally identical controls (e.g. both have an "Accept all"
// button), so walking the WHOLE comparison and leaning on element hit-testing
// to tell the hidden copy from the shown one was unreliable where the copies
// overlap: a corner sample of the clipped-under haunted "Accept all" could land
// on the honest "Accept all" painted on top (dark ink on dark ink) and read a
// false ~1.27:1. Scoping the walk to the revealed cell removes that ambiguity
// entirely — it measures exactly what the player sees at this end.
//
// Each glyph box is padded by ~0.6x the font size per side (clamped to the
// comparison box) so the background is the majority and the 70th percentile
// lands on it, as the rule assumes. A text node whose box is clipped away by
// the wipe at this end (outside the revealed region) is skipped.
function collectTextsScript(cellSel) {
  return `(() => {
  const g = document.querySelector('.comparison');
  if (!g) return null;
  const cell = document.querySelector(${JSON.stringify(cellSel)});
  if (!cell) return null;
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
  // Walk only the revealed cell, so the clipped-under twin's identical controls
  // are never measured.
  const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
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
}

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

// In-page: blur whatever has focus so no control holds a :focus colour.
const BLUR = `(() => {
  try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (_e) {}
  return true;
})()`;

/**
 * Drop any focus and any hover on the comparison's controls, so none is sampled
 * in its focus/hover colours. Freeing the room finishes the honest task by a
 * real pointer click/tap, which can leave the virtual mouse resting over a
 * button; moving the mouse to the corner clears `:hover`, and blurring drops
 * `:focus`. We measure the RESTING look a player sees.
 */
async function clearFocusHover(cdp) {
  await cdp.ev(BLUR);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1, y: 1, buttons: 0 });
}

/**
 * Scan one room at one slider end; push any flags. `cellSel` names the cell
 * actually revealed at this end (.comparison-haunted at 0, .comparison-honest
 * at 100), so only the shown copy of overlapping controls is measured.
 */
async function scanState(cdp, n, state, cellSel, flags) {
  const data = await cdp.ev(collectTextsScript(cellSel));
  if (!data || !data.texts || data.texts.length === 0) return;

  const boxes = data.texts.map((t) => ({ bx: t.bx, by: t.by, bw: t.bw, bh: t.bh }));
  const clip = {
    x: data.box.x,
    y: data.box.y,
    width: data.box.width,
    height: data.box.height,
    scale: 1,
  };

  // One capture → per-text {ratio, threshold, flagged}. `Page.captureScreenshot`
  // with captureBeyondViewport re-renders the clipped region, and that fresh
  // render can momentarily disagree with the settled DOM (a transient paint
  // frame while the honest clip/transition flushes), so a single capture
  // occasionally reads a false low-contrast even though the live element is
  // compliant — the honest "Accept all" is dark ink text on a dark ink fill
  // (~12:1), yet a transient can render the parchment cell where the button
  // should be and read parchment-on-parchment (~1.27). We therefore take TWO
  // captures a moment apart and keep only flags that reproduce in BOTH: a
  // genuine low-contrast is stable across captures; a capture transient is not.
  const captureFlags = async () => {
    const shot = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      clip,
      captureBeyondViewport: true,
    });
    if (!shot || !shot.data) return null;
    const dataUrl = 'data:image/png;base64,' + shot.data;
    const script = readPixelsScript(dataUrl, boxes, data.box.width, data.box.height);
    const pixelSets = await cdp.ev(script);
    if (!Array.isArray(pixelSets)) return null;
    const perText = new Map();
    data.texts.forEach((t, i) => {
      const textColor = parseColor(t.color);
      if (!textColor) return; // transparent text is skipped
      const pixels = pixelSets[i];
      if (!Array.isArray(pixels) || pixels.length === 0) return;
      const { ratio, threshold, flagged } = contrastOfBox(textColor, pixels, {
        size: t.size,
        weight: t.weight,
      });
      perText.set(i, { ratio, threshold, flagged });
    });
    return perText;
  };

  const first = await captureFlags();
  if (!first) return;
  await sleep(150);
  const second = await captureFlags();
  if (!second) return;

  data.texts.forEach((t, i) => {
    const a = first.get(i);
    const b = second.get(i);
    // Keep a flag only when BOTH captures flag this text (a stable, real
    // low-contrast). Report the worse (lower) ratio of the two.
    if (!a || !b || !a.flagged || !b.flagged) return;
    const ratio = Math.min(a.ratio, b.ratio);
    flags.push({
      room: n,
      state,
      text: t.text,
      color: t.color,
      size: t.size,
      weight: t.weight,
      ratio: Number(ratio.toFixed(2)),
      threshold: a.threshold,
    });
  });
}

/**
 * Set the slider to one end (0 = haunted, 100 = honest) deterministically, drop
 * any focus/hover on the comparison's controls, and wait until the wipe AND the
 * revealed cell's paint have settled.
 *
 * The scan measures the RESTING look a player sees at each end of the wipe, so
 * before pixels are read: the clip must have reached that end; no control may
 * sit in a focus/hover state (freeing the room clicks a honest button and can
 * leave the virtual mouse over it, so its `:hover` swaps `.cookie-button-equal`
 * to a parchment background); and the content must have stopped moving.
 *  1. set the native range value and dispatch `input` (updates `--split`
 *     regardless of focus), with the Home/End key as a fallback;
 *  2. clear focus (blur) and hover (move the virtual mouse to the corner);
 *  3. poll `--split` until it reaches the target;
 *  4. poll the revealed cell's geometry until it is STABLE across two reads,
 *     flushing paint with a double requestAnimationFrame, then clear focus/hover
 *     once more and wait out the hover transition (120 ms) so the resting
 *     colours have landed.
 */
async function setSlider(cdp, end) {
  const target = end === 0 ? 0 : 100;
  const cellSel = end === 0 ? '.comparison-haunted' : '.comparison-honest';
  // Drive the range directly: set its value and fire a native `input` event so
  // the Preact onInput handler updates `--split` without needing focus.
  await cdp.ev(`(() => {
    const i = document.querySelector('.comparison input[type=range], .split-range');
    if (!i) return false;
    i.focus();
    const proto = Object.getPrototypeOf(i);
    const setter = Object.getOwnPropertyDescriptor(proto, 'value') &&
      Object.getOwnPropertyDescriptor(proto, 'value').set;
    if (setter) setter.call(i, String(${target}));
    else i.value = String(${target});
    i.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
  // Keyboard fallback (Home/End), harmless if the input event already took.
  await cdp.key(end === 0 ? 'Home' : 'End');

  // Clear any focus/hover so no control is caught in its focus/hover colours.
  await clearFocusHover(cdp);

  // Poll the honest cell's `--split` until it reaches the target.
  const readSplit = `(() => {
    const cell = document.querySelector('.comparison-honest');
    if (!cell) return null;
    const v = getComputedStyle(cell).getPropertyValue('--split').trim();
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  })()`;
  for (let i = 0; i < 20; i++) {
    const v = await cdp.ev(readSplit);
    if (v === null || v === target) break;
    await sleep(50);
  }

  // Wait for the revealed cell's geometry to be STABLE across two reads, each
  // after a double rAF (a paint flush), so content has settled into place
  // before the screenshot — independent of process load.
  const measureAfterPaint = `(async () => {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const cell = document.querySelector(${JSON.stringify(cellSel)});
    if (!cell) return null;
    const btn = cell.querySelector('button, a, input');
    const r = (btn || cell).getBoundingClientRect();
    return Math.round(r.top) + 'x' + Math.round(r.left) + 'x' + Math.round(r.width) + 'x' + Math.round(r.height);
  })()`;
  let prev = null;
  for (let i = 0; i < 20; i++) {
    const sig = await cdp.ev(measureAfterPaint);
    if (sig !== null && sig === prev) break;
    prev = sig;
    await sleep(50);
  }
  // Clear focus/hover once more (the rAF waits can let state settle) and wait
  // out the hover transition (120 ms) plus a margin so the resting colours have
  // landed before the screenshot.
  await clearFocusHover(cdp);
  await sleep(300);
}

/**
 * The contrast_scan tool entry point.
 * @param {{ rooms?: string, width?: number, height?: number, reducedMotion?: boolean }} args
 * @returns {Promise<string>} JSON text
 */
export async function runContrastScan(args = {}) {
  const rooms = parseRooms(args.rooms ?? '1-12');
  const width = Number(args.width ?? 1280);
  const height = Number(args.height ?? 720);
  const reducedMotion = wantsReducedMotion(args);

  if (!distReady()) return NO_DIST_MESSAGE;

  const session = await openSession({ width, height, reducedMotion });
  const flags = [];
  try {
    for (const n of rooms) {
      // Reach the comparison by freeing the room (shared with the walk).
      await freeRoom(session.cdp, session.baseUrl, n, reducedMotion, width, height);
      await sleep(400);

      await setSlider(session.cdp, 0);
      await scanState(session.cdp, n, 'haunted', '.comparison-haunted', flags);

      await setSlider(session.cdp, 100);
      await scanState(session.cdp, n, 'honest', '.comparison-honest', flags);
    }
    return JSON.stringify({ rooms, width, height, reducedMotion, flags }, null, 2);
  } finally {
    await session.teardown();
  }
}
