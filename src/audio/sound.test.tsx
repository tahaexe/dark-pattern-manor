import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import axe from 'axe-core';

import * as sound from './sound';
import SoundToggle from './SoundToggle';
import Room from '../engine/Room';
import App from '../app/App';
import { loadRoom } from '../engine/registry';
import { __resetForTests as resetProgress } from '../engine/progress';
import type { RoomData } from '../engine/types';

// --------------------------------------------------------------------------
// A small fake AudioContext that records what was built, so tests can see
// which cue played and that exactly one context is ever created.
// --------------------------------------------------------------------------

let contextsCreated = 0;

class FakeParam {
  value = 0;
  setValueAtTime = vi.fn(() => this);
  linearRampToValueAtTime = vi.fn(() => this);
  exponentialRampToValueAtTime = vi.fn(() => this);
  cancelScheduledValues = vi.fn(() => this);
}

class FakeNode {
  connect = vi.fn(() => undefined);
  disconnect = vi.fn(() => undefined);
}

class FakeGain extends FakeNode {
  gain = new FakeParam();
}

class FakeFilter extends FakeNode {
  type = 'lowpass';
  frequency = new FakeParam();
  Q = new FakeParam();
}

class FakeSource extends FakeNode {
  buffer: unknown = null;
  loop = false;
  start = vi.fn(() => undefined);
  stop = vi.fn(() => undefined);
}

class FakeOscillator extends FakeNode {
  type = 'sine';
  frequency = new FakeParam();
  start = vi.fn(() => undefined);
  stop = vi.fn(() => undefined);
}

class FakeBuffer {
  constructor(public length: number) {}
  getChannelData() {
    return new Float32Array(this.length);
  }
}

class FakeAudioContext {
  state: 'running' | 'suspended' = 'running';
  currentTime = 0;
  sampleRate = 44100;
  destination = new FakeNode();

  // Per-context tallies the tests read.
  sources: FakeSource[] = [];
  oscillators: FakeOscillator[] = [];
  gains: FakeGain[] = [];
  filters: FakeFilter[] = [];

  constructor() {
    contextsCreated += 1;
  }

  createGain() {
    const g = new FakeGain();
    this.gains.push(g);
    return g as unknown as GainNode;
  }
  createBiquadFilter() {
    const f = new FakeFilter();
    this.filters.push(f);
    return f as unknown as BiquadFilterNode;
  }
  createBufferSource() {
    const s = new FakeSource();
    this.sources.push(s);
    return s as unknown as AudioBufferSourceNode;
  }
  createOscillator() {
    const o = new FakeOscillator();
    this.oscillators.push(o);
    return o as unknown as OscillatorNode;
  }
  createBuffer(_ch: number, len: number) {
    return new FakeBuffer(len) as unknown as AudioBuffer;
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
}

let lastContext: FakeAudioContext | null = null;

/** The engine's single live fake context, or null before one is created. */
function liveContext(): FakeAudioContext | null {
  return lastContext;
}

function installAudio() {
  contextsCreated = 0;
  lastContext = null;
  class Tracked extends FakeAudioContext {
    constructor() {
      super();
      lastContext = this;
    }
  }
  (window as unknown as { AudioContext: unknown }).AudioContext = Tracked;
  (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext = Tracked;
}

function removeAudio() {
  delete (window as unknown as { AudioContext?: unknown }).AudioContext;
  delete (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext;
}

/** Total source + oscillator nodes built so far on the live context. */
function soundNodeCount(): number {
  const c = liveContext();
  if (!c) return 0;
  return c.sources.length + c.oscillators.length;
}

/**
 * Install a working in-memory localStorage on `window` (jsdom here reports
 * none) and return it, so storage assertions have something real to read.
 * Restored in afterEach by `restoreStorage`.
 */
let storageRestore: (() => void) | null = null;
function useFakeStorage(): Storage {
  const map = new Map<string, string>();
  const fake: Storage = {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => map.delete(k),
    setItem: (k: string, v: string) => void map.set(k, v),
  };
  const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
  Object.defineProperty(window, 'localStorage', { configurable: true, value: fake });
  storageRestore = () => {
    if (original) Object.defineProperty(window, 'localStorage', original);
    else delete (window as unknown as { localStorage?: unknown }).localStorage;
    storageRestore = null;
  };
  return fake;
}

const identityRng = () => 0;

async function foyer(): Promise<RoomData> {
  return loadRoom('gravemoor-gazette');
}

/**
 * Forget the stored on/off choice so no test leaks "off" into the next: on
 * Node 22 (CI) jsdom's localStorage persists across tests; on newer Node the
 * global localStorage shadows it and is unavailable, which hid the leak.
 */
function clearStoredChoice(): void {
  try {
    globalThis.localStorage?.removeItem('dpm-sound');
  } catch {
    /* no storage here */
  }
}

beforeEach(() => {
  resetProgress();
  clearStoredChoice();
  installAudio();
  sound.__resetForTests();
});

afterEach(() => {
  clearStoredChoice();
  sound.__resetForTests();
  removeAudio();
  storageRestore?.();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// --------------------------------------------------------------------------
// Lazy, gesture-gated context creation.
// --------------------------------------------------------------------------

describe('sound — lazy, gesture-gated AudioContext', () => {
  it('creates no AudioContext at import or before a gesture', () => {
    // Merely importing the module and resetting created nothing.
    expect(contextsCreated).toBe(0);
    expect(sound.isSoundOn()).toBe(true);
  });

  it('creates exactly one AudioContext after the first gesture with sound on, reused after', () => {
    sound.setSoundOn(true);
    expect(contextsCreated).toBe(0); // nothing yet; no sound made
    sound.lantern();
    expect(contextsCreated).toBe(1);
    sound.cold();
    sound.whisper();
    expect(contextsCreated).toBe(1); // reused
  });

  it('creates no AudioContext while sound is off', () => {
    sound.setSoundOn(false);
    sound.lantern();
    sound.cold();
    sound.flee();
    sound.honest();
    sound.quiet();
    sound.startAmbience();
    expect(contextsCreated).toBe(0);
  });
});

// --------------------------------------------------------------------------
// The toggle: state, storage, default, throwing localStorage.
// --------------------------------------------------------------------------

describe('sound — the toggle store', () => {
  it('defaults to on when the key is absent', () => {
    expect(sound.isSoundOn()).toBe(true);
  });

  it('round-trips on/off and writes the stored value', () => {
    const store = useFakeStorage();
    sound.setSoundOn(false);
    expect(sound.isSoundOn()).toBe(false);
    expect(store.getItem('dpm-sound')).toBe('off');
    sound.setSoundOn(true);
    expect(sound.isSoundOn()).toBe(true);
    expect(store.getItem('dpm-sound')).toBe('on');
  });

  it('reads a stored "off" as off on reset', () => {
    const store = useFakeStorage();
    store.setItem('dpm-sound', 'off');
    sound.__resetForTests();
    expect(sound.isSoundOn()).toBe(false);
  });

  it('does not throw when localStorage throws, and keeps the default', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('blocked');
      },
    });
    try {
      expect(() => sound.__resetForTests()).not.toThrow();
      expect(sound.isSoundOn()).toBe(true); // default
      expect(() => sound.setSoundOn(false)).not.toThrow();
    } finally {
      if (original) Object.defineProperty(window, 'localStorage', original);
      else delete (window as unknown as { localStorage?: unknown }).localStorage;
    }
  });

  it('the SoundToggle reflects the state through aria-pressed', async () => {
    render(<SoundToggle />);
    const btn = screen.getByRole('button', { name: /Sound/ });
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(btn);
    await waitFor(() => expect(btn.getAttribute('aria-pressed')).toBe('false'));
    expect(sound.isSoundOn()).toBe(false);
    fireEvent.click(btn);
    await waitFor(() => expect(btn.getAttribute('aria-pressed')).toBe('true'));
  });
});

// --------------------------------------------------------------------------
// Room cues, each once; none with sound off.
// --------------------------------------------------------------------------

describe('sound — room cues fire once', () => {
  async function runLoop() {
    const room = await foyer();
    render(<Room room={room} nextSlug="inkbone-books" rng={identityRng} />);

    const counts: Record<string, number> = {};
    const snap = () => soundNodeCount();

    let before = snap();
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    counts.lantern = snap() - before;

    before = snap();
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    counts.cold = snap() - before;

    before = snap();
    const wrong = await screen.findByRole('button', { name: 'Trick wording' });
    fireEvent.click(wrong);
    counts.whisper = snap() - before;
    // The whispered hint appears together with the whisper sound.
    expect(await screen.findByText(/it is the look that lies/i)).toBeDefined();

    before = snap();
    fireEvent.click(screen.getByRole('button', { name: 'Visual interference' }));
    counts.flee = snap() - before;

    await screen.findByRole('heading', { level: 2, name: 'Visual interference' });

    before = snap();
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    await waitFor(() => expect(snap()).toBeGreaterThan(before));
    counts.honest = snap() - before;

    return counts;
  }

  it('plays lantern, cold, whisper, flee and honest, each creating sound nodes', async () => {
    sound.setSoundOn(true);
    const counts = await runLoop();
    expect(counts.lantern).toBeGreaterThan(0);
    expect(counts.cold).toBeGreaterThan(0);
    expect(counts.whisper).toBeGreaterThan(0);
    expect(counts.flee).toBeGreaterThan(0);
    expect(counts.honest).toBeGreaterThan(0);
  });

  it('plays nothing with sound off', async () => {
    sound.setSoundOn(false);
    const room = await foyer();
    render(<Room room={room} nextSlug="inkbone-books" rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Trick wording' }));
    fireEvent.click(screen.getByRole('button', { name: 'Visual interference' }));
    await screen.findByRole('heading', { level: 2, name: 'Visual interference' });
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    expect(contextsCreated).toBe(0);
  });

  it('the whisper fires once per wrong pick (nonce-keyed)', async () => {
    sound.setSoundOn(true);
    const room = await foyer();
    render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));

    const before = soundNodeCount();
    fireEvent.click(await screen.findByRole('button', { name: 'Trick wording' }));
    const afterOne = soundNodeCount();
    expect(afterOne - before).toBeGreaterThan(0);

    // A second, different wrong card fires the whisper again.
    fireEvent.click(screen.getByRole('button', { name: 'Nagging' }));
    const afterTwo = soundNodeCount();
    expect(afterTwo - afterOne).toBeGreaterThan(0);
  });
});

// --------------------------------------------------------------------------
// Ambience: leaving a room stops it and clears its timers.
// --------------------------------------------------------------------------

describe('sound — ambience lifecycle', () => {
  it('leaving a room stops the ambience and clears its crackle timers', () => {
    vi.useFakeTimers();
    sound.setSoundOn(true);
    sound.setRoomTag('haunted');
    sound.startAmbience();

    const c = liveContext();
    expect(c).not.toBeNull();
    expect(c!.sources.length).toBeGreaterThan(0);
    const ambienceSource = c!.sources[0];

    // Leave the room.
    sound.stopAmbience();
    expect(ambienceSource.stop).toHaveBeenCalled();
    expect(ambienceSource.disconnect).toHaveBeenCalled();

    // No pending crackle timer fires any further sound.
    const srcAfterStop = c!.sources.length;
    vi.advanceTimersByTime(20000);
    expect(c!.sources.length).toBe(srcAfterStop);
  });

  it('unmounting the Room stops the ambience', async () => {
    vi.useFakeTimers();
    sound.setSoundOn(true);
    const room = await foyer();
    const { unmount } = render(<Room room={room} rng={identityRng} />);
    // Room is haunted on mount, so the ambience started.
    const c = liveContext();
    expect(c).not.toBeNull();
    expect(c!.sources.length).toBeGreaterThan(0);
    const first = c!.sources[0];

    unmount();
    expect(first.stop).toHaveBeenCalled();

    const n = c!.sources.length;
    vi.advanceTimersByTime(20000);
    expect(c!.sources.length).toBe(n);
  });
});

// --------------------------------------------------------------------------
// No AudioContext: everything is a silent no-op.
// --------------------------------------------------------------------------

describe('sound — no AudioContext present', () => {
  it('every function is a no-op and nothing throws', () => {
    removeAudio();
    sound.__resetForTests();
    expect(sound.hasAudio()).toBe(false);
    expect(() => {
      sound.setSoundOn(true);
      sound.setRoomTag('haunted');
      sound.lantern();
      sound.cold();
      sound.whisper();
      sound.flee();
      sound.honest();
      sound.quiet();
      sound.startAmbience();
      sound.fadeOutAmbience();
      sound.stopAmbience();
      sound.setRoomTag(null);
    }).not.toThrow();
  });

  it('a full room loop runs without throwing when there is no audio', async () => {
    removeAudio();
    sound.__resetForTests();
    const room = await foyer();
    expect(() => {
      render(<Room room={room} nextSlug="inkbone-books" rng={identityRng} />);
      fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    }).not.toThrow();
    const correct = await screen.findByRole('button', { name: 'Visual interference' });
    expect(() => fireEvent.click(correct)).not.toThrow();
  });
});

// --------------------------------------------------------------------------
// axe-core: title page and room 1 with the toggle present.
// --------------------------------------------------------------------------

describe('sound — accessibility of the toggle', () => {
  async function expectNoViolations(container: HTMLElement) {
    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: true } },
    });
    if (results.violations.length > 0) {
      console.log('axe violations:', JSON.stringify(results.violations, null, 2));
    }
    expect(results.violations).toHaveLength(0);
  }

  it('the title page with the toggle has zero violations', async () => {
    window.location.hash = '#/';
    const { container } = render(<App />);
    await screen.findByRole('button', { name: /Sound/ });
    await expectNoViolations(container);
  });

  it('room 1 with the toggle has zero violations', async () => {
    const room = await foyer();
    const { container } = render(
      <div class="app">
        <SoundToggle />
        <Room room={room} rng={identityRng} />
      </div>,
    );
    await screen.findByRole('button', { name: /Sound/ });
    await expectNoViolations(container);
  });
});

// --------------------------------------------------------------------------
// The gesture gate: when navigator.userActivation reports no gesture yet,
// ensureContext defers and arms a one-time window listener.
// --------------------------------------------------------------------------

describe('sound — user-activation gesture gate', () => {
  /**
   * Install a fake `navigator.userActivation`. Pass `undefined` to remove it
   * (jsdom's default). Returns a setter so a test can flip `hasBeenActive` to
   * true at the moment a gesture "happens". Restored in the returned cleanup.
   */
  function withUserActivation(initial: boolean | undefined) {
    const original = Object.getOwnPropertyDescriptor(navigator, 'userActivation');
    const state = { hasBeenActive: initial };
    if (initial === undefined) {
      delete (navigator as unknown as { userActivation?: unknown }).userActivation;
    } else {
      Object.defineProperty(navigator, 'userActivation', {
        configurable: true,
        get: () => state,
      });
    }
    const restore = () => {
      if (original) Object.defineProperty(navigator, 'userActivation', original);
      else delete (navigator as unknown as { userActivation?: unknown }).userActivation;
    };
    return { setActive: (v: boolean) => (state.hasBeenActive = v), restore };
  }

  it('hasBeenActive=false: mounting a haunted room creates no AudioContext', async () => {
    const ua = withUserActivation(false);
    try {
      sound.setSoundOn(true);
      const room = await foyer();
      render(<Room room={room} rng={identityRng} />);
      // The room is haunted on mount, so startAmbience ran — but with no
      // user activation yet, ensureContext deferred and created nothing.
      expect(contextsCreated).toBe(0);
    } finally {
      ua.restore();
    }
  });

  it('hasBeenActive=false: a keydown on window creates exactly one context and starts the ambience', async () => {
    const ua = withUserActivation(false);
    try {
      sound.setSoundOn(true);
      const room = await foyer();
      render(<Room room={room} rng={identityRng} />);
      expect(contextsCreated).toBe(0);

      // The first gesture: the browser now reports activation, and our armed
      // capture-phase listener fires.
      ua.setActive(true);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));

      expect(contextsCreated).toBe(1);
      const c = liveContext();
      expect(c).not.toBeNull();
      // The ambience started: a looping buffer source was created.
      expect(c!.sources.length).toBeGreaterThan(0);
    } finally {
      ua.restore();
    }
  });

  it('hasBeenActive=false: a pointerdown on window also creates the context', async () => {
    const ua = withUserActivation(false);
    try {
      sound.setSoundOn(true);
      const room = await foyer();
      render(<Room room={room} rng={identityRng} />);
      expect(contextsCreated).toBe(0);

      ua.setActive(true);
      window.dispatchEvent(new Event('pointerdown'));

      expect(contextsCreated).toBe(1);
    } finally {
      ua.restore();
    }
  });

  it('hasBeenActive=true: the context is created on demand immediately (today\u2019s behaviour)', async () => {
    const ua = withUserActivation(true);
    try {
      sound.setSoundOn(true);
      const room = await foyer();
      render(<Room room={room} rng={identityRng} />);
      // Activation already true, so the mount ambience created the context now.
      expect(contextsCreated).toBe(1);
    } finally {
      ua.restore();
    }
  });

  it('no userActivation (jsdom default): created on demand (today\u2019s behaviour)', async () => {
    const ua = withUserActivation(undefined);
    try {
      sound.setSoundOn(true);
      const room = await foyer();
      render(<Room room={room} rng={identityRng} />);
      expect(contextsCreated).toBe(1);
    } finally {
      ua.restore();
    }
  });
});
