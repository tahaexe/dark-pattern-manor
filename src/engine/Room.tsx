import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'preact/hooks';
import type { ComponentType } from 'preact';
import type { RoomData, SpellCard } from './types';
import { initialState, reduce } from './machine';
import type { RoomEvent, RoomState } from './machine';
import { completeRoom } from './progress';
import Lantern from '../ui/Lantern';
import SpellPicker from '../ui/SpellPicker';
import LiveRegion from '../ui/LiveRegion';
import BeforeAfterSlider from '../ui/BeforeAfterSlider';
import GuideCard from '../ui/GuideCard';
import type { AtmosphereProps } from '../ui/Atmosphere';
import {
  cold,
  fadeOutAmbience,
  flee,
  honest as honestCue,
  lantern as lanternCue,
  setRoomSlug,
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

/**
 * The atmosphere layer, lazy-loaded so its canvas code rides the room chunk and
 * never weighs the initial bundle. It is purely decorative (an aria-hidden
 * canvas on the backdrop), so rendering nothing until it arrives is invisible.
 */
function useLazyAtmosphere(): ComponentType<AtmosphereProps> | null {
  const [Comp, setComp] = useState<ComponentType<AtmosphereProps> | null>(null);
  useEffect(() => {
    let alive = true;
    void import('../ui/Atmosphere').then((mod) => {
      if (alive) setComp(() => mod.default);
    });
    return () => {
      alive = false;
    };
  }, []);
  return Comp;
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

/**
 * The common haunted moment, derived from the state the engine already holds.
 * `right` from the moment the room is named onward; `wrong` keyed on the
 * wrong-pick nonce (so each wrong pick is a new key and the CSS animation
 * restarts); none otherwise. Shared CSS reads `data-moment` on `.room-scene`.
 */
function momentOf(state: RoomState): { name: 'wrong' | 'right'; key: number } | null {
  if (state.tag === 'named' || state.tag === 'honest' || state.tag === 'done') {
    return { name: 'right', key: 0 };
  }
  if (state.tag === 'picking' && state.whisperNonce > 0) {
    return { name: 'wrong', key: state.whisperNonce };
  }
  return null;
}

/** The reveal where the opening sweep rests. */
const SWEEP_REST = 50;
/** The opening sweep's duration in ms (~1.2 s). */
const SWEEP_MS = 1200;

/**
 * How long the room holds `named` so the ghost's flee is seen before the honest
 * twin appears. With motion the ghost unwinds then flees upward over the shared
 * `--duration-ghost-flee` (about 600 ms in total); under reduced motion there
 * is no unwind and no flee — the ghost simply fades over ~200 ms. After this
 * delay the view dispatches ADVANCE, so the reducer stays pure (the timer lives
 * here and is cleared on unmount). The named → honest step takes no player input.
 */
const FLEE_MS = 600;
const FLEE_REDUCED_MS = 200;

export default function Room({ room, nextSlug, nextHash, rng }: RoomProps) {
  const reduceBound = (state: RoomState, event: RoomEvent) => reduce(state, event, room);
  const [state, dispatch] = useReducer(reduceBound, room, initialState);
  // The reveal: 0 = fully haunted, 100 = fully honest. It starts at the rest
  // point so the comparison never flashes fully-haunted for assistive tech or
  // under reduced motion; the opening sweep (below) animates it in when motion
  // is allowed.
  const [slider, setSlider] = useState(SWEEP_REST);
  const reducedMotion = usePrefersReducedMotion();
  const Atmosphere = useLazyAtmosphere();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const doneRef = useRef(false);
  // The previous tag, so sound effects fire on the transition, not every render.
  const prevTag = useRef<RoomState['tag'] | null>(null);

  const comparisonRef = useRef<HTMLDivElement>(null);
  const honestLayerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  // The opening sweep runs once per room, keyed off the first honest render.
  const sweptRef = useRef(false);

  // Hold `named` for the ghost's flee, then advance to honest with no player
  // input. The haunted page and its ghost stay visible through `named`; the
  // shared CSS plays the unwind and the one flee (or, under reduced motion, a
  // short fade) during this delay. The timer is cleared on unmount so the
  // reducer never advances a room the player has left.
  useEffect(() => {
    if (state.tag !== 'named') return;
    const delay = reducedMotion ? FLEE_REDUCED_MS : FLEE_MS;
    const id = setTimeout(() => dispatch({ type: 'ADVANCE' }), delay);
    return () => clearTimeout(id);
  }, [state.tag, reducedMotion]);

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

  // Signs (the ghost, its mist and flicker) are rendered while the room is
  // haunted or inspecting AND through `named`, so the ghost is present to play
  // its flee before the honest twin appears. `fleeing` is true only during
  // `named`, driving the shared flee.
  const fleeing = state.tag === 'named';
  const signsActive = state.tag === 'haunted' || state.tag === 'inspecting' || fleeing;
  const showSplit = state.tag === 'honest' || state.tag === 'done';
  const moment = momentOf(state);

  // The opening sweep. When the comparison first appears: under reduced motion
  // it stays at the rest point (no animation); otherwise it sweeps once from 0
  // to the rest point over ~1.2 s so the reveal is seen, then rests. Runs once.
  useLayoutEffect(() => {
    if (!showSplit || sweptRef.current) return;
    sweptRef.current = true;
    if (reducedMotion) {
      setSlider(SWEEP_REST);
      return;
    }
    if (typeof requestAnimationFrame !== 'function') {
      setSlider(SWEEP_REST);
      return;
    }
    let raf = 0;
    const start = performance.now();
    setSlider(0);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / SWEEP_MS);
      setSlider(Math.round(t * SWEEP_REST));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [showSplit, reducedMotion]);

  // Focus safety (WCAG 2.4.11): if any control inside the honest layer takes
  // focus, snap the reveal fully to honest so the focused control is never
  // hidden behind the clip.
  useEffect(() => {
    if (!showSplit) return;
    const layer = honestLayerRef.current;
    if (!layer) return;
    const onFocusIn = () => setSlider(100);
    layer.addEventListener('focusin', onFocusIn);
    return () => layer.removeEventListener('focusin', onFocusIn);
  }, [showSplit]);

  // Sound: cues and ambience, driven from the view. The reducer stays pure;
  // these effects only read the tag and the wrong-pick nonce it already
  // produces. Each cue is a no-op when sound is off or there is no audio.
  useEffect(() => {
    const tag = state.tag;
    const prev = prevTag.current;
    prevTag.current = tag;

    // Tell the engine the current state so turning sound on can resume the
    // ambience, and so leaving the room can stop it. The slug chooses this
    // room's ambience voice; it comes from the room data, not the reducer.
    setRoomTag(tag);
    setRoomSlug(room.slug);

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
      setRoomSlug(null);
      stopAmbience();
    };
  }, []);

  const HauntedView = room.Haunted;
  const HonestView = room.Honest;

  // The continue affordance: the same way every room reaches the next. For the
  // last room `nextHash` is `#/end`, so the manor's exit leads to the ending.
  const leavingManor = nextHash === '#/end';

  // Dragging the divider with a pointer sets the reveal from the pointer's x,
  // without stealing keyboard focus from the range or the honest controls.
  const setFromPointer = (clientX: number) => {
    const box = comparisonRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    if (rect.width <= 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSlider(Math.max(0, Math.min(100, Math.round(pct))));
  };

  const onPointerDown = (e: PointerEvent) => {
    // Let the native range handle its own thumb; only drive from the box
    // surface so dragging the divider works.
    const target = e.target as HTMLElement | null;
    if (target && target.closest('.split-control')) return;
    draggingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setFromPointer(e.clientX);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!draggingRef.current) return;
    setFromPointer(e.clientX);
  };
  const endDrag = (e: PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  return (
    <div
      class="room-scene"
      data-moment={moment?.name}
      data-moment-key={moment ? String(moment.key) : undefined}
      data-fleeing={fleeing ? 'true' : undefined}
    >
      <div class="room" aria-hidden="true">
        <div class="room-wall"></div>
        {Atmosphere ? <Atmosphere exhale={showSplit} reducedMotion={reducedMotion} /> : null}
      </div>

      <div class="task-bar">
        <h1 class="task-bar-title" tabIndex={-1} ref={headingRef}>
          {room.name}
        </h1>
        <span class="task-bar-task">{room.task}</span>
        <Lantern onLantern={() => dispatch({ type: 'LANTERN' })} keyActive={state.tag === 'haunted'} />
      </div>

      <h2 class="visually-hidden">{STATE_HEADING[state.tag]}</h2>

      {/* The polite live region sits directly under the task bar, above the
          swapping room content (the haunted frame, the spell picker and the
          honest comparison all mount below it). Because it is above everything
          that changes between states, it never moves when the haunted frame
          gives way to the honest comparison — so holding `named` for the ghost
          flee adds no layout shift (the whisper strip no longer jumps up when
          the frame unmounts; the room's cumulative layout shift stays at 0). */}
      <LiveRegion state={state} />

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

      {showSplit ? (
        <>
          {/* The before/after comparison wipe. Both versions are stacked in one
              grid cell, so the box is as tall as the taller one and nothing
              shifts. The haunted preview is underneath; the honest twin is on
              top, revealed from the left up to `--split` by its clip-path. */}
          <div
            class="comparison"
            role="group"
            aria-label="Haunted and honest versions"
            ref={comparisonRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <div class="comparison-cell comparison-haunted">
              <span class="comparison-tag comparison-tag-haunted" aria-hidden="true">
                Haunted
              </span>
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

            <div
              class="comparison-cell comparison-honest"
              ref={honestLayerRef}
              style={{ ['--split' as string]: `${slider}%` }}
            >
              <span class="comparison-tag comparison-tag-honest" aria-hidden="true">
                Honest
              </span>
              <div class="manor-frame manor-frame-preview">
                <HonestView onCompleteTask={() => dispatch({ type: 'COMPLETE_TASK' })} />
              </div>
            </div>

            {/* The reveal edge: a candle-colour divider with a round grip.
                Decorative — the slider and the drag carry the real control. */}
            <div
              class="comparison-divider"
              aria-hidden="true"
              style={{ ['--split' as string]: `${slider}%` }}
            >
              <span class="comparison-grip"></span>
            </div>
          </div>

          <BeforeAfterSlider value={slider} onChange={setSlider} step={5} />

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
