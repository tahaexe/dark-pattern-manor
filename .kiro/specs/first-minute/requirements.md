# Requirements Document

## Introduction

The `playability` feature made every room playable at first sight: the first tap works, the possessed element is on the first screen in all twelve rooms at both sizes, and the full walk is clear. What is still missing is the explanation. Measured on the live build (headless Chrome, fresh profile), a first-time player now taps the trick in room 1 within about 1.5 s with no lantern — but the title only says "Enter the manor", and room 1 teaches its three steps only through the instruction line. A newcomer meets the loop (spot → name → free) with no preview of it and no in-room coaching.

This feature makes the first minute teach the loop, without changing any room's trick, words, signs, or honest twin, and without a fail state. It does three things:

1. **The title shows the three steps.** Above "Enter the manor" the title screen draws the three steps of play — "Spot the trick", "Name it", "Set the page free" — each with a small inline-SVG ink drawing in the manor's look and one short line under it. One tap on "Enter the manor" still starts; there is nothing else to read or dismiss.
2. **Room 1 is the tutorial.** Room 1 (the Foyer) shows coach marks for its three steps, driven from a `coach` field on room 1's data only. The marks appear while room 1 is not done (also on a later visit if it was never finished), never in any other room, carry a "Skip the tips" link that hides the rest for good, are positioned overlays that never move the page or cover their target or take focus, and announce each step once through the polite live region.
3. **Every loop description agrees.** Every player-facing text in the repo that describes the loop says the same thing — tap the trick, name it, set the page free; the lantern is the hint ("Stuck? The lantern lights the trick.").

## Glossary

- **the loop**: The three steps of every room — spot the trick, name it, set the page free.
- **the three steps**: "Spot the trick", "Name it", "Set the page free", the player-facing names of the loop's stages.
- **the title steps**: The three steps drawn on the title screen above "Enter the manor", each with an ink drawing and a one-line description.
- **the coach marks**: The small positioned overlays shown only in room 1 that point at the possessed element, the spell cards, and the comparison, one per step of the loop.
- **the possessed element**: The interactive element on the haunted page that holds the dark pattern (room 1: the "Reject all" link, id `foyer-reject`).
- **the comparison**: The Before/After split shown once a room is honest.
- **the polite live region**: The existing `role="status"` region (`LiveRegion`) that speaks the step line. It is visually hidden and out of flow.
- **room 1 not done**: Room 1's slug (`gravemoor-gazette`) is not in the persisted `completed` list.
- **Skip the tips**: The link on each coach mark that hides the remaining coach marks for good, saved in progress like the rest.
- **prefers-reduced-motion**: The CSS media query; when active, motion is replaced by static presentation.
- **the `coach` field**: An optional field on `RoomData`, set only on room 1, carrying the three coach-mark step definitions (target, title, body).

## Requirements

### Requirement 1: The title shows the three steps

**User Story:** As a first-time player at the door, I want to see the three steps of play before I enter, so that I know the loop before my first room.

#### Acceptance Criteria

1. THE title screen SHALL show, above the "Enter the manor" control, the three steps of play in order: "Spot the trick", "Name it", "Set the page free".
2. THE title screen SHALL draw, for each step, a small ink drawing in the manor's look (inline SVG, a few strokes, no new image file), marked `aria-hidden`, and SHALL show one short line under each step title: for "Spot the trick" "One part of the page is haunted. Tap it."; for "Name it" "Pick the card that names the trick."; for "Set the page free" "See the honest page and finish your task."
3. THE title screen SHALL keep a single primary control reading "Enter the manor" that starts the game in one tap (navigating to `#/room/1`), with nothing else to read or dismiss; the steps are shown, not a dialog or a step the player must close.
4. WHERE the viewport is a phone at 412 × 915, THE title screen SHALL lay the three steps out in one compact row or a short column that keeps the "Enter the manor" control within the first screen (no scrolling to reach it); at 1280 × 720 the control SHALL also be within the first screen.
5. THE three title steps SHALL use the same three step names and descriptions as the shared loop text (Requirement 4), so the title and the "?" popover never drift.
6. THE title screen SHALL keep its existing heading, tagline, facts line, progress-aware actions (Continue / Start again / The manor is quiet), and teacher footer; the steps SHALL show in the first-time ("Enter the manor") state, and MAY also show in the in-progress and complete states, but SHALL NOT replace or hide any existing control.
7. THE title steps SHALL meet WCAG AA contrast over the darkened backdrop (the title's axe-core color-contrast check stays clean).

### Requirement 2: Room 1 is the tutorial (coach marks)

**User Story:** As a first-time player in my first room, I want a short, skippable guide pointing at each step, so that I learn the loop by doing it, and never see it again once I know it.

#### Acceptance Criteria

1. THE coach marks SHALL be driven from a `coach` field on room 1's room data only; no other room SHALL carry a `coach` field, and THE engine SHALL show coach marks only for a room that has one.
2. WHEN room 1 is entered AND room 1 is not done AND the tips have not been skipped, THE engine SHALL show the coach mark for the current step; this SHALL hold on a first visit and on any later visit while room 1 is still not done.
3. THE engine SHALL show, for the spot step (while haunted or inspecting), a coach mark pointing at the possessed element reading "This part is tricking you. Tap it."; for the name step (while picking), a coach mark pointing at the spell cards reading "Pick the card that names the trick. A wrong card costs nothing."; for the free step (once honest or done), a coach mark pointing at the comparison reading "Drag the line to compare, then finish your task on the honest page."
4. THE coach marks SHALL be positioned overlays that add no layout shift (cumulative layout shift stays 0): they SHALL NOT move the page, SHALL NOT cover the element or control they point at, and SHALL NOT push the possessed element off the first screen at 1280 × 720 or 412 × 915.
5. THE coach marks SHALL NOT take focus: showing or changing a coach mark SHALL NOT move keyboard focus, and the mark SHALL NOT be in the Tab order except for its "Skip the tips" link.
6. THE engine SHALL send each step's coach text to the polite live region once per step (not repeated while the step holds), without disturbing the existing step-line announcement contract.
7. EACH coach mark SHALL carry a "Skip the tips" link; WHEN the player activates it, THE engine SHALL hide the remaining coach marks for good and SHALL persist that choice like the rest of the progress (so it holds across reloads and later visits).
8. WHEN the player presses Escape while a coach mark is showing, THE engine SHALL hide the coach marks the same way the skip link does (and persist it).
9. WHERE prefers-reduced-motion is active, THE coach marks SHALL show without any movement animation (a still mark), and SHALL otherwise behave identically.
10. THE coach marks SHALL meet WCAG AA contrast in both states and SHALL keep `contrast_scan` at zero flags (they draw over the room backdrop layer, never over text they make unreadable).
11. THE coach marks SHALL never appear in any room other than room 1, and SHALL never appear once room 1 is done.

### Requirement 3: No fail state, no new dependency, keep the guarantees

**User Story:** As a maintainer, I want the first-minute changes to respect the project's guarantees, so that nothing regresses.

#### Acceptance Criteria

1. THE feature SHALL add no fail state: coach marks and the title steps teach and can be dismissed, and dismissing or skipping them costs the player nothing.
2. THE feature SHALL add no new font, no new image file, and no new runtime dependency; the title drawings and the coach marks SHALL be CSS and inline SVG only.
3. THE feature SHALL keep the initial bundle within `check:size`, keep the room chunks code-split, and set no cookie, make no third-party request, and add no analytics (the skip choice lives in the existing localStorage progress only).
4. THE feature SHALL keep the game keyboard- and screen-reader-first and honour prefers-reduced-motion.
5. THE feature SHALL leave every room's trick, words, signs, and honest twin unchanged, including room 1's.

### Requirement 4: Every loop description agrees

**User Story:** As a player reading any of the game's explanations, I want them all to say the same thing about how to play, so that the loop is never described two different ways.

#### Acceptance Criteria

1. EVERY player-facing text in the repo that describes the loop SHALL say the same three steps: spot/tap the trick, name it (pick the card), set the page free (compare and finish the task), and SHALL describe the lantern as the hint with the wording "Stuck? The lantern lights the trick."
2. THE "?" How-to-play popover (`src/app/howToPlay.ts`) SHALL carry the three steps with this wording, and the title steps (Requirement 1) SHALL read from or match the same source so they never drift.
3. THE classroom (teaching) page's description of how to play SHALL match the same three steps and lantern-hint wording where it describes the loop.
4. THE README's play section SHALL describe the loop with the same three steps and the lantern-as-hint line.
5. THE title's meta description (and any other loop-describing meta) SHALL match the same loop wording.
6. THE change SHALL list each text it changed so the agreement is auditable.

### Requirement 5: The walk checks room 1's coach marks

**User Story:** As a maintainer, I want the walk to prove room 1's coach marks behave, so that the tutorial is measured, not assumed.

#### Acceptance Criteria

1. WHEN the walk runs room 1, THE walk SHALL check that the coach mark for each step is visible at that step.
2. WHEN the walk runs room 1, THE walk SHALL check that each step's coach mark does not cover its target: `document.elementFromPoint` at the target's centre SHALL be the target (or inside it), not the coach mark.
3. WHEN the walk runs room 1, THE walk SHALL check that activating the "Skip the tips" link hides the remaining coach marks.
4. THE first-sight check (`scripts/mcp/firstsight.mjs`) SHALL stay as it is for all rooms; room 1 SHALL still pass it with its first coach mark showing (the mark does not push the possessed element off the first screen).
5. THE walk's checks for rooms 2–12 SHALL be unchanged, and the pure first-sight / frame-top / target-size rules and their node:test coverage SHALL be unchanged.

### Requirement 6: First-minute polish (measured regressions)

**User Story:** As a first-time player, I want the door and the first room to behave as promised when measured on the build, so that the first minute is actually clear.

Measured on the working-tree build in headless Chrome (fresh profile), three regressions appeared in the first-minute change and are fixed here.

#### Acceptance Criteria

1. WHERE the viewport is up to about 800 px tall (a laptop at 1280 × 720 included), THE title screen SHALL keep the primary "Enter the manor" control fully on the first screen, with at least 16 px of space below it, without dropping any title text and without reducing any step title below the 22 px display-font floor; the 412 × 915 phone layout SHALL be unchanged.
2. EACH title step line SHALL keep its final word from being left alone on its last line when the line wraps (a widow), using a non-breaking space before the last word; the words SHALL otherwise be unchanged, and the shared-loop alignment (Requirement 4) SHALL still hold.
3. THE room 1 coach marks SHALL shift nothing: with motion on and with motion off, at 1280 × 720 and at 412 × 915, room 1's cumulative layout shift SHALL be 0 (as it was before the coach marks, and as every other room is). The mark's entrance and its placement on first show, on resize and on scroll SHALL use transforms only and SHALL be revealed only at their final measured position, so no reveal or reposition is ever recorded as a layout shift.
4. THE walk SHALL check, on the title at both sizes, that the "Enter the manor" button's box is fully inside the viewport, and SHALL report a failure otherwise, via a pure, unit-tested rule (`scripts/mcp/title.mjs`).

## Correctness Properties

These are the executable properties, for unit and walk testing.

- The title shows exactly three steps, in order, with the three step names and the three descriptions, and the "Enter the manor" control is present and points at `#/room/1`.
- The title's three step names and descriptions equal the shared loop source.
- A `coach` field is present on room 1 only; every other room's data has none.
- Room 1 shows the current step's coach mark while room 1 is not done and the tips are not skipped; it shows no coach mark once room 1 is done, once the tips are skipped, or in any other room.
- Activating "Skip the tips" (or pressing Escape) hides the remaining coach marks and persists the choice; after a reload with the choice saved, no coach mark shows.
- Each step's coach text reaches the polite live region once per step.
- Showing or changing a coach mark moves no focus and shifts nothing (CLS stays 0).
- In the walk, room 1's coach mark for each step is visible, does not cover its target (elementFromPoint at the target's centre is the target), and the skip link hides the rest; room 1 still passes first sight with its first coach mark showing.
- Every loop-describing text in the repo uses the same three steps and the same lantern-hint wording.
- At viewports up to ~800 px tall, the title's "Enter the manor" button sits fully on the first screen with at least 16 px below it; 412 × 915 is unchanged.
- Each title step line binds its last word with a non-breaking space, so a wrapped line never leaves that word alone.
- Room 1's CLS is 0 at both sizes with motion on and off (the coach marks reveal only at their final position and move only by transform).
- The walk's title check passes only when the "Enter the manor" button is fully inside the viewport (`buttonFullyInViewport`).
