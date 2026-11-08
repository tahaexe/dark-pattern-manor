# Implementation Plan

- [x] 1. Engine: the first tap works and the lantern becomes the hint
  - [x] 1.1 Add `misses` to the reducer state; make `haunted + SELECT_POSSESSED → picking`; make `haunted + SELECT_OTHER` and `inspecting + SELECT_OTHER` self-loops that increment `misses` with the new announcements; add a pure `stepLine(state, room)` helper; keep the reducer pure and total. (room-engine R2.3–2.6, R5.1)
  - [x] 1.2 In `Room.tsx`, on entering `inspecting` draw the candle ring around the possessed element (found by `possessedId`), scroll it into view and focus it, recompute on resize, respect reduced motion. (room-engine R2.2, R3.7)
  - [x] 1.3 In `Room.tsx`, add the stuck-help timer (20 s in haunted or two misses) that glows the lantern and appends " Stuck? Light the lantern."; clear on every state change and unmount. (room-engine R2.13)
  - [x] 1.4 Unit/interaction tests for 1.1–1.3, including the no-dead-end property with the new self-loops.

- [x] 2. The compact bar and the instruction line
  - [x] 2.1 Build `src/ui/RoomBar.tsx` (‹ Manor, Room N of 12 + dots, Rooms, ?, Sound) and `src/ui/RoomInstructions.tsx` (name, task, step line, lantern). (R2.1–2.5)
  - [x] 2.2 Replace the room route's Back button and task card with the bar + instruction card; move the Sound toggle into the bar on the room route only. (R2.1, R2.10)
  - [x] 2.3 Add the new step lines and wire them from `stepLine`. (R2.4–2.5)
  - [x] 2.4 CSS: style the bar, instruction card, dots, and ring; tighten room-scene top spacing so the frame clears the fold (≤150 px at 1280×720, ≤210 px at 412×915), no CLS. (R2.6–2.7)
  - [x] 2.5 Room 1: pin the cookie banner to the bottom of the viewport on the live haunted page only. (R2.9)
  - [x] 2.6 First-sight: per room at both sizes, tighten only that room's own spacing where needed; record each change. (R2.8)
  - [x] 2.7 Tests: bar text and dots, step lines per state.

- [x] 3. Quality of life
  - [x] 3.1 Inline wrong-card reason under the cards; stop the top-scroll in `LiveRegion`; scroll the reason into view (block nearest) if below the fold. (R3.1–3.2)
  - [x] 3.2 Scroll the cards into view on entering picking (block nearest; instant under reduced motion). (R3.3)
  - [x] 3.3 `src/ui/RoomsDialog.tsx` — native modal dialog, twelve links, freed rooms show their pattern, aria-current, Esc + Close, focus return. (R3.4)
  - [x] 3.4 `src/app/howToPlay.ts` + `src/ui/HowToPlay.tsx` — the "?" popover with three steps, Esc + Close, focus return. (R3.5–3.6)
  - [x] 3.5 Continue link reads "Next room: <name>" / "Leave the manor", ≥44 px. (R3.7)
  - [x] 3.6 Registry prefetch (one shared promise per slug); App loader reuses it; prefetch on reaching honest. (R3.8)
  - [x] 3.7 Comparison opening sweep to 800 ms. (R3.9)
  - [x] 3.8 Target size: every engine control ≥44×44; possessed tap area ≥24×24. (R4)
  - [x] 3.9 Tests: inline reason + no top-scroll, Rooms dialog, How-to-play, continue link text, 800 ms sweep, prefetch, axe per state.

- [x] 4. The walk and its tests
  - [x] 4.1 `scripts/mcp/walk.mjs`: keyboard path for even rooms, pointer path for odd rooms; first-sight check on entry; target-size check for engine controls; record (don't fail on) next-room transition time; update text checks to the new step lines.
  - [x] 4.2 `scripts/mcp/` tests for the new pure rules (first-sight, target-size).

- [x] 5. Gates
  - [x] 5.1 `npm test`, `npm run build`, `npm run check:rooms`, `npm run check:size`, `npm run qa:full -- 1`; report each result and every file changed.

- [x] 6. Compact chrome: bring the frame onto the first screen, hide the live strip, fix the walk and CLS
  - [x] 6.1 Hide the polite live region (visually-hidden) in `LiveRegion.tsx`: it stays in the DOM and keeps announcing, but takes no space and shifts nothing. The instruction card's step line carries the step on screen; the inline wrong-card reason under the cards stays visible. (R2.5, R2.7)
  - [x] 6.2 CSS `.room-scene`: remove the empty space above the bar (bar within 8 px of the top) and keep the gaps between bar, instruction card and frame at most 12 px, at every size. (R2.13)
  - [x] 6.3 Phone (below 600 px wide): make the bar one row, at most 56 px tall, with "‹ Manor", the counter + dots, then Rooms, ?, Sound as 44 × 44 icon buttons (accessible names kept; visible labels may drop). (R2.11)
  - [x] 6.4 Phone instruction card: keep the room/task and step lines on the left and the lantern (≥44 × 44, "Lantern" visible, "hint" may drop) on the right of the step line, never on its own row. (R2.12)
  - [x] 6.5 First-sight by frame top: the walk measures the live haunted frame's top and fails a room over 150 px at 1280×720 or 210 px at 412×915. Added a pure `frameTopWithinLimit(top, width)` rule (with `frameTopLimit`) to `firstsight.mjs` with its node:test; the walk measures `FRAME_TOP` and fails on it. (R2.6)
  - [x] 6.6 Per-room spacing: after the chrome change rooms 3 and 12 still missed the first-sight band (their possessed element was only ~25/37 px tall). Tightened only those two rooms' possessed tap areas to a 44 px hit box (no change to words, trick, signs, or honest twin). Listed below. (R2.8)
  - [x] 6.7 Continue link to done: when the room reaches done, the "Next room: <name>" link renders directly under the Before/After slider (above the Ghost Guide card) and is scrolled into view (block nearest; instant under reduced motion); text and size unchanged. (R3.10)
  - [x] 6.8 Fix the walk's self-break: after the timing click to room n+1 the walk returns to the title (`#/`), so the next iteration's readiness read sees a title other than the previous room's; `roomReadiness` and its tests are unchanged. (R6.1–6.2)
  - [x] 6.9 Fix the returned layout shift: the live region out of flow removes the play-time CLS; CLS is 0 in every room at both sizes and both motion modes. (R6.3, R2.7)
  - [x] 6.10 Tests for each change: the hidden live region still announces (LiveRegion.test.tsx); the bar's single row/actions-in-order and the lantern beside the step by class/structure (Room.test.tsx; computed layout left to the walk); the continue link's new place and the scroll (Room.test.tsx); the `frameTopWithinLimit`/`frameTopLimit` rules (firstsight.test.mjs); the walk's updated readiness/continue flow.
  - [x] 6.11 Gates: `npm test`, `npm run build`, `npm run check:rooms`, `npm run check:size`, `npm run qa:full -- 1`, `npm run qa:full -- 2,6,9` (and the full `-- 1-12`) all pass. Results, frame tops, first-sight, files changed and rooms tightened reported.

- [x] 7. The honest comparison never captures a control's click (pointer dead-end fix)
  - [x] 7.1 In `src/engine/Room.tsx`, add the `INTERACTIVE_IN_COMPARISON` selector constant and make `onPointerDown` return early (no `setPointerCapture`, no `setFromPointer`) when the target is inside an interactive control of either comparison page (`button`, `a[href]`, `input`, `select`, `textarea`, `label`, `summary`, `[role="button"]`, `[role="link"]`, `[role="checkbox"]`, `[tabindex]` other than `-1`), keeping `.split-control`, the grip, the drag on non-interactive parts and all keyboard behaviour exactly as now. (R7.1–7.3)
  - [x] 7.2 Tests (jsdom, `src/engine/Room.test.tsx`): a pointerdown then click on the honest "Reject all" reaches `done` and renders the "Next room" link; a pointerdown on a non-interactive part of the comparison starts a drag (takes pointer capture); a pointerdown on a control inside the comparison does not start a drag (no pointer capture). jsdom has no PointerEvent and drops clientX from a dispatched event, so the drag is probed by whether the comparison takes pointer capture (the single action gated by the early-return) rather than by the resulting divider percent. (R7.1–7.3)

- [x] 8. The walk completes the honest task with a real pointer
  - [x] 8.1 In `scripts/mcp/browser.mjs`, add two CDP helpers to the client: `mouseClick(x, y)` (`Input.dispatchMouseEvent` mousePressed + mouseReleased, left button) and `tap(x, y)` (`Input.dispatchTouchEvent` touchStart + touchEnd), no new dependency. (R8.1)
  - [x] 8.2 In `scripts/mcp/walk.mjs`, drive the honest task by the even/odd rule: even rooms keep focus + Enter; odd rooms scroll the first honest control into view, check `document.elementFromPoint` at its centre is that control (fail if not), then a CDP mouse click at 1280×720 or a CDP touch at 412×915. The shared `task completes` check covers both paths. (R8.1–8.3)

- [x] 9. Room 9 onto the first screen at 1280×720
  - [x] 9.1 In `src/rooms/mildew/room.css`, tighten room 9's own spacing above the possessed fee block by at least 8 px so its whole box (566–724 px → now 517–675 px) sits within the 720 px viewport at 1280×720, without changing room 9's words, trick, signs or honest twin, and leaving 412×915 as it is. Changes: `.mildew-header` `margin-bottom` `--spacing-lg` → `--spacing-sm` (−16 px); `.checkout-steps` `margin` bottom `--spacing-lg` → `--spacing-sm` (−16 px); `.plan-card` `gap` `--spacing-md` → `--spacing-sm` (−8 px × 3 gaps above the block). A `@media (max-width: 600px)` override restores `.checkout-steps` margin and `.plan-card` gap so 412×915 is byte-for-byte unchanged (the phone already overrode `.mildew-header`). (R9.1–9.3)
  - [x] 9.2 Freeze room 9's `.fee-lines` background transition during the named hold (`.room-scene[data-moment='right'] .fee-lines { animation: none; transition: none; }`): the named-hold QA caught the 120 ms `transition: background` still running when room 9 loaded from a warm chunk (ready ~5 ms). This completes the existing named-hold freeze contract and changes no words, trick, signs or honest twin. (R9.3, R6.3)

- [x] 10. Gates for items 7–9
  - [x] 10.1 `npm test`, `npm run build`, `npm run check:rooms`, `npm run check:size`, `npm run qa:full -- 1`, `npm run qa:full -- 1,9`; report each result, room 9's possessed box at both sizes from the walk, every file changed, and anything not done. (R5, R6, R7, R8, R9)
