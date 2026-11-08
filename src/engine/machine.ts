import type { RoomData, SpellCard } from './types';

/** The six states a room moves through. */
export type RoomStateTag =
  | 'haunted'
  | 'inspecting'
  | 'picking'
  | 'named'
  | 'honest'
  | 'done';

/** The reducer's state. Carries only what the view needs to render. */
export interface RoomState {
  tag: RoomStateTag;
  /** Text pushed to the polite live region next (a step line, a nudge, or a hint). */
  announcement: string;
  /**
   * Non-possessed selections while haunted or inspecting. Drives stuck help
   * only (Requirement 2.13). It is never a score, strike, or penalty, and it
   * never blocks any path to done (Requirement 5.1).
   */
  misses: number;
  /** Set only after a wrong PICK; cleared on the next event. */
  wrongHint?: string;
  /** Set only after a wrong PICK (the light flickers once). */
  flicker?: boolean;
  /** Increments on each wrong PICK so the whisper announces exactly once. */
  whisperNonce: number;
}

/** The events the reducer accepts. Unknown events are no-ops. */
export type RoomEvent =
  | { type: 'LANTERN' }
  | { type: 'SELECT_POSSESSED' }
  | { type: 'SELECT_OTHER' }
  | { type: 'PICK'; card: SpellCard }
  | { type: 'ADVANCE' } // auto-dispatched on entering `named`
  | { type: 'COMPLETE_TASK' };

/**
 * The step line each state entry announces. These are the exact words shown in
 * the instruction card's large line and spoken by the live region, so the two
 * never drift. `honest` carries the task, filled by `stepLine`.
 */
const STEP: Record<RoomStateTag, string> = {
  haunted: "Step 1 of 3 · Find the trick: tap the part of this page that's tricking you.",
  inspecting: 'Step 1 of 3 · The lantern lights the trick. Tap it.',
  picking: 'Step 2 of 3 · Name it: pick the card that names the trick.',
  named: 'Named. The ghost flees.',
  honest: 'Step 3 of 3 · Drag the line to compare. Then finish your task on the honest page: ',
  done: 'Freed! The page is honest.',
};

/** The nudge spoken when the player selects a non-possessed element. */
const NUDGE_HAUNTED = 'Not that one. Look again, or light the lantern for a hint.';
const NUDGE_INSPECTING = 'Nothing haunts this. Look for the candle ring.';

/**
 * The large instruction-card line for the current state. Pure: derived from the
 * tag and the room's task, so the card and the reducer never drift. The honest
 * line ends with the task so the player knows exactly what to finish.
 */
export function stepLine(state: RoomState, room: RoomData): string {
  if (state.tag === 'honest') return STEP.honest + room.task + '.';
  return STEP[state.tag];
}

/** The starting `haunted` state for a room. */
export function initialState(_room: RoomData): RoomState {
  return {
    tag: 'haunted',
    announcement: STEP.haunted,
    misses: 0,
    whisperNonce: 0,
  };
}

/**
 * Pure, total transition function. Unexpected events for the current state
 * return the state unchanged so no input sequence can reach a dead end. There
 * is no fail state in the union: a wrong pick is a self-loop that whispers a
 * hint and changes no progress, and a wrong look is a self-loop that nudges the
 * player and bumps a help-only counter.
 */
export function reduce(
  state: RoomState,
  event: RoomEvent,
  room: RoomData,
): RoomState {
  switch (state.tag) {
    case 'haunted':
      // The first tap works: selecting the trick goes straight to picking,
      // with no need to raise the lantern first.
      if (event.type === 'SELECT_POSSESSED') {
        return {
          tag: 'picking',
          announcement: STEP.picking,
          misses: state.misses,
          whisperNonce: state.whisperNonce,
        };
      }
      // The lantern is the hint: it lights the trick (the view rings, scrolls
      // to and focuses the possessed element on entering inspecting).
      if (event.type === 'LANTERN') {
        return {
          tag: 'inspecting',
          announcement: STEP.inspecting,
          misses: state.misses,
          whisperNonce: state.whisperNonce,
        };
      }
      // A wrong look costs nothing; it nudges and feeds stuck help only.
      if (event.type === 'SELECT_OTHER') {
        return {
          tag: 'haunted',
          announcement: NUDGE_HAUNTED,
          misses: state.misses + 1,
          whisperNonce: state.whisperNonce,
        };
      }
      return state;

    case 'inspecting':
      if (event.type === 'SELECT_POSSESSED') {
        return {
          tag: 'picking',
          announcement: STEP.picking,
          misses: state.misses,
          whisperNonce: state.whisperNonce,
        };
      }
      if (event.type === 'SELECT_OTHER') {
        return {
          tag: 'inspecting',
          announcement: NUDGE_INSPECTING,
          misses: state.misses + 1,
          whisperNonce: state.whisperNonce,
        };
      }
      return state;

    case 'picking':
      if (event.type === 'PICK') {
        const correct =
          event.card.role === 'correct' && event.card.pattern === room.pattern;
        if (correct) {
          return {
            tag: 'named',
            announcement: STEP.named,
            misses: state.misses,
            whisperNonce: state.whisperNonce,
          };
        }
        // Wrong pick: stay in picking, whisper the hint, flicker the light,
        // bump the nonce. No progress changes.
        return {
          tag: 'picking',
          announcement: STEP.picking,
          misses: state.misses,
          wrongHint: event.card.hint ?? '',
          flicker: true,
          whisperNonce: state.whisperNonce + 1,
        };
      }
      return state;

    case 'named':
      if (event.type === 'ADVANCE') {
        return {
          tag: 'honest',
          // The honest line carries the task; the view uses stepLine for the
          // full text. The announcement holds the fixed prefix so the live
          // region speaks the same words the card shows.
          announcement: STEP.honest + room.task + '.',
          misses: state.misses,
          whisperNonce: state.whisperNonce,
        };
      }
      return state;

    case 'honest':
      if (event.type === 'COMPLETE_TASK') {
        return {
          tag: 'done',
          announcement: STEP.done,
          misses: state.misses,
          whisperNonce: state.whisperNonce,
        };
      }
      return state;

    case 'done':
      return state;

    default:
      return state;
  }
}
