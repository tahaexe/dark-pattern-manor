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
- **The first tap works, and the lantern is the hint, not a chore.** A player who taps the possessed element straight away is taken into picking; the lantern is there for a player who cannot find the trick, lighting it up and focusing it.

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
                 SELECT_POSSESSED
    ┌──────────┐ ──────────────────────────────────────▶ ┌──────────┐
    │ haunted  │ ─── LANTERN ──▶ ┌────────────┐ SELECT_   │ picking  │
    │          │                 │ inspecting │ POSSESSED  │          │
    │  ▲  │    │                 │ (lantern   │ ─────────▶ │          │
    │  └──┘    │                 │  lit)      │            └──────────┘
    │ SELECT_  │                 └────────────┘                 │
    │ OTHER    │                    ▲  │ SELECT_OTHER            │ PICK_CORRECT
    │ (stay,   │                    └──┘ (stay, announce         ▼
    │ miss++)  │                         "Nothing haunts    ┌──────────┐
    └──────────┘                         this. Look for     │  named   │
                                         the candle ring",  │          │
                        PICK_WRONG       miss++)            └──────────┘
                        (stay, hint) ◀───────────────────────────│ auto (no input)
                                                                  ▼
 ┌──────────┐  COMPLETE_TASK   ┌──────────┐                 ┌──────────┐
 │   done   │ ◀─────────────── │  honest  │ ◀────────────── │ (named)  │
 └──────────┘                  └──────────┘                 └──────────┘
```

Transition table:

| From | Event | To | Side signal |
| --- | --- | --- | --- |
| `haunted` | `SELECT_POSSESSED` | `picking` | — (the first tap works) |
| `haunted` | `LANTERN` | `inspecting` | the lantern is lit: ring, scroll-into-view, focus the possessed element |
| `haunted` | `SELECT_OTHER` | `haunted` | announce `"Not that one. Look again, or light the lantern for a hint."`; `misses + 1` |
| `inspecting` | `SELECT_POSSESSED` | `picking` | — |
| `inspecting` | `SELECT_OTHER` | `inspecting` | announce `"Nothing haunts this. Look for the candle ring."`; `misses + 1` |
| `picking` | `PICK` (correct card) | `named` | — |
| `picking` | `PICK` (wrong card) | `picking` | announce that card's hint; flag `flicker` |
| `named` | `ADVANCE` (auto) | `honest` | — |
| `honest` | `COMPLETE_TASK` | `done` | caller persists progress |

Key properties the reducer guarantees:

- **The first tap works** (Requirement 2.3): from `haunted`, `SELECT_POSSESSED` goes straight to `picking` exactly as it does from `inspecting`. A player never has to raise the lantern first.
- **The lantern is the hint** (Requirement 2.2): from `haunted`, `LANTERN` enters `inspecting`, which the view renders as "the lantern is lit" — a candle-coloured ring on the possessed element, the element scrolled into view and focused, and the announcement "The lantern lights the trick. Tap it." so Enter selects it.
- **A wrong look costs nothing but surfaces help** (Requirements 2.4, 2.6): `SELECT_OTHER` is a self-loop that increments a pure `misses` counter in the state and announces a short nudge. The counter is never a score, strike, or penalty; it only feeds stuck help (Requirement 2.13).
- The `named → honest` step takes no player input (Requirement 2.7). The `Room` component dispatches `ADVANCE` after the flee delay on entering `named`, so the player experiences one motion: pick the right card, the ghost flees, the honest twin appears.
- A `PICK` with a wrong card returns a state still in `picking` with the hint attached and no progress change (Requirements 2.8, 5.2, 5.5). The reducer never produces a fail state because none exists in the union (Requirement 5.1, state-machine property "no transition reaches a fail state").
- Each wrong `PICK` sets a fresh, single-use `wrongHint` plus a `whisperNonce` that increments on every wrong pick, so the view can announce the whisper exactly once per pick and never re-announce a stale hint on an unrelated re-render (Requirements 5.2, 5.5; see the live-region design below).
- From any non-`done` state there is always a path to `done` (Requirement 2.12): the reducer never removes the only remaining edge, and wrong picks and wrong looks are self-loops, so liveness holds before and after any input.
- Progress is not held in the reducer. `done` is terminal for a room; the done **count** lives in the progress store and only ever increases (state-machine property "progress never decreases").

The reducer carries, inside the state, only what the view needs to render: the current state tag, the last announcement string, a non-negative `misses` counter, and a transient `wrongHint`/`flicker`/`whisperNonce` marker cleared or advanced on the next event. It holds a reference to nothing mutable.

### The Preact components around it

`src/engine/Room.tsx` is the one component that owns a running room. It:

1. Receives a loaded `RoomData` (see on-demand loading below).
2. Holds the reducer state with `useReducer(reduceBound, initialState(room))`.
3. Renders, per state, the room's `Haunted` component, the compact top bar and instruction card, the lantern, the spell picker, the live region, and — from `honest` onward — the comparison box (the haunted preview and the honest twin stacked in one cell), the Before/After slider, and the Ghost Guide card.
4. Translates player input (pointer, keyboard, the L key, screen-reader activation) into `RoomEvent`s.
5. On every state change, writes the new state's announcement into the live region (Requirement 3.1) and moves focus to the heading that labels the new state (Requirement 3.2) — except when the lantern is lit, where focus moves to the possessed element instead so Enter selects it.
6. On entering `inspecting`, draws a candle-coloured ring around the possessed element (found by the room's `possessedId`, so no room file changes), scrolls it into view (block center; instant under reduced motion), and focuses it. The ring is an `aria-hidden`, `pointer-events:none` overlay absolutely positioned inside the haunted frame from the element's offsets, recomputed on resize (Requirement 3.7).
7. Runs the stuck-help timer: after 20 s in `haunted` with no transition out, or once `misses` reaches 2, it glows the lantern button and appends " Stuck? Light the lantern." to the instruction line. The timer is cleared on every state change and on unmount (Requirement 2.13).
8. On reaching `done`, calls the progress store to persist completion and unlock the next room (Requirement 2.10).

The room's own `Haunted` and `Honest` components are supplied by `RoomData`; `Room.tsx` never hard-codes any brand. Shared chrome (the top bar, instruction card, lantern, spell picker, live region, slider, guide card, Rooms dialog, How-to-play popover) lives in `src/ui` and `src/app` and is imported by `Room.tsx`/`App.tsx`, so it ships in the initial bundle.

### Rooms loaded on demand

Rooms are registered in a manifest `src/engine/registry.ts` that maps each slug to a lazy loader:

```ts
// registry.ts — no room code is imported eagerly; only loader thunks.
export const rooms: Record<string, () => Promise<{ default: RoomData }>> = {
  'gravemoor-gazette': () => import('../rooms/gravemoor-gazette/room'),
  // ...the other 11, keyed by brand slug
};
```

`loadRoom(slug)` awaits the thunk and returns the `RoomData`. Each room's `room.ts` imports its own `./Haunted`, `./Honest`, and `./room.css`, so entering a room pulls exactly that room's code and styles in one chunk, and nothing else (Requirements 7.1, 7.2). A single shared promise per slug is cached so a `prefetch(slug)` on reaching honest and the App's own loader share one request (see prefetch below). The app shell shows a lightweight loading state (in-manor, whole, never broken) while the chunk arrives. The initial bundle budget is 100 KB compressed (Requirement 7.3), checked by a build-size gate.

### Prefetching the next room

When a room reaches `honest`, the engine calls `prefetch(nextSlug)` on the registry. The registry keeps one promise per slug (`memo[slug] ??= rooms[slug]()`), and both `prefetch` and `loadRoom` return that same promise, so the next room's chunk is fetched once, early, and the App's loader resolves instantly when the player follows the continue link. Prefetch is a no-op when there is no next slug (room 12) or the chunk is already in flight or loaded.

### The initial-bundle size budget

The initial application bundle must not exceed **100 KB compressed** (Requirement 7.3). `scripts/check-bundle-size.mjs`, run as `npm run check:size` after `npm run build`, reads the Vite build manifest, sums the gzip/brotli size of the entry chunk and its static imports (engine + shared UI, no room chunks), and exits non-zero if the total is above the 100 KB limit. Because rooms are reached only through dynamic `import()`, room chunks are never counted in the entry total, and the budget stays stable as rooms are added. The atmosphere layer is lazy-loaded with the room so it, too, stays out of the entry total.

### Privacy

Progress is the only persisted state and it lives in `localStorage` (Requirement 2.11, steering "Runtime privacy"). The engine sets no cookies and makes no third-party request; the only network traffic is the same-origin dynamic import of room chunks.

## Components and Interfaces

### Types: `RoomData` and `SpellCard` (`src/engine/types.ts`)

Unchanged in shape. `HauntedProps` give the Haunted component the callbacks it needs: `onSelectPossessed`, `onSelectOther`, and the current `signsActive` / `reducedMotion` flags, plus a `preview` flag for the static "before" side of the comparison. `HonestProps` give the Honest component `onCompleteTask`.

### The pattern vocabulary (`src/engine/patterns.ts`) and the relatives table (`src/engine/relatives.ts`)

Unchanged. The 18 pattern types and the symmetric relatives table drive the spell-card validity rule enforced by `check-rooms.mjs` and the room-data property test.

### The reducer's states and events (`src/engine/machine.ts`)

```ts
export type RoomStateTag =
  | 'haunted' | 'inspecting' | 'picking' | 'named' | 'honest' | 'done';

export interface RoomState {
  tag: RoomStateTag;
  announcement: string;    // text pushed to the live region for this state
  misses: number;          // non-possessed selections while haunted/inspecting; drives stuck help only
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

The reducer is total: unexpected events in a given state return the state unchanged (another guard against dead ends). `SELECT_POSSESSED` is accepted in both `haunted` and `inspecting`. `SELECT_OTHER` is a self-loop in both, incrementing `misses`. Every transition in the table above is a unit test; the state-machine correctness properties are fast-check tests over sequences of events.

### The lantern (`src/ui/Lantern.tsx`)

A real `<button>` at least 44 × 44 with the visible word **Lantern** and a small **hint** under it. Its accessible name is "Lantern: show me the trick (L)". It dispatches `LANTERN`. A global key handler maps the `L` key to the same event while the room is in `haunted`. When stuck help is active the button glows (a slow opacity pulse; a still candle outline under reduced motion). Operable by pointer and keyboard (Requirement 2.2, 3.3).

### The possessed-element ring (in `Room.tsx`)

On entering `inspecting`, `Room.tsx` finds the possessed element by `document.getElementById(room.possessedId)` inside the haunted frame and renders a candle-coloured ring overlay — the manor's focus colour, 3 px, rounded, a soft glow outside it — absolutely positioned inside the frame from the element's offsets. The ring is `aria-hidden` and `pointer-events:none`, recomputed on resize, and respects reduced motion (no glow animation). The possessed element is scrolled into view (block center; instant under reduced motion) and focused, so Enter selects it.

### The compact top bar and instruction card (`src/ui/RoomBar.tsx`, `src/ui/RoomInstructions.tsx`)

One bar replaces the old yellow Back button and tall task card:

- Left: a quiet text button "‹ Manor" (to the title; not the primary style).
- Middle: "Room N of 12" with twelve small dots (freed = filled candle colour, current = ring, others hollow; the dots are `aria-hidden`; the text reads "Room N of 12, M freed" to screen readers).
- Right: a "Rooms" button, a "?" button, and the existing Sound toggle.

Under the bar, one instruction card: a small first line with the room name and "Your task: <task>"; the current step in large text; and on the right the lantern button.

The step lines, per state:

- haunted: "Step 1 of 3 · Find the trick: tap the part of this page that's tricking you."
- inspecting: "Step 1 of 3 · The lantern lights the trick. Tap it."
- picking: "Step 2 of 3 · Name it: pick the card that names the trick."
- named: "Named. The ghost flees."
- honest: "Step 3 of 3 · Drag the line to compare. Then finish your task on the honest page: <task>."
- done: "Freed! The page is honest."

The polite announcements use the same final words. The visually hidden per-state headings stay for focus. The haunted frame starts at most 150 px from the top at 1280 × 720 and at most 210 px at 412 × 915, and the bar causes no layout shift (CLS stays 0) because the same items render in every room and state.

### The Rooms dialog (`src/ui/RoomsDialog.tsx`) and the How-to-play popover (`src/ui/HowToPlay.tsx`)

"Rooms" opens a native `<dialog>` (modal): heading "Rooms of the manor", the twelve rooms in order as links (`#/room/N`), each "N. <room name>"; freed rooms also show "freed: <pattern>" (the pattern taken from `checklist.ts`); the current room marked `aria-current="page"`; a Close button; Esc closes; focus returns to the Rooms button. Any room can be played in any order.

"?" opens a small popover "How to play" with three steps, whose text lives once in `src/app/howToPlay.ts` (a later title-screen change imports it too):

1. "Spot the trick" — "Each room is a web page with one trick in it. Tap the part that's tricking you. Stuck? Light the lantern."
2. "Name it" — "Pick the card that names the trick."
3. "Set the page free" — "Drag the line to compare it with the honest page, then do the task there."

Esc and a Close button close it; focus returns to "?".

### The spell picker (`src/ui/SpellPicker.tsx`) and the inline reason

Renders the three cards as real `<button>` elements, shuffled per mount. On entering `picking`, the cards are scrolled into view (block nearest; instant under reduced motion). After a wrong pick, that card's hint (unchanged) is shown inline right under the cards as an `aria-hidden` paragraph (the live region already speaks it); the page does **not** scroll to the top strip; if the inline reason is below the fold it is scrolled into view with `block: nearest`.

### The live region (`src/ui/LiveRegion.tsx`)

A single `role="status" aria-live="polite"` element that renders `state.announcement` and, when present, `state.wrongHint`. Every state change writes here (Requirement 3.1). The whisper of a wrong card fires **exactly once per pick**, keyed on `whisperNonce`. It no longer scrolls the page to the top on a wrong pick; the inline reason under the cards carries the visible copy.

### The Before/After comparison wipe (Requirement 9)

Unchanged in structure (the haunted preview under, the honest twin on top revealed by `clip-path`, the divider, the corner tags, focus safety snapping the slider to 100). The opening sweep now runs over about **0.8 s** instead of 1.2 s (still none under reduced motion).

### The Before/After slider (`src/ui/BeforeAfterSlider.tsx`)

Unchanged: an `<input type="range">` exposed as an ARIA slider, `step={5}` in the engine, with a thumb at least 44 × 44.

### The Ghost Guide card (`src/ui/GuideCard.tsx`)

Unchanged.

### The continue link

Reads "Next room: <next room's name>" for rooms 1–11 and "Leave the manor" for room 12, at least 44 px tall.

### The progress store in localStorage (`src/engine/progress.ts`)

Unchanged. Monotonic, in-memory fallback, no cookies, no network.

## The atmosphere layer and the common moments

The engine wires `<Atmosphere exhale={showSplit} reducedMotion={…} />` inside the `aria-hidden` `.room` backdrop and sets `data-moment`/`data-moment-key`/`data-fleeing` on `.room-scene` from the state it already holds. The common moments are shared CSS on `.ghost`/`.ghost-wrap`/`.room::after`, transforms and opacity only (a wrong pick guttters the candles and shakes the ghost's head; the right pick unwinds the ghost before the one shared 600 ms flee).

The atmosphere is **light to run** (see the atmosphere spec, which this revision made explicit):

- The breathing warm **glow** is a CSS `opacity` animation (`@keyframes atmosphere-breath`, 0.5 s, between 1 and 0.85) — no per-frame JavaScript.
- The **fog** is painted **once** to an offscreen canvas and drifted across the backdrop by a CSS `transform` animation; nothing repaints it per frame.
- Only a small **motes** canvas costs a paint, sized at device-pixel-ratio 1, woken by a timer at most **24 fps** (no idle 60 Hz `requestAnimationFrame` loop), paused while the tab is hidden.
- When the room turns **honest** the `exhale` prop runs a one-second settle (fog thins, glow rises) and then every atmosphere animation stops (CSS paused via `data-still`, the motes loop stopped), so the honest page is calm and requests **no** animation frames.
- An **adaptive still mode**: if the motes' first ~2 s average below 20 fps, the atmosphere drops to its still pose for that visit (the same pose as reduced motion), silently.
- The ghost signs and each room's act animate `transform`/`opacity` only — no animated `filter`, `box-shadow`, `text-shadow` or layout property.
- The `AudioContext` is created only once sound is armed by a gesture (the Sound toggle or the first pointer/key), and is suspended while sound is off or the tab is hidden, so an idle room with the sound untouched holds no audio engine.

`manor-qa`'s `walk_rooms` additionally asserts an honest room requests no animation frames over ~2 s (the pure `idleWithinWindow` rule) and keeps its CLS, reduced-motion and named-hold checks.

## Data Models

The authored shape of a room is the `RoomData` object. Constraints enforced by `check-rooms.mjs` and fast-check are unchanged.

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

- A **wrong spell card** costs nothing. The reducer stays in `picking`, preserves all progress, keeps every card selectable, sets `flicker`, advances `whisperNonce`, and whispers that card's hint once; the inline reason under the cards shows the same text.
- Selecting a **non-possessed element** while haunted or inspecting is not an error: the reducer stays put, nudges the player, and increments `misses` for stuck help only.
- **Unexpected events** are no-ops: the reducer returns the state unchanged, so no sequence of inputs can reach a dead end (Requirement 2.12).
- **Room chunk load failure** shows an in-manor retry affordance and does not advance or reset progress.
- **`localStorage` unavailable** falls back to in-memory progress; nothing throws into the render path.

The haunting is always a clue layered on a working page. The comparison wipe never hides a focusable honest control: focus inside the honest layer snaps the slider to 100 (Requirement 9.9).

## Testing Strategy

### Reducer unit tests (`src/engine/machine.test.ts`)

One assertion per transition in Requirement 2: `SELECT_POSSESSED` moves `haunted → picking` (the first tap) and `inspecting → picking`; `LANTERN` moves `haunted → inspecting`; `SELECT_OTHER` stays and increments `misses` with the right announcement in both `haunted` and `inspecting`; correct `PICK` moves to `named` then auto-`ADVANCE` to `honest`; wrong `PICK` stays with the hint and a bumped `whisperNonce`; `COMPLETE_TASK` moves `honest → done`.

### Property-based tests with fast-check

As before, plus: over any event sequence, `SELECT_OTHER` never decreases `misses` and never leaves the current state in a dead end; from `haunted`, `SELECT_POSSESSED` reaches `picking`.

### axe-core accessibility tests

Render one room in each of the six states and assert zero axe violations in every state, including the lantern-lit ring overlay in `inspecting`, the inline reason in `picking`, and the comparison box in `honest`/`done`.

### Engine interaction tests (`src/engine/Room.test.tsx`)

- The full loop, including the first-tap path (tap the possessed element from haunted, no lantern).
- The lantern-lit path: pressing the lantern rings and focuses the possessed element; Enter then selects it.
- The stuck help: after 20 s (fake timers) and after two misses, the lantern glows and the instruction line ends with "Stuck? Light the lantern."
- The step lines per state, the bar's text and dots, the Rooms dialog (twelve links, freed rooms show their pattern, Esc and focus return), the "?" popover, the continue link's text, the inline reason under the cards with no scroll to the top on a wrong pick, the 800 ms sweep, and axe in each state.

### Per-room tests, the room-data validation script, the bundle-size gate, and manor-qa

Unchanged in intent; manor-qa's `walk_rooms` adds a pointer path for odd rooms (tap the possessed element straight away, no lantern), a first-sight check, a target-size check for the engine's controls, an honest-room idle (no-frames) check, and records (does not fail on) the time from clicking the continue link to the next room's instruction. Its text checks use the new step lines.

### Test commands

- `npm run test` — Vitest plus the Node suites.
- `npm run check:rooms` — Node room-data validation.
- `npm run check:size` — initial-bundle size gate (after `npm run build`).
- `npm run qa:full -- <rooms>` — real-browser walk and contrast scan at both sizes, both motion modes.
