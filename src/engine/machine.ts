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
  /** Text pushed to the polite live region for this state. */
  announcement: string;
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

const ANNOUNCE: Record<RoomStateTag, string> = {
  haunted: 'A ghost haunts this page. Raise the lantern to inspect.',
  inspecting: 'Inspecting. Select the element that feels possessed.',
  picking: 'Name the trick. Choose a spell card.',
  named: 'Named. The ghost flees.',
  honest: 'The page is honest now. Compare the two, then complete the task.',
  done: 'The task is done in one click. The room is free.',
};

/** The starting `haunted` state for a room. */
export function initialState(_room: RoomData): RoomState {
  return {
    tag: 'haunted',
    announcement: ANNOUNCE.haunted,
    whisperNonce: 0,
  };
}

/**
 * Pure, total transition function. Unexpected events for the current state
 * return the state unchanged so no input sequence can reach a dead end. There
 * is no fail state in the union: a wrong pick is a self-loop that whispers a
 * hint and changes no progress.
 */
export function reduce(
  state: RoomState,
  event: RoomEvent,
  room: RoomData,
): RoomState {
  switch (state.tag) {
    case 'haunted':
      if (event.type === 'LANTERN') {
        return {
          tag: 'inspecting',
          announcement: ANNOUNCE.inspecting,
          whisperNonce: state.whisperNonce,
        };
      }
      return state;

    case 'inspecting':
      if (event.type === 'SELECT_POSSESSED') {
        return {
          tag: 'picking',
          announcement: ANNOUNCE.picking,
          whisperNonce: state.whisperNonce,
        };
      }
      if (event.type === 'SELECT_OTHER') {
        return {
          tag: 'inspecting',
          announcement: 'Nothing haunts this.',
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
            announcement: ANNOUNCE.named,
            whisperNonce: state.whisperNonce,
          };
        }
        // Wrong pick: stay in picking, whisper the hint, flicker the light,
        // bump the nonce. No progress changes.
        return {
          tag: 'picking',
          announcement: ANNOUNCE.picking,
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
          announcement: ANNOUNCE.honest,
          whisperNonce: state.whisperNonce,
        };
      }
      return state;

    case 'honest':
      if (event.type === 'COMPLETE_TASK') {
        return {
          tag: 'done',
          announcement: ANNOUNCE.done,
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
