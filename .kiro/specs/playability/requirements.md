# Requirements Document

## Introduction

A first-time player opened Dark Pattern Manor and could not get started: "I don't understand what to do when I come in", "I can't tell how to move the lantern", "the quality of life is weak". Measured on the current build, a player's first tap on the possessed element did nothing (the machine's haunted state accepted only the lantern), the lantern read as a light to carry around, the haunted frame began far below the fold (so the possessed element was off-screen at first sight in most rooms), and after a wrong card the page scrolled up to the top strip.

This feature makes every room playable at first sight. It defines a compact top bar and a single instruction card that bring the trick onto the first screen, quality-of-life behaviours (inline wrong-card reason without a scroll jump, a Rooms dialog, a How-to-play popover, a named continue link, next-room prefetch, a faster comparison sweep), and the target-size and keyboard/screen-reader guarantees for every control the engine owns. The first-tap and lantern-as-hint transitions themselves are owned by the `room-engine` spec; this feature depends on them.

## Glossary

- **first sight**: The state of a room on entry, before any player input, at a given viewport size.
- **the bar**: The single compact row along the top of the room route — "‹ Manor", the room counter and dots, "Rooms", "?", and the Sound toggle.
- **the instruction card**: The card under the bar carrying the room name, the task, the current step in large text, and the lantern button.
- **possessed element**: The interactive element on the haunted page that holds the dark pattern.
- **the lantern**: The button (and the L key) that lights up the trick — rings the possessed element, scrolls it into view, and focuses it.
- **inline reason**: The visible copy of a wrong card's hint shown under the spell cards.
- **the polite live region**: The `role="status"` region that speaks the step line and the wrong-look nudges. It is visually hidden (out of flow) so it never shows as a strip and never shifts the page; the instruction card carries the same step line on screen.
- **the Rooms dialog**: The modal listing all twelve rooms as links, any playable in any order.
- **the How-to-play popover**: The small popover behind the "?" button with the three steps of play.
- **the continue link**: The link a room shows once honest to move to the next room (or leave the manor).
- **prefers-reduced-motion**: The CSS media query; when active, motion is replaced by static presentation or instant jumps.
- **target size**: The CSS pixel size of a control's activation area.
- **interactive control**: An element the browser treats as a control — a `button`, an `a[href]`, an `input`, a `select`, a `textarea`, a `label`, a `summary`, a `[role="button"]`, a `[role="link"]`, a `[role="checkbox"]`, or any element with a `tabindex` other than `-1`.

## Requirements

### Requirement 1: The first tap and the lantern hint (engine)

**User Story:** As a first-time player, I want my first tap on the trick to work, and I want the lantern to point out the trick when I am lost, so that I am never stuck at the door.

#### Acceptance Criteria

1. WHEN the player taps the possessed element on the haunted page without first raising the lantern, THE engine SHALL take the player to the picking step.
2. WHEN the player taps a non-possessed element on the haunted page, THE engine SHALL keep the page haunted, announce "Not that one. Look again, or light the lantern for a hint.", and count a miss.
3. WHEN the player lights the lantern, THE engine SHALL draw a candle-coloured ring around the possessed element, scroll it into view, move keyboard focus to it, and announce "The lantern lights the trick. Tap it."
4. WHEN the player taps a non-possessed element after the lantern is lit, THE engine SHALL announce "Nothing haunts this. Look for the candle ring." and count a miss.
5. WHEN twenty seconds pass in the haunted state with no transition out, OR WHEN the miss count reaches two, THE engine SHALL glow the lantern button and append " Stuck? Light the lantern." to the instruction line.
6. WHERE prefers-reduced-motion is active, THE engine SHALL draw the ring without a glow animation, scroll instantly, and show the lantern's stuck-help as a still candle outline rather than a pulse.
7. THE engine SHALL clear the stuck-help timer on every state change and on unmount.

### Requirement 2: The compact bar and the instruction line

**User Story:** As a player, I want one clear bar and one clear instruction, so that I always know where I am and what to do.

#### Acceptance Criteria

1. THE room route SHALL show a single bar along the top carrying, left to right: a quiet text button "‹ Manor" to the title, "Room N of 12" with twelve small dots, a "Rooms" button, a "?" button, and the Sound toggle.
2. THE bar SHALL render each dot as filled candle colour for a freed room, a ring for the current room, and hollow for the rest, SHALL mark the dots `aria-hidden`, and SHALL expose the counter to assistive technology as "Room N of 12, M freed".
3. THE room route SHALL show, under the bar, one instruction card carrying a small first line with the room name and "Your task: <task>", the current step in large text, and the lantern button.
4. THE instruction card SHALL show, as the current step, the exact step line for the current state: haunted "Step 1 of 3 · Find the trick: tap the part of this page that's tricking you."; inspecting "Step 1 of 3 · The lantern lights the trick. Tap it."; picking "Step 2 of 3 · Name it: pick the card that names the trick."; named "Named. The ghost flees."; honest "Step 3 of 3 · Drag the line to compare. Then finish your task on the honest page: <task>."; done "Freed! The page is honest."
5. THE engine SHALL announce, through the polite live region, the same final words as the current step line. The polite live region SHALL stay in the DOM and keep announcing, and SHALL be visually hidden (the visually-hidden pattern) so it never shows as a strip and never contributes layout shift. The inline wrong-card reason under the cards SHALL stay visible as before.
6. WHEN a room is entered at 1280 × 720, THE room route SHALL place the top of the live haunted frame at most 150 px from the top of the viewport; at 412 × 915 it SHALL place it at most 210 px from the top. The first-sight check (`scripts/mcp/firstsight.mjs`) and the walk SHALL measure the live haunted frame's top against these numbers and SHALL fail a room that exceeds them, in every room at both sizes.
7. THE room route SHALL add no layout shift from the bar, the instruction card, and the polite live region (cumulative layout shift stays at 0): the same items render in every room and state, the step line reserves its height, and the polite live region is taken out of flow (visually hidden) so changing its words never moves the page.
8. WHEN a room is entered at 1280 × 720 and at 412 × 915, THE room route SHALL have at least half of the possessed element's box and at least 44 px of its height inside the viewport, tightening only that room's own spacing (not its words, trick, signs, or honest twin) where needed to meet this.
9. WHERE the room is room 1 on the live haunted page, THE room SHALL stick its cookie banner to the bottom of the viewport (position: sticky; bottom: 0), and SHALL NOT stick it in the comparison previews.
10. THE Sound toggle SHALL stay where it is on the title, ending, and teaching pages.

#### The compact bar and instruction card below 600 px (phone)

11. WHERE the viewport is below 600 px wide, THE bar SHALL be a single row at most 56 px tall carrying, left to right: "‹ Manor", then "Room N of 12" with the twelve dots under or beside it, then "Rooms", "?", and the Sound toggle rendered as 44 × 44 icon buttons. Each icon button SHALL keep an accessible name ("Rooms", "How to play", and the Sound toggle's own name); a visible label MAY be dropped on the phone only.
12. WHERE the viewport is below 600 px wide, THE instruction card SHALL keep the room/task line and the step line on the left and the lantern button (at least 44 × 44, with the visible word "Lantern"; the "hint" sub-label MAY be dropped) on the right of the step line, never on its own row.
13. AT every size, THE room route SHALL start the bar within 8 px of the top of the scene and SHALL keep the gaps between the bar, the instruction card, and the frame at most 12 px.

### Requirement 3: Quality of life

**User Story:** As a player, I want small comforts — a visible reason for a wrong card, cards and reasons that stay on screen, a room list, a how-to, a named next step, and quick transitions — so that playing feels smooth.

#### Acceptance Criteria

1. WHEN the player picks a wrong card, THE engine SHALL show that card's existing hint as an `aria-hidden` inline reason directly under the cards, SHALL NOT scroll the page to the top strip, and SHALL keep the live region announcing the whisper.
2. WHERE the inline reason is below the fold, THE engine SHALL scroll it into view with block nearest.
3. WHEN the room enters the picking step, THE engine SHALL scroll the spell cards into view with block nearest, instant under prefers-reduced-motion.
4. WHEN the player opens "Rooms", THE engine SHALL open a modal native dialog with the heading "Rooms of the manor", the twelve rooms in order as links to `#/room/N` each reading "N. <room name>", freed rooms also reading "freed: <pattern>" from the room's pattern data, the current room marked `aria-current="page"`, and a Close button; Esc SHALL close it; focus SHALL return to the "Rooms" button; any room SHALL be reachable in any order.
5. WHEN the player opens "?", THE engine SHALL open a "How to play" popover with the three steps "Spot the trick" / "Each room is a web page with one trick in it. Tap the part that's tricking you. Stuck? Light the lantern.", "Name it" / "Pick the card that names the trick.", and "Set the page free" / "Drag the line to compare it with the honest page, then do the task there."; Esc and a Close button SHALL close it; focus SHALL return to "?".
6. THE engine SHALL keep the three How-to-play steps in one module `src/app/howToPlay.ts` that the title-screen can import.
7. THE continue link SHALL read "Next room: <next room's name>" for rooms 1–11 and "Leave the manor" for room 12, and SHALL be at least 44 px tall.
8. WHEN a room reaches the honest state, THE engine SHALL prefetch the next room's chunk through the registry using one shared promise per slug, and the App's loader SHALL reuse that promise.
9. THE engine SHALL run the comparison's opening sweep over about 800 ms, and SHALL run no sweep under prefers-reduced-motion.
10. WHEN a room reaches the done state, THE engine SHALL place the "Next room: <name>" continue link directly under the comparison's Before/After slider (above the Ghost Guide card) and SHALL scroll it into view (block nearest; instant under prefers-reduced-motion); its text and size SHALL be unchanged.

### Requirement 4: Target size and input

**User Story:** As a player on a touch screen or using assistive technology, I want every control to be big enough and reachable, so that nothing is fiddly or unreachable.

#### Acceptance Criteria

1. THE engine SHALL make every control it owns — the bar, the instruction card controls, the lantern, the spell cards, the slider and its thumb, the continue link, and the dialog controls — at least 44 × 44 CSS pixels.
2. THE engine SHALL keep the possessed element's own tap area at least 24 × 24 CSS pixels, leaving the haunted page's own controls their trick look.
3. THE engine SHALL keep every control operable by keyboard alone and labelled for screen readers.

### Requirement 5: Keep

**User Story:** As a maintainer, I want the changes to respect the project's existing guarantees, so that nothing regresses.

#### Acceptance Criteria

1. THE feature SHALL add no new font and SHALL keep the room chunks code-split, so the initial bundle stays within `check:size`.
2. THE feature SHALL keep all text at WCAG AA contrast in both states and SHALL keep `contrast_scan` at zero flags.
3. THE feature SHALL keep the game keyboard- and screen-reader-first and honour prefers-reduced-motion.
4. THE feature SHALL set no cookies, make no third-party request, and add no analytics.
5. THE feature SHALL leave the title, ending, and teaching pages unchanged apart from what the bar's shared controls need.

### Requirement 6: The walk agrees with itself

**User Story:** As a maintainer, I want the walk to walk every room cleanly, so that the gates measure the game and not a bug in the walk.

#### Acceptance Criteria

1. THE walk SHALL time the move from a freed room to the next room without leaving the next room in a state the next iteration mistakes for "not loaded": after clicking the continue link to time the move, the walk SHALL either start the next room from that state without navigating again, or navigate back first, so that `roomReadiness` sees a title other than the previous room's.
2. THE walk SHALL keep `roomReadiness`'s rule (ready only once the hash names the room, loading is false, the lantern is present, and the title is new) and its node:test coverage unchanged.
3. THE walk SHALL measure cumulative layout shift as 0 in every room at both sizes and both motion modes.

### Requirement 7: The honest comparison never captures a control's click

**User Story:** As a player finishing the task with a mouse or a touch, I want my click or tap on an honest-page control to reach that control, so that I can finish the room without a keyboard.

#### Background

In the comparison, `onPointerDown` started a divider drag for any target except `.split-control`: it called `setPointerCapture` on the comparison and moved the divider to the pointer. A mouse click or a tap on a control inside the honest page (room 1's honest "Reject all", for example) was captured by the comparison and never reached the control, so the task could not be finished with a pointer; only the keyboard (focus, Enter) worked. Because the "Next room" link now renders only once the room is done, a pointer player was stuck in the room. The walk never saw this because it finishes every honest task by keyboard.

#### Acceptance Criteria

1. WHEN a pointerdown's target is inside an interactive control of either comparison page (a `button`, an `a[href]`, an `input`, a `select`, a `textarea`, a `label`, a `summary`, a `[role="button"]`, a `[role="link"]`, a `[role="checkbox"]`, or any `[tabindex]` other than `-1`), THE engine SHALL start no divider drag: it SHALL take no pointer capture and SHALL NOT move the divider, so the control receives its own click.
2. WHEN a pointerdown's target is a non-interactive part of either comparison page (not a control and not the `.split-control`), THE engine SHALL start a divider drag and move the divider to the pointer, as before.
3. THE engine SHALL leave the divider grip and the `.split-control` behaviour unchanged, and SHALL leave the keyboard behaviour of the comparison and the slider unchanged.

### Requirement 8: The walk completes the honest task with a real pointer

**User Story:** As a maintainer, I want the walk to finish the honest task by pointer in the rooms it drives by pointer, so that the pointer path to `done` is exercised and this class of bug is caught.

#### Acceptance Criteria

1. WHERE the walk drives a room by pointer (the odd rooms), THE walk SHALL complete the honest task with a real pointer: it SHALL scroll the honest control into view, check that `document.elementFromPoint` at the control's centre is that control (reporting a failure if something else is on top), then dispatch a CDP mouse click at 1280 × 720 and a CDP touch (touchStart, touchEnd) at 412 × 915.
2. WHERE the walk drives a room by keyboard (the even rooms), THE walk SHALL complete the honest task by keyboard (focus, Enter), as before.
3. THE walk's "task completes" check SHALL cover both the pointer path and the keyboard path (the room reaches `done` and the "Next room" link renders).

### Requirement 9: Room 9 is on the first screen at 1280 × 720

**User Story:** As a player entering room 9 on a desktop, I want the possessed element fully on the first screen, so that I can see the trick without scrolling.

#### Background

Measured in headless Chrome on the current build, room 9's possessed element's box was 566–724 px with a 720 px viewport (4 px below the fold at 1280 × 720).

#### Acceptance Criteria

1. WHEN room 9 is entered at 1280 × 720, THE room SHALL place the whole of its possessed element's box within the 720 px viewport (its box bottom at or above the fold), by tightening only room 9's own spacing (paddings, margins, gaps) by at least 8 px above the possessed element.
2. THE change SHALL NOT alter room 9's words, trick, signs, or honest twin.
3. THE change SHALL keep room 9 fitting at 412 × 915 as it already does, SHALL add no layout shift (CLS 0 in the walk), SHALL keep AA contrast, and SHALL leave the keyboard and screen-reader behaviour unchanged.

## Correctness Properties

These are the executable properties, for property-based and unit testing.

- For any viewport in {1280 × 720, 412 × 915} and any of the twelve rooms, on entry at least half of the possessed element's box and at least 44 px of its height are inside the viewport, and the live haunted frame's top is within the per-size limit (≤150 px at 1280 × 720, ≤210 px at 412 × 915) (checked in the walk).
- The step line and the polite announcement share the same final words for every state.
- Every engine-owned control's measured target size is at least 44 × 44 CSS px; the possessed element's tap area is at least 24 × 24 CSS px.
- The Rooms dialog lists exactly twelve links in room order; each freed room's entry contains its pattern text.
- A wrong card never scrolls the page to the top strip; the inline reason text equals that card's hint.
- Prefetch returns the same promise object that `loadRoom` later returns for a given slug.
- The polite live region is out of flow (visually hidden) so changing its words shifts nothing; cumulative layout shift stays at 0 through a full play of every room.
- A pointerdown inside an interactive control of either comparison page starts no divider drag (no pointer capture, no divider move), so a pointer click on an honest control reaches it and the room reaches done; a pointerdown on a non-interactive part of the comparison still moves the divider.
- In every room the walk drives by pointer, the honest task is completed by a real pointer (a CDP mouse click at 1280 × 720, a CDP touch at 412 × 915) and the room reaches done with the continue link rendered.
- At 1280 × 720 the whole of room 9's possessed element's box sits within the 720 px viewport.
