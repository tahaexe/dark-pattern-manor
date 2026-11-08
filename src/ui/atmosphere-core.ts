/**
 * The atmosphere layer's pure core: every parameter and scheduling decision
 * the drifting-fog / dust-mote / breathing-candlelight atmosphere needs, with
 * no canvas, no DOM and no `window`, so it can be unit-tested directly.
 *
 * The component in `Atmosphere.tsx` owns the elements, the motes timer loop and
 * the lifecycle; everything it computes lives here. The glow and the fog drift
 * are pure CSS now (the breath is a CSS opacity animation, the fog is painted
 * once and drifted by a CSS transform), so the only thing that costs a
 * per-frame paint is the small motes canvas — and even that is woken by a timer
 * at most 24 times a second, pauses when the tab is hidden, and drops to a
 * still frame once the room is honest, under reduced motion, or if the opening
 * two seconds show a device that cannot keep up (adaptive still).
 */

/** The motes paint-rate cap: at most 24 frames a second (the cheap budget). */
export const MAX_FPS = 24;
/** Milliseconds between painted motes frames at the cap. */
export const FRAME_MS = 1000 / MAX_FPS; // 41.66…

/** Dust-mote bounds: 30–60 motes caught in the candlelight. */
export const MIN_MOTES = 30;
export const MAX_MOTES = 60;

/**
 * The motes canvas is drawn at device-pixel-ratio 1. The motes are soft,
 * blurred specks, so a 1× backing store is indistinguishable from a 2× one and
 * costs a quarter of the fill — the single biggest saving on the per-frame
 * paint. (The sharp interface never rides this canvas; it is all CSS/SVG.)
 */
export const MOTES_DPR = 1;

/** The breathing glow's opacity floor and ceiling (never a flash, never zero). */
export const BREATH_MIN = 0.85;
export const BREATH_MAX = 1;
/** Breaths per second: at most twice a second, the steering's flicker limit. */
export const BREATH_HZ = 2;

/** The exhale after the right card lasts about one second. */
export const EXHALE_MS = 1000;

/** The opening window over which the device's cadence is sampled, in ms. */
export const ADAPTIVE_WINDOW_MS = 2000;

/**
 * Adaptive still measures how LATE the motes' own timer ticks arrive and how
 * long each painted frame takes — not how many frames the capped loop draws.
 *
 * The motes loop is capped at 24 fps, so on a perfectly healthy device it draws
 * ~24 frames a second and no more: counting frames against a 20 fps floor would
 * put the cap (which measures ~20.8 fps in headless Chrome) right at the floor,
 * so any single slow frame on page load would trip the fallback at random even
 * on a fast desktop. That is the bug this replaces.
 *
 * Instead the loop records, over the opening window, the gap between successive
 * timer wakes and the duration of each paint. A healthy device wakes on time
 * (each gap ≈ the frame interval, lateness ≈ 0) and paints in well under a
 * millisecond; a throttled or congested device wakes late (gaps far beyond the
 * interval) and paints slowly. The still pose engages when EITHER:
 *
 *  - the mean lateness (how much each wake overshoots the expected interval)
 *    exceeds half the frame interval, OR
 *  - the median frame takes longer than 50 ms,
 *
 * and, as a floor well under the cap and still measured on the timer's own
 * ticks, when the tick rate itself falls below 12 fps. The cap alone never
 * trips any of these on a fast desktop; a 4×-throttled CPU does.
 */
export const ADAPTIVE_LATE_FACTOR = 0.5; // mean lateness > half the frame interval
export const ADAPTIVE_MEDIAN_FRAME_MS = 50; // median paint longer than 50 ms
export const ADAPTIVE_FPS_FLOOR = 12; // measured-on-ticks floor, well under the 24 cap

/**
 * Should the motes limiter paint now? True only when at least one frame
 * interval has passed since the last painted frame, so the motes paint rate
 * never exceeds 24 fps.
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
 *
 * The component drives the breath as a CSS `@keyframes` animation now (no
 * per-frame JavaScript), so this function is kept only for the test that the
 * bound and the ≤2 Hz period hold; the CSS keyframes mirror it.
 */
export function breath(tMs: number): number {
  const mid = (BREATH_MAX + BREATH_MIN) / 2; // 0.925
  const amp = (BREATH_MAX - BREATH_MIN) / 2; // 0.075
  const v = mid + amp * Math.cos((2 * Math.PI * BREATH_HZ * tMs) / 1000);
  return Math.min(BREATH_MAX, Math.max(BREATH_MIN, v));
}

/**
 * The still-pose decision. The atmosphere shows its still pose — the glow at
 * full, the fog on one frame, the motes drawn once and not looping — whenever
 * reduced motion is active, the room is honest, or adaptive still has engaged.
 * Otherwise it animates.
 */
export function stillPose(flags: {
  reducedMotion?: boolean;
  honest?: boolean;
  adaptiveStill?: boolean;
}): 'still' | 'animate' {
  return flags.reducedMotion || flags.honest || flags.adaptiveStill ? 'still' : 'animate';
}

/**
 * The average frames per second given a painted-frame count over an elapsed
 * window in ms. A non-positive window returns 0 (no evidence of a rate). Kept
 * for reporting and as the measured-on-ticks floor input; the adaptive-still
 * decision no longer compares a capped frame count to a near-cap floor.
 */
export function averageFps(frames: number, elapsedMs: number): number {
  if (!(elapsedMs > 0) || !(frames >= 0)) return 0;
  return (frames * 1000) / elapsedMs;
}

/** The median of a list of numbers; 0 for an empty list. */
export function median(values: number[]): number {
  const xs = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (xs.length === 0) return 0;
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
}

/**
 * The mean lateness of a set of inter-tick gaps against an expected interval:
 * the average of how much each gap OVERSHOOTS the expected interval, never
 * counting an early or on-time tick as negative. A healthy device wakes on time
 * (every gap ≈ `expectedMs`, lateness ≈ 0); a congested one wakes late, so the
 * mean lateness climbs. Returns 0 for an empty list.
 */
export function meanLateness(gaps: number[], expectedMs: number): number {
  const xs = gaps.filter((g) => Number.isFinite(g));
  if (xs.length === 0) return 0;
  let sum = 0;
  for (const g of xs) sum += Math.max(0, g - expectedMs);
  return sum / xs.length;
}

/** The cadence sampled over the opening window, read off the timer's own ticks. */
export interface AdaptiveSample {
  /** Gaps between successive timer wakes, in ms (the tick cadence). */
  gaps: number[];
  /** Duration of each painted frame, in ms. */
  frameDurations: number[];
  /** The number of timer ticks observed in the window. */
  ticks: number;
  /** The window actually observed, in ms. */
  elapsedMs: number;
}

/** Tunables for {@link adaptiveStillEngages}, overridable for tests. */
export interface AdaptiveConfig {
  /** The frame interval the ticks are expected to arrive on (default FRAME_MS). */
  expectedMs?: number;
  /** Mean lateness beyond this fraction of the interval engages still. */
  lateFactor?: number;
  /** A median frame longer than this (ms) engages still. */
  medianFrameMs?: number;
  /** A measured tick rate below this (fps) engages still. */
  fpsFloor?: number;
}

/**
 * The adaptive-still decision, measured on the motes' OWN timer ticks over the
 * opening window. It engages (returns true) when the device cannot keep the
 * cadence — EITHER the wakes arrive late by more than half the frame interval
 * on average, OR the median frame takes longer than 50 ms, OR the measured tick
 * rate falls below 12 fps (a floor well under the 24 fps cap, so the cap itself
 * never trips it). A fast desktop keeps all three comfortably clear; a
 * 4×-throttled CPU crosses at least one. An empty or zero-length sample does
 * not engage (no evidence of a slow device).
 */
export function adaptiveStillEngages(sample: AdaptiveSample, cfg: AdaptiveConfig = {}): boolean {
  const expectedMs = cfg.expectedMs ?? FRAME_MS;
  const lateFactor = cfg.lateFactor ?? ADAPTIVE_LATE_FACTOR;
  const medianFrameMs = cfg.medianFrameMs ?? ADAPTIVE_MEDIAN_FRAME_MS;
  const fpsFloor = cfg.fpsFloor ?? ADAPTIVE_FPS_FLOOR;

  const gaps = sample.gaps ?? [];
  const frames = sample.frameDurations ?? [];
  // No ticks observed means no evidence either way — do not engage.
  if (gaps.length === 0 && frames.length === 0) return false;

  if (meanLateness(gaps, expectedMs) > expectedMs * lateFactor) return true;
  if (frames.length > 0 && median(frames) > medianFrameMs) return true;

  // The measured tick rate, off the timer's own ticks (not the painted count),
  // as a floor well under the cap.
  const tickFps = averageFps(sample.ticks, sample.elapsedMs);
  if (tickFps > 0 && tickFps < fpsFloor) return true;

  return false;
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
 * motes are a touch larger (1.0–3.2 px) and brighter (alpha 0.28–0.72). The
 * component brightens them further where the glow is strongest (see
 * `moteGlow`), so the field reads as motes drifting through the warm light
 * without ever painting over the interface — the canvas sits on the backdrop,
 * under every card, control and line of text.
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
 * The fog is painted ONCE to an offscreen canvas and then drifted by a CSS
 * transform, so these values describe a single still field, not a per-frame
 * animation. Each band carries enough alpha (0.10–0.20) to read as fog on the
 * dark painted room and stays soft (two overlapping blobs per band, gradient
 * edges) so it never looks like a bar. WCAG AA contrast is untouched:
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
