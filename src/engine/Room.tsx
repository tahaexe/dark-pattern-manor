import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'preact/hooks';
import type { ComponentType } from 'preact';
import type { CoachStep, RoomData, SpellCard } from './types';
import { initialState, reduce, stepLine } from './machine';
import type { RoomEvent, RoomState } from './machine';
import { areTipsSkipped, completeRoom, loadProgress, skipTips } from './progress';
import { prefetch } from './registry';
import RoomBar from '../ui/RoomBar';
import RoomInstructions from '../ui/RoomInstructions';
import SpellPicker from '../ui/SpellPicker';
import LiveRegion from '../ui/LiveRegion';
import BeforeAfterSlider from '../ui/BeforeAfterSlider';
import GuideCard from '../ui/GuideCard';
import CoachMarks from '../ui/CoachMarks';
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
  /** 1-based room number, for the bar's counter and dots. */
  roomNum?: number;
  /** The set of freed room numbers (1-based), for the bar's dots. */
  freed?: ReadonlySet<number>;
  /** Slug of the next room to unlock on completion (and to prefetch). */
  nextSlug?: string;
  /** Display name of the next room, for the continue link. */
  nextName?: string;
  /**
   * Hash of the next destination, offered from the honest step the way every
   * room reaches the next: `#/room/N+1` for rooms 1–11, `#/end` for room 12.
   */
  nextHash?: string;
  /** Optional rng so tests can fix the spell-card order. */
  rng?: () => number;
}

/**
 * The controls of either comparison page (haunted or honest) that must keep
 * their own click: a pointerdown inside one of these starts no divider drag, so
 * a mouse click or a tap on the honest task button reaches it. Without this the
 * comparison captured the pointer (setPointerCapture) and the control's click
 * never fired — a pointer dead-end, since the "Next room" link only appears
 * once the room is done. Keyboard play was unaffected, so the walk (which
 * finishes the honest task by keyboard) never saw it.
 */
const INTERACTIVE_IN_COMPARISON =
  'button, a[href], input, select, textarea, label, summary,' +
  '[role="button"], [role="link"], [role="checkbox"], [tabindex]:not([tabindex="-1"])';

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
 * never weighs the initial bundle.
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
 * The coach step for the current state, or null where no mark shows. The spot
 * mark covers haunted/inspecting, the name mark covers picking, the free mark
 * covers honest/done; `named` (the brief flee) shows no mark so nothing
 * competes with the ghost's exit.
 */
function coachStepFor(tag: RoomState['tag']): CoachStep | null {
  if (tag === 'haunted' || tag === 'inspecting') return 'spot';
  if (tag === 'picking') return 'name';
  if (tag === 'honest' || tag === 'done') return 'free';
  return null;
}

/** The box the ring draws around the possessed element, in frame coordinates. */
interface RingBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Find the possessed element inside the live frame by its id. */
function findPossessed(frame: HTMLElement, id: string): HTMLElement | null {
  const byId = frame.ownerDocument?.getElementById(id);
  if (byId && frame.contains(byId)) return byId as HTMLElement;
  // Fallback: an attribute selector, robust where getElementById misses (and
  // without needing CSS.escape, which jsdom does not provide).
  return frame.querySelector<HTMLElement>(`[id="${id}"]`);
}

/**
 * The common haunted moment, derived from the state the engine already holds.
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
/** The opening sweep's duration in ms (~0.8 s). */
const SWEEP_MS = 800;

/** How long the room holds `named` so the ghost's flee is seen. */
const FLEE_MS = 600;
const FLEE_REDUCED_MS = 200;

/** Stuck help: after this long in haunted, or after this many misses. */
const STUCK_MS = 20000;
const STUCK_MISSES = 2;

export default function Room({
  room,
  roomNum = room.id,
  freed,
  nextSlug,
  nextName,
  nextHash,
  rng,
}: RoomProps) {
  const reduceBound = (state: RoomState, event: RoomEvent) => reduce(state, event, room);
  const [state, dispatch] = useReducer(reduceBound, room, initialState);
  const [slider, setSlider] = useState(SWEEP_REST);
  const [stuck, setStuck] = useState(false);
  const [ring, setRing] = useState<RingBox | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const Atmosphere = useLazyAtmosphere();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const doneRef = useRef(false);
  const prevTag = useRef<RoomState['tag'] | null>(null);

  const frameRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const comparisonRef = useRef<HTMLDivElement>(null);
  const honestLayerRef = useRef<HTMLDivElement>(null);
  const continueRef = useRef<HTMLAnchorElement>(null);
  const draggingRef = useRef(false);
  const sweptRef = useRef(false);

  // First-minute tutorial (room 1 only): the coach marks show while the room is
  // not done and the player has not skipped the tips. `completedAtMount` is read
  // once, so a later visit to an unfinished room still coaches, but a finished
  // room never does. The skip choice lives in the persisted progress.
  const [tipsSkippedState, setTipsSkipped] = useState(() => areTipsSkipped());
  const completedAtMount = useRef(loadProgress().completed.includes(room.slug));
  const onSkipTips = () => {
    skipTips();
    setTipsSkipped(true);
  };

  // Hold `named` for the ghost's flee, then advance to honest with no input.
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

  // Prefetch the next room's chunk when this room turns honest, so following
  // the continue link resolves instantly. One shared promise per slug.
  useEffect(() => {
    if (state.tag === 'honest') prefetch(nextSlug);
  }, [state.tag, nextSlug]);

  // Move focus to the heading labelling the new state — except while the
  // lantern is lit (inspecting), where focus goes to the possessed element so
  // Enter selects it (handled in the ring effect below).
  useEffect(() => {
    if (state.tag === 'inspecting') return;
    headingRef.current?.focus();
  }, [state.tag]);

  // When the room reaches done, the continue link sits directly under the
  // slider (above the Ghost Guide card); scroll it into view (block nearest;
  // instant under reduced motion) so the next step is never screens away.
  useEffect(() => {
    if (state.tag !== 'done') return;
    const el = continueRef.current;
    if (!el || typeof el.scrollIntoView !== 'function') return;
    el.scrollIntoView({
      block: 'nearest',
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }, [state.tag, reducedMotion]);

  // Stuck help: after 20 s in haunted with no transition out, or once the miss
  // counter reaches two, glow the lantern and append the help line. The timer
  // is cleared on every state change and on unmount; misses feed it directly.
  useEffect(() => {
    if (state.tag !== 'haunted') {
      setStuck(false);
      return;
    }
    if (state.misses >= STUCK_MISSES) {
      setStuck(true);
      return;
    }
    const id = setTimeout(() => setStuck(true), STUCK_MS);
    return () => clearTimeout(id);
  }, [state.tag, state.misses]);

  // The lantern is lit (inspecting): ring the possessed element, scroll it into
  // view, and focus it so Enter selects it. The ring is an aria-hidden,
  // pointer-events:none overlay inside the frame, recomputed on resize. Cleared
  // when leaving inspecting and on unmount.
  useLayoutEffect(() => {
    if (state.tag !== 'inspecting') {
      setRing(null);
      return;
    }
    const frame = frameRef.current;
    if (!frame) return;
    const el = findPossessed(frame, room.possessedId);
    if (!el) {
      // No possessed element found: skip the ring, keep the player able to tap.
      headingRef.current?.focus();
      return;
    }

    const place = () => {
      const fr = frame.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      setRing({
        top: er.top - fr.top,
        left: er.left - fr.left,
        width: er.width,
        height: er.height,
      });
    };
    place();

    el.scrollIntoView?.({
      block: 'center',
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
    el.focus?.();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver === 'function') {
      ro = new ResizeObserver(() => place());
      ro.observe(frame);
      ro.observe(el);
    }
    window.addEventListener('resize', place);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', place);
    };
  }, [state.tag, room.possessedId, reducedMotion]);

  const fleeing = state.tag === 'named';
  const signsActive = state.tag === 'haunted' || state.tag === 'inspecting' || fleeing;
  const showSplit = state.tag === 'honest' || state.tag === 'done';
  const moment = momentOf(state);

  // The coach marks apply only to room 1 (the room that carries `coach`), while
  // the room is neither already completed on entry nor completed this session,
  // and the tips are not skipped.
  const coachApplies =
    !!room.coach &&
    room.coach.length > 0 &&
    !completedAtMount.current &&
    !doneRef.current &&
    !tipsSkippedState;
  const coachStep = coachStepFor(state.tag);
  const activeMark =
    coachApplies && coachStep ? (room.coach!.find((m) => m.step === coachStep) ?? null) : null;

  // Announce each coach step's body once, through the shared polite region. We
  // pass `extra` to LiveRegion only on the frame the step changes (tracked by a
  // ref), so the coach line is spoken once per step, not repeated while it holds.
  const lastCoachStep = useRef<CoachStep | null>(null);
  const [coachExtra, setCoachExtra] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!activeMark || !coachStep) {
      lastCoachStep.current = coachStep ?? null;
      setCoachExtra(undefined);
      return;
    }
    if (lastCoachStep.current !== coachStep) {
      lastCoachStep.current = coachStep;
      setCoachExtra(activeMark.body);
      // Clear after a tick so a later re-render of the same step does not
      // re-announce; the region keeps the spoken text until the next change.
      const id = setTimeout(() => setCoachExtra(undefined), 1200);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [activeMark, coachStep]);

  // The opening sweep (~0.8 s), once per room; held at rest under reduced motion.
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

  // Focus safety (WCAG 2.4.11): focusing a control in the honest layer snaps the
  // reveal fully to honest so the focused control is never hidden by the clip.
  useEffect(() => {
    if (!showSplit) return;
    const layer = honestLayerRef.current;
    if (!layer) return;
    const onFocusIn = () => setSlider(100);
    layer.addEventListener('focusin', onFocusIn);
    return () => layer.removeEventListener('focusin', onFocusIn);
  }, [showSplit]);

  // Sound cues and ambience, driven from the view.
  useEffect(() => {
    const tag = state.tag;
    const prev = prevTag.current;
    prevTag.current = tag;

    setRoomTag(tag);
    setRoomSlug(room.slug);

    if (prev === 'haunted' && tag === 'inspecting') lanternCue();
    if ((prev === 'haunted' || prev === 'inspecting') && tag === 'picking') cold();
    if (tag === 'named') flee();
    if (tag === 'done') honestCue();

    if (HAUNTED_TAGS.includes(tag)) {
      startAmbience();
    } else if (tag === 'honest' && prev !== 'honest' && prev !== 'done') {
      fadeOutAmbience();
    }
  }, [state.tag]);

  // The whisper fires exactly once per wrong pick, keyed on the nonce.
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

  const leavingManor = nextHash === '#/end';
  const continueText = leavingManor
    ? 'Leave the manor'
    : `Next room: ${nextName ?? 'the next room'}`;

  const setFromPointer = (clientX: number) => {
    const box = comparisonRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    if (rect.width <= 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSlider(Math.max(0, Math.min(100, Math.round(pct))));
  };

  const onPointerDown = (e: PointerEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (target.closest('.split-control')) return;
    // A pointerdown inside an interactive control of either page (haunted or
    // honest) must reach that control: start no drag, take no pointer capture
    // and do not move the divider, so the control gets its own click. Without
    // this the comparison captured the pointer and a mouse click or tap on the
    // honest task button (e.g. room 1's honest "Reject all") never fired — a
    // pointer dead-end, since the "Next room" link appears only once done.
    if (target.closest(INTERACTIVE_IN_COMPARISON)) return;
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

  const freedSet = freed ?? new Set<number>();

  return (
    <div
      class="room-scene"
      ref={sceneRef}
      data-moment={moment?.name}
      data-moment-key={moment ? String(moment.key) : undefined}
      data-fleeing={fleeing ? 'true' : undefined}
    >
      <div class="room" aria-hidden="true">
        <div class="room-wall"></div>
        {Atmosphere ? <Atmosphere exhale={showSplit} reducedMotion={reducedMotion} /> : null}
      </div>

      <RoomBar roomNum={roomNum} total={12} freed={freedSet} />

      <RoomInstructions
        name={room.name}
        task={room.task}
        stepLine={stepLine(state, room)}
        stuck={stuck}
        onLantern={() => dispatch({ type: 'LANTERN' })}
        lanternKeyActive={state.tag === 'haunted'}
        headingRef={headingRef}
      />

      <h2 class="visually-hidden">{STATE_HEADING[state.tag]}</h2>

      <LiveRegion state={state} extra={coachExtra} />

      {!showSplit ? (
        <div class="manor-frame" ref={frameRef}>
          <HauntedView
            onSelectPossessed={() => dispatch({ type: 'SELECT_POSSESSED' })}
            onSelectOther={() => dispatch({ type: 'SELECT_OTHER' })}
            signsActive={signsActive}
            reducedMotion={reducedMotion}
          />
          {ring ? (
            <div
              class={`possessed-ring${reducedMotion ? ' is-still' : ''}`}
              aria-hidden="true"
              style={{
                top: `${ring.top}px`,
                left: `${ring.left}px`,
                width: `${ring.width}px`,
                height: `${ring.height}px`,
              }}
            ></div>
          ) : null}
        </div>
      ) : null}

      {state.tag === 'picking' ? (
        <SpellPicker
          cards={room.cards}
          onPick={(card: SpellCard) => dispatch({ type: 'PICK', card })}
          flicker={state.flicker}
          reason={state.wrongHint}
          reasonNonce={state.whisperNonce}
          rng={rng}
        />
      ) : null}

      {showSplit ? (
        <>
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

            <div
              class="comparison-divider"
              aria-hidden="true"
              style={{ ['--split' as string]: `${slider}%` }}
            >
              <span class="comparison-grip"></span>
            </div>
          </div>

          <BeforeAfterSlider value={slider} onChange={setSlider} step={5} />

          {/* The continue link sits directly under the slider (above the Ghost
              Guide card) once the task is done, so the next room is one short
              scroll away, not three screens below the guide. */}
          {nextHash && state.tag === 'done' ? (
            <a class="room-continue" href={nextHash} ref={continueRef}>
              {continueText}
            </a>
          ) : null}

          <GuideCard pattern={room.pattern} guide={room.guide} />
        </>
      ) : null}

      {/* The first-minute coach marks: room 1 only, while not done and not
          skipped. A positioned overlay beside the current step's target that
          never moves the page, covers the target, or takes focus. */}
      {activeMark ? (
        <CoachMarks
          marks={room.coach!}
          step={coachStep!}
          sceneRef={sceneRef}
          onSkip={onSkipTips}
          reducedMotion={reducedMotion}
        />
      ) : null}
    </div>
  );
}
