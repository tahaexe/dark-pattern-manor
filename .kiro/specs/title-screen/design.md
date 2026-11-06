# Design Document

## Overview

Two small, independent changes.

1. **A real title screen.** The title route `#/` moves out of `App.tsx` into its own component `src/app/TitleScreen.tsx`, with its own CSS `src/app/title-screen.css` and its own test `src/app/TitleScreen.test.tsx`. `App.tsx` keeps the routing and only renders `<TitleScreen />` for the title route. The screen reuses the rooms' painted foyer backdrop (the existing `.room` / `.room-wall` markup from `look.css`), darkens it with a vignette so text stays at WCAG AA, and lays a candlelit front hall on top: the large heading, the tagline, the floating ink-line ghost, one facts line, and a progress-aware primary button.

2. **A sound gesture-gate fix.** `ensureContext` in `src/audio/sound.ts` learns to respect `navigator.userActivation`: when the platform reports no user activation yet, it creates nothing, returns null, and arms a one-time capture-phase `pointerdown`/`keydown` listener on `window` that, on the first gesture, creates the context and resumes the ambience if a room is still haunted. Where `navigator.userActivation` is absent (jsdom, older browsers), behaviour is exactly as today.

Both changes keep the game fully playable, keep the bundle within budget (no new image, no new font, a few hundred bytes of code), and change nothing in `machine.ts`, `progress.ts`, or the reducer tests.

## The title screen

### Component split

`App.tsx` today inlines the title markup inside its `route === 'title'` branch and owns two title-related behaviours: it focuses the `h1` on entering the title route, and it shows a `#/end` link once all twelve are complete. The split:

- `TitleScreen.tsx` renders all of the title's own markup: the backdrop, the heading (`<h1 tabindex={-1}>`), the tagline, the ghost, the facts line, and the progress-aware controls — including the all-complete `#/end` link, which is now part of the title screen's own progress logic.
- `App.tsx`'s title branch becomes just `<TitleScreen />`. The existing "focus the `h1` when the route is title" effect stays in `App.tsx` (it already queries `document.querySelector('h1')`, which still finds the title heading), so the kept focus behaviour needs no change and keeps working when the player returns to the title.
- The old `handleStart` click handler and the `.title-screen` / `.start-button` / `.title-end-link` markup leave `App.tsx`. `TitleScreen` uses plain `<a href>` anchors for navigation (matching how rooms already navigate with `#/…` links), so no click handler is needed and hash routing drives the transition.

`App.tsx` still imports nothing new beyond `TitleScreen`; `ROOM_ORDER`, `doneCount`, and the rest stay as they are for the room/end routes.

### The backdrop and vignette

The title screen renders the same backdrop box the rooms use:

```tsx
<div class="room" aria-hidden="true">
  <div class="room-wall"></div>
</div>
```

`.room-wall` (in `look.css`) already paints `foyer.webp` with a night-scrim gradient. On the title screen the content sits on a dedicated `.title-screen` surface inside a `.room-scene`-like full-height container. To guarantee AA contrast for the large candle-coloured heading, the tagline (`--ghost`), and the facts line (`--ghost`), `title-screen.css` adds its own vignette layer over the backdrop — a centred radial gradient darkening toward a strong `--manor-night` center behind the text column — so the text column is always over a near-solid dark field. This is additive to the room's existing scrim and never lightens anything, so it cannot lower contrast. The axe-core `color-contrast` check in the test is the real proof; the vignette is tuned until it passes at all three progress states.

Colours used: `--candle` for the heading, `--ghost` for the tagline and facts, `--manor-night` for the vignette, all from `tokens.css`. No new colour is introduced.

### Heading, tagline, facts

```tsx
<h1 class="title-heading" tabindex={-1}>Dark Pattern Manor</h1>
<p class="title-tagline">Every trick is a ghost. Name it to set the page free.</p>
<p class="title-facts">12 haunted rooms · No account, nothing tracked · Plays by keyboard and screen reader</p>
```

- `.title-heading`: `font-family: var(--font-display)`, `font-weight: 700`, `color: var(--candle)`, a soft glow via `text-shadow` using a candle-tinted rgba, and `font-size: clamp(3rem, 2rem + 5vw, 6.5rem)` so it is ~3 rem at 412 px and ~6.5 rem at 1920 px. Centred.
- `.title-tagline`: `font-family: var(--font-ui)`, `color: var(--ghost)`, a comfortable size (~1.25 rem), centred.
- `.title-facts`: `font-family: var(--font-ui)`, `color: var(--ghost)`, smaller (~1 rem), centred, the three facts joined by " · " exactly as a single string so the middle dots are literal text.

All three are plain text nodes, so the tests can assert them word for word with `getByText` / `getByRole('heading')`.

### The ink-line ghost as a shared component

Room 1's ghost (in `src/rooms/gravemoor-gazette/Haunted.tsx`) is a thin white ink-line SVG:

```tsx
<svg viewBox="0 0 120 140" width="120" height="140" class="ghost" aria-hidden="true">
  <path class="ghost-body" d="M20 70 Q20 24 60 24 Q100 24 100 70 L100 118
     Q94 112 88 118 Q82 124 76 118 Q70 112 64 118
     Q58 124 52 118 Q46 112 40 118 Q34 124 28 118
     Q22 112 20 118 Z" />
  <circle class="ghost-eye" cx="48" cy="60" r="4" />
  <circle class="ghost-eye" cx="72" cy="60" r="4" />
  <path class="ghost-mouth" d="M52 74 Q60 82 68 74" />
</svg>
```

Extract this exact drawing into `src/ui/InkGhost.tsx`:

```tsx
export interface InkGhostProps {
  class?: string;
  width?: number;
  height?: number;
}
export default function InkGhost({ class: className = 'ghost', width = 120, height = 140 }: InkGhostProps) {
  return (/* the same svg, aria-hidden, same paths, same classes */);
}
```

Defaults reproduce room 1's current SVG exactly: `class="ghost"`, `width="120"`, `height="140"`, the same `viewBox`, the same three paths/circles with the same class names. Room 1 then renders `<InkGhost />` in place of its inline `<svg>`.

**Switch room 1 only if nothing changes.** The extracted component with its defaults produces byte-identical SVG markup to room 1's current inline SVG (same element order, same attributes, same classes). Room 1's own test (`gravemoor-gazette.test.tsx`) and the engine axe/contrast tests continue to pass unchanged, which is the proof that room 1's output did not change. If any room-1 assertion were to change, room 1 would be left alone and only the title screen would use `InkGhost`; the design intent is that it does not change, so room 1 is switched.

On the title screen the ghost is sized by CSS, not the SVG's intrinsic width/height:

```tsx
<span class="title-ghost" aria-hidden="true">
  <InkGhost />
</span>
```

`.title-ghost` is a reserved, fixed-size box (so there is no layout shift): `height: clamp(80px, 8vw, 140px)` with a matching width ratio, positioned beside the heading (to its right on wide viewports, above/beside on phones). The inner SVG fills the box via `width: 100%; height: 100%`. A gentle float animation (`transform: translateY`) runs by default; under `@media (prefers-reduced-motion: reduce)` the animation is removed so the ghost holds still. The ghost is `aria-hidden` (the `<span>` wrapper carries it, and `InkGhost`'s SVG is also `aria-hidden`), so screen readers skip it.

### The progress-aware controls

The controls are computed from progress read in the initial bundle, with no room chunk loaded. To name the next unfinished room without importing its chunk, a small ordered name list lives beside the registry:

`src/engine/registry.ts` gains an exported constant:

```ts
/** Room display names in product order, index = room number - 1. */
export const ROOM_NAMES: readonly string[] = [
  'The Foyer', 'The Library', 'The Dining Room', 'The Parlour',
  'The Conservatory', 'The Ballroom', 'The Portrait Gallery', 'The Pantry',
  'The Study', 'The Nursery', 'The Attic', 'The Cellar',
];
```

These names are static strings (they already appear, identically, in `EndingPage.tsx`'s checklist), so nothing new is loaded. `roomSlugs()` already gives the slug order; `ROOM_NAMES[i]` is the display name of room `i + 1`.

The next unfinished room is the first slug, in order, not in `loadProgress().completed`:

```ts
const { completed } = loadProgress();
const slugs = roomSlugs();
const firstUnfinishedIndex = slugs.findIndex((s) => !completed.includes(s)); // -1 when all done
const done = doneCount();
```

Rendering by progress:

- **0 complete** (`done === 0`): primary anchor `href="#/room/1"` reading "Enter the manor".
- **1–11 complete** (`done >= 1 && done < 12`): primary anchor to `#/room/${firstUnfinishedIndex + 1}` reading `Continue: ${ROOM_NAMES[firstUnfinishedIndex]}` (e.g. "Continue: The Conservatory"); secondary anchor `href="#/room/1"` reading "Start from the Foyer". Navigating to room 1 does not write progress, so starting from the Foyer never erases anything — progress is monotonic.
- **12 complete** (`done >= 12`): primary anchor `href="#/end"` reading "The manor is quiet" (today's wording, now the primary control); secondary anchor `href="#/room/1"` reading "Walk the rooms again".

All controls are anchors styled as candle buttons (`.title-button` primary, `.title-link` secondary). `.title-button` reuses the rooms' candle button look: a gold→candle gradient fill, `--ink` text (AA on the candle fill), min 44×44 target, and a 3 px `--candle` focus ring via `:focus-visible`. `.title-link` is a quieter candle-coloured underlined link, also at least 44 px tall in its tap area. Because they are real `<a href="#/…">` elements, the existing hash router (`parseHash` + the `hashchange` listener in `App.tsx`) drives every transition, exactly as the rooms' `.room-continue` links already do.

### Above the fold and no layout shift

The screen is a single centred column (`display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh`). The heading uses `clamp()` so it never overflows a 412 px width; the ghost box is `clamp()`-sized and reserved. At 1920×1080 the column (heading ≤ 6.5 rem, tagline, facts, one or two controls, ghost beside the heading) fits well inside 1080 px; at 412×915 the smaller clamp values keep the same four required elements visible without scrolling. The ghost's fixed box and the static text mean nothing reflows after first paint (CLS 0). No new raster image and no new `@fontsource` import are added — the backdrop and both fonts are already loaded.

### Files

```
src/app/TitleScreen.tsx         # new — the component
src/app/title-screen.css        # new — its styles (imported by TitleScreen.tsx)
src/app/TitleScreen.test.tsx    # new — its tests
src/ui/InkGhost.tsx             # new — the shared ink-line ghost
src/engine/registry.ts          # edited — add ROOM_NAMES
src/app/App.tsx                 # edited — render <TitleScreen />, drop inline title markup
src/rooms/gravemoor-gazette/Haunted.tsx  # edited — use <InkGhost /> (only if output is unchanged)
```

`App.test.tsx` already asserts the title heading, tagline, and the end link; those texts stay (the subtitle text and "Dark Pattern Manor" are unchanged). The old "Start" button and its two tests (`clicking Start shows "The Foyer"`, `clicking Back returns to the title`) are updated to drive the new anchors instead, because the "Start" button no longer exists — this is covered in tasks.

## The sound gesture-gate fix

### Today

`ensureContext()` creates the context the first time any sound function runs:

```ts
function ensureContext(): AudioContext | null {
  const Ctor = AudioCtor();
  if (!Ctor) return null;
  if (!ctx) { ctx = new Ctor(); master = ctx.createGain(); /* … */ }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  return ctx;
}
```

`Room.tsx` calls `startAmbience()` in a mount effect while the room is haunted. On a direct visit to `#/room/N`, that effect runs before any gesture, so `ensureContext()` builds the context with no user activation and the browser warns.

### The change

Add a user-activation gate at the top of `ensureContext`, plus a one-time armed listener:

```ts
let pendingGesture = false; // a capture-phase listener is armed, waiting for the first gesture

/** True only when the platform reports there has been no user activation yet. */
function awaitingFirstGesture(): boolean {
  const ua = typeof navigator !== 'undefined'
    ? (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
    : undefined;
  return !!ua && ua.hasBeenActive === false;
}

function armGestureListener(): void {
  if (pendingGesture || typeof window === 'undefined') return;
  pendingGesture = true;
  const onGesture = () => {
    window.removeEventListener('pointerdown', onGesture, true);
    window.removeEventListener('keydown', onGesture, true);
    pendingGesture = false;
    const c = ensureContext();            // now hasBeenActive is true → really creates it
    // Resume the ambience if sound is on and a room is still haunted.
    if (c && soundOn && roomTag && HAUNTED_TAGS.has(roomTag)) startAmbience();
  };
  window.addEventListener('pointerdown', onGesture, true);  // capture phase
  window.addEventListener('keydown', onGesture, true);      // capture phase
}

function ensureContext(): AudioContext | null {
  const Ctor = AudioCtor();
  if (!Ctor) return null;
  if (!ctx && awaitingFirstGesture()) {   // no activation yet → defer, arm once, create nothing
    armGestureListener();
    return null;
  }
  if (!ctx) {
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  return ctx;
}
```

Notes:

- `awaitingFirstGesture()` is true **only** when `navigator.userActivation` exists and `hasBeenActive === false`. When `userActivation` is absent (jsdom, older browsers) it is false, so `ensureContext` behaves exactly as today (Requirement 7.4). When `hasBeenActive` is true it is also false, so again today's behaviour (Requirement 7.5).
- When deferring, `ensureContext` returns null and the calling sound function no-ops cleanly (every caller already handles a null context). `startAmbience()`'s own guard (`if (!c || !master) return;`) means no ambience object is created while deferred, so a later real `startAmbience()` on the first gesture is not blocked by a stale `ambience`.
- The listener is capture-phase on `window` and removes itself after the first `pointerdown` or `keydown`, so it fires exactly once (Requirement 7.2, 7.3). On that gesture `userActivation.hasBeenActive` is now true, so the re-entrant `ensureContext()` really creates the context, and the ambience is (re)started when appropriate.
- `pendingGesture` prevents arming more than one pair of listeners if several sound calls are deferred before the first gesture.
- `__resetForTests()` must clear `pendingGesture` and remove any armed listeners so tests start clean. The reset drops `ctx`/`master`/`ambience`/listeners today; it will also set `pendingGesture = false` (the armed window listeners are harmless after reset because `onGesture` is a fresh closure per arm and a reset test re-installs a fresh window state, but to be safe the arm is idempotent and self-removing).

### Why the toggle path is unaffected

When the player clicks the Sound toggle or the lantern, that click *is* the user gesture; by the time the handler's `ensureContext()` runs, `hasBeenActive` is already true, so the context is created immediately — no deferral, no change from today. The deferral only ever triggers for sound requested before any gesture (the direct-visit ambience on mount).

## Testing Strategy

### Title screen (`src/app/TitleScreen.test.tsx`)

Vitest + `@testing-library/preact` + `axe-core`, resetting progress with `__resetForTests` from `progress.ts` in `beforeEach`/`afterEach` (matching `App.test.tsx`). Helper `complete(n)` completes the first `n` rooms in slug order via `completeRoom`.

- Heading "Dark Pattern Manor", tagline, and facts line asserted word for word.
- 0 complete: primary anchor text "Enter the manor", `href="#/room/1"`; no secondary link.
- 3 complete: primary anchor text "Continue: The Parlour" (room 4 is the next unfinished), `href="#/room/4"`; secondary anchor "Start from the Foyer", `href="#/room/1"`.
- 12 complete: primary anchor "The manor is quiet", `href="#/end"`; secondary anchor "Walk the rooms again", `href="#/room/1"`.
- The ghost element is `aria-hidden` (query the `.title-ghost` wrapper / the svg).
- Focus returns to the heading: render, assert the `h1` has `tabindex=-1`, call `.focus()` (or assert `App` focuses it on the title route) and check `document.activeElement` is the heading.
- axe-core zero violations (with `color-contrast` enabled) at 0, 3, and 12 complete.

### App (`src/app/App.test.tsx`)

Updated so the two interaction tests drive the new anchors (click the "Enter the manor" anchor instead of "Start"; return to the title via the hash) and the existing title/subtitle/end-link assertions still hold. The heading, subtitle, and end-link texts are unchanged, so those assertions keep passing as-is.

### Room 1 (`src/rooms/gravemoor-gazette/gravemoor-gazette.test.tsx`)

Not modified. It passes unchanged, proving the `InkGhost` extraction did not change room 1's output. If it had failed, room 1 would revert to its inline SVG.

### Sound (`src/audio/sound.test.tsx`)

A helper installs/removes a fake `navigator.userActivation`:

```ts
function setUserActivation(hasBeenActive: boolean | undefined) {
  if (hasBeenActive === undefined) delete (navigator as any).userActivation;
  else Object.defineProperty(navigator, 'userActivation', {
    configurable: true, value: { hasBeenActive },
  });
}
```

New cases, each restoring `navigator.userActivation` afterwards:

1. **Deferred before a gesture**: `userActivation.hasBeenActive = false`; render `Room` (the Foyer, haunted on mount) with sound on; assert `contextsCreated === 0`. Then dispatch `new KeyboardEvent('keydown')` on `window`; assert `contextsCreated === 1` and that the ambience started (a buffer source exists on the live context). Clean up listeners via `__resetForTests`.
2. **No `userActivation`**: delete it; today's behaviour — mounting a haunted room with sound on creates one context immediately (the existing ambience tests already cover this, re-asserted here for clarity).
3. **`hasBeenActive === true`**: today's behaviour — context created on demand immediately.

All existing sound tests keep passing because, in jsdom, `navigator.userActivation` is absent by default, so `awaitingFirstGesture()` is false and nothing defers unless a test opts in.

### Gates

`npm test`, `npm run build`, `npm run check:rooms`, `npm run check:size` all pass. The title screen adds a small component and CSS and no new asset, so the bundle stays within the 100 KB budget.
