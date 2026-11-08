/**
 * Sound for Dark Pattern Manor.
 *
 * A quiet, layered haunted ambience with a voice for each room, and six short
 * cues, all synthesized with the Web Audio API — no audio files, no downloads,
 * nothing to license. Everything is atmosphere layered on a game that is fully
 * playable in silence.
 *
 * Rules this module keeps (the invariants, kept at the top):
 *  - One AudioContext, created lazily and ONLY once sound has been ARMED — that
 *    is, once the player has switched Sound on (the toggle is a user gesture)
 *    OR the first pointerdown/keydown has fired after a room asked to play.
 *    It is never created at import, at page load, or merely on a room's mount
 *    before any of that, so an idle room on a fresh visit holds no audio engine
 *    at all. When armed but the platform reports no user activation yet
 *    (`navigator.userActivation.hasBeenActive === false`), creation is deferred
 *    to that first gesture, so opening a room's address directly never creates
 *    the context before a gesture.
 *  - While sound is OFF, any context created earlier is SUSPENDED and no new one
 *    is made; while the document is HIDDEN the context is suspended and it
 *    resumes when the page is visible again and sound is on. So an idle or
 *    backgrounded room pays nothing for audio.
 *  - If no AudioContext constructor exists (jsdom has none), every function is
 *    a silent no-op that throws nothing.
 *  - Everything passes through one master gain, held quiet: the whole ambience
 *    (the sum of all its layers) about -20 dBFS, the cues about -12 dBFS, so
 *    the sum never clips.
 *  - The on/off choice is remembered in localStorage under "dpm-sound"; a
 *    throwing localStorage falls back to the default (on) and never throws.
 *  - No cookies, no third-party network request: the only persisted state is
 *    the one localStorage key.
 *  - Sound off stops everything — every layer and every cue — at once.
 *  - The soundscape is subtle: every layer is quiet and slowly varying so the
 *    bed never loops audibly; no jump scares, no screams, no sudden loud sounds.
 */

/** dBFS → linear gain. */
export const DB = (db: number): number => 10 ** (db / 20);

/** The two level targets, in dB below full scale. */
export const AMBIENCE_DB = -20;
export const CUE_DB = -12;

const AMBIENCE_GAIN = DB(AMBIENCE_DB); // ≈ 0.1 — the whole-ambience target
const CUE_GAIN = DB(CUE_DB); // ≈ 0.25 — the cue target

const STORAGE_KEY = 'dpm-sound';

/** Tags in which the ambience plays. */
const HAUNTED_TAGS = new Set(['haunted', 'inspecting', 'picking']);

/**
 * A single ambience layer's peak gain, always strictly below the whole-ambience
 * target: `scale` is in (0, 1), so no one layer is ever as loud as the sum.
 */
function layerPeak(scale: number): number {
  return AMBIENCE_GAIN * scale;
}

/**
 * A creak delay in ms for the house settling, always within [8000, 20000]
 * inclusive. Factored out and exported so a property test can check the range
 * without touching the audio engine.
 */
export function creakDelayMs(rand: () => number = Math.random): number {
  return 8000 + Math.floor(rand() * 12001); // 8000..20000 inclusive
}

// --------------------------------------------------------------------------
// The one AudioContext and master gain, born lazily once sound is armed,
// suspended whenever sound is off or the tab hidden.
// --------------------------------------------------------------------------

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

/**
 * True once sound has been armed this visit: either the player switched Sound
 * on (the toggle, a user gesture) or the first captured pointerdown/keydown
 * fired. Until then, a room asking to play on mount creates NO context — it
 * only arms the gesture listener — so an idle room on a fresh visit never spins
 * up the audio engine. Reset only by `__resetForTests`.
 */
let armed = false;

/** True while the visibility listener is installed (armed once, on first ctx). */
let visibilityArmed = false;

type AudioCtorType = typeof AudioContext;

/** The AudioContext constructor, or null when the platform has none. */
function AudioCtor(): AudioCtorType | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: AudioCtorType;
    webkitAudioContext?: AudioCtorType;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** True when the platform can make sound at all. */
export function hasAudio(): boolean {
  return AudioCtor() !== null;
}

/**
 * True only when the platform exposes `navigator.userActivation` AND it reports
 * that the page has not yet had a user gesture (`hasBeenActive === false`).
 * When `userActivation` is absent (jsdom, older browsers) this is false, so an
 * armed context is created on demand; when a gesture has already happened it is
 * also false.
 */
function awaitingFirstGesture(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive?: boolean } })
    .userActivation;
  return !!ua && ua.hasBeenActive === false;
}

/**
 * While true, a one-time capture-phase listener is armed on `window`, waiting
 * for the first gesture so the deferred context can be created then. The stored
 * cleanup removes those listeners (used on reset).
 */
let pendingGestureCleanup: (() => void) | null = null;

/**
 * Arm a one-time capture-phase pointerdown/keydown listener on `window`. On the
 * first gesture it removes itself, arms sound, creates the context, and resumes
 * the ambience if sound is on and a room is still haunted. Idempotent: a second
 * call while already armed does nothing.
 */
function armGestureListener(): void {
  if (pendingGestureCleanup || typeof window === 'undefined') return;
  const onGesture = () => {
    cleanup();
    armed = true;
    const c = ensureContext();
    if (c && soundOn && roomTag && HAUNTED_TAGS.has(roomTag)) startAmbience();
  };
  const cleanup = () => {
    window.removeEventListener('pointerdown', onGesture, true);
    window.removeEventListener('keydown', onGesture, true);
    pendingGestureCleanup = null;
  };
  window.addEventListener('pointerdown', onGesture, true);
  window.addEventListener('keydown', onGesture, true);
  pendingGestureCleanup = cleanup;
}

/**
 * Suspend the context while hidden; resume it while visible and sound is on.
 * Installed once, the first time a context is created, and removed on reset.
 */
function onVisibility(): void {
  if (!ctx) return;
  if (typeof document !== 'undefined' && document.hidden) {
    void ctx.suspend?.().catch?.(() => {});
  } else if (soundOn) {
    void ctx.resume?.().catch?.(() => {});
  }
}

function armVisibilityListener(): void {
  if (visibilityArmed || typeof document === 'undefined') return;
  document.addEventListener('visibilitychange', onVisibility);
  visibilityArmed = true;
}

/**
 * The single place an AudioContext is born. Only ever reached from a public
 * sound function, and it creates a context ONLY when sound is armed (see
 * `armed`) and on — so no context exists at import, at load, or on a fresh
 * room's mount, and none is created while sound is off.
 *
 * If sound is on but not yet armed, it creates nothing, arms a one-time gesture
 * listener, and returns null; the caller no-ops cleanly and the context is
 * created on that first gesture instead. Likewise, if armed but the platform
 * reports no user activation yet, it defers to the gesture listener.
 *
 * When the document is hidden, a freshly created or existing context is left
 * suspended; the visibility listener resumes it when the page returns.
 */
function ensureContext(): AudioContext | null {
  const Ctor = AudioCtor();
  if (!Ctor) return null;
  if (!soundOn) return null; // never create or resume a context while off
  if (!ctx && (!armed || awaitingFirstGesture())) {
    armGestureListener();
    return null;
  }
  if (!ctx) {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 1; // per-sound gains set the real levels
    master.connect(ctx.destination);
    armVisibilityListener();
  }
  const hidden = typeof document !== 'undefined' && document.hidden;
  if (hidden) {
    // Keep it suspended while the tab is hidden; the listener resumes it later.
    void ctx.suspend?.().catch?.(() => {});
  } else if (ctx.state === 'suspended') {
    // Resume inside the gesture; ignore rejection (sound simply stays silent).
    void ctx.resume().catch(() => {});
  }
  return ctx;
}

function now(c: AudioContext): number {
  return c.currentTime;
}

// --------------------------------------------------------------------------
// The toggle store: on/off, persisted, observable.
// --------------------------------------------------------------------------

type Listener = () => void;
const listeners = new Set<Listener>();

function readStored(): boolean {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    return raw !== 'off'; // "off" → false; anything else (incl. absent) → on
  } catch {
    return true; // default on when storage throws
  }
}

function writeStored(on: boolean): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    // Swallow: a throwing storage must never throw into the game.
  }
}

let soundOn = readStored();

/** The last room tag the view reported, so resuming knows whether to. */
let roomTag: string | null = null;

/** The current room's slug, so the ambience can choose that room's voice. */
let roomSlug: string | null = null;

/** Whether sound is currently on. */
export function isSoundOn(): boolean {
  return soundOn;
}

/** Subscribe to on/off changes; returns an unsubscribe function. */
export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(): void {
  for (const fn of listeners) fn();
}

/**
 * Turn sound on or off. Switching ON is a user gesture that ARMS sound: the
 * context may now be created (or deferred to the first gesture if the platform
 * reports none yet), and the ambience resumes if a room is haunted. Switching
 * OFF stops everything at once AND suspends the context, so no audio engine
 * keeps running while the sound is off. The choice is persisted; a throwing
 * localStorage never throws.
 */
export function setSoundOn(on: boolean): void {
  if (on) armed = true; // the toggle gesture arms sound
  if (on === soundOn) {
    writeStored(on);
    // Even with no state change, honour the invariant: off → suspend any
    // existing context so none keeps running while the sound is off.
    if (!on && ctx) void ctx.suspend?.().catch?.(() => {});
    return;
  }
  soundOn = on;
  writeStored(on);
  if (!on) {
    stopAmbience();
    if (ctx) void ctx.suspend?.().catch?.(() => {});
  } else if (roomTag && HAUNTED_TAGS.has(roomTag)) {
    startAmbience();
  }
  notify();
}

/**
 * The room tells the engine which state it is in. Passing null means the
 * player left the room: the ambience stops. The engine remembers the tag so
 * turning sound back on can resume the ambience when a room is haunted.
 */
export function setRoomTag(tag: string | null): void {
  roomTag = tag;
  if (tag === null) stopAmbience();
}

/**
 * The room tells the engine its slug, so the ambience can add that room's
 * voice. Passing null clears it (used on leaving the room). This comes from the
 * room's static data, not from the state machine, so the reducer stays pure.
 */
export function setRoomSlug(slug: string | null): void {
  roomSlug = slug;
}

// --------------------------------------------------------------------------
// Noise.
// --------------------------------------------------------------------------

/** Two seconds of white noise, looped by callers. */
function noiseBuffer(c: AudioContext): AudioBuffer {
  const len = Math.max(1, Math.floor(c.sampleRate * 2));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

// --------------------------------------------------------------------------
// The layered ambience: room tone, wind, a distant clock, the house settling,
// and one room voice chosen by slug. Every layer connects into the one
// ambience gain so the whole bed fades and stops as one.
// --------------------------------------------------------------------------

interface Ambience {
  nodes: AudioNode[];
  gain: GainNode;
  timers: ReturnType<typeof setTimeout>[];
  stopped: boolean;
}

let ambience: Ambience | null = null;

/**
 * Each ambience layer's chosen peak gain, recorded as the layer is built and
 * reset on every startAmbience(). A test reads these through
 * `__ambienceLayerPeaks()` to assert every layer stays below the ambience
 * target, without needing a real audio device.
 */
let layerPeaks: number[] = [];

/** Disconnect a node and swallow any error (already-stopped, etc.). */
function safeDisconnect(node: AudioNode): void {
  try {
    node.disconnect();
  } catch {
    /* ignore */
  }
}

/** Stop a source node and swallow any error. */
function safeStop(node: AudioScheduledSourceNode): void {
  try {
    node.stop();
  } catch {
    /* ignore */
  }
}

// --------------------------------------------------------------------------
// Shared ambience layers. Each builder attaches its nodes to `amb.nodes`, its
// timers to `amb.timers`, connects into `amb.gain`, and records its peak.
// --------------------------------------------------------------------------

/**
 * The room tone that exists today: looped noise through a low-pass around
 * 300 Hz with a slow random drift so it is never static. The loudest layer,
 * still below the whole-ambience target.
 */
function buildRoomTone(c: AudioContext, amb: Ambience): void {
  const t = now(c);
  const peak = layerPeak(0.9);
  layerPeaks.push(peak);

  const source = c.createBufferSource();
  source.buffer = noiseBuffer(c);
  source.loop = true;

  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 300;

  const gain = c.createGain();
  gain.gain.setValueAtTime(peak, t);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(amb.gain);
  safeStart(source, t);
  amb.nodes.push(source, filter, gain);

  // Slow random drift of the low-pass frequency.
  const drift = () => {
    if (amb.stopped || !ctx) return;
    const freq = 220 + Math.random() * 160; // ~220–380 Hz
    try {
      filter.frequency.linearRampToValueAtTime(freq, ctx.currentTime + 3);
    } catch {
      /* ignore */
    }
    amb.timers.push(setTimeout(drift, 3000));
  };
  amb.timers.push(setTimeout(drift, 3000));
}

/**
 * Wind through the hall: filtered noise whose band and level drift slowly, so
 * neither the colour nor the loudness ever settles.
 */
function buildWind(c: AudioContext, amb: Ambience): void {
  const t = now(c);
  const peak = layerPeak(0.5);
  layerPeaks.push(peak);

  const source = c.createBufferSource();
  source.buffer = noiseBuffer(c);
  source.loop = true;

  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 450;
  bp.Q.value = 0.7;

  const gain = c.createGain();
  gain.gain.setValueAtTime(peak * 0.6, t);

  source.connect(bp);
  bp.connect(gain);
  gain.connect(amb.gain);
  safeStart(source, t);
  amb.nodes.push(source, bp, gain);

  // Slow drift of both the band centre and the level.
  const drift = () => {
    if (amb.stopped || !ctx) return;
    const freq = 300 + Math.random() * 400; // ~300–700 Hz
    const level = peak * (0.3 + Math.random() * 0.7); // 0.3×–1× of the peak
    try {
      bp.frequency.linearRampToValueAtTime(freq, ctx.currentTime + 4);
      gain.gain.linearRampToValueAtTime(level, ctx.currentTime + 4);
    } catch {
      /* ignore */
    }
    amb.timers.push(setTimeout(drift, 4000));
  };
  amb.timers.push(setTimeout(drift, 4000));
}

/** One soft, muffled tick: a very short low sine pulse. Far back when quiet. */
function tick(c: AudioContext, amb: Ambience, out: GainNode, peak: number, freq: number): void {
  if (amb.stopped || !master) return;
  const t = now(c);
  const dur = 0.05;
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(out);
  safeStart(osc, t);
  safeStop2(osc, t + dur + 0.02);
  amb.nodes.push(osc, g);
}

/**
 * A distant clock: a soft muffled tick about once a second, far back in the
 * mix. The spacing is jittered so it never locks to a beat.
 */
function buildClock(c: AudioContext, amb: Ambience): void {
  const peak = layerPeak(0.25);
  layerPeaks.push(peak);
  const out = c.createGain();
  out.gain.value = 1;
  out.connect(amb.gain);
  amb.nodes.push(out);

  const schedule = () => {
    if (amb.stopped) return;
    const delay = 900 + Math.random() * 200; // ~0.9–1.1 s
    amb.timers.push(
      setTimeout(() => {
        if (amb.stopped || !ctx) return;
        tick(ctx, amb, out, peak, 180);
        schedule();
      }, delay),
    );
  };
  schedule();
}

/**
 * The house settling: an occasional low wooden creak at random intervals of
 * 8–20 s. A low tone with a slow pitch wobble and a gentle swell-and-fade.
 */
function buildCreak(c: AudioContext, amb: Ambience): void {
  const peak = layerPeak(0.6);
  layerPeaks.push(peak);
  const out = c.createGain();
  out.gain.value = 1;
  out.connect(amb.gain);
  amb.nodes.push(out);

  const fire = () => {
    if (amb.stopped || !ctx) return;
    const t = now(ctx);
    const dur = 0.8 + Math.random() * 0.6; // 0.8–1.4 s
    const base = 70 + Math.random() * 40; // 70–110 Hz

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.linearRampToValueAtTime(base * 1.1, t + dur * 0.5);
    osc.frequency.linearRampToValueAtTime(base * 0.95, t + dur);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 400;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(lp);
    lp.connect(g);
    g.connect(out);
    safeStart(osc, t);
    safeStop2(osc, t + dur + 0.02);
    amb.nodes.push(osc, lp, g);
    schedule();
  };
  const schedule = () => {
    if (amb.stopped) return;
    amb.timers.push(setTimeout(fire, creakDelayMs()));
  };
  schedule();
}

// --------------------------------------------------------------------------
// The room voices. One quiet layer per room, chosen by slug, below the room
// tone and below every cue. Each is subtle — no jump scare, no sudden loud.
// --------------------------------------------------------------------------

type VoiceBuilder = (c: AudioContext, amb: Ambience) => void;

/** Make a layer sub-gain connected to the ambience gain, recording its peak. */
function voiceOut(c: AudioContext, amb: Ambience, scale: number): { out: GainNode; peak: number } {
  const peak = layerPeak(scale);
  layerPeaks.push(peak);
  const out = c.createGain();
  out.gain.value = 1;
  out.connect(amb.gain);
  amb.nodes.push(out);
  return { out, peak };
}

/** A short scheduled grain: filtered noise with a quick envelope. */
function grain(
  c: AudioContext,
  amb: Ambience,
  out: GainNode,
  peak: number,
  opts: { type: BiquadFilterType; freq: number; q: number; dur: number; attack?: number },
): void {
  if (amb.stopped) return;
  const t = now(c);
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const f = c.createBiquadFilter();
  f.type = opts.type;
  f.frequency.value = opts.freq;
  f.Q.value = opts.q;
  const g = c.createGain();
  const attack = opts.attack ?? 0.01;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
  src.connect(f);
  f.connect(g);
  g.connect(out);
  safeStart(src, t);
  safeStop2(src, t + opts.dur + 0.02);
  amb.nodes.push(src, f, g);
}

/** A short scheduled sine blip (a ping or a note). */
function blip(
  c: AudioContext,
  amb: Ambience,
  out: GainNode,
  peak: number,
  opts: { freq: number; dur: number; glideTo?: number; type?: OscillatorType },
): void {
  if (amb.stopped) return;
  const t = now(c);
  const osc = c.createOscillator();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(opts.freq, t);
  if (opts.glideTo) osc.frequency.exponentialRampToValueAtTime(opts.glideTo, t + opts.dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
  osc.connect(g);
  g.connect(out);
  safeStart(osc, t);
  safeStop2(osc, t + opts.dur + 0.02);
  amb.nodes.push(osc, g);
}

/** Schedule a repeating event at a jittered delay; re-schedules itself. */
function everyFew(amb: Ambience, minMs: number, maxMs: number, body: () => void): void {
  const run = () => {
    if (amb.stopped) return;
    body();
    schedule();
  };
  const schedule = () => {
    if (amb.stopped) return;
    const delay = minMs + Math.random() * (maxMs - minMs);
    amb.timers.push(setTimeout(run, delay));
  };
  schedule();
}

/** The Foyer — a draught under the door: low-passed noise with a slow drift. */
const buildDraught: VoiceBuilder = (c, amb) => {
  const t = now(c);
  const { out, peak } = voiceOut(c, amb, 0.4);
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  src.loop = true;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 400;
  const g = c.createGain();
  g.gain.setValueAtTime(peak * 0.5, t);
  src.connect(lp);
  lp.connect(g);
  g.connect(out);
  safeStart(src, t);
  amb.nodes.push(src, lp, g);
  const drift = () => {
    if (amb.stopped || !ctx) return;
    try {
      g.gain.linearRampToValueAtTime(peak * (0.3 + Math.random() * 0.7), ctx.currentTime + 5);
    } catch {
      /* ignore */
    }
    amb.timers.push(setTimeout(drift, 5000));
  };
  amb.timers.push(setTimeout(drift, 5000));
};

/** The Library — a page turning now and then: a high-passed swish. */
const buildPageTurn: VoiceBuilder = (c, amb) => {
  const { out, peak } = voiceOut(c, amb, 0.35);
  everyFew(amb, 6000, 14000, () => {
    if (!ctx) return;
    grain(ctx, amb, out, peak, { type: 'highpass', freq: 2000, q: 0.7, dur: 0.25, attack: 0.03 });
  });
};

/** The Dining Room — a faint clink of cutlery: one or two short metallic pings. */
const buildCutlery: VoiceBuilder = (c, amb) => {
  const { out, peak } = voiceOut(c, amb, 0.3);
  everyFew(amb, 5000, 12000, () => {
    if (!ctx) return;
    blip(ctx, amb, out, peak, { freq: 2400 + Math.random() * 600, dur: 0.12 });
    if (Math.random() < 0.5)
      amb.timers.push(
        setTimeout(() => {
          if (ctx) blip(ctx, amb, out, peak * 0.8, { freq: 3000 + Math.random() * 500, dur: 0.1 });
        }, 90),
      );
  });
};

/** The Parlour — a fire crackling low: frequent very short filtered clicks. */
const buildFire: VoiceBuilder = (c, amb) => {
  const { out, peak } = voiceOut(c, amb, 0.4);
  const fire = () => {
    if (amb.stopped || !ctx) return;
    const clicks = 2 + Math.floor(Math.random() * 3); // 2–4 clicks
    for (let i = 0; i < clicks; i++) {
      amb.timers.push(
        setTimeout(
          () => {
            if (ctx)
              grain(ctx, amb, out, peak * 0.8, {
                type: 'bandpass',
                freq: 1800 + Math.random() * 1200,
                q: 2,
                dur: 0.012 + Math.random() * 0.015,
                attack: 0.002,
              });
          },
          i * (20 + Math.random() * 40),
        ),
      );
    }
  };
  everyFew(amb, 2000, 6000, fire);
};

/** The Conservatory — the clock's tick louder and a little too fast. */
const buildFastClock: VoiceBuilder = (c, amb) => {
  const { out, peak } = voiceOut(c, amb, 0.45);
  const schedule = () => {
    if (amb.stopped) return;
    const delay = 700 + Math.random() * 150; // ~0.7–0.85 s — a little fast
    amb.timers.push(
      setTimeout(() => {
        if (amb.stopped || !ctx) return;
        tick(ctx, amb, out, peak, 200);
        schedule();
      }, delay),
    );
  };
  schedule();
};

/** The Ballroom — a far-off, detuned waltz phrase (three notes, 3/4). */
const buildWaltz: VoiceBuilder = (c, amb) => {
  const { out, peak } = voiceOut(c, amb, 0.35);
  // A low-pass to push it far off.
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 900;
  lp.connect(out);
  amb.nodes.push(lp);
  everyFew(amb, 10000, 16000, () => {
    if (!ctx) return;
    const root = 330 * (1 + (Math.random() * 0.03 - 0.015)); // slightly detuned
    const notes = [root, root * 1.25, root * 1.5]; // a simple triad phrase
    notes.forEach((f, i) => {
      amb.timers.push(
        setTimeout(() => {
          if (ctx) blip(ctx, amb, lp, peak, { freq: f, dur: 0.5 });
        }, i * 420),
      );
    });
  });
};

/** The Portrait Gallery — murmuring that never forms words. */
const buildMurmur: VoiceBuilder = (c, amb) => {
  const t = now(c);
  const { out, peak } = voiceOut(c, amb, 0.35);
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  src.loop = true;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 500;
  bp.Q.value = 2;
  const g = c.createGain();
  g.gain.setValueAtTime(peak * 0.5, t);
  src.connect(bp);
  bp.connect(g);
  g.connect(out);
  safeStart(src, t);
  amb.nodes.push(src, bp, g);
  // Slow band and level drift so it burbles like far voices, never words.
  const drift = () => {
    if (amb.stopped || !ctx) return;
    try {
      bp.frequency.linearRampToValueAtTime(300 + Math.random() * 600, ctx.currentTime + 2);
      g.gain.linearRampToValueAtTime(peak * (0.3 + Math.random() * 0.6), ctx.currentTime + 2);
    } catch {
      /* ignore */
    }
    amb.timers.push(setTimeout(drift, 2000));
  };
  amb.timers.push(setTimeout(drift, 2000));
};

/** The Pantry — a jar lid rattling: a short metallic rattle now and then. */
const buildJarLid: VoiceBuilder = (c, amb) => {
  const { out, peak } = voiceOut(c, amb, 0.35);
  everyFew(amb, 7000, 15000, () => {
    const rattles = 3 + Math.floor(Math.random() * 3); // 3–5 quick pings
    for (let i = 0; i < rattles; i++) {
      amb.timers.push(
        setTimeout(
          () => {
            if (ctx)
              blip(ctx, amb, out, peak * (0.6 + Math.random() * 0.4), {
                freq: 1500 + Math.random() * 500,
                dur: 0.06,
              });
          },
          i * (40 + Math.random() * 30),
        ),
      );
    }
  });
};

/** The Study — a pen scratching: a short high-passed noise scrape. */
const buildPenScratch: VoiceBuilder = (c, amb) => {
  const { out, peak } = voiceOut(c, amb, 0.3);
  everyFew(amb, 4000, 9000, () => {
    if (!ctx) return;
    grain(ctx, amb, out, peak, { type: 'highpass', freq: 2600, q: 0.8, dur: 0.18, attack: 0.02 });
  });
};

/** The Nursery — a slow, slightly out-of-tune music box. */
const buildMusicBox: VoiceBuilder = (c, amb) => {
  const { out, peak } = voiceOut(c, amb, 0.35);
  // A simple phrase of high notes, each a touch detuned.
  const melody = [1047, 1175, 1319, 1175, 1047, 880]; // C6 D6 E6 D6 C6 A5
  everyFew(amb, 7000, 11000, () => {
    melody.forEach((f, i) => {
      amb.timers.push(
        setTimeout(() => {
          if (ctx) {
            const detuned = f * (1 + (Math.random() * 0.02 - 0.01));
            blip(ctx, amb, out, peak, { freq: detuned, dur: 0.4 });
          }
        }, i * 1200),
      );
    });
  });
};

/** The Attic — rain on the roof: steady high-passed noise with shimmer. */
const buildRain: VoiceBuilder = (c, amb) => {
  const t = now(c);
  const { out, peak } = voiceOut(c, amb, 0.4);
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  src.loop = true;
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1500;
  const g = c.createGain();
  g.gain.setValueAtTime(peak * 0.7, t);
  src.connect(hp);
  hp.connect(g);
  g.connect(out);
  safeStart(src, t);
  amb.nodes.push(src, hp, g);
  // Gentle amplitude shimmer.
  const drift = () => {
    if (amb.stopped || !ctx) return;
    try {
      g.gain.linearRampToValueAtTime(peak * (0.5 + Math.random() * 0.5), ctx.currentTime + 3);
    } catch {
      /* ignore */
    }
    amb.timers.push(setTimeout(drift, 3000));
  };
  amb.timers.push(setTimeout(drift, 3000));
};

/** The Cellar — water dripping: one resonant drip at random intervals. */
const buildDrip: VoiceBuilder = (c, amb) => {
  const { out, peak } = voiceOut(c, amb, 0.4);
  everyFew(amb, 3000, 7000, () => {
    if (!ctx) return;
    blip(ctx, amb, out, peak, { freq: 900, glideTo: 500, dur: 0.14 });
  });
};

/** The voice table: one builder per room slug. */
const VOICES: Record<string, VoiceBuilder> = {
  'gravemoor-gazette': buildDraught,
  'inkbone-books': buildPageTurn,
  grimsupper: buildCutlery,
  gloamline: buildFire,
  hollowpost: buildFastClock,
  shroudery: buildWaltz,
  lanternstay: buildMurmur,
  mothmilk: buildJarLid,
  mildew: buildPenScratch,
  wanderwick: buildMusicBox,
  rookery: buildRain,
  bramblegate: buildDrip,
};

/** The twelve slugs the voice table covers (for tests). */
export const VOICE_SLUGS: readonly string[] = Object.keys(VOICES);

// --------------------------------------------------------------------------
// Start / fade / stop the whole ambience.
// --------------------------------------------------------------------------

/**
 * Start the layered ambience, fading in over ~2 s. No-op when there is no
 * audio, sound is off, the ambience already runs, or sound is not yet armed
 * (no context — a gesture listener is armed instead). Builds the shared layers
 * (room tone, wind, clock, creak) and the current room's voice if it has one.
 */
export function startAmbience(): void {
  if (!hasAudio() || !soundOn || ambience) return;
  const c = ensureContext();
  if (!c || !master) return;

  const t = now(c);

  // The one ambience sub-gain every layer connects into, faded in/out as one.
  const gain = c.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(AMBIENCE_GAIN, t + 2); // ~2 s fade-in
  gain.connect(master);

  const amb: Ambience = {
    nodes: [gain],
    gain,
    timers: [],
    stopped: false,
  };
  ambience = amb;
  layerPeaks = [];

  // The shared layers.
  buildRoomTone(c, amb);
  buildWind(c, amb);
  buildClock(c, amb);
  buildCreak(c, amb);

  // The room's voice, if its slug has one. An unknown slug adds no voice.
  const voice = roomSlug ? VOICES[roomSlug] : undefined;
  if (voice) {
    try {
      voice(c, amb);
    } catch {
      /* a voice must never throw into the game */
    }
  }
}

/** Fade the ambience out over ~1.5 s, then stop and disconnect its nodes. */
export function fadeOutAmbience(): void {
  const amb = ambience;
  const c = ctx;
  if (!amb || amb.stopped) return;
  // Clear every timer at once so no new layer event starts.
  for (const timer of amb.timers) clearTimeout(timer);
  amb.timers = [];
  if (c && master) {
    const t = now(c);
    try {
      amb.gain.gain.cancelScheduledValues(t);
      amb.gain.gain.setValueAtTime(amb.gain.gain.value, t);
      amb.gain.gain.linearRampToValueAtTime(0, t + 1.5);
    } catch {
      /* ignore */
    }
    amb.stopped = true;
    const toStop = amb.nodes;
    ambience = null;
    setTimeout(() => {
      for (const node of toStop) {
        if ('stop' in node) safeStop(node as AudioScheduledSourceNode);
        safeDisconnect(node);
      }
    }, 1600);
  } else {
    stopAmbience();
  }
}

/**
 * Stop the ambience at once: stop and disconnect every node and clear every
 * timer. Idempotent.
 */
export function stopAmbience(): void {
  const amb = ambience;
  if (!amb) return;
  amb.stopped = true;
  for (const timer of amb.timers) clearTimeout(timer);
  amb.timers = [];
  for (const node of amb.nodes) {
    if ('stop' in node) safeStop(node as AudioScheduledSourceNode);
    safeDisconnect(node);
  }
  ambience = null;
}

// --------------------------------------------------------------------------
// Start/stop helpers that tolerate the fake context and odd browsers.
// --------------------------------------------------------------------------

function safeStart(node: AudioScheduledSourceNode, when: number): void {
  try {
    node.start(when);
  } catch {
    try {
      node.start();
    } catch {
      /* ignore */
    }
  }
}

function safeStop2(node: AudioScheduledSourceNode, when: number): void {
  try {
    node.stop(when);
  } catch {
    /* ignore */
  }
}

// --------------------------------------------------------------------------
// The cues. Each is short (0.2–1.2 s), starts and ends at 0 amplitude, and is
// a no-op when sound is off or there is no audio.
// --------------------------------------------------------------------------

/** Run `body` inside a live context when sound is on; otherwise no-op. */
function withSound(body: (c: AudioContext, master: GainNode) => void): void {
  if (!hasAudio() || !soundOn) return;
  const c = ensureContext();
  if (!c || !master) return;
  try {
    body(c, master);
  } catch {
    // A cue must never throw into the game.
  }
}

/** A soft low "whoomph": a noise burst through a falling low-pass sweep. */
export function lantern(): void {
  withSound((c, out) => {
    const t = now(c);
    const dur = 0.55;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c);

    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1200, t);
    lp.frequency.exponentialRampToValueAtTime(120, t + dur);

    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(CUE_GAIN, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(lp);
    lp.connect(g);
    g.connect(out);
    safeStart(src, t);
    safeStop2(src, t + dur + 0.02);
  });
}

/** A cold breath: band-passed noise swelling in and out. */
export function cold(): void {
  withSound((c, out) => {
    const t = now(c);
    const dur = 0.8;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c);

    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 600;
    bp.Q.value = 1.5;

    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(CUE_GAIN, t + dur / 2);
    g.gain.linearRampToValueAtTime(0, t + dur);

    src.connect(bp);
    bp.connect(g);
    g.connect(out);
    safeStart(src, t);
    safeStop2(src, t + dur + 0.02);
  });
}

/**
 * The wrong-card moment: a short whispered "shh" (band-passed noise ~3 kHz,
 * fast attack, short tail) plus a candle gutter — a short airy dip of
 * low-passed noise that swells and recedes under the shh. Both begin and end
 * at 0 and share the cue level, so the pair peaks at the cue target.
 */
export function whisper(): void {
  withSound((c, out) => {
    const t = now(c);
    const dur = 0.3;

    // The shh.
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3000;
    bp.Q.value = 3;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(CUE_GAIN * 0.7, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(out);
    safeStart(src, t);
    safeStop2(src, t + dur + 0.02);

    // The candle gutter: a short low airy dip, swell then recede.
    const gutterDur = 0.25;
    const gsrc = c.createBufferSource();
    gsrc.buffer = noiseBuffer(c);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 300;
    const gg = c.createGain();
    gg.gain.setValueAtTime(0, t);
    gg.gain.linearRampToValueAtTime(CUE_GAIN * 0.3, t + gutterDur * 0.4);
    gg.gain.linearRampToValueAtTime(0, t + gutterDur);
    gsrc.connect(lp);
    lp.connect(gg);
    gg.connect(out);
    safeStart(gsrc, t);
    safeStop2(gsrc, t + gutterDur + 0.02);
  });
}

/**
 * The right-card moment: the ghost's unwinding sigh — a sine that slurs down
 * then turns upward — rising into the airy glide to ~880 Hz, under a soft
 * noise breath. The whole thing keeps the flee's existing ~0.6 s length.
 */
export function flee(): void {
  withSound((c, out) => {
    const t = now(c);
    const dur = 0.6;

    const osc = c.createOscillator();
    osc.type = 'sine';
    // The unwinding sigh: dip from 300→180 Hz in the first beat, then rise.
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.linearRampToValueAtTime(180, t + 0.12);
    osc.frequency.exponentialRampToValueAtTime(880, t + dur);

    const oscGain = c.createGain();
    oscGain.gain.setValueAtTime(0, t);
    oscGain.gain.linearRampToValueAtTime(CUE_GAIN, t + 0.08);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    // Light tremolo on the oscillator gain.
    const lfo = c.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 6;
    const lfoGain = c.createGain();
    lfoGain.gain.value = CUE_GAIN * 0.15;
    lfo.connect(lfoGain);
    lfoGain.connect(oscGain.gain);

    osc.connect(oscGain);
    oscGain.connect(out);

    // A soft noise breath under the glide.
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1500;
    bp.Q.value = 0.8;
    const noiseGain = c.createGain();
    noiseGain.gain.setValueAtTime(0, t);
    noiseGain.gain.linearRampToValueAtTime(CUE_GAIN * 0.3, t + 0.1);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp);
    bp.connect(noiseGain);
    noiseGain.connect(out);

    safeStart(osc, t);
    safeStart(lfo, t);
    safeStart(src, t);
    safeStop2(osc, t + dur + 0.02);
    safeStop2(lfo, t + dur + 0.02);
    safeStop2(src, t + dur + 0.02);
  });
}

/**
 * The honest page: a warm, resolved chord — three sine partials of a major
 * triad (C5, E5, G5) with about a 0.6 s decay. The partials are scaled so the
 * chord's peak meets, not exceeds, the cue target.
 */
export function honest(): void {
  withSound((c, out) => {
    const t = now(c);
    const dur = 0.6;
    const partials = [523.25, 659.25, 783.99]; // C5, E5, G5 — a major triad
    const perPartial = CUE_GAIN / partials.length;
    for (const freq of partials) {
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = c.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(perPartial, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      g.connect(out);
      safeStart(osc, t);
      safeStop2(osc, t + dur + 0.02);
    }
  });
}

/** A gentle three-note descending chime, once: the ending. */
export function quiet(): void {
  withSound((c, out) => {
    const t = now(c);
    const notes = [659.25, 587.33, 493.88]; // E5, D5, B4 descending
    const step = 0.28;
    const dur = 0.5;
    notes.forEach((freq, i) => {
      const start = t + i * step;
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = c.createGain();
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(CUE_GAIN * 0.6, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(g);
      g.connect(out);
      safeStart(osc, start);
      safeStop2(osc, start + dur + 0.02);
    });
  });
}

// --------------------------------------------------------------------------
// Test seam.
// --------------------------------------------------------------------------

/** Test-only: the peak gain recorded for each ambience layer on last start. */
export function __ambienceLayerPeaks(): number[] {
  return [...layerPeaks];
}

/** Test-only: the live context's state, or null when there is no context. */
export function __contextState(): string | null {
  return ctx ? ctx.state : null;
}

/** Test-only: whether a context currently exists. */
export function __hasContext(): boolean {
  return ctx !== null;
}

/** Test-only: run the visibility handler (as a visibilitychange would). */
export function __runVisibility(): void {
  onVisibility();
}

/** Test-only: drop the context, master, ambience, pending gesture and listeners. */
export function __resetForTests(): void {
  stopAmbience();
  pendingGestureCleanup?.();
  if (visibilityArmed && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onVisibility);
  }
  visibilityArmed = false;
  armed = false;
  if (master) safeDisconnect(master);
  if (ctx) {
    try {
      void ctx.close?.();
    } catch {
      /* ignore */
    }
  }
  ctx = null;
  master = null;
  ambience = null;
  roomTag = null;
  roomSlug = null;
  layerPeaks = [];
  listeners.clear();
  soundOn = readStored();
}
