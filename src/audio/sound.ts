/**
 * Sound for Dark Pattern Manor.
 *
 * A quiet haunted ambience and six short cues, all synthesized with the Web
 * Audio API — no audio files, no downloads, nothing to license. Everything is
 * atmosphere layered on a game that is fully playable in silence.
 *
 * Rules this module keeps:
 *  - One AudioContext, created lazily and only inside a user gesture, never at
 *    import or page load, so the browser never blocks it and nothing plays
 *    before the player has acted.
 *  - If no AudioContext constructor exists (jsdom has none), every function is
 *    a silent no-op that throws nothing.
 *  - Everything passes through one master gain, held quiet: the ambience about
 *    -20 dBFS, the cues about -12 dBFS, so the sum never clips.
 *  - The on/off choice is remembered in localStorage under "dpm-sound"; a
 *    throwing localStorage falls back to the default (on) and never throws.
 *  - No cookies, no third-party network request: the only persisted state is
 *    the one localStorage key.
 */

/** dBFS → linear gain. */
export const DB = (db: number): number => 10 ** (db / 20);

/** The two level targets, in dB below full scale. */
export const AMBIENCE_DB = -20;
export const CUE_DB = -12;

const AMBIENCE_GAIN = DB(AMBIENCE_DB); // ≈ 0.1
const CUE_GAIN = DB(CUE_DB); // ≈ 0.25

const STORAGE_KEY = 'dpm-sound';

/** Tags in which the ambience plays. */
const HAUNTED_TAGS = new Set(['haunted', 'inspecting', 'picking']);

// --------------------------------------------------------------------------
// The one AudioContext and master gain, born lazily inside a gesture.
// --------------------------------------------------------------------------

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

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
 * The single place an AudioContext is born. Only ever reached from a public
 * sound function, each of which runs inside (or just after) a user gesture,
 * and only when sound is on — so no context exists at import or before a
 * gesture, and none is created while sound is off.
 */
function ensureContext(): AudioContext | null {
  const Ctor = AudioCtor();
  if (!Ctor) return null;
  if (!ctx) {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 1; // per-sound gains set the real levels
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') {
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
 * Turn sound on or off. Off stops everything at once, including the ambience.
 * On resumes the ambience if a room is currently haunted. The choice is
 * persisted; a throwing localStorage never throws.
 */
export function setSoundOn(on: boolean): void {
  if (on === soundOn) {
    writeStored(on);
    return;
  }
  soundOn = on;
  writeStored(on);
  if (!on) {
    stopAmbience();
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
// The ambience: a low room tone plus the odd candle crackle.
// --------------------------------------------------------------------------

interface Ambience {
  nodes: AudioNode[];
  gain: GainNode;
  timers: ReturnType<typeof setTimeout>[];
  stopped: boolean;
}

let ambience: Ambience | null = null;

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

/**
 * Start the room tone and schedule crackles, fading in over ~2 s. No-op when
 * there is no audio, sound is off, or the ambience already runs.
 */
export function startAmbience(): void {
  if (!hasAudio() || !soundOn || ambience) return;
  const c = ensureContext();
  if (!c || !master) return;

  const t = now(c);

  const source = c.createBufferSource();
  source.buffer = noiseBuffer(c);
  source.loop = true;

  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 300;

  const gain = c.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(AMBIENCE_GAIN, t + 2); // ~2 s fade-in

  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  safeStart(source, t);

  const amb: Ambience = {
    nodes: [source, filter, gain],
    gain,
    timers: [],
    stopped: false,
  };
  ambience = amb;

  // Slow random drift of the low-pass frequency so the tone is never static.
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

  // Candle crackles at random intervals of 2–6 s, each re-scheduling the next.
  const scheduleCrackle = () => {
    if (amb.stopped) return;
    const delay = 2000 + Math.random() * 4000; // 2–6 s
    amb.timers.push(setTimeout(fire, delay));
  };
  const fire = () => {
    if (amb.stopped) return;
    crackle();
    scheduleCrackle();
  };
  scheduleCrackle();
}

/** A few very short filtered noise clicks: the candle crackle. */
function crackle(): void {
  const c = ctx;
  if (!c || !master || !ambience) return;
  const t = now(c);
  const clicks = 2 + Math.floor(Math.random() * 3); // 2–4 clicks
  for (let i = 0; i < clicks; i++) {
    const start = t + i * (0.02 + Math.random() * 0.04);
    const dur = 0.008 + Math.random() * 0.017; // 8–25 ms

    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c);

    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800 + Math.random() * 1200;
    bp.Q.value = 2;

    const g = c.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(AMBIENCE_GAIN * 0.8, start + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    src.connect(bp);
    bp.connect(g);
    g.connect(master);
    safeStart(src, start);
    safeStop2(src, start + dur + 0.02);
  }
}

/** Fade the ambience out over ~1.5 s, then stop and disconnect its nodes. */
export function fadeOutAmbience(): void {
  const amb = ambience;
  const c = ctx;
  if (!amb || amb.stopped) return;
  // Clear the crackle/drift timers at once so no new crackle starts.
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

/** A short whispered "shh": band-passed noise ~3 kHz, fast attack, short tail. */
export function whisper(): void {
  withSound((c, out) => {
    const t = now(c);
    const dur = 0.3;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c);

    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3000;
    bp.Q.value = 3;

    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(CUE_GAIN, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(bp);
    bp.connect(g);
    g.connect(out);
    safeStart(src, t);
    safeStop2(src, t + dur + 0.02);
  });
}

/** An airy rising glide: a sine 220→880 Hz with a light tremolo, under noise. */
export function flee(): void {
  withSound((c, out) => {
    const t = now(c);
    const dur = 0.6;

    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
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

/** A warm soft chime: two sine partials a fifth apart, ~0.6 s decay. */
export function honest(): void {
  withSound((c, out) => {
    const t = now(c);
    const dur = 0.6;
    const partials = [523.25, 783.99]; // a fifth apart (C5, G5)
    for (const freq of partials) {
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = c.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(CUE_GAIN * 0.6, t + 0.02);
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

/** Test-only: drop the context, master, ambience and listeners. */
export function __resetForTests(): void {
  stopAmbience();
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
  listeners.clear();
  soundOn = readStored();
}
