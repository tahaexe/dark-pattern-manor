import { useEffect, useRef } from 'preact/hooks';
import {
  ADAPTIVE_WINDOW_MS,
  adaptiveStillEngages,
  buildFog,
  buildMotes,
  FRAME_MS,
  fogBands,
  moteCount,
  moteGlow,
  MOTES_DPR,
  shouldDraw,
  stillPose,
  type AdaptiveSample,
  type FogBand,
  type Mote,
} from './atmosphere-core';

export interface AtmosphereProps {
  /** True once the room reaches the honest step: the page exhales once, then
   *  the whole atmosphere goes still. */
  exhale: boolean;
  /** True when the user asks for reduced motion. */
  reducedMotion: boolean;
}

/** A tiny seeded rng so the mote/fog field is deterministic (no dependency). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Warm candle colour (matches --candle), used for the fog-lit motes. */
const CANDLE = { r: 240, g: 190, b: 119 };
/** Fog colour (matches the parchment/ghost warm white). */
const FOG = { r: 244, g: 239, b: 230 };

/**
 * A tiny test seam. In jsdom there is no real 2D context, so the component
 * starts no loop and draws nothing; but the loop's scheduling and still-state
 * decisions still need proving. The component records, on a module-level
 * observable keyed by a nonce, what it decided to do (start a loop vs draw
 * once), how many motes frames it painted, and whether it is paused/stopped, so
 * a test can drive fake timers and read the result without a canvas.
 */
export interface AtmosphereProbe {
  /** 'animate' when a motes loop started, 'still' when it drew once only. */
  plan: 'animate' | 'still' | 'none';
  /** Painted motes frames so far (still pose counts as 1). */
  frames: number;
  /** True while the motes timer loop is scheduling wakes. */
  looping: boolean;
  /** True once adaptive still engaged for this visit. */
  adaptiveStill: boolean;
  /** True while paused because the document is hidden. */
  pausedHidden: boolean;
}

let currentProbe: AtmosphereProbe | null = null;
/** Test-only: read the latest probe (null before the component has mounted). */
export function __atmosphereProbe(): AtmosphereProbe | null {
  return currentProbe;
}

/**
 * The atmosphere layer: a CSS glow, a CSS-drifted fog image and one small motes
 * canvas, all on the room's backdrop, behind the manor frame and every control.
 *
 * It is light: the warm breathing glow is a CSS `opacity` animation (no JS per
 * frame); the fog is painted once to an offscreen canvas and drifted by a CSS
 * `transform` (nothing repaints it per frame); only the motes cost a paint, and
 * that canvas is at device-pixel-ratio 1, woken by a timer at most 24 times a
 * second, paused while the tab is hidden, and dropped to one still frame once
 * the room turns honest, under `prefers-reduced-motion: reduce`, or if the
 * opening two seconds show a device that cannot keep the cadence (adaptive
 * still). Everything is `aria-hidden` and never takes pointer events, so no
 * text, card or control is covered.
 *
 * Cheap for the compositor too: the glow breath and the fog drift are stepped
 * CSS animations (see atmosphere.css), so the software compositor updates them
 * only a couple of dozen times a second at most; the two layers are promoted
 * to their own compositor layer (`will-change`) ONLY while they move, so an
 * idle/still/honest/hidden room does not pay to recomposite a large promoted
 * layer; and while the tab is hidden the component sets `data-hidden` on the
 * root so both CSS animations pause.
 */
export default function Atmosphere({ exhale, reducedMotion }: AtmosphereProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fogRef = useRef<HTMLCanvasElement>(null);
  const motesRef = useRef<HTMLCanvasElement>(null);
  // The latest exhale value, read inside the loop without re-subscribing it.
  const exhaleRef = useRef(exhale);
  exhaleRef.current = exhale;

  // Drive the still pose through a data attribute on the root so the CSS glow
  // and fog animations pause (and hold their rest frame) without a re-render.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (exhale) root.setAttribute('data-exhale', 'true');
    else root.removeAttribute('data-exhale');
  }, [exhale]);

  useEffect(() => {
    const root = rootRef.current;
    const motes = motesRef.current;
    const fog = fogRef.current;

    // The probe starts fresh each mount/reduced-motion change, so a test reads
    // this run's decisions. Honest and reduced motion start still.
    const probe: AtmosphereProbe = {
      plan: 'none',
      frames: 0,
      looping: false,
      adaptiveStill: false,
      pausedHidden: false,
    };
    currentProbe = probe;

    const setStill = (still: boolean) => {
      if (!root) return;
      if (still) root.setAttribute('data-still', 'true');
      else root.removeAttribute('data-still');
    };

    // Promote the glow and fog to their own compositor layer ONLY while they
    // actually move; dropping `will-change` when still/hidden/honest means an
    // idle room does not pay to recomposite a large promoted layer. The CSS
    // reads `data-moving` to add `will-change` to the glow and fog.
    const setMoving = (moving: boolean) => {
      if (!root) return;
      if (moving) root.setAttribute('data-moving', 'true');
      else root.removeAttribute('data-moving');
    };

    // Pause/resume the glow and fog CSS animations while the tab is hidden, so a
    // backgrounded room composites nothing. Independent of the still pose.
    const setHidden = (hidden: boolean) => {
      if (!root) return;
      if (hidden) root.setAttribute('data-hidden', 'true');
      else root.removeAttribute('data-hidden');
    };

    // The honest exhale ends in the still pose; reduced motion is still from the
    // start. `honest` here means "exhale has begun" — the component exhales once
    // (the CSS fades the fog / lifts the glow for ~1 s via data-exhale) and then
    // holds still.
    const honest = exhaleRef.current;
    const startStill = stillPose({ reducedMotion, honest }) === 'still';

    // The motes 2D context. Without a real one (jsdom), or honest/reduced, we
    // never loop; but we still record the plan and draw-once decision so the
    // test seam and the still CSS are driven correctly.
    const ctx =
      motes && typeof motes.getContext === 'function'
        ? (motes.getContext('2d') as CanvasRenderingContext2D | null)
        : null;
    const canDraw = !!ctx && typeof ctx.createRadialGradient === 'function';

    let timer: ReturnType<typeof setTimeout> | null = null;
    let raf = 0;
    let idle: number | ReturnType<typeof setTimeout> | null = null;
    let lastDrawn = -Infinity;
    let started = 0;
    let adaptiveChecked = false;
    let field: Mote[] = [];
    let fogField: FogBand[] = [];
    let cssW = 0;
    let cssH = 0;

    // The device cadence, sampled over the opening window off the timer's own
    // ticks: the gap between successive wakes and the duration of each paint.
    // Adaptive still reads these (not the capped frame count) so the 24 fps cap
    // never trips it on a fast desktop.
    const sample: AdaptiveSample = { gaps: [], frameDurations: [], ticks: 0, elapsedMs: 0 };
    let lastWakeAt = -1;

    const nowMs = () =>
      typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();

    const measure = (canvas: HTMLCanvasElement, dpr: number) => {
      const rect = canvas.getBoundingClientRect();
      cssW = Math.max(1, Math.round(rect.width || canvas.clientWidth || 0));
      cssH = Math.max(1, Math.round(rect.height || canvas.clientHeight || 0));
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    };

    // Paint the fog ONCE to its own canvas; CSS drifts it with a transform.
    const paintFogOnce = () => {
      if (!fog || typeof fog.getContext !== 'function') return;
      const fctx = fog.getContext('2d') as CanvasRenderingContext2D | null;
      if (!fctx || typeof fctx.createLinearGradient !== 'function') return;
      // The fog canvas is a little wider than the scene (see atmosphere.css:
      // width 118%) so the CSS drift never shows an edge; it is drawn at DPR 1
      // (soft gradients hide the lack of density).
      const rect = fog.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width || fog.clientWidth || cssW || 1));
      const h = Math.max(1, Math.round(rect.height || fog.clientHeight || cssH || 1));
      fog.width = w;
      fog.height = h;
      fctx.clearRect(0, 0, w, h);
      // Lay the pre-built bands across the layer's two halves so either side of
      // the drift shows continuous fog.
      for (const band of fogField) {
        const fg = fctx.createLinearGradient(0, band.y, 0, band.y + band.h);
        fg.addColorStop(0, `rgba(${FOG.r},${FOG.g},${FOG.b},0)`);
        fg.addColorStop(0.5, `rgba(${FOG.r},${FOG.g},${FOG.b},${band.a})`);
        fg.addColorStop(1, `rgba(${FOG.r},${FOG.g},${FOG.b},0)`);
        fctx.fillStyle = fg;
        const half = w / 2;
        for (const baseX of [band.phase % half, (band.phase % half) + half]) {
          fctx.beginPath();
          fctx.ellipse(
            baseX + half * 0.3,
            band.y + band.h / 2,
            half * 0.5,
            band.h / 2,
            0,
            0,
            Math.PI * 2,
          );
          fctx.ellipse(
            baseX + half * 0.7,
            band.y + band.h / 2,
            half * 0.45,
            band.h / 2,
            0,
            0,
            Math.PI * 2,
          );
          fctx.fill();
        }
      }
    };

    // The glow centre/radius the motes use for their candlelight weighting.
    const glowGeom = () => ({
      cx: cssW * 0.5,
      cy: cssH * 0.42,
      rad: Math.max(cssW, cssH) * 0.8,
    });

    const paintMotes = (advance: boolean) => {
      if (!ctx) return;
      ctx.clearRect(0, 0, cssW, cssH);
      const { cx, cy, rad } = glowGeom();
      for (const m of field) {
        if (advance) {
          const dt = FRAME_MS / 1000;
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          if (m.y < -2) {
            m.y = cssH + 2;
            m.x = Math.random() * cssW;
          }
          if (m.x < -2) m.x = cssW + 2;
          if (m.x > cssW + 2) m.x = -2;
        }
        const glow = moteGlow(m.x, m.y, cx, cy, rad);
        const a = Math.min(1, m.a * glow);
        ctx.beginPath();
        ctx.fillStyle = `rgba(${CANDLE.r},${CANDLE.g},${CANDLE.b},${a})`;
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
      probe.frames += 1;
    };

    const stopLoop = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      probe.looping = false;
    };

    const goStill = () => {
      stopLoop();
      setStill(true);
      // Still: the glow and fog no longer move, so drop their layer promotion.
      setMoving(false);
      if (canDraw)
        paintMotes(false); // one calm frame
      else probe.frames += 1;
      probe.plan = 'still';
    };

    // One timer wake: if visible and due, request a single rAF to paint; then
    // schedule the next wake. This is the whole cost of an idle room — at most
    // 24 frame requests a second, not the display's 60.
    const wake = () => {
      timer = null;
      const wokeAt = nowMs();
      // Record the cadence (the gap since the last wake) over the opening
      // window, skipping the pauses while hidden so a backgrounded room does
      // not read as a slow device.
      if (typeof document !== 'undefined' && document.hidden) {
        probe.pausedHidden = true;
        // Pause the glow and fog CSS too while hidden.
        setHidden(true);
        lastWakeAt = -1; // reset the cadence clock across the hidden gap
        // Re-arm so we resume promptly when visible again; visibilitychange
        // also re-arms, but this keeps the loop alive if that event is missed.
        timer = setTimeout(wake, FRAME_MS);
        return;
      }
      probe.pausedHidden = false;
      setHidden(false);
      if (!adaptiveChecked) {
        if (lastWakeAt >= 0) sample.gaps.push(wokeAt - lastWakeAt);
        lastWakeAt = wokeAt;
        sample.ticks += 1;
      }
      const now = wokeAt;
      if (shouldDraw(now, lastDrawn)) {
        const doPaint = () => {
          raf = 0;
          const paintStart = nowMs();
          if (canDraw) paintMotes(true);
          else probe.frames += 1;
          if (!adaptiveChecked) sample.frameDurations.push(nowMs() - paintStart);
          lastDrawn = now;
          // Adaptive still: after the opening window, if the device could not
          // keep the cadence (late wakes or slow frames, measured on the
          // timer's own ticks — not the capped frame count), hold the still
          // pose for the rest of this visit.
          if (!adaptiveChecked && now - started >= ADAPTIVE_WINDOW_MS) {
            adaptiveChecked = true;
            sample.elapsedMs = now - started;
            if (adaptiveStillEngages(sample)) {
              probe.adaptiveStill = true;
              goStill();
              return;
            }
          }
        };
        if (typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(doPaint);
        else doPaint();
      }
      if (timer === null && probe.looping) timer = setTimeout(wake, FRAME_MS);
    };

    const onVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) {
        // Pause the glow and fog CSS immediately on hide; the motes loop sees
        // document.hidden on its next wake.
        probe.pausedHidden = true;
        setHidden(true);
        lastWakeAt = -1; // the cadence clock resets across the hidden gap
        return;
      }
      // On returning, resume the CSS layers and reset the frame clock so no
      // catch-up burst occurs.
      setHidden(false);
      lastDrawn = -Infinity;
      probe.pausedHidden = false;
      if (probe.looping && timer === null) timer = setTimeout(wake, 0);
    };

    const start = () => {
      idle = null;
      const dpr = MOTES_DPR; // motes canvas is always 1×
      if (motes) measure(motes, dpr);
      const rng = mulberry32(0x9e3779b9);
      field = buildMotes(moteCount(cssW, cssH), cssW, cssH, rng);
      fogField = buildFog(fogBands(cssW, cssH), cssW, cssH, rng);
      paintFogOnce();
      started = nowMs();

      if (startStill) {
        goStill();
        return;
      }

      setStill(false);
      // Moving: promote the glow and fog to their own layer while they animate.
      setMoving(true);
      probe.plan = 'animate';
      probe.looping = true;
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', onVisibility);
        // Honour the current visibility at once (a room mounted in a hidden tab
        // starts paused).
        if (document.hidden) setHidden(true);
      }
      // Paint the first frame immediately, then schedule the timer loop.
      if (canDraw) paintMotes(false);
      else probe.frames += 1;
      lastDrawn = nowMs();
      timer = setTimeout(wake, FRAME_MS);
    };

    // Start only after the first paint so the largest contentful paint is never
    // delayed.
    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const w = (typeof window !== 'undefined' ? window : undefined) as IdleWindow | undefined;
    if (w && typeof w.requestIdleCallback === 'function') {
      idle = w.requestIdleCallback(start);
    } else {
      idle = setTimeout(start, 200);
    }

    return () => {
      stopLoop();
      if (idle !== null) {
        if (w && typeof w.cancelIdleCallback === 'function' && typeof idle === 'number') {
          w.cancelIdleCallback(idle);
        } else {
          clearTimeout(idle as ReturnType<typeof setTimeout>);
        }
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
      if (root) {
        root.removeAttribute('data-hidden');
        root.removeAttribute('data-moving');
      }
      if (currentProbe === probe) currentProbe = null;
    };
    // Re-run when reduced motion or the honest/exhale flag changes (animate ⇄
    // still). Exhale flips the room to its calm, still pose.
  }, [reducedMotion, exhale]);

  return (
    <div class="atmosphere" aria-hidden="true" ref={rootRef}>
      <div class="atmosphere-glow"></div>
      <canvas class="atmosphere-fog" aria-hidden="true" ref={fogRef}></canvas>
      <canvas class="atmosphere-motes" aria-hidden="true" ref={motesRef}></canvas>
    </div>
  );
}
