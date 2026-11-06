import { useEffect, useRef } from 'preact/hooks';
import type { RoomState } from '../engine/machine';

export interface LiveRegionProps {
  state: RoomState;
}

/**
 * The single polite live region. It announces the current state and, after a
 * wrong pick, whispers that card's hint. The whisper is keyed on
 * `whisperNonce` so each wrong pick announces exactly once and no unrelated
 * re-render re-announces a stale hint.
 *
 * On a narrow screen the stacked spell cards can push the whisper below the
 * fold, so after each wrong pick the page scrolls just enough to show it
 * (`block: 'nearest'`: no scroll when it is already visible). Focus stays on
 * the card; the scroll is instant under reduced motion.
 */
export default function LiveRegion({ state }: LiveRegionProps) {
  const whisperRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.whisperNonce === 0 || !state.wrongHint) return;
    const el = whisperRef.current;
    if (!el || typeof el.scrollIntoView !== 'function') return;
    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [state.whisperNonce]);

  return (
    <div
      role="status"
      aria-live="polite"
      class="spell-card-whisper-region"
      aria-label="Spell card feedback"
    >
      <p class="live-announcement">{state.announcement}</p>
      {state.wrongHint ? (
        <p class="spell-card-whisper" key={state.whisperNonce} ref={whisperRef}>
          {state.wrongHint}
        </p>
      ) : null}
    </div>
  );
}
