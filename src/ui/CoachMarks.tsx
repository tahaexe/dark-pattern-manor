import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { RefObject } from 'preact';
import type { CoachMark, CoachStep } from '../engine/types';
import './coach-marks.css';

export interface CoachMarksProps {
  /** The room's coach marks (room 1 only). */
  marks: ReadonlyArray<CoachMark>;
  /** The current loop step derived from the room state. */
  step: CoachStep;
  /** The scene element the targets are resolved within. */
  sceneRef: RefObject<HTMLElement>;
  /** Hide the remaining marks for good (skip link / Escape). */
  onSkip: () => void;
  /** True under prefers-reduced-motion. */
  reducedMotion: boolean;
}

/** Where the mark sits relative to its target. */
type Side = 'below' | 'above';

interface Placed {
  /** Translate X/Y from the scene's top-left, in px. */
  x: number;
  y: number;
  width: number;
  side: Side;
  /**
   * True once the mark's position has settled, so it can be revealed. While
   * false the plate is rendered (so it can be measured) but kept invisible
   * (`visibility: hidden`). Every re-placement while the scene is still moving
   * — the entry's ring/scroll, the comparison's opening sweep — happens while
   * invisible; the mark is revealed only once the position has held for a
   * moment, at its final spot. A move while invisible is never a visible
   * reposition, so the layout-shift observer records nothing: CLS stays 0.
   */
  ready: boolean;
}

/** The coach plate's width budget, in px, when placing it inside the scene. */
const MARK_WIDTH = 260;
/** Gap between the target and the plate. */
const MARK_GAP = 12;
/** An estimate of the plate's height, used only when it cannot be measured yet. */
const MARK_EST_HEIGHT = 120;
/**
 * How long a placement must hold still before the mark is revealed, in ms. The
 * entry (ring placement, scrollIntoView) and the comparison's opening sweep
 * reflow the scene for a short while after a step begins; waiting for the
 * position to settle means the mark is revealed only at its final spot, so no
 * post-reveal reposition is ever recorded as a layout shift.
 */
const SETTLE_MS = 450;
/** A move smaller than this (px) counts as "held still" for the settle check. */
const SETTLE_EPSILON = 1;

/**
 * The tutorial coach mark for room 1. It draws one small positioned overlay for
 * the current loop step, beside the element it points at — never over it, never
 * off the first screen, and never moving the page.
 *
 * It is absolutely positioned at the scene's top-left and placed purely with a
 * CSS `transform: translate(...)`, so it takes no layout space. It is kept
 * invisible (`visibility: hidden`) until its position has settled, then revealed
 * at that final spot. The scene keeps moving for a short while after each step
 * begins — the possessed ring's scrollIntoView on entry, the comparison's
 * opening sweep once honest — and every re-placement during that window happens
 * while the mark is invisible. Because the mark only ever becomes visible at its
 * final position, the layout-shift observer never sees it move: CLS stays 0.
 *
 * Its chosen SIDE (above the target, or below it) is picked once per step and
 * then held, so the decorative arrow never jumps from one plate edge to the
 * other. It prefers to sit ABOVE its target, so it never covers the target and
 * never lands on the content that follows it (e.g. the spell cards' inline
 * wrong-card reason); it drops below only when there is no room above.
 *
 * It takes no focus: nothing inside is auto-focused and only the "Skip the tips"
 * button is in the Tab order. The skip link and the Escape key both call
 * `onSkip`. Under reduced motion the mark shows with no movement. If the target
 * cannot be found, it renders nothing. It owns no live region: the engine (Room)
 * speaks each step's body once through the shared polite region.
 */
export default function CoachMarks({
  marks,
  step,
  sceneRef,
  onSkip,
  reducedMotion,
}: CoachMarksProps) {
  const mark = marks.find((m) => m.step === step) ?? null;
  const [placed, setPlaced] = useState<Placed | null>(null);
  const markRef = useRef<HTMLDivElement>(null);
  // The side chosen on the first placement for this step, held across later
  // re-placements so the arrow never jumps edges.
  const sideRef = useRef<Side | null>(null);

  // Escape dismisses the tips, matching the How-to-play popover's handling.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onSkip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSkip]);

  // Place the plate beside its target inside the scene, recomputed on resize and
  // whenever the scene or the target changes size, and reveal it only once the
  // position has held still for SETTLE_MS. Until then it is placed but invisible,
  // so no reposition is ever a visible shift.
  useLayoutEffect(() => {
    const scene = sceneRef.current;
    // A fresh step: forget the previous step's side and settle state.
    sideRef.current = null;
    if (!scene || !mark) {
      setPlaced(null);
      return;
    }

    let revealed = false;
    let lastX = NaN;
    let lastY = NaN;
    let settleTimer = 0;

    const compute = (): { x: number; y: number; width: number; side: Side } | null => {
      const target = scene.querySelector<HTMLElement>(mark.target);
      if (!target) return null;
      const sr = scene.getBoundingClientRect();
      const tr = target.getBoundingClientRect();
      if (sr.width <= 0 || tr.width <= 0) return null;

      const width = Math.min(MARK_WIDTH, Math.max(160, sr.width - 24));
      const measured = markRef.current?.getBoundingClientRect().height;
      const markH = measured && measured > 0 ? measured : MARK_EST_HEIGHT;

      const targetCenterX = tr.left - sr.left + tr.width / 2;
      let x = targetCenterX - width / 2;
      x = Math.max(8, Math.min(x, sr.width - width - 8));

      const aboveY = tr.top - sr.top - MARK_GAP - markH;
      let side: Side;
      if (sideRef.current) {
        side = sideRef.current;
      } else {
        side = aboveY >= 8 ? 'above' : 'below';
        sideRef.current = side;
      }
      const y = side === 'above' ? aboveY : tr.bottom - sr.top + MARK_GAP;
      return { x, y, width, side };
    };

    const scheduleReveal = () => {
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        revealed = true;
        const p = compute();
        if (p) setPlaced({ ...p, ready: true });
      }, SETTLE_MS);
    };

    const place = () => {
      const p = compute();
      if (!p) {
        setPlaced(null);
        return;
      }
      // Keep it invisible until revealed; render at the latest position either
      // way so the measured height is right by the time it shows.
      setPlaced({ ...p, ready: revealed });
      // If it has not settled, or it just moved, (re)start the settle timer.
      const moved =
        Math.abs(p.x - lastX) > SETTLE_EPSILON || Math.abs(p.y - lastY) > SETTLE_EPSILON;
      lastX = p.x;
      lastY = p.y;
      if (!revealed || moved) {
        revealed = false;
        scheduleReveal();
      }
    };

    place();
    // A post-paint pass so the measured height refines the first placement while
    // still invisible.
    const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(place) : 0;

    let ro: ResizeObserver | null = null;
    const target = scene.querySelector<HTMLElement>(mark.target);
    if (typeof ResizeObserver === 'function') {
      ro = new ResizeObserver(() => place());
      ro.observe(scene);
      if (target) ro.observe(target);
    }
    window.addEventListener('resize', place);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (settleTimer) clearTimeout(settleTimer);
      ro?.disconnect();
      window.removeEventListener('resize', place);
    };
  }, [mark, sceneRef, step]);

  if (!mark || !placed) return null;

  return (
    <div
      ref={markRef}
      class={`coach-mark coach-mark-${placed.side}${reducedMotion ? ' is-still' : ''}${
        placed.ready ? '' : ' is-measuring'
      }`}
      style={{
        width: `${placed.width}px`,
        transform: `translate(${placed.x}px, ${placed.y}px)`,
      }}
      data-step={mark.step}
    >
      <span class="coach-mark-arrow" aria-hidden="true"></span>
      <p class="coach-mark-body">{mark.body}</p>
      <button type="button" class="coach-mark-skip" onClick={() => onSkip()}>
        Skip the tips
      </button>
    </div>
  );
}
