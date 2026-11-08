import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import { h } from 'preact';
import Atmosphere, { __atmosphereProbe } from './Atmosphere';
import { FRAME_MS } from './atmosphere-core';

// --------------------------------------------------------------------------
// The motes loop in jsdom.
//
// jsdom has no real 2D canvas context, so to observe the loop we install a stub
// 2D context on every <canvas> (with the drawing methods the component checks),
// a controllable `performance.now` clock, and a synchronous requestAnimationFrame
// so a timer wake paints immediately. Fake timers then drive the timer loop.
//
// The component records its decisions on a probe (plan, painted frames, whether
// it is looping, whether adaptive still engaged, whether paused while hidden),
// read through __atmosphereProbe(), so these assertions need no pixels.
//
// Adaptive still is measured on the timer's OWN ticks now, not the capped frame
// count: it engages when the wakes arrive late (the gaps overshoot the frame
// interval) or the frames take too long. A fast desktop (wakes on time, instant
// frames) never trips it; a slow one (wakes far apart under the simulated
// clock) does.
// --------------------------------------------------------------------------

/** A frame step safely above FRAME_MS so each wake reliably paints (no float
 *  boundary flake); FRAME_MS ≈ 41.67, so 43 ms is one cheap frame. */
const FRAME = Math.ceil(FRAME_MS) + 1;

/** A no-op stub 2D context carrying the methods the component guards on/uses. */
function stubContext() {
  const grad = { addColorStop: () => {} };
  return {
    createRadialGradient: () => grad,
    createLinearGradient: () => grad,
    clearRect: () => {},
    fillRect: () => {},
    beginPath: () => {},
    ellipse: () => {},
    arc: () => {},
    fill: () => {},
    setTransform: () => {},
    fillStyle: '',
  } as unknown as CanvasRenderingContext2D;
}

let clock = 0;
let rafRestore: (() => void) | null = null;
let ricRestore: (() => void) | null = null;
let ctxRestore: (() => void) | null = null;
let nowRestore: (() => void) | null = null;

function installEnv() {
  clock = 0;

  // A controllable clock for performance.now().
  const perf = globalThis.performance as Performance & { now: () => number };
  const originalNow = perf.now.bind(perf);
  perf.now = () => clock;
  nowRestore = () => {
    perf.now = originalNow;
  };

  // requestAnimationFrame runs its callback synchronously (so a timer wake
  // paints at once), and returns a handle; cancel is a no-op.
  const win = globalThis as unknown as {
    requestAnimationFrame?: (cb: (t: number) => void) => number;
    cancelAnimationFrame?: (h: number) => void;
    requestIdleCallback?: unknown;
    cancelIdleCallback?: unknown;
  };
  const origRaf = win.requestAnimationFrame;
  const origCaf = win.cancelAnimationFrame;
  win.requestAnimationFrame = (cb: (t: number) => void) => {
    cb(clock);
    return 1;
  };
  win.cancelAnimationFrame = () => {};
  rafRestore = () => {
    win.requestAnimationFrame = origRaf;
    win.cancelAnimationFrame = origCaf;
  };

  // Ensure the component takes the setTimeout(start) path (no idle callback),
  // which fake timers can drive deterministically.
  const hadRic = 'requestIdleCallback' in win;
  const origRic = win.requestIdleCallback;
  const origCic = win.cancelIdleCallback;
  delete win.requestIdleCallback;
  delete win.cancelIdleCallback;
  ricRestore = () => {
    if (hadRic) {
      win.requestIdleCallback = origRic;
      win.cancelIdleCallback = origCic;
    }
  };

  // Give every canvas a stub 2D context.
  const proto = globalThis.HTMLCanvasElement.prototype;
  const origGetContext = proto.getContext;
  proto.getContext = function (type: string) {
    return type === '2d' ? stubContext() : null;
  } as typeof proto.getContext;
  ctxRestore = () => {
    proto.getContext = origGetContext;
  };
}

function restoreEnv() {
  rafRestore?.();
  ricRestore?.();
  ctxRestore?.();
  nowRestore?.();
  rafRestore = ricRestore = ctxRestore = nowRestore = null;
}

/** Advance the clock and run the pending timers (which read the new clock). */
function tick(ms: number) {
  clock += ms;
  vi.advanceTimersByTime(ms);
}

beforeEach(() => {
  vi.useFakeTimers();
  installEnv();
});

afterEach(() => {
  cleanup();
  restoreEnv();
  vi.useRealTimers();
});

describe('the motes loop wakes on a timer at <= 24 fps', () => {
  it('starts animating after the first-paint timeout and paints once per frame interval', () => {
    render(h(Atmosphere, { exhale: false, reducedMotion: false }));
    // Before the start timeout fires, nothing has run.
    expect(__atmosphereProbe()?.plan).toBe('none');

    // The start is scheduled via setTimeout(200). Fire it.
    tick(200);
    const p = __atmosphereProbe();
    expect(p).not.toBeNull();
    expect(p!.plan).toBe('animate');
    expect(p!.looping).toBe(true);
    const afterStart = p!.frames; // one frame painted on start

    // Each timer wake, a frame interval apart, paints one more frame.
    tick(FRAME);
    expect(__atmosphereProbe()!.frames).toBe(afterStart + 1);
    tick(FRAME);
    expect(__atmosphereProbe()!.frames).toBe(afterStart + 2);
  });

  it('does not paint faster than the cap: a sub-interval wake paints nothing', () => {
    render(h(Atmosphere, { exhale: false, reducedMotion: false }));
    tick(200);
    const base = __atmosphereProbe()!.frames;
    // A wake arrives on schedule but less than FRAME_MS of CLOCK has elapsed
    // (we advance the timer but keep the clock behind): shouldDraw refuses, so
    // no new frame is painted.
    vi.advanceTimersByTime(FRAME); // timer fires, clock unchanged
    expect(__atmosphereProbe()!.frames).toBe(base);
  });
});

describe('the loop pauses while the document is hidden', () => {
  it('paints nothing while hidden and resumes when visible', () => {
    render(h(Atmosphere, { exhale: false, reducedMotion: false }));
    tick(200);
    const before = __atmosphereProbe()!.frames;

    // Hide the tab.
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    try {
      tick(FRAME);
      tick(FRAME);
      const p = __atmosphereProbe()!;
      expect(p.pausedHidden).toBe(true);
      expect(p.frames).toBe(before); // nothing painted while hidden
    } finally {
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    }

    // Visible again: the loop resumes and paints.
    tick(FRAME);
    expect(__atmosphereProbe()!.frames).toBeGreaterThan(before);
  });
});

describe('the still pose starts no loop', () => {
  it('draws once and does not loop under reduced motion', () => {
    render(h(Atmosphere, { exhale: false, reducedMotion: true }));
    tick(200);
    const p = __atmosphereProbe()!;
    expect(p.plan).toBe('still');
    expect(p.looping).toBe(false);
    const frames = p.frames;
    // No further frames, however long we wait.
    tick(FRAME * 10);
    expect(__atmosphereProbe()!.frames).toBe(frames);
  });

  it('draws once and does not loop once the room is honest (exhale)', () => {
    render(h(Atmosphere, { exhale: true, reducedMotion: false }));
    tick(200);
    const p = __atmosphereProbe()!;
    expect(p.plan).toBe('still');
    expect(p.looping).toBe(false);
    const frames = p.frames;
    tick(FRAME * 10);
    expect(__atmosphereProbe()!.frames).toBe(frames);
  });
});

describe('adaptive still engages when the device cannot keep the cadence', () => {
  it('drops to the still pose for the visit when the wakes arrive far too late', () => {
    render(h(Atmosphere, { exhale: false, reducedMotion: false }));
    tick(200);
    expect(__atmosphereProbe()!.plan).toBe('animate');

    // Simulate a slow device: each timer wake arrives ~400 ms apart (the clock
    // jumps 400 ms per wake), far beyond the ~41.7 ms interval. The wakes are
    // late by much more than half the interval, so after the 2 s window
    // adaptive still engages.
    for (let i = 0; i < 6; i++) {
      tick(400);
    }
    const p = __atmosphereProbe()!;
    expect(p.adaptiveStill).toBe(true);
    expect(p.looping).toBe(false);

    // Stopped for good: no further frames.
    const frames = p.frames;
    tick(FRAME * 10);
    expect(__atmosphereProbe()!.frames).toBe(frames);
  });

  it('keeps animating when the wakes arrive on time through the window', () => {
    render(h(Atmosphere, { exhale: false, reducedMotion: false }));
    tick(200);
    // Wake every FRAME ms through the whole window: the gaps sit right on the
    // interval (lateness ~0) and the synchronous frames take no clock time, so
    // adaptive still must NOT engage — the cap itself can never trip it.
    for (let i = 0; i < 70; i++) {
      tick(FRAME);
    }
    const p = __atmosphereProbe()!;
    expect(p.adaptiveStill).toBe(false);
    expect(p.looping).toBe(true);
  });

  it('a single late wake among on-time ones does not trip it (the fixed random-trip bug)', () => {
    render(h(Atmosphere, { exhale: false, reducedMotion: false }));
    tick(200);
    // Two on-time wakes, then one late wake (300 ms gap), then on-time wakes for
    // the rest of the window. The old count-vs-cap rule tripped at random on a
    // slow page-load frame; the lateness/median rule does not, because one late
    // gap barely moves the mean and the frames are instant.
    tick(FRAME);
    tick(FRAME);
    tick(300); // one late wake, gap recorded
    for (let i = 0; i < 58; i++) {
      tick(FRAME);
    }
    const p = __atmosphereProbe()!;
    expect(p.adaptiveStill).toBe(false);
    expect(p.looping).toBe(true);
  });
});

describe('teardown on unmount', () => {
  it('stops the loop so no further frames paint', () => {
    const { unmount } = render(h(Atmosphere, { exhale: false, reducedMotion: false }));
    tick(200);
    expect(__atmosphereProbe()!.looping).toBe(true);
    const frames = __atmosphereProbe()!.frames;

    unmount();
    tick(FRAME * 10);
    // The probe is cleared on unmount; nothing kept painting.
    const p = __atmosphereProbe();
    if (p) expect(p.frames).toBe(frames);
    else expect(p).toBeNull();
  });
});
