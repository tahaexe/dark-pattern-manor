# Implementation Plan

- [x] 1. One loop story: the shared text source
  - [x] 1.1 In `src/app/howToPlay.ts`: bring the three `HOW_TO_PLAY` bodies to the agreed loop wording and make step 1's lantern line read "Stuck? The lantern lights the trick."; add `TITLE_STEPS` (the terse one-liner per title) and a pure guard that keeps `TITLE_STEPS` title-aligned with `HOW_TO_PLAY`. (R4.1–4.2, R1.5)
  - [x] 1.2 Test `src/app/howToPlay.test.ts`: same three titles in order across both arrays; step-1 body carries the new lantern line; the guard rejects a mismatch.

- [x] 2. The title shows the three steps
  - [x] 2.1 In `src/app/TitleScreen.tsx`: render `<ol class="title-steps">` above `.title-actions`, mapping `TITLE_STEPS` to three `.title-step` items (aria-hidden `StepGlyph` inline SVG + title + line); add the three `StepGlyph` inline SVGs (a few strokes each, ink look, no new image). Keep every existing control; steps render in all three progress states. (R1.1–1.3, R1.6, R3.2)
  - [x] 2.2 CSS in `src/app/title-screen.css`: `.title-steps`, `.title-step`, `.title-step-glyph` (reserved box), `.title-step-title` (display ≥22px), `.title-step-line` (AA body); a `@media (max-width: 600px)` that keeps the steps compact so "Enter the manor" stays on the first screen at 412×915 and 1280×720; reduced-motion safe; tokens only. (R1.4, R1.7, R3.4)
  - [x] 2.3 Tests in `src/app/TitleScreen.test.tsx`: the three steps render in order with the three titles and the three lines; each glyph is aria-hidden; "Enter the manor" present and → `#/room/1`; steps present in in-progress and complete states without removing controls; axe-core color-contrast clean in all three states.

- [x] 3. Room 1 data: the `coach` field
  - [x] 3.1 In `src/engine/types.ts`: add the `CoachMark` interface and the optional `coach?: ReadonlyArray<CoachMark>` on `RoomData`. (R2.1)
  - [x] 3.2 In `src/rooms/gravemoor-gazette/room.ts`: add the three coach marks (spot → `#foyer-reject`, name → `.spell-cards`, free → `.comparison`) with the Requirement-2.3 wording. No other room gets a `coach` field. (R2.1, R2.3, R2.11)
  - [x] 3.3 Room-data test: exactly one loaded room defines a non-empty `coach` and it is room 1; each mark has a valid `step`, a non-empty `target` and `body`. (R2.1, R2.11)

- [x] 4. Progress: the skip flag
  - [x] 4.1 In `src/engine/progress.ts`: add optional `tipsSkipped` to `Progress`, carry it through `read`/`write`, and add `areTipsSkipped()` and `skipTips()` (monotonic, memory fallback). (R2.7, R3.3)
  - [x] 4.2 Tests in `src/engine/progress.test.ts`: `areTipsSkipped()` is false by default, true after `skipTips()`, survives a reload (re-read), and does not disturb `completed`/`unlocked`.

- [x] 5. The CoachMarks component and the engine gating
  - [x] 5.1 Build `src/ui/CoachMarks.tsx`: render the single mark for the current step, positioned beside its target inside the scene (never over it, never off-screen), via a transform (so moving it adds no CLS), recomputed on resize/ResizeObserver; a "Skip the tips" button and window Escape both call `onSkip`; no focus steal; reduced-motion = still mark; renders nothing if the target is missing. (R2.3–2.5, R2.8–2.9)
  - [x] 5.2 In `src/engine/Room.tsx`: add a `sceneRef` on `.room-scene`; compute `coachApplies` (room has `coach`, not done this session, not completed at mount, not skipped) and `coachStep` from the state tag; read `completedAtMount` once and `tipsSkippedState` from `areTipsSkipped()`; render `<CoachMarks …>` as the last child of `.room-scene` when it applies; `onSkip` calls `skipTips()` and flips state so the marks unmount. (R2.2, R2.7, R2.11, R3.5)
  - [x] 5.3 Announce once per step: add an optional `extra` prop to `src/ui/LiveRegion.tsx` (one region, a second `<p>` when present); in `Room.tsx` pass the current step's coach body as `extra` only on the frame the step changes (tracked by a ref), so each step announces once. (R2.6)
  - [x] 5.4 CSS in `src/ui/coach-marks.css` (imported by the component, in the initial bundle): `.coach-mark` (absolute, transform-placed, wood plate, AA, z above frame/ring, below the How-to-play popover), `.coach-mark-arrow`, `.coach-mark-body`, `.coach-mark-skip` (≥44px, candle focus ring); entrance within the flicker limit, off under reduced motion; tokens only; pointer-events only on the plate, which never overlaps the target. (R2.4, R2.9, R2.10)
  - [x] 5.5 Tests (`src/ui/CoachMarks.test.tsx` and `src/engine/Room.coach.test.tsx`): spot mark on entry, name mark at picking, free mark at honest/done; a room without `coach` shows none; a completed room shows none on re-entry; Skip hides and persists; Escape hides and persists; showing a mark moves no focus; the coach body reaches the live region once per step; reduced motion = no animation class. (R2.2–2.11)

- [x] 6. The walk checks room 1's coach marks
  - [x] 6.1 In `scripts/mcp/walk.mjs`: for room 1 only, at each step assert the `.coach-mark` is visible and `document.elementFromPoint` at the target's centre is the target (not the mark); then assert clicking `.coach-mark-skip` removes `.coach-mark`. Keep the first-sight check unchanged and confirm room 1 still passes it with the first mark showing. Rooms 2–12 and the pure-rule files untouched. (R5.1–5.5)

- [x] 7. One loop story: the remaining texts
  - [x] 7.1 Align `src/app/ClassroomPage.tsx`'s loop description to the three steps (loop sentence only; no lesson-plan rewrite). (R4.3, R4.6)
  - [x] 7.2 Align `README.md`'s play/how-to description to the three steps and the lantern-as-hint line. (R4.4, R4.6)
  - [x] 7.3 Align `index.html`'s `name="description"` meta to the loop wording. (R4.5, R4.6)

- [x] 8. Gates
  - [x] 8.1 Run `npm test`, `npm run build`, `npm run check:rooms`, `npm run check:size`, and `npm run qa:full` (all rooms, both sizes, both motion modes); report each result, every file created or changed, the list of loop texts changed, and anything not done. All pass. (R3.1–3.5, R5)

- [x] 9. First-minute polish (measured regressions)
  - [x] 9.1 Make the title fit short viewports: in `src/app/title-screen.css` add a `@media (max-height: 800px)` block that tightens the heading size, the ghost size and the vertical gaps/padding so "Enter the manor" is fully on the first screen at 1280×720 with ≥16px below it, without dropping any text and keeping each step title ≥22px; 412×915 (height 915 > 800) is untouched. Measured: button bottom 504 of 720 (216px below) at 1280×720; 412×915 unchanged (bottom 766). (R6.1)
  - [x] 9.2 No widows in the title step lines: in `src/app/howToPlay.ts` bind each `TITLE_STEPS` line's last word with a non-breaking space (`\u00A0`); the words are otherwise unchanged and the alignment guard still holds. Updated `src/app/howToPlay.test.ts` and `src/app/TitleScreen.test.tsx` to the nbsp lines and assert no line leaves a word after its last non-breaking space. (R6.2)
  - [x] 9.3 Room 1 CLS 0: in `src/ui/CoachMarks.tsx` reveal the mark only once its position has settled — it is placed and re-placed invisibly (`is-measuring`, `visibility: hidden`) through the entry's ring/scroll and the comparison's opening sweep, then revealed at its final spot, so every refining move happens before paint and is never a shift; the side is held per step so the arrow never jumps edges. The `is-measuring` rule in `src/ui/coach-marks.css` sets `visibility: hidden` (keeping the full plate measured so the reveal lands at the right height). Measured: room 1 CLS 0 at both sizes, motion on and off. (R6.3)
  - [x] 9.4 The walk checks the title button: added the pure rule `scripts/mcp/title.mjs` (`buttonFullyInViewport`) with `scripts/mcp/title.test.mjs`; in `scripts/mcp/walk.mjs` added `walkTitle` (navigate to `#/`, measure the "Enter the manor" box, fail if not fully in the viewport) and call it once per size before the rooms; taught `scripts/mcp/manor-qa-full.mjs` to print and count the title entry. (R6.4)
  - [x] 9.5 Gates: ran `npm test` (pass), `npm run build` (pass), `npm run check:size` (pass, 29.6 KB), and `npm run qa:full`. All four title checks pass (button fully on the first screen at both sizes); room 1 CLS is 0 at both sizes with motion on and off; room 1's three coach marks are visible and uncovered and the skip hides them. Two pre-existing, flaky findings surfaced intermittently and are NOT caused by this change (room content and the contrast scanner are untouched): room 6's named-hold occasionally catches a `.cloak-size` transition mid-flight, and room 1's haunted cookie-bar / honest "Accept all" occasionally flag in `contrast_scan` at 412×915 with motion on (the screenshot is sometimes captured mid mist/flicker). Repeating the room-1 412×915 scan four times gave 0, 0, 1, 0 flags; every reduced-motion scan is 0. (R6.1–6.4)
