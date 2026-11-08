import type { RoomState } from '../engine/machine';

export interface LiveRegionProps {
  state: RoomState;
}

/**
 * The polite live region for state changes and nudges. It announces
 * `state.announcement` — the step line on each state entry, and the short
 * nudge after a wrong look ("Not that one…", "Nothing haunts this…").
 *
 * It stays in the DOM and keeps announcing, but it is VISUALLY HIDDEN (the
 * visually-hidden pattern: a 1px, out-of-flow box clipped away). The instruction
 * card already shows the current step line on screen, so a visible copy here was
 * a redundant dark strip under the card — and, because its text changed between
 * states, it was the one thing still shifting the page during play. Taken out of
 * flow it occupies no space and moves nothing: the strip is gone and layout
 * shift returns to 0.
 *
 * The wrong-card hint is NOT announced here: it is carried by the inline reason
 * under the spell cards (see `SpellPicker`), which is itself a polite live
 * region and stays visible, so the hint is spoken and shown by one node. That
 * node sits under the cards and never scrolls the page to this top strip.
 */
export default function LiveRegion({ state }: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      class="spell-card-whisper-region visually-hidden"
      aria-label="Spell card feedback"
    >
      <p class="live-announcement">{state.announcement}</p>
    </div>
  );
}
