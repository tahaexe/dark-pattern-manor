# Design — atmosphere

## Overview

Two things ship together here, plus the QA that proves them:

1. **The atmosphere layer** — one component, `src/ui/Atmosphere.tsx`, with its
   styles in `src/styles/atmosphere.css`. It draws a breathing warm glow and a
   drifting fog with CSS (the glow an opacity `@keyframes`, the fog a bitmap
   painted once and moved by a CSS `transform`), and dust motes on one small
   `<canvas>`, all inside the room's `aria-hidden` `.room` backdrop layer, under
   everything else. All of its parameters and scheduling decisions live in a
   pure module, `src/ui/atmosphere-core.ts`, so they can be unit-tested with no
   canvas and no DOM.
2. **The common haunted moments** — the two beats every room should feel on a
   wrong and a right pick — driven by the engine (`Room.tsx`) through a
   `data-moment` attribute on `.room-scene`, animated by shared CSS in
   `src/styles/atmosphere.css` on the `.ghost` / `.ghost-wrap` elements every
   room already renders, plus a shared **named-hold** rule that stills every
   other element in the live haunted frame while the ghost flees.
3. **manor-qa motion checks** — `walk_rooms` and `contrast_scan` gain an
   optional `reducedMotion` boolean, `walk_rooms` reports and gates CLS, asserts
   the named hold leaves only the shared flee moving, and the reduced-motion
   walk asserts animations are at rest and the static label shows. The pure
   rules live in `scripts/mcp/motion.mjs`.

Nothing new is added to `package.json`. The atmosphere is lazy-loaded with the
room chunk so the initial bundle stays under budget.

## Cheap for the renderer AND the compositor

The first build drew glow, fog and motes on one canvas in a 60 Hz rAF loop. A
later pass moved the glow and fog onto CSS — the glow an opacity `@keyframes`,
the fog a once-drawn bitmap drifted by a CSS `transform` — so the renderer's
main thread fell sharply. But headless Chrome composites in **software**: a CSS
animation that changes a layer's opacity or transform every display frame makes
the compositor recomposite that layer 60 times a second on the CPU. Measured on
the CSS build at 1280×720, 1× CPU, room 1 idle: the renderer fell from ~20 % to
~6.6 % of a core (good) but the GPU/compositor process rose from ~6 % to ~26 %,
so all processes together went ~26 %→~32 %, over the ≤15 % target.

The follow-up stepped both CSS animations and shrank the fog layer. That cut the
compositor's rate but not enough: measured again, the renderer was ~7 % but the
GPU process still sat around ~17 % (all processes ~24 %), because each composite
of the glow and fog layers is paid on the CPU, and promoting those layers to
their own compositor layer **all the time** (`will-change` always on) leaves
large promoted layers the software compositor repaints even when the room is
idle. This revision closes that with two changes that keep the look:

- **A slower glow breath, and only ~12 compositor updates a second.** The glow
  breath was `steps(12, jump-none)` over its 500 ms half-cycle — 24 opacity
  changes a second. It is a slow breath, so it is now `steps(6, jump-none)` over
  the same 500 ms — about **12** opacity changes a second (the change per step
  is 0.025 opacity, still imperceptible stepping). The fog drift stays
  `steps(120)` over 60 s (~2 transform changes a second). So the compositor
  touches the glow ~12×/s and the fog ~2×/s, not once per display frame.
- **Promote the layers only while they move.** `will-change` is no longer in the
  glow/fog base rules; it is applied by two rules gated on `data-moving`:

  ```css
  .atmosphere[data-moving='true'] .atmosphere-glow { will-change: opacity; }
  .atmosphere[data-moving='true'] .atmosphere-fog  { will-change: transform; }
  ```

  The component sets `data-moving` on the `.atmosphere` root when it starts the
  animate path, and removes it the moment the room goes still (reduced / honest
  / adaptive), is unmounted, or (via `data-hidden`) is backgrounded. So the two
  big layers are promoted exactly when — and only when — they are
  drifting/breathing; an idle, still or honest room keeps no large promoted
  layer for the software compositor to repaint.

Already in place from the earlier pass, and kept:

- **A smaller fog layer.** The fog layer was `width: 200%; left: -50%` — twice
  the scene wide. It is `width: 118%; left: -9%` and drifts `translateX(-8% …
  8%)` (of its own width, ±9.44 % of the scene), still covering 0–100 % of the
  scene at both extremes with no edge, but no wider than the scene plus its
  drift, so each recomposite copies less area.
- **Paused when hidden.** A `visibilitychange` listener sets `data-hidden` on
  the `.atmosphere` root while the document is hidden; the CSS pauses the glow
  and fog animations (`animation-play-state: paused`) then, and the component
  also drops `data-moving`, so a backgrounded room composites nothing. The motes
  loop already pauses. On return the attributes come back and both resume.

None of this changes the look (a slow breathing glow, slowly drifting fog, dust
motes) or the other guarantees (≤24 fps motes, DPR 1, still on honest/reduced,
adaptive still, no layout shift, 0 contrast flags).

## Adaptive still, measured on the timer's own ticks

The adaptive still mode must catch a slow device, not the motes cap. The earlier
build compared the **capped loop's painted-frame count** (≈20.8 fps measured in
headless Chrome) against a 20 fps floor: the cap sat right at the floor, so any
slow first frame on page load dropped the average under 20 and the still mode
engaged at random, freezing the atmosphere on a fast desktop in roughly half of
otherwise-identical runs. That is the bug.

The fix measures **how the motes' own timer behaves**, not how many frames the
capped loop draws. Over the opening ~2 s the loop records, on each wake:

- the **gap** since the previous wake (the tick cadence), and
- the **duration** of the paint it triggers.

A healthy device wakes on time (every gap ≈ the ~41.7 ms frame interval,
lateness ≈ 0) and paints in well under a millisecond; a throttled or congested
device wakes late (gaps far beyond the interval) and paints slowly. The pure
`adaptiveStillEngages(sample)` engages the still pose when **any** of:

- the **mean lateness** — the average overshoot of each gap beyond the frame
  interval — exceeds half the interval (`ADAPTIVE_LATE_FACTOR = 0.5`), OR
- the **median frame** takes longer than 50 ms (`ADAPTIVE_MEDIAN_FRAME_MS`), OR
- the **measured tick rate** (ticks ÷ window, off the timer's own ticks) falls
  below 12 fps (`ADAPTIVE_FPS_FLOOR`), a floor well under the 24 fps cap.

The 24 fps cap never trips any of these on a fast desktop: capped wakes arrive
on time (lateness ≈ 0), frames are instant, and the measured tick rate (~23 fps)
is far above 12. A single slow first frame barely moves the mean lateness or the
median, so it no longer trips. A 4×-throttled CPU crosses at least one
threshold. Gaps across a hidden pause are not recorded (the cadence clock resets
on hide), so a backgrounded room does not read as a slow device.

## Where the canvas lives

`Room.tsx` already renders:

```tsx
<div class="room-scene">
  <div class="room" aria-hidden="true">
    <div class="room-wall"></div>
  </div>
  ...task bar, frame, cards, comparison, guide...
</div>
```

`.room` is `position: absolute; inset: 0; z-index: 0` and `aria-hidden`.
`.room-wall` paints the backdrop image and the vignette sits in `.room::after`.
Everything interactive sits at `z-index: 2` and above.

The atmosphere layer is added as a sibling of `.room-wall` inside `.room`:

```tsx
<div class="room" aria-hidden="true">
  <div class="room-wall"></div>
  <Atmosphere exhale={showSplit} reducedMotion={reducedMotion} />
</div>
```

`Atmosphere` renders a `.atmosphere` root holding the CSS glow div, the fog
canvas and the motes canvas, absolutely positioned to fill `.room`
(`position: absolute; inset: 0; pointer-events: none`). Because `.room` already
reserves the full scene box (`inset: 0` over a `min-height: 100vh` scene),
adding the layer inside it causes no reflow and no layout shift (Req 1.1, 1.5,
1.10). The layer sits above `.room-wall` and below all interface chrome
(`z-index ≥ 2`), so it never paints over text or controls, and `contrast_scan`
(which measures the `.comparison` box, far above the backdrop) is unaffected
(Req 1.1).

## The pure core — `src/ui/atmosphere-core.ts`

Everything testable without a canvas is here. No Preact, no DOM, no `window`.

```ts
export const MAX_FPS = 24;
export const FRAME_MS = 1000 / MAX_FPS;        // 41.66…
export const MIN_MOTES = 30;
export const MAX_MOTES = 60;
export const MOTES_DPR = 1;
export const BREATH_MIN = 0.85;                // glow opacity floor
export const BREATH_MAX = 1;                   // glow opacity ceiling
export const BREATH_HZ = 2;                    // at most two cycles per second
export const EXHALE_MS = 1000;                 // the one-second exhale
export const ADAPTIVE_WINDOW_MS = 2000;
export const ADAPTIVE_LATE_FACTOR = 0.5;       // mean lateness > half the interval
export const ADAPTIVE_MEDIAN_FRAME_MS = 50;    // median paint > 50 ms
export const ADAPTIVE_FPS_FLOOR = 12;          // measured-on-ticks floor, under the cap

export function shouldDraw(now: number, lastDrawn: number): boolean;
export function moteCount(width: number, height: number): number;
export function fogBands(width: number, height: number): number;
export function breath(tMs: number): number;         // 0.925 + 0.075*cos(...)
export function stillPose(flags: { reducedMotion?; honest?; adaptiveStill? }): 'still' | 'animate';
export function averageFps(frames: number, elapsedMs: number): number;
export function median(values: number[]): number;
export function meanLateness(gaps: number[], expectedMs: number): number;
export function adaptiveStillEngages(sample: AdaptiveSample, cfg?: AdaptiveConfig): boolean;
export function buildMotes(n, w, h, rng): Mote[];
export function buildFog(bands, w, h, rng): FogBand[];
export function moteGlow(x, y, cx, cy, rad, floor?): number;
export function exhaleProgress(msSinceStart: number): number;
```

`AdaptiveSample` is `{ gaps: number[]; frameDurations: number[]; ticks: number;
elapsedMs: number }` — the inter-wake gaps, the paint durations, the tick count
and the window actually observed. `AdaptiveConfig` overrides the thresholds for
tests (`expectedMs`, `lateFactor`, `medianFrameMs`, `fpsFloor`).

Key decisions:

- **`shouldDraw`** gates the motes timer loop at ≤24 fps (property P1).
- **`moteCount`** scales with viewport area, clamped to `[30, 60]` (property
  P2). **`MOTES_DPR = 1`** keeps the motes canvas backing store at DPR 1.
- **`breath`** is `0.925 + 0.075·cos(2π·BREATH_HZ·t/1000)`, in `[0.85, 1]`, two
  cycles a second (property P3). The CSS `@keyframes` mirrors its bound; the
  stepped timing samples this breath at ~12 discrete opacities a second now.
- **`stillPose`** decides still vs animate (property P4). **`adaptiveStillEngages`**
  reads the timer cadence and engages on late wakes, a slow median frame, or a
  sub-12 fps tick rate; it never trips on a fast-desktop cadence (property P5).
  **`averageFps`**, **`median`** and **`meanLateness`** are the pure helpers it
  composes, each unit-tested on its own.
- **`buildMotes` / `buildFog` / `moteGlow` / `exhaleProgress`** carry the field
  values and the exhale easing (see the visibility-tuning note below).

### Visibility tuning (made the mood clearly visible but calm)

The field builders carry stronger, still-calm values so a player plainly sees a
candlelit room with fog drifting through it, while every lightness guarantee
holds: fog band alpha `0.10–0.20` and drift speed `3–7 px/s`; mote radius
`1.0–3.2 px` and base alpha `0.28–0.72`, brightened near the glow by `moteGlow`;
the warm radial glow lifted so the candlelight warms the walls. The breath stays
within `[0.85, 1]` at ≤2 Hz.

## The component — `src/ui/Atmosphere.tsx`

Props: `{ exhale: boolean; reducedMotion: boolean }`.

- Renders `.atmosphere` → `.atmosphere-glow` (CSS), `.atmosphere-fog` (canvas,
  painted once), `.atmosphere-motes` (canvas, timer loop).
- On mount, schedules start **after first paint** (`requestIdleCallback`, else
  `setTimeout(start, 200)`), stored and cancelled on unmount (Req 1.7).
- `start()` measures the motes canvas at DPR 1, builds the mote and fog fields
  from a seeded rng (no dependency), paints the fog once, and either goes still
  (honest/reduced) or starts the motes timer loop and sets `data-moving`.
- **Motes loop:** a `setTimeout(FRAME_MS)` wake requests one rAF to paint, then
  re-arms — ≤24 frame requests a second, not 60. Each wake records the gap since
  the last wake and the paint duration into the opening-window sample; after the
  window it calls `adaptiveStillEngages(sample)` and drops to still if the device
  cannot keep the cadence. Paused while `document.hidden` (and the cadence clock
  resets across the pause so a hidden gap is not read as slowness).
- **Still pose** is driven onto the `.atmosphere` root as `data-still='true'`
  (the CSS glow/fog animations pause and hold their rest frame) and clears
  `data-moving` (the layers are no longer promoted); `data-exhale` runs the
  one-second settle first.
- **Layer promotion:** `data-moving='true'` on the root while the loop animates;
  the CSS adds `will-change` to the glow and fog only then. It is removed when
  the room goes still (`goStill`), on unmount, and (through the hidden path)
  while backgrounded.
- **Hidden pause:** the same `visibilitychange` listener that pauses the motes
  loop toggles `data-hidden='true'` on the root while the document is hidden, so
  the CSS pauses the glow and fog too; it is removed on return.
- **Cleanup** (unmount): `cancelAnimationFrame`, `cancelIdleCallback` /
  `clearTimeout`, `removeEventListener`, and clear `data-hidden` / `data-moving`
  (Req 1.8).
- In jsdom (no `canvas.getContext`) the component starts no loop; it still sets
  the plan/attributes so tests of the mounted Room never spin a loop.

### Lazy loading

`Room.tsx` imports `Atmosphere` lazily so the atmosphere code lands in the room
chunk, keeping the entry bundle under the 100 KB budget. `check:size` confirms.

## The atmosphere CSS — `src/styles/atmosphere.css`

```css
.atmosphere-glow {
  background: radial-gradient( 80% 80% at 50% 42%, … );
  opacity: 1;
  /* Stepped so the compositor updates the opacity ~12 times a second. */
  animation: atmosphere-breath 500ms steps(6, jump-none) infinite alternate;
}
@keyframes atmosphere-breath { from { opacity: 1; } to { opacity: 0.85; } }

.atmosphere-fog {
  /* No wider than the scene plus its drift (was 200% / -50%). */
  width: 118%;
  left: -9%;
  /* Stepped so the big layer recomposites only ~twice a second. */
  animation: atmosphere-fog-drift 60s steps(120) infinite alternate;
}
@keyframes atmosphere-fog-drift {
  from { transform: translateX(-8%); }
  to   { transform: translateX(8%); }
}

/* Promote to a compositor layer ONLY while moving (no idle promoted layer). */
.atmosphere[data-moving='true'] .atmosphere-glow { will-change: opacity; }
.atmosphere[data-moving='true'] .atmosphere-fog  { will-change: transform; }

/* Hidden: pause both CSS layers so a backgrounded room composites nothing. */
.atmosphere[data-hidden='true'] .atmosphere-glow,
.atmosphere[data-hidden='true'] .atmosphere-fog { animation-play-state: paused; }

/* Still pose (reduced / honest / adaptive): hold the rest frame. */
.atmosphere[data-still='true'] .atmosphere-glow { animation: none; opacity: 1; }
.atmosphere[data-still='true'] .atmosphere-fog  { animation: none; }
/* Exhale + reduced-motion branches as before. */
```

The stepped timing and the move-only promotion are the compositor saving:
`steps(6, jump-none)` over 500 ms is ~12 opacity changes a second; `steps(120)`
over 60 s is ~2 transform changes a second; and `will-change` lives only inside
the `data-moving` rules, so no idle large layer stays promoted. The look is
unchanged — the breath is slow and the fog drift is only 16 % of its own width
over a minute, so neither reads as stepping.

## The common moments — engine-driven, shared CSS

### The engine marks the scene

`Room.tsx` sets `data-moment` (`"wrong"` keyed on the wrong-pick nonce, `"right"`
from `named` on) and `data-fleeing` (during `named`) on `.room-scene`, from
state it already holds (property P6). The shared CSS animates `.ghost-wrap` for
the wrong head-shake, the right unwind and the single flee; `.room::after` for
the candle gutter. Transforms and opacity only (Req 2.4).

### The shared named-hold rule (Req 2.7)

While the room is held named for the flee (`data-moment='right'`), every element
inside the **live** haunted frame except `.ghost-wrap` and its descendants must
be still, so no control's own transition can be caught mid-flight. The earlier
build stilled only the possessed element (`.room-scene[data-moment='right']
.possessed`), which left other controls free: room 6's size buttons
(`.cloak-size`) carry `transition: all`, and the walk caught one transitioning
`background-color` mid-hold at 1280×720, because a size button is not the
possessed element. The fix is one shared rule next to the possessed one:

```css
/* Everything in the live haunted frame holds still during the flee, except the
   shared .ghost-wrap (and what is inside it), which carries the unwind/flee. */
.room-scene[data-moment='right'] .manor-frame *:not(.ghost-wrap):not(.ghost-wrap *) {
  transition: none;
  animation: none;
}
```

`.manor-frame` is the live frame (the previews are `.manor-frame-preview`, and
during the named hold there is no split yet, so only the live frame is present).
The rule stops transitions and animations on every descendant, which cancels an
in-flight hover transition immediately (`transition: none` removes the running
transition). `.ghost-wrap` itself is excluded (so the shared unwind/flee still
runs) and so are its children (`:not(.ghost-wrap *)`, so nothing inside the
ghost is frozen). It is scoped to `data-moment='right'` only, so no other moment
is affected. The existing `.possessed` rule stays (it is a harmless, more
specific subset) and the per-room act-freeze rules stay. Under reduced motion
nothing animates anyway, so the rule is a no-op there.

## The before/after divider — composited, no layout shift

The divider is placed with `transform: translateX(var(--split))` and
`left: -1px`, so the opening sweep only composites — no reflow — and `walk_rooms`
reports CLS 0 in every room in both motion modes.

## manor-qa motion — `scripts/mcp/motion.mjs` and the two tools

### Pure rules (`scripts/mcp/motion.mjs`)

```js
export function wantsReducedMotion(args)        // -> boolean, default false
export const CLS_LIMIT = 0.01;
export function clsWithinLimit(cls, limit)      // -> boolean (pass)
export function animationsAtRest(playStates)    // -> boolean
export function idleWithinWindow(framesRequested) // -> boolean (pass)
export function labelWithinClip(label, clips, tolerance) // -> boolean
export function heldMotionOffenders(running)    // -> offenders[]
```

`heldMotionOffenders` already returns every running animation/transition inside
the live frame whose target is not `.ghost-wrap` or inside it (property P11); the
session helper `__heldMotion()` reports transitions too (its `nameOf` maps a
transition to `transition:<property>`), so the size-button `transition:
background-color` the walk caught is exactly what the shared named-hold rule now
stops — no change to the rule or the helper is needed, only the CSS fix makes
the offenders list empty.

### `session.mjs`, `walk.mjs`, `contrast-scan.mjs`, `manor-qa.mjs`

Unchanged by this revision: `openSession` emulates reduced motion before
navigation and installs the CLS/rAF/anim/label/held-motion helpers; `walk.mjs`
gates CLS, the idle (no-frames) window, the named hold and the reduced-motion
checks; the schemas carry the optional `reducedMotion` boolean; the smoke script
runs one room with `reducedMotion: true`.

## Testing strategy

- **`src/ui/atmosphere-core.test.ts`** (vitest): the 24 fps cap, mote/fog
  bounds, DPR 1, the breath bound, the still-pose decision, `median` and
  `meanLateness`, and the adaptive-still decision measured on the timer cadence
  — a fast-desktop sample never engages (even with one slow first frame), while
  late wakes, a slow median frame or a sub-12 fps tick rate each engage
  (properties P1–P5).
- **`src/ui/atmosphere-loop.test.ts`** (vitest/jsdom): the motes loop wakes on a
  timer at ≤24 fps, pauses hidden, draws once under reduced/honest; adaptive
  still engages when the simulated wakes arrive far late and NOT when they
  arrive on time, nor on a single late wake; and it tears down on unmount.
- **`src/ui/atmosphere-css.test.ts`** (vitest, stylesheet as text): the glow and
  fog animations carry a `steps(...)` timing (the glow ≤6 steps → ~12 updates/s),
  `will-change` appears only inside the `data-moving` rules (two occurrences,
  both scoped), `data-hidden` pauses both, and the fog layer is no wider than the
  scene plus its drift (width ≤ ~120 %, not 200 %).
- **`src/ui/atmosphere-named-hold.test.ts`** (vitest, stylesheet as text): the
  shared rule stills every element in the live frame except `.ghost-wrap` during
  `data-moment='right'` (`*:not(.ghost-wrap):not(.ghost-wrap *)` with
  `transition: none; animation: none`), it does not touch the shared flee, and
  it is scoped to the right moment only. The possessed-element rule stays.
- **`src/engine/Room.moment.test.tsx`** (vitest): the moment attribute wiring
  (property P6).
- **`scripts/mcp/motion.test.mjs`** (`node:test`): the pure rules, including
  `heldMotionOffenders` flagging a non-`ghost-wrap` transition and passing when
  only the flee runs (properties P6–P11).
- **`npm run qa:full`** drives the server over stdio for non-interactive runs:
  all 12 rooms, 1280×720 and 412×915, both motion modes — CLS 0, 0 contrast
  flags, honest-idle no-frames, and the named hold leaving only the shared flee
  moving (so room 6's `.cloak-size` no longer fails).

Existing suites stay green; the atmosphere canvas is inert in jsdom and the new
attributes/rule do not affect any existing assertion.

## Privacy, safety, constraints

No new dependency, no network, no cookies. No file is written to disk by the
tools. No local user or machine path is written into any file. The work touches
only this repository.
