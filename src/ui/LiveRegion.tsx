import type { RoomState } from '../engine/machine';

export interface LiveRegionProps {
  state: RoomState;
}

/**
 * The single polite live region. It announces the current state and, after a
 * wrong pick, whispers that card's hint. The whisper is keyed on
 * `whisperNonce` so each wrong pick announces exactly once and no unrelated
 * re-render re-announces a stale hint.
 */
export default function LiveRegion({ state }: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      class="spell-card-whisper-region"
      aria-label="Spell card feedback"
    >
      <p class="live-announcement">{state.announcement}</p>
      {state.wrongHint ? (
        <p class="spell-card-whisper" key={state.whisperNonce}>
          {state.wrongHint}
        </p>
      ) : null}
    </div>
  );
}
