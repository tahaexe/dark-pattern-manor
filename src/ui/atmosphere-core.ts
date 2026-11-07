/**
 * The atmosphere layer's pure core: every parameter and scheduling decision
 * the drifting-fog / dust-mote / breathing-candlelight canvas needs, with no
 * canvas, no DOM and no `window`, so it can be unit-tested directly.
 *
 * The component in `Atmosphere.tsx` owns the `<canvas>`, the rAF loop and the
 * lifecycle; everything it computes lives here.
 */

/** The paint-rate cap: at most 30 frames a second (steering's cheap budget). */
export const MAX_FPS = 30;
/** Milliseconds between painted frames at the cap. */
export const FRAME_MS = 1000 / MAX_FPS; // 33.33…

/** Dust-mote bounds: 30–60 motes caught in the candlelight. */
export const MIN_MOTES = 30;
export const MAX_MOTES = 60;

/** The device-pixel-ratio cap for the backing store. */
export const MAX_DPR = 2;

/** The breathing glow's opacity floor and ceiling (never a flash, never zero). */
export const BREATH_MIN = 0.85;
export const BREATH_MAX = 1;
/** Breaths per second: at most twice a second, the steering's flicker limit. */
export const BREATH_HZ = 2;

/** The exhale after the right card lasts about one second. */
export const EXHALE_MS = 1000;

/**
 * The backing-store scale: the device pixel ratio, never below 1, capped at 2.
 * The canvas backing store is `cssW*scale × cssH*scale`; the 2D context is then
 * scaled by this so draw code works in CSS pixels.
 */
export function backingScale(dpr: number): number {
  const d = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  return Math.min(Math.max(1, d), MAX_DPR);
}

/**
 * Should the limiter paint now? True only when at least one frame interval has
 * passed since the last painted frame, so the paint rate never exceeds 30 fps
 * even though the rAF loop ticks at the display's rate.
 */
export function shouldDraw(now: number, lastDrawn: number): boolean {
  return now - lastDrawn >= FRAME_MS;
}

/**
 * The mote count for a viewport: scales with area, clamped to [30, 60]. A phone
 * gets ~30, a wide desktop ~60, never outside the bound.
 */
export function moteCount(width: number, height: number): number {
  const w = Math.max(0, width || 0);
  const h = Math.max(0, height || 0);
  const byArea = Math.round((w * h) / 26000);
  return Math.max(MIN_MOTES, Math.min(MAX_MOTES, byArea || MIN_MOTES));
}

/** The number of fog bands: 3 on a roomy scene, 2 on a short or narrow one. */
export function fogBands(width: number, height: number): number {
  return width >= 700 && height >= 500 ? 3 : 2;
}

/**
 * The breathing glow's opacity at time `tMs`, a slow cosine centred on 0.925
 * with amplitude 0.075, so it stays within [0.85, 1] and completes at most two
 * cycles per second. Never a flash, never zero.
 */
export function breath(tMs: number): number {
  const mid = (BREATH_MAX + BREATH_MIN) / 2; // 0.925
  const amp = (BREATH_MAX - BREATH_MIN) / 2; // 0.075
  const v = mid + amp * Math.cos((2 * Math.PI * BREATH_HZ * tMs) / 1000);
  return Math.min(BREATH_MAX, Math.max(BREATH_MIN, v));
}

/** The still-frame decision: draw once under reduced motion, else animate. */
export function renderPlan(reducedMotion: boolean): 'animate' | 'draw-once' {
  return reducedMotion ? 'draw-once' : 'animate';
}

/** A dust mote, in CSS pixels, with a slow drift velocity and an alpha. */
export interface Mote {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  a: number;
}

/** A soft fog band: a vertical position, a height, a drift speed, an alpha. */
export interface FogBand {
  y: number;
  h: number;
  speed: number;
  a: number;
  phase: number;
}

/**
 * Build `n` motes spread over the viewport, with gentle upward drift.
 *
 * Dust caught in candlelight should read as little floating specks, so the
 * motes are a touch larger (1.0–3.2 px) and brighter (alpha 0.28–0.72) than the
 * first, barely-visible pass. The component brightens them further where the
 * glow is strongest (see `moteGlow`), so the field reads as motes drifting
 * through the warm light without ever painting over the interface — the canvas
 * sits on the backdrop, under every card, control and line of text.
 */
export function buildMotes(n: number, w: number, h: number, rng: () => number): Mote[] {
  const out: Mote[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      x: rng() * w,
      y: rng() * h,
      r: 1.0 + rng() * 2.2, // 1.0–3.2 px dust, large enough to see float
      vx: (rng() - 0.5) * 6, // gentle horizontal sway, px/s
      vy: -(4 + rng() * 10), // slow upward drift, px/s
      a: 0.28 + rng() * 0.44, // visible but calm, 0.28–0.72
    });
  }
  return out;
}

/**
 * Build `bands` soft fog bands across the viewport.
 *
 * The fog is the mood a player should notice drifting through the visible
 * backdrop — above and beside the frame and across the painted window — so each
 * band carries enough alpha (0.10–0.20) to read as fog on the dark painted room
 * and drifts slowly (3–7 px/s) rather than the near-invisible 0.04–0.09 of the
 * first pass. It stays soft (two overlapping blobs per band, gradient edges) so
 * it never looks like a bar, and it rides on the backdrop under every control,
 * so it lies with the backdrop, never over text. WCAG AA contrast is untouched:
 * `contrast_scan` measures the `.comparison` box far above this layer.
 */
export function buildFog(bands: number, w: number, h: number, rng: () => number): FogBand[] {
  const out: FogBand[] = [];
  for (let i = 0; i < bands; i++) {
    const band = h / bands;
    out.push({
      y: band * i + band * (0.2 + rng() * 0.3),
      h: band * (0.6 + rng() * 0.5),
      speed: (3 + rng() * 4) * (rng() < 0.5 ? -1 : 1), // 3–7 px/s, either way
      a: 0.1 + rng() * 0.1, // readable fog, 0.10–0.20
      phase: rng() * w,
    });
  }
  return out;
}

/**
 * A mote's candlelight brightness multiplier at `(x, y)`, given the glow centre
 * `(cx, cy)` and its radius `rad`: 1 at the centre, easing down to `floor` at
 * the edge and beyond, so motes near the candlelight look brighter than those
 * in the dark corners. Pure and clamped, so it is unit-testable and the
 * component just multiplies the mote's base alpha by it.
 */
export function moteGlow(
  x: number,
  y: number,
  cx: number,
  cy: number,
  rad: number,
  floor = 0.55,
): number {
  if (!(rad > 0)) return 1;
  const dx = x - cx;
  const dy = y - cy;
  const d = Math.sqrt(dx * dx + dy * dy) / rad; // 0 at centre, 1 at edge
  const t = Math.min(1, Math.max(0, d));
  // Ease the bright centre out to the floor at the edge.
  const falloff = 1 - t * t;
  return floor + (1 - floor) * falloff;
}

/** An ease-out over [0,1]. */
function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

/**
 * Exhale progress 0..1 at `msSinceStart`, eased and clamped to 1 so the scene
 * settles after about a second and then holds calm.
 */
export function exhaleProgress(msSinceStart: number): number {
  if (!(msSinceStart > 0)) return 0;
  const t = Math.min(1, msSinceStart / EXHALE_MS);
  return easeOut(t);
}
