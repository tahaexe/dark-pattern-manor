# Design Document

## Overview

This feature makes every room playable at first sight without changing any room's trick, words, signs, or honest twin. It layers three things onto the existing engine:

1. **Engine transitions** (owned by `room-engine`, implemented here): the first tap works, and the lantern becomes a hint that rings and focuses the possessed element. A pure `misses` counter and a stuck-help timer surface help without any penalty.
2. **Shared chrome**: a compact top bar and a single instruction card that bring the trick onto the first screen, a Rooms dialog, and a How-to-play popover, all in the initial bundle.
3. **Quality of life**: an inline wrong-card reason with no scroll jump, cards and reasons scrolled into view, a named continue link, next-room prefetch, and a faster comparison sweep.

Everything stays keyboard- and screen-reader-first, honours reduced motion, adds no font or dependency, keeps room chunks code-split, and holds the bundle, contrast, and CLS budgets.

## Architecture

### The machine (`src/engine/machine.ts`)

The reducer gains a `misses: number` field and two reshaped transitions:

- `haunted + SELECT_POSSESSED → picking` (the first tap), identical to `inspecting + SELECT_POSSESSED`.
- `haunted + SELECT_OTHER → haunted` with `misses + 1` and the announcement "Not that one. Look again, or light the lantern for a hint."
- `inspecting + SELECT_OTHER` keeps `inspecting` with `misses + 1` and the announcement "Nothing haunts this. Look for the candle ring."
- `haunted + LANTERN → inspecting` unchanged in topology; `inspecting` is rendered as "the lantern is lit".

`initialState` sets `misses: 0`. The reducer stays pure and total; the stuck-help timer, the ring, the focus, and the scrolling all live in `Room.tsx`, not the reducer. The no-dead-end property and every room's signs are unchanged.

Announcements become the step lines' final words so the live region and the instruction card never drift. The announcement map is:

| tag | announcement / step line tail |
| --- | --- |
| haunted | "Step 1 of 3 · Find the trick: tap the part of this page that's tricking you." |
| inspecting | "Step 1 of 3 · The lantern lights the trick. Tap it." |
| picking | "Step 2 of 3 · Name it: pick the card that names the trick." |
| named | "Named. The ghost flees." |
| honest | "Step 3 of 3 · Drag the line to compare. Then finish your task on the honest page: <task>." |
| done | "Freed! The page is honest." |

The haunted and inspecting `SELECT_OTHER` announcements are the short nudges above, written as one-off announcements that do not replace the step line (the instruction card keeps showing the step; the live region speaks the nudge). To keep the reducer the single source of the announcement, the step-line text for the instruction card is derived in a tiny pure helper `stepLine(state, room)` in `machine.ts` that returns the card's large text from the tag and the task, and the reducer's `announcement` holds whatever the live region should say next (the step line for a state entry, the nudge for a wrong look, the hint for a wrong pick).

### The Room component (`src/engine/Room.tsx`)

New responsibilities:

- **Lantern-lit ring and focus.** On entering `inspecting`, find the possessed element by `document.getElementById(room.possessedId)` within the live (non-preview) frame. Compute its offsets relative to the frame and render a `<div class="possessed-ring" aria-hidden>` overlay positioned absolutely inside the frame. Scroll the element into view (`block: 'center'`, instant under reduced motion) and `focus()` it. A `ResizeObserver` (and a window `resize` listener as fallback) recomputes the ring box; cleared on leaving `inspecting` and on unmount. The ring's glow is animated only when motion is allowed.
- **Focus rule.** The per-state focus effect moves focus to the state heading, except in `inspecting`, where focus goes to the possessed element so Enter selects it.
- **Stuck help.** A `misses >= 2` OR a 20 s `setTimeout` started on entering `haunted` sets `stuck = true`. The timer id is stored in a ref and cleared on every tag change and on unmount. `stuck` glows the lantern and appends " Stuck? Light the lantern." to the instruction line.
- **Picking scroll.** On entering `picking`, scroll the spell-cards container into view (`block: 'nearest'`, instant under reduced motion).
- **Prefetch.** On entering `honest`, call `prefetch(nextSlug)`.
- **Continue link text.** "Next room: <nextName>" for rooms 1–11, "Leave the manor" for room 12. `nextName` is passed in from `App.tsx` (from `ROOM_NAMES`), so the engine still hard-codes no room.

The bar and instruction card replace the old `.task-bar` block. `Room.tsx` renders `<RoomBar … />` and `<RoomInstructions … />` at the top, then the live region, then the swapping content exactly as today.

### Shared chrome

- **`src/ui/RoomBar.tsx`** — the bar. Props: `roomNum`, `freedCount`, `freedSet` (for the dots), `onManor` (navigate to `#/`), and children/handlers for opening the Rooms dialog and the How-to-play popover; it also renders `<SoundToggle />` on the right so the room route no longer needs the floating toggle. The twelve dots are an `aria-hidden` row; a visually hidden span reads "Room N of 12, M freed".
- **`src/ui/RoomInstructions.tsx`** — the instruction card. Props: `name`, `task`, `stepLine`, `stuck`, and the lantern handler. It renders the small first line, the large step line (with the stuck suffix when `stuck`), and the `<Lantern />`.
- **`src/ui/RoomsDialog.tsx`** — a native `<dialog>` opened with `showModal()`. Builds its list from `ROOM_NAMES` (room-engine registry) and the freed set, and reads each freed room's pattern from `CHECKLIST` in `src/app/checklist.ts` (matching by room number). Esc closes (native), and a Close button closes; on close, focus returns to the opener via a ref passed down. Links are plain `#/room/N` anchors, so any room is reachable in any order.
- **`src/ui/HowToPlay.tsx`** — a small popover (a `<div role="dialog" aria-modal="false">` anchored near "?", or a native `<dialog>` non-modal; a simple absolutely-positioned panel with a focus trap is enough). Content comes from `src/app/howToPlay.ts`. Esc and Close close it; focus returns to "?".
- **`src/app/howToPlay.ts`** — `export const HOW_TO_PLAY: ReadonlyArray<{ title: string; body: string }>` with the three steps, imported by `HowToPlay` now and the title screen later.

The Sound toggle stays rendered by `App.tsx` on the title, look, end, and teach routes; only the room route moves it into the bar. This keeps Requirement 2.10.

### Registry prefetch (`src/engine/registry.ts`)

Add a memo so one promise per slug is shared:

```ts
const memo: Record<string, Promise<RoomData>> = {};
function load(slug: string): Promise<RoomData> {
  return (memo[slug] ??= rooms[slug]().then((m) => m.default));
}
export function prefetch(slug?: string): void { if (slug && rooms[slug]) void load(slug); }
export async function loadRoom(slug: string): Promise<RoomData> {
  if (!rooms[slug]) throw new Error(`Unknown room slug: ${slug}`);
  return load(slug);
}
```

`loadRoom` keeps its signature. `prefetch` is a no-op for an unknown or missing slug. A unit test asserts `prefetch(slug)` then `loadRoom(slug)` resolve to the same object and that `rooms[slug]` was invoked once.

### CSS

A new initial-bundle stylesheet section (in `src/styles/manor.css` and `src/styles/look.css`, since those already ship with the Room) styles `.room-bar`, `.room-bar-dots`, `.room-instructions`, `.room-step`, `.possessed-ring`, `.rooms-dialog`, `.how-to-play`, and tightens the room-scene top spacing so the frame clears the fold:

- The bar is a single flex row, dark wood plate, AA text, 44 px min targets, `position: relative; z-index: 2`.
- The instruction card is a compact two-row grid: small first line + step line on the left, the lantern on the right.
- `.possessed-ring`: `position: absolute; border: 3px solid var(--candle); border-radius: var(--radius-sm); box-shadow: 0 0 10px var(--candle); pointer-events: none;` with a slow opacity pulse that is disabled under reduced motion.
- The room-scene top padding and the bar/instruction margins are tuned so the haunted frame's top is ≤ 150 px at 1280 × 720 and ≤ 210 px at 412 × 915.
- Room 1's `.cookie-banner` becomes `position: sticky; bottom: 0` on the live haunted page only (a `.cookie-banner` inside `.manor-frame:not(.manor-frame-preview)`), never in the previews, so it reads like a real cookie bar sitting on the fold.
- The comparison sweep constant `SWEEP_MS` drops to 800 in `Room.tsx`.
- The continue link keeps its look but gains `min-height: 44px; display: inline-flex; align-items: center`.

No new font is added; all colours come from `tokens.css`.

## Components and Interfaces

```
App.tsx
 ├─ (title/look/end/teach) SoundToggle + page
 └─ (room) RoomRoute
       └─ Room
            ├─ RoomBar (dots, Manor, Rooms→RoomsDialog, ?→HowToPlay, SoundToggle)
            ├─ RoomInstructions (name, task, stepLine, stuck, Lantern)
            ├─ LiveRegion
            ├─ Haunted  + possessed-ring overlay (inspecting)
            ├─ SpellPicker + inline reason (picking)
            └─ comparison + BeforeAfterSlider + GuideCard + continue (honest/done)
```

## Error Handling

- No possessed element found for the ring (bad id): skip the ring and focus the frame heading; the player can still tap the trick. This never throws.
- `showModal()` unsupported (very old engines): fall back to a non-modal visible panel; Esc and Close still work.
- Prefetch failure is swallowed; the App's loader will retry and surface the existing in-manor retry affordance.

## Testing Strategy

- **Engine unit/interaction tests** (`machine.test.ts`, `Room.test.tsx`): the first-tap transition, the miss counter and its announcements, the no-dead-end property with the new self-loops, the ring and focus after the lantern, stuck help after 20 s (fake timers) and after two misses, the step line per state, the inline reason under the cards with no top-scroll on a wrong pick, the 800 ms sweep, and axe in each state.
- **Chrome tests**: `RoomBar` text and dots (freed/current/hollow, the screen-reader counter), `RoomsDialog` (twelve links, freed rooms show their pattern, Esc closes, focus returns), `HowToPlay` (three steps, Esc/Close, focus returns), the continue link text per room.
- **Registry test**: `prefetch` shares one promise with `loadRoom`.
- **The walk** (`scripts/mcp/walk.mjs`): keyboard path for even rooms (L, Tab to possessed, Enter), pointer path for odd rooms (click the possessed element straight away, no lantern); a first-sight check on entry; a target-size check for engine controls; and a recorded (non-failing) time from clicking the continue link until the next room's instruction is visible. Its `node:test` coverage updates for the new pure rules.

## The honest comparison's pointerdown (Requirement 7)

### The bug

`Room.tsx`'s `onPointerDown` treated every pointerdown on the comparison as the start of a divider drag, except on `.split-control`: it set `draggingRef`, called `setPointerCapture(e.pointerId)` on the comparison element, and moved the divider to the pointer's x. Because the capture binds every later pointer event to the comparison, a mouse click or a tap that landed on a control inside the honest page (room 1's honest "Reject all") never produced a `click` on that control — the comparison swallowed it. Keyboard play (focus + Enter) still worked, which is why the walk, which finishes every honest task by keyboard, never saw it. With the continue link now rendering only at `done`, a pointer-only player was stuck.

### The fix

`onPointerDown` learns one extra early-return. Before starting a drag it asks whether the target sits inside an interactive control of either page, using a single selector constant:

```ts
const INTERACTIVE_IN_COMPARISON =
  'button, a[href], input, select, textarea, label, summary,' +
  '[role="button"], [role="link"], [role="checkbox"], [tabindex]:not([tabindex="-1"])';

const onPointerDown = (e: PointerEvent) => {
  const target = e.target as HTMLElement | null;
  if (!target) return;
  if (target.closest('.split-control')) return;
  // A control of either page keeps its own click: no capture, no divider move.
  if (target.closest(INTERACTIVE_IN_COMPARISON)) return;
  draggingRef.current = true;
  (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  setFromPointer(e.clientX);
};
```

`target.closest(…)` walks up from the event target, so a pointerdown on a span inside the honest "Reject all" button still finds the `button` and returns early. A pointerdown on a non-interactive part of either cell (the card background, the tag, empty padding) matches neither `.split-control` nor the control selector, so it starts the drag exactly as before. `onPointerMove`, `endDrag`, the grip, the slider and all keyboard handling are untouched, so the keyboard behaviour is unchanged. Nothing else in the component changes.

### Tests (jsdom, `Room.test.tsx`)

- A pointerdown then click on an honest control (room 1's honest "Reject all") completes the task: the state reaches `done` and the "Next room" link renders. (`fireEvent.pointerDown` on the button, then `fireEvent.click` on it; assert `doneCount()` is 1 and the continue link appears.)
- A pointerdown on a non-interactive part of the comparison (the comparison group itself, away from any control) still moves the divider: the honest layer's `--split` changes.
- A pointerdown on a control inside the comparison does not move the divider: `--split` is unchanged.

`setPointerCapture`/`releasePointerCapture` do not exist in jsdom, so the handlers already guard them with `?.`; the tests rely on the early-return, not on capture.

## The walk completes the honest task by pointer (Requirement 8)

Today the walk finishes every honest task by focusing each honest control and pressing Enter. That keyboard path never exercises a real pointer, so the Requirement 7 bug was invisible. The walk now splits the honest task by the same even/odd rule it already uses for entry:

- **Even rooms (keyboard):** unchanged — focus each honest control, assert it is visible, press Enter until the step line/announcement reads "Freed!".
- **Odd rooms (pointer):** for the first honest control (`.comparison-honest button, .comparison-honest a[href]`), scroll it into view, read its centre with `document.elementFromPoint` and fail if that element is not the control (something on top), then dispatch a **real pointer** at that centre: a CDP mouse click (`Input.dispatchMouseEvent` mousePressed + mouseReleased, button "left") at 1280 × 720, and a CDP touch (`Input.dispatchTouchEvent` touchStart + touchEnd) at 412 × 915. The width the walk is running at selects which. After the gesture it waits and reads the step line/announcement for "Freed!".

The shared `check('task completes', done, true)` then covers whichever path ran, so both the pointer path and the keyboard path must reach `done`. The CDP client (`browser.mjs`) gains two tiny helpers, `mouseClick(x, y)` and `tap(x, y)`, built on `Input.dispatchMouseEvent` and `Input.dispatchTouchEvent`; they add no dependency. Because the walk already drives odd rooms by pointer on entry, this change keeps the even/odd split consistent end to end.

No pure rule changes, so `firstsight.mjs`, `rooms.mjs`, `divider.mjs` and `motion.mjs` and their `node:test` files are untouched; the pointer completion is exercised by `qa:full` (it needs Chrome and a build).

## Room 9 on the first screen at 1280 × 720 (Requirement 9)

Room 9's possessed element (the block of fee lines, `#study-fee-lines`) measured as a 158 px-tall box with its bottom at 724 px at 1280 × 720 — 4 px below the 720 px fold. The frame top and the shared chrome are within budget; only room 9's own vertical spacing above the fee block needs tightening. The fix lives entirely in `src/rooms/mildew/room.css`, tightening spacing above the possessed block by at least 8 px, with no change to room 9's words, trick, signs, or honest twin, and no change at 412 × 915 (that size already fits and uses its own `@media (max-width: 600px)` overrides, which are left alone). The walk's CLS check stays at 0 because the same elements render in every state; the contrast tokens are unchanged. The exact declarations changed are listed in `tasks.md`.
