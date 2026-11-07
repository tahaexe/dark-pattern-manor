import { useEffect, useRef } from 'preact/hooks';
import {
  backingScale,
  breath,
  buildFog,
  buildMotes,
  exhaleProgress,
  fogBands,
  moteCount,
  moteGlow,
  renderPlan,
  shouldDraw,
  type FogBand,
  type Mote,
} from './atmosphere-core';

export interface AtmosphereProps {
  /** True once the room reaches the honest step: the page exhales once. */
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

/** Warm candle colour (matches --candle), used for glow and motes. */
const CANDLE = { r: 240, g: 190, b: 119 };
/** Fog colour (matches the parchment/ghost warm white). */
const FOG = { r: 244, g: 239, b: 230 };

/**
 * The atmosphere layer: one `<canvas>` on the room's backdrop, behind the
 * manor frame and every control, drawing a slow drifting fog, dust motes
 * caught in candlelight, and a warm glow that breathes on the walls.
 *
 * It is cheap: it starts only after the first paint, paints at most 30 fps,
 * pauses while the tab is hidden, sizes to the device pixel ratio capped at 2,
 * and tears everything down on unmount. Under `prefers-reduced-motion: reduce`
 * it runs no animation at all and draws a single still frame. When the room
 * turns honest it exhales once — the fog thins, the glow rises — then holds
 * calm. The canvas is `aria-hidden` and never takes pointer events, so it
 * never covers any text, card or control.
 */
export default function Atmosphere({ exhale, reducedMotion }: AtmosphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The exhale clock: when `exhale` turns true we record the start so the draw
  // loop (or the still redraw) can ease the fog/glow over ~1s and then rest.
  const exhaleStartRef = useRef<number | null>(null);
  // The latest reduced-motion/exhale values, read inside the loop without
  // re-subscribing it.
  const exhaleRef = useRef(exhale);
  exhaleRef.current = exhale;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof canvas.getContext !== 'function') return; // jsdom: inert

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let idle: number | ReturnType<typeof setTimeout> | null = null;
    let running = false;
    let lastDrawn = -Infinity;
    let started = 0;
    let motes: Mote[] = [];
    let fog: FogBand[] = [];
    let cssW = 0;
    let cssH = 0;
    let scale = 1;

    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      cssW = Math.max(1, Math.round(rect.width || canvas.clientWidth || 0));
      cssH = Math.max(1, Math.round(rect.height || canvas.clientHeight || 0));
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      scale = backingScale(dpr);
      canvas.width = Math.round(cssW * scale);
      canvas.height = Math.round(cssH * scale);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
    };

    const paint = (now: number) => {
      // Exhale easing: thin the fog and lift the glow over ~1s, then hold.
      let fogScale = 1;
      let glowLift = 0;
      if (exhaleRef.current) {
        if (exhaleStartRef.current === null) exhaleStartRef.current = now;
        const p = exhaleProgress(now - exhaleStartRef.current);
        fogScale = 1 - 0.6 * p; // fog thins to 40%
        glowLift = 0.08 * p; // glow rises a touch
      } else {
        exhaleStartRef.current = null;
      }

      ctx.clearRect(0, 0, cssW, cssH);

      // The breathing warm glow: a soft radial centred high on the wall, lifted
      // so the candlelight clearly warms the room (the backdrop mostly shows in
      // the margins around and above the frame, where this glow lives).
      const b = (reducedMotion ? 1 : breath(now - started)) + glowLift;
      const cx = cssW * 0.5;
      const cy = cssH * 0.42;
      const rad = Math.max(cssW, cssH) * 0.8;
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      const g = Math.min(1, b);
      grd.addColorStop(0, `rgba(${CANDLE.r},${CANDLE.g},${CANDLE.b},${0.22 * g})`);
      grd.addColorStop(0.55, `rgba(${CANDLE.r},${CANDLE.g},${CANDLE.b},${0.1 * g})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, cssW, cssH);

      // The drifting fog bands.
      for (const band of fog) {
        const drift = reducedMotion ? 0 : ((now - started) / 1000) * band.speed;
        const x = ((band.phase + drift) % (cssW + band.h)) - band.h;
        const fg = ctx.createLinearGradient(0, band.y, 0, band.y + band.h);
        const a = band.a * fogScale;
        fg.addColorStop(0, `rgba(${FOG.r},${FOG.g},${FOG.b},0)`);
        fg.addColorStop(0.5, `rgba(${FOG.r},${FOG.g},${FOG.b},${a})`);
        fg.addColorStop(1, `rgba(${FOG.r},${FOG.g},${FOG.b},0)`);
        ctx.fillStyle = fg;
        // Two soft overlapping blobs so the band is not a hard rectangle.
        ctx.beginPath();
        ctx.ellipse(x + cssW * 0.3, band.y + band.h / 2, cssW * 0.5, band.h / 2, 0, 0, Math.PI * 2);
        ctx.ellipse(x + cssW * 0.7, band.y + band.h / 2, cssW * 0.45, band.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // The dust motes caught in the candlelight: brighter where the glow is.
      for (const m of motes) {
        if (!reducedMotion) {
          const dt = 1 / 30;
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

      lastDrawn = now;
    };

    const nowMs = () =>
      typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();

    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (typeof document !== 'undefined' && document.hidden) return; // paused while hidden
      const now = nowMs();
      if (shouldDraw(now, lastDrawn)) paint(now);
    };

    const onVisibility = () => {
      // On returning to a visible tab, reset the frame clock so no catch-up
      // burst occurs; the next tick paints one fresh frame.
      if (typeof document !== 'undefined' && !document.hidden) lastDrawn = -Infinity;
    };

    const start = () => {
      idle = null;
      measure();
      const rng = mulberry32(0x9e3779b9);
      motes = buildMotes(moteCount(cssW, cssH), cssW, cssH, rng);
      fog = buildFog(fogBands(cssW, cssH), cssW, cssH, rng);
      started = nowMs();

      if (renderPlan(reducedMotion) === 'draw-once') {
        // One still frame of fog and glow, no loop.
        paint(started);
        return;
      }

      running = true;
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', onVisibility);
      }
      raf = requestAnimationFrame(loop);
    };

    // Start only after the first paint so the largest contentful paint is
    // never delayed.
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
      if (raf) cancelAnimationFrame(raf);
      if (idle !== null) {
        if (w && typeof w.cancelIdleCallback === 'function' && typeof idle === 'number') {
          w.cancelIdleCallback(idle);
        } else {
          clearTimeout(idle as ReturnType<typeof setTimeout>);
        }
      }
      if (running && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
    // Re-run when reduced motion changes (animate ⇄ still). The exhale is read
    // live through a ref, so it does not restart the loop.
  }, [reducedMotion]);

  return <canvas class="atmosphere-canvas" aria-hidden="true" ref={canvasRef}></canvas>;
}
