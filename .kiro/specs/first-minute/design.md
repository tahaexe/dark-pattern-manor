# Design Document

## Overview

The first minute now teaches the loop. Three independent pieces layer onto the existing engine and chrome without touching any room's trick, words, signs, or honest twin:

1. **Title steps** — the title screen draws the three steps of play above "Enter the manor", each an inline-SVG ink drawing plus one line, read from the shared `HOW_TO_PLAY` source so they can never drift from the "?" popover.
2. **Room 1 coach marks** — room 1 carries a new optional `coach` field; `Room.tsx` renders a small `CoachMarks` overlay that points at the possessed element, then the cards, then the comparison, one mark per loop step, only while room 1 is not done and the tips are not skipped. The marks are positioned overlays with no layout shift, no focus steal, one polite announcement per step, a "Skip the tips" link, and Escape to dismiss, all honouring reduced motion.
3. **One loop story** — every player-facing description of the loop (the "?" popover, the title steps, the classroom page, the README, the index meta) is brought to the same three steps and the same lantern-hint line.

Everything stays keyboard- and screen-reader-first, honours reduced motion, adds no font/image/dependency, keeps the room chunks code-split, and holds the bundle, contrast, and CLS budgets. The skip choice lives in the existing localStorage progress; no new persistence.

## Architecture

### Shared loop text (`src/app/howToPlay.ts`)

`HOW_TO_PLAY` already holds the three steps. Two changes:

- Keep the three titles exactly: `Spot the trick`, `Name it`, `Set the page free`.
- Bring every `body` to the agreed loop wording, and make the lantern hint read "Stuck? The lantern lights the trick." (today it reads "Stuck? Light the lantern." in step 1). The three bodies become:
  - Spot the trick — "Each room is a web page with one trick in it. Tap the part that's tricking you. Stuck? The lantern lights the trick."
  - Name it — "Pick the card that names the trick. A wrong card costs nothing."
  - Set the page free — "Drag the line to compare it with the honest page, then do the task there."

A second, shorter constant is added for the title drawings' one-liners, so the title can show a terse line under each ink drawing while the "?" popover keeps its fuller body. Both live in `howToPlay.ts`, both keyed by the same titles, so they are audited together:

```ts
export interface TitleStep {
  title: string; // same three titles as HOW_TO_PLAY
  line: string;  // the terse one-liner under the title ink drawing
}
export const TITLE_STEPS: ReadonlyArray<TitleStep> = [
  { title: 'Spot the trick', line: 'One part of the page is haunted. Tap it.' },
  { title: 'Name it', line: 'Pick the card that names the trick.' },
  { title: 'Set the page free', line: 'See the honest page and finish your task.' },
];
```

A tiny pure guard in the module keeps `TITLE_STEPS` and `HOW_TO_PLAY` title-aligned (same three titles, same order); a unit test asserts it. This satisfies Requirement 1.5 and 4.2 (one source, no drift).

### Title steps (`src/app/TitleScreen.tsx`, `title-screen.css`)

`TitleScreen` renders a new `<ol class="title-steps">` immediately above `.title-actions`, mapping `TITLE_STEPS` to three `<li class="title-step">` items. Each item has:

- an `aria-hidden` inline-SVG ink drawing (`StepGlyph`, see below) in `<span class="title-step-glyph">`,
- `<span class="title-step-title">{title}</span>` (Cormorant display, ≥22 px so it keeps the display-font rule),
- `<span class="title-step-line">{line}</span>` (Atkinson body).

The list is ordered (`<ol>`) so assistive tech reads "1, 2, 3" naturally; the glyphs are decorative. No dialog, no dismissable step: the steps are always-present page content above the single "Enter the manor" button, so Requirement 1.3 (one tap, nothing to dismiss) holds. The steps render in every title state (first-time, in-progress, complete); they sit above `.title-actions`, which keeps its progress-aware controls unchanged (Requirement 1.6).

`StepGlyph` is a small function component in `TitleScreen.tsx` (or a tiny sibling module) returning one of three inline SVGs keyed by index, each a few strokes in the ink look (stroke `var(--ghost)` / `var(--candle)`, no fill or light fill), reusing the drawing language of `InkGhost`:

- step 0 "Spot": a pointing hand / tap mark over a small page corner.
- step 1 "Name": a spell card with a check stroke.
- step 2 "Free": a split rectangle with a vertical divider line (the Before/After motif).

No new image file is added (Requirement 3.2).

**Layout.** `.title-steps` is a flex row that wraps; each `.title-step` is a narrow column (glyph, title, line) with a reserved glyph box so presence causes no shift. On a phone (≤ 600 px) the row either stays one compact row of three narrow columns or becomes a short stacked column — whichever keeps "Enter the manor" on the first screen. To guarantee the button stays on the first screen at 412 × 915 and 1280 × 720, the steps block is kept compact (small glyph, tight gaps) and the title column already centres within one viewport; the firstsight-style budget is verified by the title tests' structure and by eye in the build (the title is not part of the room walk). Contrast is AA over the vignette (Requirement 1.7), matching the existing tagline/facts.

### Room 1 coach field (`src/engine/types.ts`, `src/rooms/gravemoor-gazette/room.ts`)

A new optional field on `RoomData`:

```ts
/** One coach mark: which loop step, what it points at, and its words. */
export interface CoachMark {
  /** The loop step this mark belongs to. */
  step: 'spot' | 'name' | 'free';
  /** CSS selector for the element the mark points at, within the room scene. */
  target: string;
  /** The mark's heading-less body text (also the once-per-step announcement). */
  body: string;
}

export interface RoomData {
  // …existing fields…
  /** Tutorial coach marks, set on room 1 only. Absent on every other room. */
  coach?: ReadonlyArray<CoachMark>;
}
```

Room 1's `room.ts` gains:

```ts
coach: [
  { step: 'spot', target: '#foyer-reject', body: 'This part is tricking you. Tap it.' },
  { step: 'name', target: '.spell-cards', body: 'Pick the card that names the trick. A wrong card costs nothing.' },
  { step: 'free', target: '.comparison', body: 'Drag the line to compare, then finish your task on the honest page.' },
],
```

No other room gets a `coach` field. The room-data property test and `check-rooms` ignore the optional field (it is not required); a new room-data test asserts exactly one room (room 1) defines `coach`. This satisfies Requirement 2.1 and 2.11.

The `spot` target is `#foyer-reject`, the possessed element's id on the live page (the preview omits it, so the selector resolves to the live one). `name` points at `.spell-cards` (the cards container), `free` at `.comparison`.

### Progress: the skip flag (`src/engine/progress.ts`)

The skip choice is one boolean in the existing progress store, so it rides the same localStorage key and in-memory fallback — no new persistence, no cookie, no network (Requirement 3.3).

```ts
export interface Progress {
  completed: string[];
  unlocked: string[];
  tipsSkipped?: boolean; // first-minute: coach marks skipped for good
}
```

`read`/`write` carry the field through (reading `Boolean(parsed.tipsSkipped)`, writing it when set). Two helpers:

```ts
export function areTipsSkipped(): boolean { return read().tipsSkipped === true; }
export function skipTips(): void { const p = read(); write({ ...p, tipsSkipped: true }); }
```

Both are pure wrappers over the existing read/write, monotonic (skip only ever turns on), and degrade to memory like the rest. `__resetForTests` already clears the store, so tests start unskipped.

### The coach-marks component (`src/ui/CoachMarks.tsx`)

A new shared-chrome component, imported by `Room.tsx`. It is only mounted when the engine decides coach marks apply, so unmounting it when the room is done or the tips are skipped removes it entirely (no hidden DOM, no layout).

Props:

```ts
export interface CoachMarksProps {
  /** The room's coach marks (room 1 only). */
  marks: ReadonlyArray<CoachMark>;
  /** The current loop step derived from the room state. */
  step: 'spot' | 'name' | 'free';
  /** The scene element the targets are resolved within. */
  sceneRef: RefObject<HTMLElement>;
  /** Hide the remaining marks for good (skip link / Escape). */
  onSkip: () => void;
  /** True under prefers-reduced-motion. */
  reducedMotion: boolean;
}
```

Behaviour:

- It picks the single mark whose `step` matches the current `step`. If none matches (should not happen for room 1), it renders nothing.
- **Positioning.** A `useLayoutEffect` finds the target via `sceneRef.current.querySelector(mark.target)`, reads the target's and the scene's `getBoundingClientRect`, and positions a `position: absolute` overlay inside the scene *beside* the target — never over it. It chooses a side with room (below the target if there is space under it within the scene, else above; clamped horizontally to the scene) so the mark does not cover the target and does not push it off-screen. A small arrow points from the mark toward the target. Recomputed on `resize` and via a `ResizeObserver` on the scene and the target, cleared on unmount — the same pattern `Room.tsx` already uses for the possessed ring.
- **No layout shift.** The overlay is absolutely positioned inside `.room-scene` (which is `position: relative`), so it is out of normal flow and changes no sibling geometry: CLS stays 0 (Requirement 2.4). It never sets the possessed element's geometry.
- **No focus steal.** The mark container is `tabindex`-free and nothing inside it is auto-focused. Only the "Skip the tips" link is focusable (a real `<button>`); it is in the Tab order so a keyboard player can reach and use it, but focus is never moved *to* it programmatically (Requirement 2.5).
- **Announcement once per step.** The component does not own a live region; it calls an `onAnnounce(step, body)` — actually, to avoid a second live region and to keep the single announcement contract, the *engine* announces. See "Announcements" below. The component only draws.
- **Skip / Escape.** The "Skip the tips" link calls `onSkip`. A `keydown` listener on `window` for `Escape` also calls `onSkip` (and `preventDefault`), matching `HowToPlay`'s Escape handling. `onSkip` in `Room.tsx` calls `skipTips()` and flips local state so the marks unmount (Requirement 2.7, 2.8).
- **Reduced motion.** When `reducedMotion`, the mark renders with no entrance/pulse animation (a still mark); otherwise a gentle fade/pulse within the flicker limits. Transforms and opacity only (Requirement 2.9).
- **Contrast.** The mark is a dark wood plate with ghost/candle text (the same tokens the bar and instruction card use), drawn above the backdrop but never over room text; `contrast_scan` stays at zero flags because the comparison text it might sit near is not covered — the mark sits beside its target (Requirement 2.10).

The arrow and plate are CSS; no image.

### Deriving the step and gating in `Room.tsx`

`Room.tsx` computes whether coach marks apply and the current step, purely from what it already holds:

```ts
const coachApplies =
  !!room.coach &&
  room.coach.length > 0 &&
  !doneRef.current &&          // not done this session…
  !completedAtMount &&         // …and not already completed on entry
  !tipsSkippedState;           // and not skipped

const coachStep: 'spot' | 'name' | 'free' | null =
  state.tag === 'haunted' || state.tag === 'inspecting' || state.tag === 'picking'
    ? state.tag === 'picking' ? 'name' : 'spot'
    : state.tag === 'honest' || state.tag === 'done'
      ? 'free'
      : null; // named: brief flee, no mark
```

- `completedAtMount` is read once at mount from `loadProgress().completed.includes(room.slug)` — so a later visit to an unfinished room still shows marks, but a finished room never does (Requirement 2.2, 2.11).
- `tipsSkippedState` is `useState(() => areTipsSkipped())`; `onSkip` sets it true and calls `skipTips()`.
- The `free` mark shows at `honest` and `done`; the `spot` mark covers `haunted`/`inspecting`; the `name` mark covers `picking`. `named` (the brief flee) shows no mark so nothing competes with the flee animation.
- When `coachApplies` is true and `coachStep` is non-null, `Room.tsx` renders `<CoachMarks marks={room.coach!} step={coachStep} sceneRef={sceneRef} onSkip={onSkip} reducedMotion={reducedMotion} />` as the last child of `.room-scene` (so it layers above, since it is absolutely positioned). `sceneRef` is a new ref on the outer `.room-scene` div.

### Announcements (one per step, no second live region)

The engine must announce each coach step's body once, through the existing polite live region, without breaking the step-line contract (`state.announcement`). The chosen approach keeps `LiveRegion` as the single polite region and does not touch the reducer:

`Room.tsx` keeps a `coachAnnounce` state string and renders a *second* visually-hidden polite region dedicated to coach text — but that would be two polite regions. To avoid that, instead: `Room.tsx` appends the coach body to the announcement the existing `LiveRegion` reads, only on the frame where the step changes. Concretely, `LiveRegion` already reads `state.announcement`; we add an optional `extra` prop:

```tsx
<LiveRegion state={state} extra={coachApplies ? coachBodyForStep : undefined} />
```

`LiveRegion` renders `state.announcement` and, when `extra` is present and differs from the last announced extra, a second `<p>` inside the same region with the coach body. To guarantee "once per step" (Requirement 2.6), `Room.tsx` tracks the last announced step in a ref and only passes `extra` when the step changed, clearing it after a tick. This keeps one region, speaks the step line and then the coach line politely, and never repeats while a step holds.

This is a minimal, additive change to `LiveRegion` (an optional prop, default undefined) and does not alter the existing step-line behaviour or the wrong-card inline reason.

### CSS (`src/styles/manor.css`, `src/app/title-screen.css`)

- **Title steps** (`title-screen.css`): `.title-steps` (flex row, wrap, centered, gap), `.title-step` (narrow column, centered), `.title-step-glyph` (reserved box ~44 px, ghost stroke), `.title-step-title` (display font, candle, ≥22 px), `.title-step-line` (Atkinson, ghost, AA). A `@media (max-width: 600px)` keeps the row compact (smaller glyph, tighter gaps) so "Enter the manor" stays on the first screen. Reduced motion: no glyph animation (the glyphs are static anyway). Colours only from tokens.
- **Coach marks** (`manor.css`): `.coach-mark` (absolute, dark wood plate, bronze border, ghost/candle text, `z-index` above the frame/ring but below the How-to-play popover, `max-width` ~18rem, AA), `.coach-mark-arrow` (a small rotated square or SVG triangle pointing at the target), `.coach-mark-body` (the text), `.coach-mark-skip` (a real link/button, ≥44 px tall target, candle focus ring). An entrance fade/opacity pulse disabled under `prefers-reduced-motion` and kept within the flicker limit. `pointer-events` are enabled only on the plate (so the skip link works) but the plate never overlaps the target, so it does not block taps on the target.

No new font; all colours from `tokens.css`.

## Components and Interfaces

```
TitleScreen
 ├─ title-headline / tagline / facts (unchanged)
 ├─ title-steps (NEW): 3 × title-step { StepGlyph, title, line }  ← TITLE_STEPS
 ├─ title-actions (unchanged, progress-aware)
 └─ title-footer (unchanged)

App → Room (room 1)
 Room (.room-scene, sceneRef)
   ├─ RoomBar / RoomInstructions / LiveRegion(state, extra)
   ├─ Haunted + possessed-ring
   ├─ SpellPicker
   ├─ comparison + BeforeAfterSlider + continue + GuideCard
   └─ CoachMarks (NEW, room 1 only): one mark for the current step + Skip
```

## Error Handling

- **Target not found** (bad selector, or the target not yet in the DOM): `CoachMarks` renders nothing for that step rather than a floating mark, and never throws. The player plays normally; the walk's "mark visible" check would catch a persistent miss.
- **No `ResizeObserver`** (old engines, jsdom): fall back to the `resize` listener and the initial placement; jsdom tests assert render/skip/persist logic, not pixel geometry.
- **localStorage unavailable**: `skipTips`/`areTipsSkipped` degrade to the in-memory progress fallback exactly like `completeRoom`/`loadProgress`, so skipping still works for the session and never throws into render.

## Testing Strategy

- **Title (jsdom, `TitleScreen.test.tsx`)**: the three steps render in order with the three titles and the three lines; each step's glyph is `aria-hidden`; "Enter the manor" is still present and points at `#/room/1`; the steps also render in the in-progress and complete states without removing the existing controls; axe-core color-contrast stays clean in all three states.
- **Shared text (jsdom, `howToPlay.test.ts`)**: `TITLE_STEPS` and `HOW_TO_PLAY` share the same three titles in order; the step-1 body carries "Stuck? The lantern lights the trick."; the guard rejects a mismatch.
- **Room data (`roomData.property.test.ts` / a focused test)**: exactly one loaded room defines a non-empty `coach`, and it is room 1; each coach mark has a `step` in {spot,name,free}, a non-empty `target`, and a non-empty `body`.
- **Coach marks (jsdom, `Room.test.tsx` + `CoachMarks.test.tsx`)**:
  - room 1 shows the `spot` mark on entry (haunted), the `name` mark at picking, the `free` mark at honest/done;
  - a room with no `coach` (e.g. a built fixture or room 2) shows no coach mark;
  - once room 1 is completed (progress has its slug), no coach mark shows on re-entry;
  - "Skip the tips" hides the marks and persists (`areTipsSkipped()` is true; a fresh render shows none);
  - Escape hides the marks and persists;
  - showing a mark does not move focus (document.activeElement unchanged by the mark);
  - the coach body reaches the polite live region once per step (the region's text includes the body once when the step changes);
  - under reduced motion the mark renders with no animation class.
- **The walk (`scripts/mcp/walk.mjs`)**: for room 1 only, after entering (spot), after reaching picking (name), and after reaching the comparison (free): assert the step's `.coach-mark` is visible, and that `document.elementFromPoint` at the target's centre is the target (or inside it), not the coach mark. Then assert that clicking `.coach-mark-skip` removes `.coach-mark`. The first-sight check on entry is unchanged and still passes with the first coach mark showing. Rooms 2–12 are untouched. No pure-rule file (`firstsight.mjs`, `rooms.mjs`, `divider.mjs`, `motion.mjs`) changes, so their node:tests are untouched.

## The one loop story (Requirement 4) — texts changed

The agreed loop wording: **spot/tap the trick → name it (pick the card) → set the page free (compare, finish the task)**, and the lantern line **"Stuck? The lantern lights the trick."** The following player-facing texts are brought to it; each is listed in `tasks.md` as it is changed:

1. `src/app/howToPlay.ts` — `HOW_TO_PLAY` bodies and the lantern line; add `TITLE_STEPS`.
2. `src/app/TitleScreen.tsx` — the new title steps (from `TITLE_STEPS`).
3. `src/app/ClassroomPage.tsx` — the one sentence that describes the loop ("Students spot the trick, name it, and watch the page turn honest.") is kept/aligned to the three steps; if any loop description there diverges, it is aligned (no lesson-plan rewrite — only the loop description).
4. `README.md` — the play/overview description of the loop aligned to the three steps and the lantern-as-hint line (the `walk_rooms` bullet mentions the lantern; the overview line "spot and name dark patterns to set pages free" already matches and is extended with the three steps where the README describes how to play).
5. `index.html` — the `name="description"` meta aligned so it describes the loop consistently (the title's meta description).

Only loop-describing text changes; brand copy, sources, and lesson content are left alone.
