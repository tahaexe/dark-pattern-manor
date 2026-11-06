# Design Document

## Overview

Sound adds a quiet haunted ambience and six short cues to Dark Pattern Manor, all synthesized with the Web Audio API — no files, no downloads, nothing to license. A Sound toggle sits top-right inside the manor frame on every page.

The whole subsystem lives in `src/audio/sound.ts` (plus `src/audio/sound.test.tsx`) with one small Preact component, the toggle, in the same folder. It is built around three ideas:

1. **One lazy engine.** A single module-level engine owns one `AudioContext`, one master `GainNode`, and the running ambience. The context is created lazily, only inside a user gesture, never at import or page load, so the browser's autoplay policy never blocks it and nothing plays before the player acts. If no `AudioContext` constructor exists (jsdom has none), every exported function is a silent no-op that throws nothing.
2. **View-driven cues.** Every cue is a named exported function (`lantern`, `cold`, `whisper`, `flee`, `honest`, `quiet`). They are called from Preact effects in `Room.tsx` and `EndingPage.tsx` that watch the state machine's tag and the wrong-pick count. `machine.ts` is never touched; it stays pure and its tests stay unchanged.
3. **A remembered toggle.** A tiny observable holds the on/off state, mirrored to `localStorage` under `dpm-sound`. The toggle component reads and flips it; the engine reads it before making any sound. Turning sound off stops everything at once; turning it on resumes the ambience if a room is still haunted.

Nothing in `machine.ts`, `progress.ts`, or the reducer tests changes. The initial bundle grows by well under 3 KB gzipped, so `npm run check:size` still passes.

## Architecture

### Module layout

```
src/audio/
  sound.ts          # the engine, the toggle store, the six cues, ambience
  SoundToggle.tsx   # the on-every-page toggle button
  sound.test.tsx    # vitest + a fake AudioContext
```

`sound.ts` imports nothing from the engine and nothing from Preact, so it is a plain, testable module. `SoundToggle.tsx` is the only Preact piece and imports from `sound.ts`.

### The engine (a module singleton)

```ts
// The one AudioContext and master gain, created lazily inside a gesture.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

// The running ambience, if any.
interface Ambience {
  nodes: AudioNode[];      // every node to stop + disconnect
  gain: GainNode;          // the ambience sub-gain, faded in/out
  timers: number[];        // every scheduled crackle timer
  stopped: boolean;
}
let ambience: Ambience | null = null;
```

**`hasAudio()`** returns whether a constructor exists:

```ts
function AudioCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  return window.AudioContext ?? (window as any).webkitAudioContext ?? null;
}
```

When `AudioCtor()` is null every public function returns early — a no-op (Requirement 1.4, 9.6).

**`ensureContext()`** is the single place a context is born. It is only ever reached from a public function called during a gesture, and only when sound is on:

```ts
function ensureContext(): AudioContext | null {
  const Ctor = AudioCtor();
  if (!Ctor) return null;
  if (!ctx) {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 1;           // per-sound gains set the real levels
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();  // Requirement 1.5
  return ctx;
}
```

Because `ensureContext()` is never called at import and every caller is a gesture handler (the toggle click, the lantern click, a card click, the task click) or an effect that runs after such a gesture, no context exists at import or before a gesture (Requirement 1.1, 1.2). With sound off, the cue and ambience functions return before calling `ensureContext()`, so none is created (Requirement 1.3).

### Levels (Requirement 2)

One master gain at 1.0; each source sets its own gain so the sum stays below full scale.

- Ambience sub-gain target ≈ `10 ** (-20/20)` ≈ `0.1` (−20 dBFS).
- Cue peak gain ≈ `10 ** (-12/20)` ≈ `0.25` (−12 dBFS).

A single cue at 0.25 plus the ambience at 0.1 sums to 0.35 — comfortably below 1.0, so nothing clips (Requirement 2.4). Short noise bursts are shaped by an envelope that starts and ends at 0, so there are no clicks.

Helpers exported for the test and reused internally:

```ts
export const DB = (db: number) => 10 ** (db / 20);
export const AMBIENCE_DB = -20;
export const CUE_DB = -12;
```

### Noise

A reusable white-noise buffer (a couple of seconds, looped) feeds the ambience and the noise-based cues:

```ts
function noiseBuffer(c: AudioContext): AudioBuffer {
  const len = Math.floor(c.sampleRate * 2);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}
```

A "brown-ish" low tone is white noise through a low-pass filter; that is enough for the room tone and keeps the code tiny.

### The ambience (Requirement 3)

`startAmbience()` — called when a room is haunted and sound is on:

1. No-op if no context, sound off, or an ambience already runs.
2. Create a looping `AudioBufferSourceNode` over the noise buffer → a `BiquadFilterNode` (`lowpass`, frequency ≈ 300 Hz) → an ambience `GainNode` → master.
3. Slowly drift the filter frequency: a timer (or a slow `LFO` via an `OscillatorNode` on `filter.frequency`) nudges it within ≈ 220–380 Hz so the tone is not static ("slow random drift").
4. Fade the ambience gain from 0 to `DB(-20)` over ≈ 2 s with `linearRampToValueAtTime` (Requirement 3.2).
5. Schedule the first crackle at a random 2–6 s; each crackle re-schedules the next (Requirement 3.1). A crackle is a few very short filtered noise clicks (tiny envelopes, ≈ 8–25 ms each) through a high-ish band-pass, kept quiet.
6. Record every node and timer on the `ambience` object.

`fadeOutAmbience()` — called when the room turns honest: ramp the ambience gain to 0 over ≈ 1.5 s (Requirement 3.3), then stop and disconnect after the ramp; clear the crackle timers immediately so no new crackle starts.

`stopAmbience()` — called on unmount / leaving the room: stop and disconnect every node at once and clear every timer (Requirement 3.4). Both fade-out and stop guard against double-stop with the `stopped` flag.

In jsdom there is no context, so all of these are no-ops and the tests exercise them through the fake context instead.

### The cues (Requirement 4)

Each cue is short (0.2–1.2 s), begins and ends at amplitude 0, and plays through a fresh gain into master. All return early when sound is off or no context. Sketch of each:

- **`lantern()`** — noise source → `lowpass` whose frequency sweeps from ≈ 1200 Hz down to ≈ 120 Hz over ≈ 0.5 s, under a quick attack / slow release gain: a soft low "whoomph".
- **`cold()`** — noise → `bandpass` (≈ 600 Hz, moderate Q) with a gain that swells up then down over ≈ 0.8 s: a cold breath in and out.
- **`whisper()`** — noise → `bandpass` (≈ 3 kHz, higher Q) with a fast attack and a short tail, ≈ 0.3 s: a whispered "shh".
- **`flee()`** — a sine gliding ≈ 220 → 880 Hz over ≈ 0.6 s with a light tremolo (a slow LFO on a gain), under a soft noise breath: an airy rising glide.
- **`honest()`** — two sines a fifth apart (e.g. 523.25 Hz and 783.99 Hz) with a ≈ 0.6 s exponential decay: a warm soft chime.
- **`quiet()`** — three descending sine notes played once in sequence (e.g. 659 → 587 → 494 Hz), each a short soft chime: the ending.

Every cue schedules its own `stop()` and relies on the envelope reaching 0, so nothing lingers or clicks.

For the test to see which cue played, each cue calls a tiny internal `playing(name)` the test can observe — in practice the test counts how many source/oscillator nodes the fake context created per cue and asserts each named function created at least one. The functions are named exports, so the test calls them directly too.

### The toggle store

```ts
type Listener = () => void;
let soundOn = readStored();          // default true
const listeners = new Set<Listener>();

export function isSoundOn(): boolean;
export function setSoundOn(on: boolean): void;  // persists + starts/stops + notifies
export function subscribe(fn: Listener): () => void;
```

- `readStored()` reads `localStorage['dpm-sound']`; `"off"` → false, anything else (including a throw or a missing key) → true, the default (Requirement 6.5, 6.9).
- `setSoundOn(false)` stops everything at once — `stopAmbience()` and no further cues (Requirement 6.6).
- `setSoundOn(true)` persists and, if a room is currently haunted, resumes the ambience (Requirement 6.7). The engine tracks the last room tag set by `Room.tsx` through `setRoomTag(tag)` so it knows whether to resume.
- Writes to `localStorage` are wrapped in try/catch so a throwing storage never throws (Requirement 6.9).

`setRoomTag(tag: RoomStateTag | null)` is the one hook the room gives the engine: it records whether a room is haunted (tag in `haunted|inspecting|picking`) so that `setSoundOn(true)` can decide to resume, and so leaving a room (`setRoomTag(null)`) stops the ambience.

### The toggle component (`SoundToggle.tsx`)

A real `<button>`:

```tsx
<button
  type="button"
  class="sound-toggle"
  aria-pressed={on}
  onClick={toggle}
>
  <SpeakerIcon on={on} />
  <span class="sound-toggle-label">Sound</span>
</button>
```

- Subscribes to the store so `aria-pressed` tracks the state (Requirement 6.2).
- The click is a user gesture: flipping to on and then, from an effect, starting the ambience if a room is haunted, satisfies the gesture gate (Requirement 1.2).
- Inline-SVG speaker icon, two glyphs (on with waves, off with a slash), `aria-hidden` because the visible word "Sound" names the button (Requirement 6.1).
- 44 × 44 px minimum target, positioned `absolute` top-right inside the manor frame, high enough z-index to stay clickable but placed so it never overlaps the task bar, possessed element, ghost, or spell cards at 1920×1080 or 412 px (Requirement 6.3, 6.4). CSS lives in `manor.css` using tokens only.

### Where the toggle is mounted

The toggle must show on the title page, every room, and the ending (Requirement 6.1). It is mounted once in `App.tsx`, fixed to the top-right of the app shell, so it rides along on every route without each page repeating it. (It still reads as "inside the manor frame" visually; the app shell is the manor.) This keeps a single tab-order position and one instance. `App.tsx` already owns the route, so the toggle is added beside the routed content.

### Where the cues fire

**`Room.tsx`** gains effects (no reducer change):

- On `state.tag` changing to `haunted` the room first mounts: call `setRoomTag(tag)` on every tag change; when the tag is in `haunted|inspecting|picking` ensure the ambience is running; when it becomes `honest` fade it out.
- `lantern`: when the tag goes `haunted → inspecting`.
- `cold`: when the tag goes `inspecting → picking` (the possessed element was selected).
- `whisper`: watch `state.whisperNonce`; when it increases, play `whisper` once (Requirement 5.3) — this is the same nonce the live region uses, so the whisper sound and the whispered hint fire together (Requirement 4.4).
- `flee`: when the tag becomes `named` (the correct card was chosen).
- `honest`: when the tag becomes `done` (the task was completed on the honest page).
- On unmount: `setRoomTag(null)` and `stopAmbience()` so leaving the room stops the ambience and clears its timers (Requirement 3.4).

Because the effects read `state.tag` and `state.whisperNonce` — values the pure reducer already produces — `machine.ts` is untouched (Requirement 5.2).

**`EndingPage.tsx`** gains one effect: on mount, if `doneCount() >= 12`, play `quiet()` once (Requirement 4.7). The gate page (fewer than 12) plays nothing.

### Diagram

```
 user gesture ─▶ SoundToggle.onClick ─▶ setSoundOn(true) ─▶ ensureContext()
                                                   │
 Room.tsx effects ─▶ lantern/cold/whisper/flee/honest ─┤
 Room.tsx effects ─▶ start/fadeOut/stop Ambience ──────┤
 EndingPage effect ─▶ quiet ───────────────────────────┤
                                                   ▼
                        each sound ─▶ its gain ─▶ master gain ─▶ destination
```

## Components and Interfaces

### `src/audio/sound.ts` — public API

```ts
// state
export function isSoundOn(): boolean;
export function setSoundOn(on: boolean): void;
export function subscribe(fn: () => void): () => void;

// the room tells the engine what state it is in
export function setRoomTag(tag: string | null): void;

// cues (named so tests can see which played)
export function lantern(): void;
export function cold(): void;
export function whisper(): void;
export function flee(): void;
export function honest(): void;
export function quiet(): void;

// ambience (driven by Room.tsx)
export function startAmbience(): void;
export function fadeOutAmbience(): void;
export function stopAmbience(): void;

// test seams
export function hasAudio(): boolean;
export function __resetForTests(): void;   // drops ctx/master/ambience + listeners
export const AMBIENCE_DB: number;
export const CUE_DB: number;
```

Every public function first checks `hasAudio()` and (for sound-making ones) `isSoundOn()`, returning a no-op otherwise.

### `src/audio/SoundToggle.tsx`

A single default-exported Preact component taking no props. It reads `isSoundOn()`, subscribes for updates, renders the button with `aria-pressed`, and on click calls `setSoundOn(!on)`.

## Data Models

The only persisted datum is `localStorage['dpm-sound']` ∈ `{"on", "off"}`. Absent or unreadable → default `"on"` in effect (sound on, silent until a gesture). No other storage, no cookies, no network (Requirement 8.2).

## Error Handling

- **No `AudioContext`** (jsdom, very old browsers): `hasAudio()` is false, every function is a no-op, nothing throws (Requirement 1.4, 9.6).
- **Suspended context**: resumed inside the gesture (Requirement 1.5); if resume rejects, it is ignored (sound simply stays silent).
- **Throwing `localStorage`**: both read and write are wrapped; read falls back to the default, write is swallowed (Requirement 6.9).
- **Double stop / leave**: `stopAmbience()` and `fadeOutAmbience()` are idempotent via the `stopped` flag and null checks.
- **Off mid-sound**: `setSoundOn(false)` stops the ambience at once; already-scheduled cue tails are short (≤ 1.2 s) and quiet, and new cues return early.

Sound never affects game state: no cue or ambience path writes progress, changes the reducer, or blocks a control. The game is fully playable in silence.

## Testing Strategy

`src/audio/sound.test.tsx`, run under `npm test`.

### Fake AudioContext

A small class records what was built: a `created` counter per class, arrays of created oscillators/sources/gains/filters, and stubs for `createGain`, `createOscillator`, `createBufferSource`, `createBiquadFilter`, `createBuffer`, `currentState`/`resume`, `destination`, and `currentTime`. Each node stub records `connect`, `start`, `stop`, and `AudioParam` calls (`setValueAtTime`, `linearRampToValueAtTime`, `exponentialRampToValueAtTime`). The test installs it as `window.AudioContext` and removes it to simulate "no AudioContext".

### Cases (Requirement 9)

1. **Lazy, gesture-gated**: after importing the module, no context exists; after a first cue with sound on, exactly one `AudioContext` was constructed; a second cue reuses it (still one); with sound off, calling cues constructs none.
2. **The toggle**: `setSoundOn`/`isSoundOn` round-trip; `aria-pressed` reflects state in the rendered `SoundToggle`; the stored value is written (`"on"`/`"off"`); the default is on when the key is absent; a `localStorage` whose `getItem`/`setItem` throw does not throw and yields the default.
3. **Room cues fire once**: render `Room` (the Foyer) with sound on and the fake context installed; raise the lantern → `lantern` played; select the possessed element → `cold`; a wrong card → one `whisper` and the hint text present together; the right card → `flee`; complete the task → `honest`. With sound off, the same sequence builds no sound nodes.
4. **Leaving a room**: with fake timers, render `Room` haunted (ambience scheduled), then unmount; assert the ambience nodes were stopped/disconnected and no crackle timer remains pending (advancing timers plays nothing).
5. **No AudioContext**: remove the constructor; every exported function and a full `Room` loop run without throwing.
6. **axe-core**: the title page with the toggle and room 1 with the toggle report zero violations.

### What stays unchanged

`machine.ts` and its tests (`machine.test.ts`, `machine.property.test.ts`) are not edited. `check-rooms.mjs` and the bundle-size gate are not edited; the new code is small and dynamic only where rooms already are (the engine ships in the initial bundle as shared code, well under 3 KB gzipped).
