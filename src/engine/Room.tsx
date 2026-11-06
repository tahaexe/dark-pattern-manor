import { useEffect, useReducer, useRef, useState } from 'preact/hooks';
import type { RoomData, SpellCard } from './types';
import { initialState, reduce } from './machine';
import type { RoomEvent, RoomState } from './machine';
import { completeRoom } from './progress';
import Lantern from '../ui/Lantern';
import SpellPicker from '../ui/SpellPicker';
import LiveRegion from '../ui/LiveRegion';
import BeforeAfterSlider from '../ui/BeforeAfterSlider';
import GuideCard from '../ui/GuideCard';
import {
  cold,
  fadeOutAmbience,
  flee,
  honest as honestCue,
  lantern as lanternCue,
  setRoomTag,
  startAmbience,
  stopAmbience,
  whisper,
} from '../audio/sound';

export interface RoomProps {
  room: RoomData;
  /** Slug of the next room to unlock on completion. */
  nextSlug?: string;
  /**
   * Hash of the next destination, offered from the honest step the way every
   * room reaches the next: `#/room/N+1` for rooms 1–11, `#/end` for room 12.
   */
  nextHash?: string;
  /** Optional rng so tests can fix the spell-card order. */
  rng?: () => number;
}

/** True when the user asks for reduced motion. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setReduced(mq.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);
  return reduced;
}

/** The heading that labels each state, for focus and announcement. */
const STATE_HEADING: Record<RoomState['tag'], string> = {
  haunted: 'Haunted',
  inspecting: 'Inspecting',
  picking: 'Name the trick',
  named: 'Named',
  honest: 'The honest page',
  done: 'The room is free',
};

const HAUNTED_TAGS: ReadonlyArray<RoomState['tag']> = ['haunted', 'inspecting', 'picking'];

export default function Room({ room, nextSlug, nextHash, rng }: RoomProps) {
  const reduceBound = (state: RoomState, event: RoomEvent) => reduce(state, event, room);
  const [state, dispatch] = useReducer(reduceBound, room, initialState);
  const [slider, setSlider] = useState(0);
  const reducedMotion = usePrefersReducedMotion();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const doneRef = useRef(false);
  // The previous tag, so sound effects fire on the transition, not every render.
  const prevTag = useRef<RoomState['tag'] | null>(null);

  // Auto-advance named -> honest with no player input.
  useEffect(() => {
    if (state.tag === 'named') {
      dispatch({ type: 'ADVANCE' });
    }
  }, [state.tag]);

  // Persist progress exactly once on reaching done.
  useEffect(() => {
    if (state.tag === 'done' && !doneRef.current) {
      doneRef.current = true;
      completeRoom(room.slug, nextSlug);
    }
  }, [state.tag, room.slug, nextSlug]);

  // Move focus to the heading labelling the new state.
  useEffect(() => {
    headingRef.current?.focus();
  }, [state.tag]);

  // Sound: cues and ambience, driven from the view. The reducer stays pure;
  // these effects only read the tag and the wrong-pick nonce it already
  // produces. Each cue is a no-op when sound is off or there is no audio.
  useEffect(() => {
    const tag = state.tag;
    const prev = prevTag.current;
    prevTag.current = tag;

    // Tell the engine the current state so turning sound on can resume the
    // ambience, and so leaving the room can stop it.
    setRoomTag(tag);

    // Cues on specific transitions.
    if (prev === 'haunted' && tag === 'inspecting') lanternCue();
    if (prev === 'inspecting' && tag === 'picking') cold();
    if (tag === 'named') flee();
    if (tag === 'done') honestCue();

    // Ambience: play only while haunted/inspecting/picking; fade out when the
    // room turns honest.
    if (HAUNTED_TAGS.includes(tag)) {
      startAmbience();
    } else if (tag === 'honest' && prev !== 'honest' && prev !== 'done') {
      fadeOutAmbience();
    }
  }, [state.tag]);

  // The whisper fires exactly once per wrong pick, keyed on the nonce the live
  // region also uses — so the whisper sound and the whispered hint land
  // together. Skip the initial 0 so no whisper plays on mount.
  const firstNonce = useRef(true);
  useEffect(() => {
    if (firstNonce.current) {
      firstNonce.current = false;
      return;
    }
    if (state.whisperNonce > 0) whisper();
  }, [state.whisperNonce]);

  // Leaving the room: stop the ambience at once and clear its timers.
  useEffect(() => {
    return () => {
      setRoomTag(null);
      stopAmbience();
    };
  }, []);

  const signsActive = state.tag === 'haunted' || state.tag === 'inspecting';
  const showSplit = state.tag === 'honest' || state.tag === 'done';

  const HauntedView = room.Haunted;
  const HonestView = room.Honest;

  // The continue affordance: the same way every room reaches the next. For the
  // last room `nextHash` is `#/end`, so the manor's exit leads to the ending.
  const leavingManor = nextHash === '#/end';

  return (
    <div class="room-scene">
      <div class="room" aria-hidden="true">
        <div class="room-wall"></div>
      </div>

      <div class="task-bar">
        <h1 class="task-bar-title" tabIndex={-1} ref={headingRef}>
          {room.name}
        </h1>
        <span class="task-bar-task">{room.task}</span>
        <Lantern onLantern={() => dispatch({ type: 'LANTERN' })} keyActive={state.tag === 'haunted'} />
      </div>

      <h2 class="visually-hidden">{STATE_HEADING[state.tag]}</h2>

      {!showSplit ? (
        <div class="manor-frame">
          <HauntedView
            onSelectPossessed={() => dispatch({ type: 'SELECT_POSSESSED' })}
            onSelectOther={() => dispatch({ type: 'SELECT_OTHER' })}
            signsActive={signsActive}
            reducedMotion={reducedMotion}
          />
        </div>
      ) : null}

      {state.tag === 'picking' ? (
        <SpellPicker
          cards={room.cards}
          onPick={(card: SpellCard) => dispatch({ type: 'PICK', card })}
          flicker={state.flicker}
          rng={rng}
        />
      ) : null}

      <LiveRegion state={state} />

      {showSplit ? (
        <>
          <div class="split" style={{ ['--split' as string]: `${slider}%` }}>
            <div class="split-side haunted">
              <span class="split-label">Haunted</span>
              <div class="manor-frame manor-frame-preview">
                <HauntedView
                  onSelectPossessed={() => {}}
                  onSelectOther={() => {}}
                  signsActive={false}
                  reducedMotion={reducedMotion}
                  preview
                />
              </div>
            </div>
            <div class="split-side honest">
              <span class="split-label">Honest</span>
              <div class="manor-frame manor-frame-preview">
                <HonestView onCompleteTask={() => dispatch({ type: 'COMPLETE_TASK' })} />
              </div>
            </div>
          </div>

          <BeforeAfterSlider value={slider} onChange={setSlider} />

          <GuideCard pattern={room.pattern} guide={room.guide} />

          {nextHash ? (
            <a class="room-continue" href={nextHash}>
              {leavingManor ? 'Leave the manor' : 'Leave this room'}
            </a>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
