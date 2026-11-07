# Design — atmosphere

## Overview

Two things ship together here, plus the QA that proves them:

1. **The atmosphere layer** — one component, `src/ui/Atmosphere.tsx`, with its
   styles in `src/styles/atmosphere.css`. It draws fog, dust motes and a
   breathing warm glow on a single `<canvas>` placed inside the room's
   `aria-hidden` `.room` backdrop layer, under everything else. All of its
   parameters and scheduling decisions live in a pure module,
   `src/ui/atmosphere-core.ts`, so they can be unit-tested with no canvas and
   no DOM.
2. **The common haunted moments** — the two beats every room should feel on a
   wrong and a right pick — driven by the engine (`Room.tsx`) through a
   `data-moment` attribute on `.room-scene`, animated by shared CSS in
   `src/styles/atmosphere.css` on the `.ghost` / `.ghost-wrap` elements every
   room already renders.
3. **manor-qa motion checks** — `walk_rooms` and `contrast_scan` gain an
   optional `reducedMotion` boolean, `walk_rooms` reports and gates CLS, and
   the reduced-motion walk asserts animations are at rest and the static label
   shows. The pure rules live in `scripts/mcp/motion.mjs`.

Nothing new is added to `package.json`. The atmosphere is lazy-loaded with the
room chunk so the initial bundle stays under budget.

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

The atmosphere canvas is added as a sibling of `.room-wall` inside `.room`:

```tsx
<div class="room" aria-hidden="true">
  <div class="room-wall"></div>
  <Atmosphere exhale={showSplit} reducedMotion={reducedMotion} />
</div>
```

`Atmosphere` renders exactly one `<canvas class="atmosphere-canvas" aria-hidden="true">`,
absolutely positioned to fill `.room` (`position: absolute; inset: 0;
pointer-events: none`). Because `.room` already reserves the full scene box
(`inset: 0` over a `min-height: 100vh` scene), adding the canvas inside it
causes no reflow and no layout shift (Req 1.1, 1.4, 1.11). The canvas sits
above `.room-wall` and below `.room::after`'s vignette only in paint order
within the `z-index: 0` backdrop; all interface chrome is at `z-index ≥ 2`, so
the canvas never paints over text or controls, and `contrast_scan` (which
measures the `.comparison` box, far above the backdrop) is unaffected (Req 1.4).

## The pure core — `src/ui/atmosphere-core.ts`

Everything testable without a canvas is here. No Preact, no DOM, no `window`.

```ts
export const MAX_FPS = 30;
export const FRAME_MS = 1000 / MAX_FPS;        // 33.33…
export const MIN_MOTES = 30;
export const MAX_MOTES = 60;
export const MAX_DPR = 2;
export const BREATH_MIN = 0.85;                // glow opacity floor
export const BREATH_MAX = 1;                   // glow opacity ceiling
export const BREATH_HZ = 2;                    // at most two cycles per second
export const EXHALE_MS = 1000;                 // the one-second exhale

/** The backing-store scale: devicePixelRatio capped at 2. */
export function backingScale(dpr: number): number;   // min(max(1, dpr), 2)

/** Should the limiter draw now? True when >= FRAME_MS since the last frame. */
export function shouldDraw(now: number, lastDrawn: number): boolean;

/** Mote count for a viewport: scales with area, clamped to [30, 60]. */
export function moteCount(width: number, height: number): number;

/** Fog band count for a viewport: 2 on a short/narrow scene, else 3. */
export function fogBands(width: number, height: number): number;

/** Breathing glow opacity at time t (ms), bounded to [BREATH_MIN, BREATH_MAX]. */
export function breath(tMs: number): number;         // 0.925 + 0.075*cos(...)

/** The still-frame decision. */
export function renderPlan(reducedMotion: boolean): 'animate' | 'draw-once';

/** Initial mote and fog field, from a seeded rng, for the draw loop. */
export interface Mote { x: number; y: number; r: number; vx: number; vy: number; a: number; }
export interface FogBand { y: number; h: number; speed: number; a: number; phase: number; }
export function buildMotes(n: number, w: number, h: number, rng: () => number): Mote[];
export function buildFog(bands: number, w: number, h: number, rng: () => number): FogBand[];

/** A mote's candlelight brightness at (x,y): 1 at the glow centre, eased down
 *  to `floor` at/beyond the glow radius; clamped to [floor, 1]. */
export function moteGlow(x: number, y: number, cx: number, cy: number, rad: number, floor?: number): number;

/** Exhale progress 0..1 at ms since the exhale began; eased, clamped. */
export function exhaleProgress(msSinceStart: number): number;
```

Key decisions:

- **`shouldDraw`** gates the rAF loop. The loop calls `requestAnimationFrame`
  every tick (≈60 fps) but only paints when `shouldDraw(now, lastDrawn)` is
  true, so the paint rate is capped at 30 fps (property P1). This is the cheap
  way to cap fps without `setInterval` drift. The visibility tuning below keeps
  it to at most 30 fps and paused when hidden even after the look change.
- **`moteCount`** scales with viewport area (`round(area / 26000)`), clamped to
  `[30, 60]`, so a phone gets ~30 and a wide desktop ~60, never outside the
  bound (property P2). The count is unchanged by the visibility tuning — only
  each mote's size, alpha and glow weighting change (see below).
- **`backingScale`** is `min(max(1, dpr), 2)` (property P2). The canvas backing
  store is `cssW * scale × cssH * scale`; the 2D context is scaled by `scale`
  so draw code works in CSS pixels.
- **`breath`** is `0.925 + 0.075 * cos(2π · BREATH_HZ · t/1000)`, which stays in
  `[0.85, 1]` and completes two cycles per second — the steering's flicker
  limit, never a flash (property P3). The breathing glow keeps this limit even
  though it is lifted to be clearly visible; the limit is on the *oscillation*,
  not the base brightness.
- **`renderPlan`** returns `'draw-once'` under reduced motion, `'animate'`
  otherwise (property P4).
- **`exhaleProgress`** eases `0→1` over `EXHALE_MS` (ease-out), clamped to 1 so
  after a second it rests; the component thins the fog alpha and lifts the glow
  by this progress, then holds.
- **`moteGlow`** is the candlelight weighting a player should feel: motes near
  the warm glow are brighter, motes in the dark corners calmer. It is
  `floor + (1 - floor)·(1 - t²)` with `t = clamp(dist/rad, 0, 1)` (default
  `floor` 0.55), so it is 1 at the glow centre, eases to the floor at the edge,
  never below it, and is a safe 1 when `rad ≤ 0`. The component multiplies each
  mote's base alpha by this.

### Visibility tuning (made the mood clearly visible but calm)

The first pass drew the atmosphere so faint that at 1280×720 and 412×915 the
motes were barely visible and the fog hardly at all. The pure field builders now
carry stronger, still-calm values so a player plainly sees a candlelit room with
fog drifting through it, while every other guarantee (30 fps cap, paused when
hidden, DPR ≤ 2, reduced-motion still frame, no layout shift, 0 contrast flags)
holds:

- **Fog** — `buildFog` gives each band alpha `0.10–0.20` (was `0.04–0.09`, too
  faint to read on the dark painted room) and a slow drift speed magnitude of
  `3–7 px/s` (was `6–16 px/s`), so two or three soft bands drift noticeably but
  gently through the visible backdrop above and beside the frame and across the
  painted window. The bands stay soft: two overlapping gradient-edged ellipses
  per band, never a hard bar. The exhale still thins the fog to 40%.
- **Motes** — `buildMotes` gives each mote radius `1.0–3.2 px` (was
  `0.6–2.2 px`) and base alpha `0.28–0.72` (was `0.15–0.5`), so the dust is
  large and bright enough to see float. The component then multiplies each
  mote's alpha by `moteGlow(...)`, so they glow where the candlelight is and
  settle in the dark, which reads as dust caught in the warm light.
- **Glow** — the component's warm radial is lifted (inner stop ~`0.22·g`, mid
  stop ~`0.10·g`, radius `0.8·max(w,h)`) so the candlelight clearly warms the
  walls where the backdrop shows — the margins around and above the frame.
  The oscillation stays `breath(t)` within `[0.85, 1]` at ≤ 2 Hz: never a flash.

All of these live in the pure core (field values) or the component's draw code
(glow stops, mote glow multiply); none of them changes the per-frame cost
meaningfully — the same mote count, the same two/three bands, the same single
radial — so the layer is still cheap, still ≤ 30 fps, still paused when hidden,
and still a single still frame under reduced motion.

## The component — `src/ui/Atmosphere.tsx`

Props: `{ exhale: boolean; reducedMotion: boolean }`.

- Holds a `ref` to the one canvas.
- On mount, schedules start **after first paint**: `requestIdleCallback(start)`
  when available, else `setTimeout(start, 200)` (Req 1.5). The handle is stored
  and cancelled on unmount.
- `start()` reads the canvas's CSS box, sets the backing store to
  `cssW*scale × cssH*scale` with `scale = backingScale(devicePixelRatio)`, and
  `ctx.scale(scale, scale)` so the draw code is in CSS pixels (Req 1.8).
- Builds the mote field (`buildMotes(moteCount(w,h), …)`) and fog bands
  (`buildFog(fogBands(w,h), …)`) with a small seeded rng (deterministic, no
  dependency).
- **Animate branch** (`renderPlan(false) === 'animate'`): a `requestAnimationFrame`
  loop. Each tick: if `document.hidden`, skip painting (the loop keeps ticking
  but draws nothing) — and on `visibilitychange` the `lastDrawn` clock is reset
  so no catch-up burst occurs (Req 1.7). Otherwise, when
  `shouldDraw(now, lastDrawn)`: clear, draw the breathing glow at `breath(now)`
  opacity (lifted stops so it reads), draw the fog bands (drifting by their
  slow speed, wrapped), draw the motes (slow upward drift with gentle
  horizontal sway, each alpha weighted by `moteGlow`), update `lastDrawn`.
- **Draw-once branch** (reduced motion): draw a single still frame — the fog
  bands at rest and the glow at `BREATH_MAX` — and start no loop (Req 1.12).
- **Exhale**: when the `exhale` prop flips to `true`, record `exhaleStart =
  now`. While `exhaleProgress < 1`, the glow is lifted and the fog alpha is
  scaled down by the progress; once it reaches 1 the scene holds calm. Under
  reduced motion, the flip triggers a single still redraw with the calmer
  values, no animation (Req 1.13).
- **Cleanup** (unmount): `cancelAnimationFrame`, `cancelIdleCallback` /
  `clearTimeout`, and `removeEventListener('visibilitychange', …)` (Req 1.9).
- The whole component is a no-op when there is no `canvas.getContext` (jsdom):
  it renders the `<canvas>` element but starts nothing, so tests of the mounted
  Room never spin a loop.

### Lazy loading

`Room.tsx` imports `Atmosphere` with a Preact `lazy` + `Suspense` boundary, or
a plain dynamic `import()` guarded by local state, so the atmosphere code lands
in the room chunk rather than the entry chunk. Since rooms are already loaded
on demand, this keeps the entry bundle unchanged and under the 100 KB budget
(Req 1.10). The `atmosphere-core.ts` pure module is tiny and may be imported
eagerly by the component; it is only ever reached from the lazy `Atmosphere`,
so it rides in the room chunk too. `check:size` is re-run to confirm.

## The common moments — engine-driven, shared CSS

### The engine marks the scene

`Room.tsx` computes the moment from state it already has and sets it on
`.room-scene`:

```ts
function momentOf(state: RoomState): { name: 'wrong' | 'right'; key: number } | null {
  if (state.tag === 'named' || state.tag === 'honest' || state.tag === 'done') {
    return { name: 'right', key: 0 };
  }
  if (state.tag === 'picking' && state.whisperNonce > 0) {
    return { name: 'wrong', key: state.whisperNonce };
  }
  return null;
}
```

The scene renders:

```tsx
<div class="room-scene" data-moment={moment?.name} data-moment-key={moment?.key}>
```

`data-moment-key` changes with the wrong-pick nonce, so each wrong pick is a
new attribute value; combined with a CSS `animation`, the browser restarts the
gutter/head-shake animation on every wrong pick (Req 2.2, 2.3). The attribute
is absent (undefined) while haunted/inspecting/picking with no wrong pick, is
`"wrong"` after a wrong pick, and is `"right"` from `named` on (property P5).
Nothing per-room is touched: the engine already owns `whisperNonce` and the
state tag.

The ghost flee that already runs per room keeps its 600 ms timing; the shared
`right` moment adds the "stop mid-gesture and unwind upward" lead-in that
plays before the room's own flee, by animating `.ghost-wrap` (Req 2.4). Because
all twelve rooms render `.ghost-wrap` and `.ghost` inside `.ghost-signs`, the
shared selectors reach every room. A `check-rooms`-adjacent audit (and the grep
done during design) confirms all twelve already use those exact class names, so
no room needs a renamed element or an added class; the design nonetheless
states the rule (Req 2.6): where a room differs, add the shared class, never
rename.

### Shared CSS (`src/styles/atmosphere.css`)

Imported once (from `look.css`, alongside `manor.css`), so it is global like
the rest of the manor styles. Transforms and opacity only (Req 2.6):

```css
/* Wrong pick: the candles gutter — a brief dip of the warm light (~300ms) —
   and the ghost shakes its head once. The engine re-keys data-moment-key on
   each wrong pick so these restart. */
.room-scene[data-moment='wrong'] .room::after { animation: candle-gutter 300ms ease-out; }
.room-scene[data-moment='wrong'] .ghost-wrap  { animation: ghost-shake 300ms ease-out; }

@keyframes candle-gutter { 0%,100%{opacity:1} 40%{opacity:.7} }
@keyframes ghost-shake   { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-6deg)} 75%{transform:rotate(6deg)} }

/* Right pick: the ghost stops mid-gesture and unwinds upward before it flees.
   The room's own ghost-flee (600ms) still runs; this is the lead-in. */
.room-scene[data-moment='right'] .ghost-wrap { animation: ghost-unwind 220ms ease-out; }
@keyframes ghost-unwind { 0%{transform:translateY(0) scaleY(1)} 100%{transform:translateY(-8px) scaleY(1.08)} }

@media (prefers-reduced-motion: reduce) {
  .room-scene[data-moment='wrong'] .room::after,
  .room-scene[data-moment='wrong'] .ghost-wrap,
  .room-scene[data-moment='right'] .ghost-wrap { animation: none; }
}
```

The gutter targets `.room::after` (the existing candlelight layer), so the dip
is the warm light guttering, consistent with the atmosphere glow. Under reduced
motion all three are off; the ghost simply fades with the room's own
reduced-motion rules (Req 2.5). None of this hides content: it only transforms
the ghost and dips a decorative glow, so text stays readable and controls
operable and a wrong card still costs nothing (Req 2.7).

The breathing glow of the atmosphere canvas and the `candle-gutter` of
`.room::after` are two different layers (canvas vs CSS pseudo-element); the
gutter is a one-shot 300 ms dip, the breath is the canvas's steady ≤2 Hz
oscillation, so they do not fight.

## The before/after divider — composited, no layout shift

The before/after comparison (`src/styles/manor.css`, `.comparison*`) reveals the
honest twin with a `clip-path` on `.comparison-honest` and marks the reveal edge
with a `.comparison-divider` (and its centred `.comparison-grip`). The opening
sweep in `Room.tsx` eases the reveal `--split` from 0 to the rest point over
~1.2 s. The divider was placed with `left: var(--split)`, so each sweep step
moved a laid-out element and the browser logged a small **layout shift** per
step — about 0.003–0.006 per room with motion on, and 0 under reduced motion
(the sweep does not run). This predates the atmosphere; the clip-path wipe of
the honest layer never shifted.

The divider is now placed with `transform: translateX(var(--split))` and
`left: -1px` (keeping the 2 px edge centred on the split, as the old
`margin-left: -1px` did). Moving it then only composites — no reflow — so the
sweep no longer logs any layout shift and `walk_rooms` reports CLS 0 in every
room in both motion modes. The grip rides inside the divider, so it needs no
move of its own.

## manor-qa motion — `scripts/mcp/motion.mjs` and the two tools

### Pure rules (`scripts/mcp/motion.mjs`)

```js
/** Read reducedMotion from tool args; default false; non-boolean → false. */
export function wantsReducedMotion(args)        // -> boolean

/** The CLS gate: true when the room PASSES (cls <= limit). */
export const CLS_LIMIT = 0.01;
export function clsWithinLimit(cls, limit = CLS_LIMIT)  // -> boolean

/** The animations-at-rest rule: true when every animation is finished/paused,
 *  or there are none. Input is an array of play states (strings). */
export function animationsAtRest(playStates)    // -> boolean
```

These three are unit-tested (Req 3.5, properties P6, P7, P8).

### `session.mjs` — reduced-motion emulation

`openSession` already calls `Emulation.setEmulatedMedia` with
`prefers-reduced-motion: no-preference`. It gains a `reducedMotion` option:
when true it sets the feature to `reduce` **before** any navigation (the helper
script is already added on new document; the media override is set once at
session open, before the first `Page.navigate`), satisfying "emulate before the
page loads" (Req 3.1). The session also installs, via
`Page.addScriptToEvaluateOnNewDocument`, a tiny CLS collector:

```js
window.__clsReset = () => { window.__cls = 0; };
window.__cls = 0;
new PerformanceObserver((list) => {
  for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
}).observe({ type: 'layout-shift', buffered: true });
```

and helpers `window.__animAtRest()` (maps `document.getAnimations()` to play
states and returns whether all are finished/paused or none) and
`window.__stirsVisible()` (returns `__vis` of the `.stirs-label` /
"Something stirs here" element). The observer is buffered so shifts from before
the script ran are still counted; the walk resets `__cls` right after
navigating to each room so the reported value is that room's walk.

### `walk.mjs` — the new checks

`runWalk(args)` reads `const reducedMotion = wantsReducedMotion(args)` and
passes it to `openSession({ width, height, reducedMotion })`. `walkRoom` gains
two steps:

- **CLS**: after navigating and settling, call `__clsReset()`; at the end of
  the room's walk read `cls = await cdp.ev('window.__cls')`, record it in
  `r.checks['cls']`, and `check('layout shift within 0.01',
  clsWithinLimit(cls), true)` — failing the room when it exceeds 0.01 (Req 3.4,
  property P6). The reset-after-settle avoids counting the initial room paint,
  which is a navigation, not a shift during play.
- **Reduced motion** (only when `reducedMotion` is true): after the comparison
  is up, `check('animations at rest', animationsAtRest(await
  cdp.ev('window.__animStates()')), true)` and `check('stirs label visible',
  await cdp.ev('__stirsVisible()'))`. The static label is the room's
  `.stirs-label` shown under reduced motion while the possessed element shows
  signs; the walk checks it while still haunted (before freeing the room) and
  the animations-at-rest check after the ghost would otherwise animate. The
  result keeps the same JSON shape; it only adds keys to the per-room `checks`
  and any new `fail` lines (Req 3.2).

The reduced-motion walk still frees each room and runs every existing check, so
the result object is a superset — no field is removed or renamed.

### `contrast-scan.mjs` — the new argument

`runContrastScan(args)` reads `reducedMotion` the same way and passes it to
`openSession`. The scan itself is unchanged (it measures pixels, not motion);
the flag is accepted so a caller can scan the reduced-motion rendering, which is
what the task's final verification does. The result JSON keeps its shape;
`{ rooms, width, height, flags }` gains an echoed `reducedMotion` field for
traceability, which does not change the existing fields (Req 3.2).

### `manor-qa.mjs` — the schemas

The shared `roomsSchema` gains:

```js
reducedMotion: {
  type: 'boolean',
  description: 'Emulate prefers-reduced-motion: reduce before loading each page.',
  default: false,
}
```

Both `walk_rooms` and `contrast_scan` use this schema, so both tools advertise
the new optional argument. Tool names and the `content: [{ type: 'text', text }]`
result shape are unchanged (Req 3.2).

### Smoke script

`manor-qa-smoke.mjs` adds one call: `walk_rooms` on room `1` with
`{ reducedMotion: true }`, and prints whether its reduced-motion checks passed
(Req 3.6). Chrome is not available in CI, so this runs only when a human (or
Kiro) runs the smoke script; the pure rules carry the automated coverage.

## Testing strategy

- **`src/ui/atmosphere-core.test.ts`** (vitest): `shouldDraw` caps at 30 fps
  (false just under `FRAME_MS`, true at/after it); `moteCount` is in `[30, 60]`
  for a grid of viewport sizes and a fast-check property over random sizes;
  `fogBands` returns 2 or 3; `backingScale` is `min(dpr, 2)` and never below 1;
  `breath(t)` stays in `[0.85, 1]` for a sweep of `t`; `renderPlan(true) ===
  'draw-once'` and `renderPlan(false) === 'animate'`; `exhaleProgress` is 0 at
  0, monotonic, and clamped to 1 (properties P1–P4). The visibility tuning adds
  coverage: `buildMotes` radii are `1.0–3.2 px` and alphas `0.28–0.72`;
  `buildFog` alphas are `0.10–0.20` and speed magnitudes `3–7 px/s`; `moteGlow`
  is 1 at the centre, eases to its floor at the edge, stays within `[floor, 1]`
  for any point (fast-check), brighter nearer the centre, and a safe 1 when the
  radius is not positive.
- **`src/engine/Room.moment.test.tsx`** (vitest): render the Foyer; after a
  wrong pick `.room-scene` has `data-moment="wrong"` with a `data-moment-key`;
  a second wrong pick changes the key; the correct pick leaves
  `data-moment="right"` and no `data-moment="wrong"` (property P5, Req 4.2).
- **`scripts/mcp/motion.test.mjs`** (`node:test`): `wantsReducedMotion`
  defaults to false and reads booleans; `clsWithinLimit` passes at ≤ 0.01 and
  fails above; `animationsAtRest` passes for `[]`, `['finished']`,
  `['paused','finished']` and fails for `['running']` (properties P6–P8).
- **The smoke script** proves the tools end to end with and without reduced
  motion when a browser is present. `npm run qa:full` drives the same server
  over stdio for non-interactive runs where the MCP tools cannot be approved;
  it reports CLS per room in both motion modes (now 0 everywhere after the
  divider fix) and 0 contrast flags with the brighter atmosphere.

Existing suites (`Room.test.tsx`, the room tests, the protocol/contrast/rooms/
static-server QA tests) stay green; the atmosphere canvas is inert in jsdom and
the new `data-moment` attribute does not affect any existing assertion.

## Privacy, safety, constraints

No new dependency, no network, no cookies: the atmosphere is pure canvas draw
and the QA additions are loopback/CDP only, matching the game's runtime-privacy
stance. No file is written to disk by the tools. No local user or machine path
is written into any file. The work touches only this repository.
