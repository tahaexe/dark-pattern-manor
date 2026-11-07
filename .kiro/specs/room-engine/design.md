# Design Document

## Overview

The Room Engine is the core subsystem in `src/engine` that drives a single room of Dark Pattern Manor through its lifecycle: a haunted brand page, the act of naming the trick, and the honest twin shown beside it. It is the contract between per-room content (the `RoomData` object with its Haunted and Honest components, three spell cards, and Ghost Guide entry) and the shared app shell (routing, progress, shared UI).

The engine is built from two cleanly separated halves:

1. **A pure reducer** (`src/engine/machine.ts`) that holds the room state machine. It is a plain function `(state, event) => state` with no Preact, no DOM, and no side effects. Because it is pure, every transition in Requirement 2 and every state-machine correctness property can be exercised in isolation with unit tests and fast-check property tests, with no rendering.
2. **Preact components** (`src/engine/Room.tsx` and the shared UI in `src/ui`) that render the current reducer state, translate player input into events, manage the live region and focus, and enforce the accessibility and reduced-motion guarantees.

Rooms are loaded **on demand**. The initial bundle carries only the engine and shared UI; each room's data, Haunted component, Honest component, and CSS arrive through a dynamic `import()` keyed by room slug when the player enters that room (Requirement 7).

The engine enforces the data invariants (Requirement 1, 8) at two moments: at authoring time through a Node validation script (`npm run check:rooms`) that fails the build if any room breaks a rule, and at test time through fast-check property tests. The reducer guarantees the no-fail rule (Requirement 5): a wrong card never changes progress; it only whispers a hint.

### Design goals

- The reducer is the single source of truth for room state; components render it and never hold parallel state that could drift.
- Every rule that a room must obey is executable: a property test, an axe-core assertion, or a line in `check-rooms.mjs`. Nothing is left to prose.
- The engine serves all 12 rooms identically. Nothing in the engine knows about any specific room; room difference lives entirely in `RoomData`.
- Fiction and honesty (Requirement 8) are structural: brand identity is rendered only from `RoomData`, and the honest twin is a real best practice, verified by each room's own test.

## Folder and file naming

Every room lives in `src/rooms/<slug>/`, where `<slug>` is the room's fictional brand slug — not its number or room title. The room's number and display title (for example `1` and `"The Foyer"`) live inside the room's `RoomData`, never in the folder name. Each room owns its test at `src/rooms/<slug>/<slug>.test.tsx`.

Room 1, The Foyer, is the fictional brand **The Gravemoor Gazette**, so its files are:

- `src/rooms/gravemoor-gazette/room.ts`
- `src/rooms/gravemoor-gazette/Haunted.tsx`
- `src/rooms/gravemoor-gazette/Honest.tsx`
- `src/rooms/gravemoor-gazette/room.css`
- `src/rooms/gravemoor-gazette/gravemoor-gazette.test.tsx`

`check-rooms.mjs` asserts that each room's `slug` matches the folder it is registered from, so a mismatched folder and slug fails the build.

## Architecture

### The room state machine as a pure reducer

The machine lives in `src/engine/machine.ts` and exports:

- `type RoomState` — the discriminated union of states.
- `type RoomEvent` — the discriminated union of events.
- `initialState(room: RoomData): RoomState` — the starting `haunted` state for a room.
- `reduce(state: RoomState, event: RoomEvent, room: RoomData): RoomState` — the pure transition function.

States (Requirement 2.1): `haunted → inspecting → picking → named → honest → done`.

```
 ┌──────────┐  LANTERN     ┌────────────┐  SELECT_POSSESSED   ┌──────────┐
 │ haunted  │ ───────────▶ │ inspecting │ ──────────────────▶ │ picking  │
 └──────────┘              └────────────┘                     └──────────┘
                                  ▲  │ SELECT_OTHER                 │
                                  └──┘ (stay, announce              │ PICK_CORRECT
                                       "Nothing haunts this.")      ▼
                                                               ┌──────────┐
                                        PICK_WRONG (stay,      │  named   │
                                        announce hint) ◀───────┤          │
                                                               └──────────┘
                                                                     │ auto (no input)
                                                                     ▼
 ┌──────────┐  COMPLETE_TASK   ┌──────────┐                   ┌──────────┐
 │   done   │ ◀─────────────── │  honest  │ ◀──────────────── │ (named)  │
 └──────────┘                  └──────────┘                   └──────────┘
```

Transition table:

| From | Event | To | Side signal |
| --- | --- | --- | --- |
| `haunted` | `LANTERN` | `inspecting` | — |
| `inspecting` | `SELECT_POSSESSED` | `picking` | — |
| `inspecting` | `SELECT_OTHER` | `inspecting` | announce `"Nothing haunts this."` |
| `picking` | `PICK` (correct card) | `named` | — |
| `picking` | `PICK` (wrong card) | `picking` | announce that card's hint; flag `flicker` |
| `named` | `ADVANCE` (auto) | `honest` | — |
| `honest` | `COMPLETE_TASK` | `done` | caller persists progress |

Key properties the reducer guarantees:

- The `named → honest` step takes no player input (Requirement 2.5). The `Room` component dispatches `ADVANCE` immediately on entering `named`, so the player experiences one motion: pick the right card, the ghost flees, the honest twin appears.
- A `PICK` with a wrong card returns a state still in `picking` with the hint attached and no progress change (Requirements 2.6, 5.2, 5.5). The reducer never produces a fail state because none exists in the union (Requirement 5.1, state-machine property "no transition reaches a fail state").
- Each wrong `PICK` sets a fresh, single-use `wrongHint` plus a `whisperNonce` that increments on every wrong pick, so the view can announce the whisper exactly once per pick and never re-announce a stale hint on an unrelated re-render (Requirements 5.2, 5.5; see the live-region design below).
- From any non-`done` state there is always a path to `done` (Requirement 2.10): the reducer never removes the only remaining edge, and wrong picks are self-loops, so liveness holds before and after any input.
- Progress is not held in the reducer. `done` is terminal for a room; the done **count** lives in the progress store and only ever increases (state-machine property "progress never decreases").

The reducer carries, inside the state, only what the view needs to render: the current state tag, the last announcement string, and a transient `wrongHint`/`flicker`/`whisperNonce` marker cleared or advanced on the next event. It holds a reference to nothing mutable.

### The Preact components around it

`src/engine/Room.tsx` is the one component that owns a running room. It:

1. Receives a loaded `RoomData` (see on-demand loading below).
2. Holds the reducer state with `useReducer(reduceBound, initialState(room))`.
3. Renders, per state, the room's `Haunted` component, the lantern, the spell picker, the live region, and — from `honest` onward — the comparison box (the haunted preview and the honest twin stacked in one cell), the Before/After slider, and the Ghost Guide card.
4. Translates player input (pointer, keyboard, the L key, screen-reader activation) into `RoomEvent`s.
5. On every state change, writes the new state's announcement into the live region (Requirement 3.1) and moves focus to the heading that labels the new state (Requirement 3.2).
6. On reaching `done`, calls the progress store to persist completion and unlock the next room (Requirement 2.8).

The room's own `Haunted` and `Honest` components are supplied by `RoomData`; `Room.tsx` never hard-codes any brand. Shared chrome (lantern, spell picker, live region, slider, guide card, task bar, candle progress) lives in `src/ui` and is imported by `Room.tsx`, so it ships in the initial bundle.

### Rooms loaded on demand

Rooms are registered in a manifest `src/engine/registry.ts` that maps each slug to a lazy loader:

```ts
// registry.ts — no room code is imported eagerly; only loader thunks.
export const rooms: Record<string, () => Promise<{ default: RoomData }>> = {
  'gravemoor-gazette': () => import('../rooms/gravemoor-gazette/room'),
  // ...the other 11 added as they are built, keyed by brand slug
};
```

`loadRoom(slug)` awaits the thunk and returns the `RoomData`. Each room's `room.ts` imports its own `./Haunted`, `./Honest`, and `./room.css`, so entering a room pulls exactly that room's code and styles in one chunk, and nothing else (Requirements 7.1, 7.2). The app shell shows a lightweight loading state (in-manor, whole, never broken) while the chunk arrives. The initial bundle budget is 100 KB compressed (Requirement 7.3), checked by a build-size gate (see below); because no room is statically imported, the budget holds as rooms are added.

### The initial-bundle size budget

The initial application bundle must not exceed **100 KB compressed** (Requirement 7.3). A Node check — `scripts/check-bundle-size.mjs`, run as `npm run check:size` after `npm run build` — reads the Vite build manifest, sums the gzip (brotli) size of the entry chunk and its static imports (engine + shared UI, no room chunks), and exits non-zero if the total is above the 100 KB limit, printing the measured size and the limit. The GitHub Pages workflow runs the build then this check, so a bundle over budget fails the build rather than shipping. Because rooms are reached only through dynamic `import()`, room chunks are never counted in the entry total, and the budget stays stable as rooms are added. The atmosphere layer (below) is lazy-loaded with the room so it, too, stays out of the entry total.

### Privacy

Progress is the only persisted state and it lives in `localStorage` (Requirement 2.9, steering "Runtime privacy"). The engine sets no cookies and makes no third-party request; the only network traffic is the same-origin dynamic import of room chunks.

## Components and Interfaces

### Types: `RoomData` and `SpellCard` (`src/engine/types.ts`)

```ts
export type PatternName = string; // one of the 18 named dark patterns; see patterns.ts / relatives.ts

export interface SpellCard {
  pattern: PatternName;          // non-empty; one of the 18 pattern types
  role: 'correct' | 'relative' | 'different';
  hint?: string;                 // required when role !== 'correct'; ≤ 20 words; never names the correct pattern
}

export interface GuideLine {
  sourceLabel: string;           // non-empty
  url: string;                   // non-empty, absolute, https, on the primary-source allowlist
}

export interface GuideEntry {
  definition: string;            // non-empty, two sentences
  whereYouMeetIt: string;        // non-empty
  us: GuideLine;                 // non-empty label + https url
  eu: GuideLine;                 // non-empty label + https url
  tip: string;                   // non-empty; exactly one protection tip
}

export interface RoomData {
  id: number;                    // unique positive integer across all rooms, 1–12
  slug: string;                  // non-empty kebab-case; matches the room's folder name
  name: string;                  // display name, e.g. "The Foyer"
  brand: string;                 // fictional brand, e.g. "The Gravemoor Gazette"
  brandKind: string;             // e.g. "news"
  domain: string;                // fictional, .manor pseudo-domain, e.g. "gravemoor-gazette.manor"
  pattern: PatternName;          // the room's dark pattern, used exactly once across rooms
  task: string;                  // e.g. "reject the cookies"
  possessedId: string;           // id of the possessed element; found in the DOM by this id
  Haunted: FunctionComponent<HauntedProps>;
  Honest: FunctionComponent<HonestProps>;
  cards: [SpellCard, SpellCard, SpellCard]; // exactly three
  guide: GuideEntry;
}
```

`HauntedProps` give the Haunted component the callbacks it needs: `onSelectPossessed`, `onSelectOther`, and the current `signsActive` / `reducedMotion` flags so it can render ghost signs, plus a `preview` flag for the static "before" side of the comparison. `HonestProps` give the Honest component `onCompleteTask` so its single task action dispatches `COMPLETE_TASK`. Both variants are rendered from the same `RoomData`, so they necessarily share the room's brand, the room's content, and the room's task; `check-rooms.mjs` asserts the two variants are built from one `RoomData` and never diverge on brand, content, or task.

### The pattern vocabulary (`src/engine/patterns.ts`)

Spell card names may come only from the 18 dark-pattern types the steering names: the 12 room patterns — Visual interference, Trick wording, Confirmshaming, Hidden subscription, Fake urgency, Fake scarcity, Fake social proof, Sneaking, Hidden costs, Nagging, Preselection, Hard to cancel — and the 6 wandering patterns that live only in the Guide — Disguised ads, Forced action, Obstruction, Comparison prevention, Addictive design, Currency confusion. `patterns.ts` exports this frozen list as `PATTERNS`; `check-rooms.mjs` and the room-data property test reject any card whose `pattern` is not in `PATTERNS`.

### The relatives table (`src/engine/relatives.ts`)

One symmetric table declares which patterns are close relatives (design decision 1). It is stored as unordered pairs and read through helpers:

```ts
export const RELATIVE_PAIRS: ReadonlyArray<readonly [PatternName, PatternName]> = [
  ['Visual interference', 'Trick wording'],
  ['Trick wording', 'Preselection'],
  ['Confirmshaming', 'Nagging'],
  ['Hidden subscription', 'Hidden costs'],
  ['Fake urgency', 'Fake scarcity'],
  ['Fake scarcity', 'Fake social proof'],
  ['Sneaking', 'Preselection'],
  ['Hidden costs', 'Sneaking'],
  ['Hard to cancel', 'Hidden subscription'],
  ['Hard to cancel', 'Obstruction'],
  ['Nagging', 'Forced action'],
  ['Nagging', 'Addictive design'],
  ['Visual interference', 'Disguised ads'],
  ['Hidden costs', 'Comparison prevention'],
  ['Hidden costs', 'Currency confusion'],
];

export function areRelatives(a: PatternName, b: PatternName): boolean; // symmetric lookup
export function relativesOf(p: PatternName): PatternName[];
```

**Room card validity rule** (design decision 1): a room is valid only if

- its `relative` card's pattern is a relative of the room's `pattern` (`areRelatives(pattern, relativeCard.pattern)` is true), and
- its `different` card's pattern is neither the room's `pattern` nor a relative of it.

The table is symmetric: `areRelatives(a, b) === areRelatives(b, a)`. A fast-check property asserts symmetry, and `check-rooms.mjs` asserts the validity rule per room.

### The reducer's states and events (`src/engine/machine.ts`)

```ts
export type RoomStateTag =
  | 'haunted' | 'inspecting' | 'picking' | 'named' | 'honest' | 'done';

export interface RoomState {
  tag: RoomStateTag;
  announcement: string;    // text pushed to the live region for this state
  wrongHint?: string;      // set only after a wrong PICK; cleared on next event
  flicker?: boolean;       // set only after a wrong PICK (Requirement 5.3)
  whisperNonce: number;    // increments on each wrong PICK so the whisper announces exactly once per pick
}

export type RoomEvent =
  | { type: 'LANTERN' }
  | { type: 'SELECT_POSSESSED' }
  | { type: 'SELECT_OTHER' }
  | { type: 'PICK'; card: SpellCard }
  | { type: 'ADVANCE' }        // auto-dispatched on entering `named`
  | { type: 'COMPLETE_TASK' };
```

The reducer is total: unexpected events in a given state return the state unchanged (another guard against dead ends). Every transition in the table above is a unit test; the state-machine correctness properties are fast-check tests over sequences of events.

### The lantern (`src/ui/Lantern.tsx`)

A real `<button>` labelled `Lantern (L)` (matching the prototype) that dispatches `LANTERN`. A global key handler maps the `L` key to the same event while the room is in `haunted`. Operable by pointer and keyboard (Requirement 2.2, 3.3).

### The spell picker (`src/ui/SpellPicker.tsx`)

Renders the three cards as real `<button>` elements (never `div role="button"`; the prototype test enforces this), each labelled by its pattern name, in a shuffled order (shuffle property). Selecting a card dispatches `PICK` with that card. The correct card drives `named`; a wrong card keeps `picking` and surfaces the hint. All cards stay enabled after a wrong pick (Requirement 5.5). Card symbols are inline SVG per the look rules. Because the order is shuffled per room, `check-rooms.mjs` asserts across all rooms that the correct card is **not** in the same position in every room (the correct-card position is not constant).

### The live region (`src/ui/LiveRegion.tsx`)

A single `role="status" aria-live="polite"` element (matching the prototype's "Spell card feedback" region) that renders `state.announcement` and, when present, `state.wrongHint`. Every state change writes here (Requirement 3.1). This is the screen-reader channel for "Nothing haunts this.", the whispered hints, and state labels.

The whisper of a wrong card fires **exactly once per pick** and is announced **once** in this polite live region: the view keys the whisper on `state.whisperNonce`, so each wrong `PICK` produces one new announcement and no re-render re-announces a stale hint; a correct pick, a repeated identical render, or any unrelated state change does not re-fire the whisper (Requirements 2.6, 5.2, 5.5). The engine test asserts a single wrong pick yields exactly one whisper in exactly one polite region.

### The Before/After comparison wipe (Requirement 9)

From the `honest` state on, `Room.tsx` renders a **comparison box** — a classic before/after wipe — in place of the old two-column side-by-side layout.

**Layout.** The two versions are stacked in one CSS-grid cell (both children assigned `grid-area: 1 / 1`), so the box is as tall as the taller of the two and nothing shifts as the wipe moves (Requirement 9.1). The haunted preview is drawn underneath; the honest twin is drawn on top and revealed from the left edge up to the slider's value with

```css
.comparison-honest { clip-path: inset(0 calc(100% - var(--split)) 0 0); }
```

where the honest layer carries an inline `--split: <value>%` (Requirement 9.2). A value of 0 shows all haunted, 100 all honest (Requirement 9.3). A thin vertical divider in the candle colour with a small round grip sits at the reveal edge; the divider and grip are decorative and `aria-hidden` (Requirement 9.6). A small "Haunted" label sits in the top-right corner and a "Honest" label in the top-left corner, each clipped to its own side of the divider so each is visible only on its own side (Requirement 9.7).

The comparison box carries `role="group"` with the accessible name "Haunted and honest versions" (Requirement 9.11). The haunted preview inside it stays non-interactive (`preview` mode: `aria-hidden`, `tabIndex={-1}`, no `onClick`, no possessed-element id), exactly as today. The honest twin stays the interactive layer: its single task button completes the room (Requirement 9.10). Clipped-away parts of the honest layer receive no pointer events by the nature of `clip-path`.

**The opening sweep.** When the comparison first appears, the slider starts at 50. Under `prefers-reduced-motion` it is set to 50 and held there with no animation (Requirement 9.4). Otherwise an effect sweeps the value once from 0 to 50 over about 1.2 s with `requestAnimationFrame`, then rests at 50, so the reveal is seen (Requirement 9.5). The sweep runs once per room; it is cancelled on unmount.

**Dragging the divider.** In addition to the range input, the player can drag the divider itself: a `pointerdown` on the comparison box (with pointer capture) and `pointermove` set the value from the pointer's x position relative to the box (`(clientX − left) / width × 100`, clamped 0–100). This pointer path does **not** move keyboard focus (Requirement 9.8).

**Focus safety (WCAG 2.4.11).** When any element inside the honest layer receives focus (a `focusin` listener on the honest layer), the slider jumps to 100 at once, so a focused control is never hidden behind the clip (Requirement 9.9).

**Narrow screens.** Below 600 px the comparison box is full width and the same wipe works unchanged (Requirement 9.12).

The engine's comparison uses its own class names (`.comparison`, `.comparison-cell`, `.comparison-haunted`, `.comparison-honest`, `.comparison-divider`, `.comparison-grip`, `.comparison-tag`) so the standalone look-page prototype's `.split` styles are untouched.

### The Before/After slider (`src/ui/BeforeAfterSlider.tsx`)

An `<input type="range">` exposed as an ARIA slider, operable by keyboard (Requirement 3.6, 9.8). It drives the comparison wipe; it appears from the `honest` state onward. Value 0 shows fully haunted, 100 fully honest; the control is labelled "Before and After slider". Keyboard semantics: Left/Down decrease and Right/Up increase by one `step`; Page Down decreases and Page Up increases by `step × 5`; `Home` jumps to the minimum (0, fully haunted) and `End` to the maximum (100, fully honest); all values are clamped to 0–100. In the engine the slider is given `step={5}`, so the arrow keys move by 5 and Page Up/Down by 25. Pointer dragging on the range works natively. The component's own test uses the default `step` of 1. The engine test drives the slider with the arrow keys, Page Up/Down, and `Home`/`End` and asserts the value and the rendered `--split` move accordingly.

### The Ghost Guide card (`src/ui/GuideCard.tsx`)

Opens on entering `honest`. Renders the room's `GuideEntry`: the two-sentence definition, the where-you-meet-it line, a US line and an EU line each with a real source link (`sourceLabel` + `url`), and one protection tip. The guide title uses Cormorant Garamond per the look rules. All content comes from `RoomData.guide`; the component hard-codes nothing brand- or pattern-specific. Every source URL is `https` and on the primary-source allowlist (below), enforced by `check-rooms.mjs`.

### The primary-source allowlist

Ghost Guide sources are limited to the primary-source domains the steering names (FTC "Bringing Dark Patterns to Light" for the US line; EU DSA Art. 25 / EDPB for the EU line). The allowlist is:

- `ftc.gov`
- `eur-lex.europa.eu`
- `edpb.europa.eu`

`check-rooms.mjs` requires every `us.url` and `eu.url` to be `https` and to have a host that equals, or is a subdomain of, a domain on this allowlist; any other host fails the build.

### The progress store in localStorage (`src/engine/progress.ts`)

```ts
interface Progress { completed: string[]; unlocked: string[]; }
export function loadProgress(): Progress;
export function completeRoom(slug: string, nextSlug?: string): Progress; // adds to completed, unlocks next
export function doneCount(): number;
```

Backed by a single `localStorage` key (e.g. `dpm:progress`). `completeRoom` is monotonic: it only adds to `completed` and `unlocked`, so the done count never decreases (state-machine property). No timer, score, strike counter, or reset mechanism exists (Requirement 5.1). The store sets no cookies and makes no network request (Requirement 2.9). It degrades safely when `localStorage` is unavailable (in-memory fallback) so the game never dead-ends.

## The atmosphere layer and the common moments

The manor has a shared living atmosphere and two haunted moments that are the
same in every room. Both are specified in full in `.kiro/specs/atmosphere`; the
engine's part is summarised here.

### The atmosphere layer

One component, `src/ui/Atmosphere.tsx` (with its pure core in
`src/ui/atmosphere-core.ts` and styles in `src/styles/atmosphere.css`), draws on
a single `<canvas>` placed inside the room's `aria-hidden` `.room` backdrop
layer, beneath the manor frame, the task bar, the spell cards, the comparison
box and every other control. It paints:

- a slow drifting fog (two or three soft, large, low-alpha bands) and 30–60
  dust motes caught in candlelight;
- a warm radial candlelight that breathes — its opacity moving between 1 and
  0.85 at most twice a second, the steering's flicker limit, never a flash.

It is cheap: it starts only after the first paint (`requestIdleCallback`, or a
short `setTimeout` fallback, so it never delays the largest paint), paints at
most 30 fps, pauses while the tab is hidden, sizes its backing store to the
device pixel ratio capped at 2, and stops the loop and removes its listeners on
unmount. It adds no new dependency and is lazy-loaded with the room so the
initial bundle stays under the `check:size` budget. The canvas is absolutely
positioned inside the already-reserved `.room` box, so it causes no layout
shift (a room's cumulative layout shift stays at or below 0.01). Under
`prefers-reduced-motion: reduce` it runs no animation and draws a single still
frame. When the room turns honest the layer **exhales** once over about a
second — the fog thinning, the glow rising — and then stays calm.

The engine wires it in as `<Atmosphere exhale={showSplit} reducedMotion={…} />`,
a sibling of `.room-wall` inside `.room`; the `exhale` prop turns true when the
comparison appears (the honest step).

### The common moments

The two moments every room shares are driven by the engine from the state it
already holds — the wrong-pick nonce and the `named`/`honest`/`done` state — not
by any per-room code. `Room.tsx` sets a `data-moment` attribute on
`.room-scene`: `"wrong"` keyed on `whisperNonce` (via `data-moment-key`, so each
wrong pick is a fresh value and the CSS animation restarts), `"right"` from the
moment the room is named onward, and absent otherwise. Shared CSS in
`src/styles/atmosphere.css` animates the `.ghost` / `.ghost-wrap` elements every
room already renders, with transforms and opacity only:

- **a wrong card** — the candles gutter (a brief ~300 ms dip of the warm
  `.room::after` light) and the ghost shakes its head once;
- **the right card** — the ghost stops mid-gesture and unwinds upward before it
  flees (the room's own 600 ms ghost-flee still carries the exit), and the page
  exhales.

Under reduced motion there is no gutter, no head-shake and no unwind; the ghost
simply fades. None of this hides content, so a wrong card still costs nothing
and the no-fail rule holds. All twelve rooms already name their ghost elements
`.ghost-wrap` / `.ghost`, so the shared selectors reach every room; where a room
differed, the shared class would be added rather than the room's element
renamed.

### manor-qa learns motion

`walk_rooms` and `contrast_scan` take an optional `reducedMotion` boolean
(emulated through the browser's media emulation before each page loads,
defaulting to false). The reduced-motion walk also asserts no element has a
running animation (`document.getAnimations()` is empty or every animation is
finished/paused) and that the static "Something stirs here" label is visible.
`walk_rooms` reports each room's cumulative layout shift (a buffered
`PerformanceObserver` for `layout-shift`) and fails a room whose shift exceeds
0.01. The tools keep their names and result shapes; only their JSON Schemas gain
the optional boolean. The pure rules (`wantsReducedMotion`, `clsWithinLimit`,
`animationsAtRest`) live in `scripts/mcp/motion.mjs` with `node:test` coverage.

## Data Models

The authored shape of a room is the `RoomData` object above. Constraints enforced by `check-rooms.mjs` and by fast-check property tests:

**Structural (Requirement 1):**

- `id` is a positive integer and unique across all rooms.
- `slug`, `name`, `brand`, `brandKind`, `domain`, `pattern`, `task`, `possessedId` are all non-empty; `slug` is kebab-case.
- `cards` has length exactly 3.
- Exactly one card has `role: 'correct'` and its `pattern` equals the room's `pattern`; exactly one has `role: 'relative'`; exactly one has `role: 'different'`.
- Every non-correct card has a non-empty `hint`.
- `guide` has a non-empty two-sentence `definition`, non-empty `whereYouMeetIt`, non-empty `us.sourceLabel`/`us.url`, non-empty `eu.sourceLabel`/`eu.url`, and non-empty `tip`.

**Room set (Requirement 1.6, product steering):**

- There are exactly 12 rooms with ids 1–12, each id used once.
- Each of the 12 room patterns is used by exactly one room.
- Each room's `brand` is one of the 12 approved fictional brands; its `slug` matches its folder; its `domain` uses the `.manor` pseudo-domain.

**Spell cards:**

- Every card's `pattern` is one of the 18 pattern types named in the steering.
- The correct card's position (after shuffling) is not constant across all rooms.

**Relatives (design decision 1):**

- The `relative` card's pattern is a relative of the room's pattern.
- The `different` card's pattern is neither the room's pattern nor a relative of it.

**Hint quality (design decision 2):**

- Each wrong card's `hint` has at most 20 words.
- No wrong card's `hint` contains the room's correct pattern name (case-insensitive substring check).

**Fiction and honesty (Requirement 8):**

- Brand name, brand kind, domain, and all shown people, products, and prices are fictional; the domain uses the `.manor` suffix to stay clearly non-real.
- The honest twin contains no instance of the room's pattern and completes the task in one action (verified per-room, below).

**Ghost Guide sources:**

- Each room has exactly one `tip` (one protection tip).
- Every `us.url` and `eu.url` is `https` and on the primary-source allowlist (`ftc.gov`, `eur-lex.europa.eu`, `edpb.europa.eu`).
- No quoted text in the guide exceeds 25 words.

### The Foyer sample data

| Field | Value |
| --- | --- |
| id | 1 |
| slug | `gravemoor-gazette` |
| name | The Foyer |
| brand | The Gravemoor Gazette |
| brandKind | news |
| domain | gravemoor-gazette.manor |
| pattern | Visual interference |
| task | reject the cookies |
| possessedId | `foyer-reject` |
| correct card | Visual interference |
| relative card | Trick wording (a relative of Visual interference) + hint |
| different card | Nagging (not a relative of Visual interference) + hint |

## Error Handling

**There is no fail state** (Requirement 5, steering "No fail state"). The engine has no error path that penalises the player:

- A **wrong spell card** is the central "error" the player can make, and it costs nothing. The reducer stays in `picking`, preserves all progress and sequence position, keeps every card selectable, sets `flicker` so the light flickers once (Requirement 5.3), advances `whisperNonce`, and whispers that card's hint through the live region exactly once (Requirements 2.6, 5.2, 5.5). With `prefers-reduced-motion` active, the flicker is replaced by a static, non-animated indicator (Requirement 5.4).
- Selecting a **non-possessed element** while inspecting is not an error either: the reducer stays in `inspecting` and announces "Nothing haunts this." (Requirement 2.4).
- **Unexpected events** for the current state are no-ops: the reducer returns the state unchanged, so no sequence of inputs can reach a dead end (Requirement 2.10).
- **Room chunk load failure** (offline, cache miss) shows an in-manor retry affordance that is whole and readable — never a broken frame — and does not advance or reset progress. Retrying re-issues the dynamic import.
- **`localStorage` unavailable** falls back to in-memory progress so the room still completes; nothing throws into the render path.

The haunting is always a clue layered on a working page, never hidden or broken content: all text stays readable and all controls operable while any ghost sign shows (Requirement 4.3, steering "Cracks and distortion"). The comparison wipe never hides a focusable honest control: focus inside the honest layer snaps the slider to 100 (Requirement 9.9).

## Testing Strategy

Testing is layered to match the architecture, and every rule above is executable.

### Reducer unit tests (`src/engine/machine.test.ts`)

One assertion per transition in Requirement 2: `LANTERN` moves `haunted → inspecting`; `SELECT_POSSESSED` moves `inspecting → picking`; `SELECT_OTHER` stays and announces "Nothing haunts this."; correct `PICK` moves to `named` then auto-`ADVANCE` to `honest`; wrong `PICK` stays in `picking` with the hint and no progress change and a bumped `whisperNonce`; `COMPLETE_TASK` moves `honest → done` (Requirement 6.1).

### Property-based tests with fast-check

- **Room data properties** (`src/engine/roomData.property.test.ts`, Requirement 6.2): over a generator of valid rooms and over the real room registry — cards length is 3; exactly one correct/relative/different; each wrong card has a non-empty hint ≤ 20 words that never names the correct pattern; every card's pattern is one of the 18 pattern types; ids unique across rooms; guide US/EU lines non-empty; relatives validity rule holds; shuffle yields a permutation of the same three cards (same set, possibly different order).
- **Relatives table property** (`src/engine/relatives.property.test.ts`): `areRelatives` is symmetric for all pattern pairs.
- **State machine properties** (`src/engine/machine.property.test.ts`, Requirement 6.3): for any event sequence, dispatching the correct card eventually reaches `honest`; a wrong pick keeps `picking`; no transition reaches a fail state; the done count is monotonic (never decreases).

### axe-core accessibility tests

- Engine-level (`src/engine/Room.axe.test.tsx`, Requirement 6.4): render one room in each of the six states (`haunted`, `inspecting`, `picking`, `named`, `honest`, `done`) and assert zero axe violations in every state, including the comparison box in the honest and done states.
- Per-room (below, design decision 5): axe-core finds zero violations on both the haunted and honest variants of every room, with the `color-contrast` rule included (not disabled). With `prefers-reduced-motion` mocked on, assert no ghost sign animates (the possessed element shows the static dashed candle outline and the "Something stirs here" label instead).

### The atmosphere and moment tests

- **`src/ui/atmosphere-core.test.ts`** (vitest): the pure core — the 30 fps limiter (`shouldDraw`), the mote and fog parameters (`moteCount` in 30–60, `fogBands` 2 or 3, `backingScale` = min(dpr, 2)), the breathing bound (`breath` in [0.85, 1]), the reduced-motion still-frame decision (`renderPlan`), and the exhale easing (`exhaleProgress`).
- **`src/engine/Room.moment.test.tsx`** (vitest): a wrong pick sets `data-moment="wrong"` with a `data-moment-key` that changes on a second wrong pick; the right card leaves `data-moment="right"` and clears the wrong moment.

### Engine interaction tests (`src/engine/Room.test.tsx`)

- The full loop: lantern → inspecting → pick possessed → picking → correct card → honest → complete task → done; focus moves to the new state's heading; loading a room uses dynamic import.
- **The wrong-card whisper fires exactly once per pick and is announced once** in the single polite live region: after one wrong pick, exactly one whisper is present in exactly one `aria-live="polite"` region and is not re-announced by subsequent unrelated re-renders.
- **The comparison box** appears with both versions in a `role="group"` labelled "Haunted and honest versions"; under `prefers-reduced-motion` the slider's value is 50 and the honest layer's inline style carries a matching `--split: 50%`.
- **The Before/After slider moves with the keyboard**: the arrow keys step the value by 5, Page Up/Down by 25, `Home` sets it to 0 and `End` to 100, clamped; the test asserts the slider value after each key.
- **Focus safety**: focusing the honest twin's task button moves the slider to 100.
- **Completion at any slider value**: the honest twin's single task click moves the room to `done` regardless of the slider's value.

### Per-room tests (`src/rooms/<slug>/<slug>.test.tsx`, design decision 4)

Every room ships its own test file (for The Foyer: `src/rooms/gravemoor-gazette/gravemoor-gazette.test.tsx`) asserting:

1. The **honest variant completes the task in one click** (a single activation of the task action moves the room to `done`).
2. The **possessed element is reachable by keyboard** (focusable, non-empty accessible name, selectable without a pointer) and is found by its `possessedId`.
3. The **room's own pattern rule passes on the honest variant and fails on the haunted variant.** A test that passes on both variants is considered broken and must be rewritten, because it would not be detecting the pattern.
4. **Every text passes WCAG AA contrast in both variants** (axe `color-contrast` enabled on both), proving the trick is made with size, weight, and placement — never with unreadable text.

**The Foyer's pattern rule:** in the honest variant, "Reject all" and "Accept all" are both `<button>` elements with the same font size, padding, and fill style; in the haunted variant, "Reject all" is a small plain text link (differing size/weight/placement) while "Accept all" is a full button. The test asserts equality of the two controls' computed size/padding/fill on the honest side and asserts the inequality (and the link-vs-button element difference) on the haunted side, so it fails if the haunted side were ever made symmetric.

### Room data validation script (`scripts/check-rooms.mjs`, design decision 3)

Run as `npm run check:rooms`. It loads every registered room and validates each against the structural rules (Requirement 1), the relatives validity rule (design decision 1), the hint-quality rules (design decision 2), and the requirements' room data correctness properties. Specifically it asserts, for every room's data:

- **The room set**: exactly 12 rooms with ids 1–12, each id used once, and each of the 12 room patterns used by exactly one room.
- **The brand and address**: the `brand` is one of the 12 approved fictional brands; the `slug` matches the folder the room is registered from; the `domain` uses the `.manor` pseudo-domain.
- **The spell cards**: every card's `pattern` is one of the 18 pattern types the steering names; exactly one correct/relative/different; the relatives validity rule; the hint-quality rules; and that the correct card is **not** in the same position in every room.
- **The possessed element**: the `possessedId` is non-empty and the possessed element is found in the rendered DOM by that id.
- **The two variants**: both the haunted and honest variants are built from the one `RoomData`, sharing the room's brand, content, and task.
- **The Ghost Guide**: every source URL is `https` and on the primary-source allowlist (`ftc.gov`, `eur-lex.europa.eu`, `edpb.europa.eu`); there is exactly one protection tip per room; and no quoted text exceeds 25 words.

On the first failure it prints the **room name** and the **rule** that failed, then exits non-zero so CI and the local build block on bad room data. It reads only room data — no rendering beyond the minimal DOM needed to resolve the possessed element by id — so it is fast and usable as a pre-build gate.

### Bundle-size validation script (`scripts/check-bundle-size.mjs`)

Run as `npm run check:size` after `npm run build`. It reads the Vite build manifest, sums the compressed (gzip/brotli) size of the entry chunk plus its static imports — the engine and shared UI, with no room chunks counted — and fails the build if the total exceeds 100 KB, printing the measured size and the 100 KB limit (Requirement 7.3). The GitHub Pages workflow runs the build and then this check, so a bundle over budget never ships.

### Real-browser QA (manor-qa)

The `manor-qa` MCP server (`scripts/mcp`) walks and scans the built site in a real headless Chrome. Its `walk_rooms` and `contrast_scan` tools accept an optional `reducedMotion` boolean; the reduced-motion walk asserts animations are at rest and the static "Something stirs here" label is visible, and every walk reports and gates each room's cumulative layout shift (≤ 0.01). The pure motion rules live in `scripts/mcp/motion.mjs` under `node:test`.

### Test commands

- `npm run test` — Vitest: all reducer, property, axe, engine interaction, and per-room tests.
- `npm run check:rooms` — Node room-data validation.
- `npm run check:size` — Node initial-bundle size gate (after `npm run build`).
- `npm run typecheck` / `npm run build` — strict TypeScript, which also guards the `RoomData` shape.

All animation and motion assertions honour `prefers-reduced-motion`; tests mock the media query to verify both the animated and the static-sign branches.
