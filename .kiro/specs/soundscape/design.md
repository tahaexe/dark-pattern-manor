# Design Document

## Overview

Soundscape deepens the existing Sound subsystem without changing anything the player triggers. It stays inside `src/audio/sound.ts` (plus `src/audio/sound.test.tsx`) and keeps the whole module built around the same three ideas it already has — one lazy engine, view-driven cues, and a remembered toggle. The invariants the `sound` spec states live at the top of the module and are unchanged: one `AudioContext` born only inside a user gesture, a silent no-op without Web Audio, one master gain, ambience ≈ -20 dBFS and cues ≈ -12 dBFS, the one `localStorage` key, no files, no network, fully playable in silence, and sound off stops everything.

Three things change:

1. **The ambience becomes layered.** Where `startAmbience()` built one room-tone source plus a crackle scheduler, it now builds a small set of quiet layers under one ambience gain: the room tone (unchanged in character), wind through the hall, a distant clock tick, the house settling (an occasional creak), and one room voice chosen by slug.
2. **A voice table.** A `const VOICES: Record<string, (ctx, out, amb) => void>` maps each of the twelve slugs to a builder that adds its one quiet layer. `startAmbience()` reads the current room slug (set by the view through `setRoomSlug`) and runs its voice if present.
3. **Fuller moment cues.** `whisper()`, `flee()` and `honest()` grow a little more body, firing on the same triggers at the same levels.

Nothing in `machine.ts`, `progress.ts`, the reducer tests, `check-rooms.mjs`, or the bundle gate changes. The added code is a few hundred bytes of synthesis; `npm run check:size` stays well under its 100 KB limit.

## Architecture

### Where the layers live

All layers hang off the single `ambience` object the module already keeps:

```ts
interface Ambience {
  nodes: AudioNode[];      // every node to stop + disconnect
  gain: GainNode;          // the one ambience sub-gain, faded in/out
  timers: ReturnType<typeof setTimeout>[]; // every scheduled timer
  stopped: boolean;
}
```

Every layer connects into `amb.gain` (never straight to master), so the whole ambience fades and stops as one, and so the whole bed is governed by the single ambience fade to/from `DB(AMBIENCE_DB)`. Each layer's own sub-gain is held strictly below `DB(AMBIENCE_DB)` so that:

- no single layer is as loud as the whole-ambience target (Requirement 5.2), and
- the layers summed still sit around the ambience target, well under full scale with a cue on top (Requirement 1.4).

A small helper keeps that honest and testable:

```ts
/** A layer's peak, always below the ambience target. `scale` in (0,1). */
function layerPeak(scale: number): number {
  return AMBIENCE_GAIN * scale; // AMBIENCE_GAIN = DB(AMBIENCE_DB)
}
```

Chosen scales (all < 1, so every layer peak < `AMBIENCE_GAIN`):

| layer           | scale | why                                             |
| --------------- | ----- | ----------------------------------------------- |
| room tone       | 0.9   | the bed, loudest layer but still below the whole |
| wind            | 0.5   | a soft drifting band of noise                    |
| clock tick      | 0.25  | far back in the mix                              |
| creak           | 0.6   | brief, occasional                                |
| voice (default) | 0.4   | sits below the room tone                         |

The ambience sub-gain still ramps 0 → `AMBIENCE_GAIN` over ~2 s on start and `AMBIENCE_GAIN` → 0 over ~1.5 s on fade-out; the layer scales are applied on each layer's own gain, which is set once and left (slowly modulated for wind/voice), so the overall bed never exceeds the ambience target envelope.

### The layers

Each builder takes `(c: AudioContext, amb: Ambience)` and attaches its nodes to `amb.nodes` and any timers to `amb.timers`, connecting into `amb.gain`.

- **Room tone** — `buildRoomTone`: the existing looping noise → `lowpass ≈ 300 Hz` → layer gain (scale 0.9), with the existing slow random drift of the filter frequency within ~220–380 Hz over 3 s steps. Unchanged in character; just moved into a builder and connected through `amb.gain`.
- **Wind** — `buildWind`: looping noise → `bandpass` whose centre frequency drifts slowly (e.g. 300–700 Hz) and whose layer gain drifts slowly between ~0.3× and 1× of its scale (0.5), each on a timer of a few seconds. "Band and level drift slowly."
- **Clock** — `buildClock`: a scheduler that fires one soft muffled tick about once a second (randomised ~0.9–1.1 s so it never locks to a beat). A tick is a very short pulse: a low sine (~180 Hz) or a short low-passed noise click through a tiny envelope, at scale 0.25 — far back. The Conservatory voice reuses this builder with a louder, slightly faster tick (see voices).
- **Creak** — `buildCreak`: the house settling. A scheduler picks a delay in `[8000, 20000] ms` (Requirement 2.5 / 5.4), then plays one low wooden creak: a low sine or sawtooth (~70–110 Hz) with a slow pitch wobble and a gentle swell-and-fade envelope over ~0.8–1.4 s, scale 0.6. Each creak re-schedules the next. The delay function is factored out so a property test can check its range:

  ```ts
  /** A creak delay in ms, always within [8000, 20000]. */
  export function creakDelayMs(rand: () => number = Math.random): number {
    return 8000 + Math.floor(rand() * 12001); // 8000..20000 inclusive
  }
  ```

The existing candle crackle is folded into the Parlour voice (a fire crackling low) rather than played in every room, so the shared bed is tone + wind + clock + creak, and the per-room character comes from the voice.

### The voice table

```ts
type VoiceBuilder = (c: AudioContext, amb: Ambience) => void;

const VOICES: Record<string, VoiceBuilder> = {
  'gravemoor-gazette': buildDraught,   // The Foyer — a draught under the door
  'inkbone-books':     buildPageTurn,  // The Library — a page turning now and then
  'grimsupper':        buildCutlery,   // The Dining Room — a faint clink of cutlery
  'gloamline':         buildFire,      // The Parlour — a fire crackling low
  'hollowpost':        buildFastClock, // The Conservatory — the tick louder, a little fast
  'shroudery':         buildWaltz,     // The Ballroom — a far-off detuned waltz phrase
  'lanternstay':       buildMurmur,    // The Portrait Gallery — murmuring, never words
  'mothmilk':          buildJarLid,    // The Pantry — a jar lid rattling
  'mildew':            buildPenScratch,// The Study — a pen scratching
  'wanderwick':        buildMusicBox,  // The Nursery — a slow out-of-tune music box
  'rookery':           buildRain,      // The Attic — rain on the roof
  'bramblegate':       buildDrip,      // The Cellar — water dripping
};
```

Each builder is small and synthesized, every peak below the ambience target (voice scale ≤ 0.4 unless noted). Sketches:

- **Draught** (`buildDraught`) — low-passed noise (~400 Hz) with a slow gain drift: a thin whistle of air under a door.
- **Page turn** (`buildPageTurn`) — a scheduler every ~6–14 s: a short high-passed noise swish (~0.25 s) with a quick envelope: a page turning now and then.
- **Cutlery** (`buildCutlery`) — a scheduler every ~5–12 s: one or two very short band-passed metallic pings (high sine + fast decay): a faint clink.
- **Fire** (`buildFire`) — reuses the existing crackle: frequent very short filtered noise clicks at a low level, scheduled 2–6 s apart: a fire crackling low.
- **Fast clock** (`buildFastClock`) — the clock tick builder at scale ~0.45 and ~0.8 s spacing: louder and a little too fast.
- **Waltz** (`buildWaltz`) — a slow 3/4 phrase of three detuned sine notes, far-off (low-passed, low gain), repeating every ~10–16 s: a detuned waltz phrase.
- **Murmur** (`buildMurmur`) — band-passed noise (~300–900 Hz) with slow amplitude and band drift, never forming words: murmuring.
- **Jar lid** (`buildJarLid`) — a scheduler every ~7–15 s: a short metallic rattle (a few quick band-passed pings decaying): a jar lid rattling.
- **Pen scratch** (`buildPenScratch`) — a scheduler every ~4–9 s: a short high-passed noise scrape with a grainy envelope: a pen scratching.
- **Music box** (`buildMusicBox`) — a slow simple melody of detuned high sines (slightly out of tune), one note every ~1–1.5 s, phrase repeating: a music box.
- **Rain** (`buildRain`) — steady high-passed noise with gentle amplitude shimmer, plus occasional heavier drops: rain on the roof.
- **Drip** (`buildDrip`) — a scheduler every ~3–7 s: one resonant drip (a quick sine blip through a sharp band-pass with a fast pitch drop): water dripping.

`startAmbience()` runs the shared layers, then:

```ts
const voice = roomSlug ? VOICES[roomSlug] : undefined;
if (voice) voice(c, amb);
```

so an unknown slug simply adds no voice and never throws (Requirement 3.6).

### How the room slug reaches the engine

`Room.tsx` already calls `setRoomTag(tag)` on every tag change and `setRoomTag(null)` on unmount. Soundscape adds a sibling, `setRoomSlug(slug)`, set once from `room.slug` in the same effect that starts the ambience, and cleared (`setRoomSlug(null)`) in the unmount cleanup next to `stopAmbience()`. The engine reads `roomSlug` when building the ambience. This keeps the reducer pure (Requirement 4.6): the slug comes from `room` data, not from the state machine.

### Fuller cues

The cues keep their names, triggers and levels. Only their synthesis grows:

- **`whisper()`** — the existing band-passed "shh" at ~3 kHz, plus a *candle gutter*: a short airy dip — a very short low-passed noise swell that dips and recovers over ~0.25 s, mixed under the shh, both within `CUE_GAIN`. The dip begins and ends at 0.
- **`flee()`** — the existing airy rising sine glide and noise breath, preceded/underlaid by the *ghost's unwinding sigh*: a soft descending-to-rising sine (a brief downward slur that turns upward) feeding the same rise, so the whole thing still lasts the flee's existing ~0.6 s.
- **`honest()`** — grows from two partials (a fifth) to a *warm, resolved chord*: three sine partials of a major triad (e.g. C5 / E5 / G5, 523.25 / 659.25 / 783.99 Hz) with the same ~0.6 s decay, summed below `CUE_GAIN` so the chord's peak still meets the cue target.

`cold()`, `lantern()` and `quiet()` are unchanged. The honest-page ambience fade is unchanged (`fadeOutAmbience()`).

### Levels and clipping (unchanged invariant)

`AMBIENCE_GAIN = DB(-20) ≈ 0.1`, `CUE_GAIN = DB(-12) ≈ 0.25`. Every ambience layer peaks at `AMBIENCE_GAIN * scale` with `scale < 1`, and they all share the one ambience sub-gain whose envelope tops out at `AMBIENCE_GAIN`; summing a handful of quiet, mostly non-overlapping layers under that single gain keeps the bed around -20 dBFS. A cue at ~0.25 plus the bed at ~0.1 sums to ~0.35 — well below 1.0 — so nothing clips. Each cue's internal partials are scaled so the cue's own peak meets, not exceeds, `CUE_GAIN`.

## Components and Interfaces

### `src/audio/sound.ts` — public API (additions only)

```ts
// NEW: the room tells the engine which room it is, so the voice can be chosen.
export function setRoomSlug(slug: string | null): void;

// NEW (exported for tests): the twelve voices and the creak delay.
export const VOICE_SLUGS: readonly string[];      // Object.keys(VOICES)
export function creakDelayMs(rand?: () => number): number;

// NEW (test seam): peak gains recorded per ambience layer so a test can
// assert each stays below the ambience target.
export function __ambienceLayerPeaks(): number[]; // present only for tests
```

Everything already exported (`isSoundOn`, `setSoundOn`, `subscribe`, `setRoomTag`, the six cues, `startAmbience`, `fadeOutAmbience`, `stopAmbience`, `hasAudio`, `__resetForTests`, `AMBIENCE_DB`, `CUE_DB`, `DB`) keeps its signature.

To let the layer-peak test read the peaks without a real audio device, `startAmbience()` records each layer's chosen peak gain into a module array as it builds (reset on each start); `__ambienceLayerPeaks()` returns a copy. This needs no real audio: the fake context in the test still drives the builders, and the recorded numbers are the same the code would set on the gain nodes.

### `src/engine/Room.tsx` — one line added

In the sound effect that already calls `setRoomTag(tag)`, also call `setRoomSlug(room.slug)` when starting the ambience; in the unmount cleanup, call `setRoomSlug(null)` beside `stopAmbience()`. No other change; the reducer and its tests are untouched.

## Data Models

No new persisted data. The only storage is still `localStorage['dpm-sound'] ∈ {"on","off"}`. `roomSlug` is module-level transient state, like `roomTag`.

## Error Handling

- **No `AudioContext`**: every builder is reached only through `startAmbience()`, which returns early when `hasAudio()` is false; the voice table is pure data and reading it throws nothing.
- **Unknown slug**: `VOICES[slug]` is `undefined`, so no voice layer is added; the other layers still play.
- **Off mid-ambience**: `setSoundOn(false)` → `stopAmbience()` stops and disconnects every layer node and clears every timer (tone drift, wind drift, clock, creak, voice schedulers).
- **Double stop / leave**: guarded by the `stopped` flag and null checks, as today.
- Sound never writes game state, never blocks a control; the game is fully playable in silence.

## Testing Strategy

`src/audio/sound.test.tsx`, run under `npm test`, extends the existing fake `AudioContext` (which already records created gains, sources, oscillators and filters, and every `AudioParam` call).

New cases (Requirement 5):

1. **Voice table coverage** — `VOICE_SLUGS` equals the twelve registry slugs as a set: every room slug is present and no extra key exists. The twelve are read from `registry`'s `roomSlugs()` so the test and the game can never drift.
2. **Layer peaks below the ambience target** — start the ambience for a known room with the fake context; read `__ambienceLayerPeaks()` and assert every value is `> 0` and `< DB(AMBIENCE_DB)` (strictly below the whole-ambience level).
3. **Sound off stops every layer** — start the ambience (so every shared layer and the room voice exist), then `setSoundOn(false)`; assert every source/oscillator built for the ambience had `stop` and `disconnect` called, and that advancing fake timers past 20 s creates no new node (every scheduler timer cleared).
4. **Creak interval property** — a fast-check property over a seeded `rand: () => number` in `[0,1)`: `creakDelayMs(rand)` is always `>= 8000` and `<= 20000`. (`fast-check` is already a dev dependency.)
5. **Unknown slug** — `setRoomSlug('not-a-room')` then `startAmbience()` runs without throwing and still builds the shared layers.

The existing lazy/gesture, toggle, room-cue, ambience-lifecycle, no-audio and axe cases are unchanged and must still pass. `machine.ts` and its tests are not edited. `check-rooms.mjs` and the size gate are not edited; the added synthesis is a few hundred bytes gzipped.
