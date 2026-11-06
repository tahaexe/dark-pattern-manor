# Tasks — Room 10: The Nursery (brand Wanderwick)

> Copied from `.kiro/specs/room-template/tasks.md` and worked top to bottom.
> The room's gate is `npm run test` and `npm run check:rooms`; both must pass.

- [x] 1. Author the room data
  - File: `src/rooms/wanderwick/room.ts`
  - Fill the `RoomData` from the design table: id 10, slug `wanderwick`, name
    "The Nursery", brand "Wanderwick", brandKind "toy-box puzzle game for the
    house's small ghosts", domain `wanderwick.manor`, pattern Nagging, task
    "keep playing", possessedId "nursery-prompt". Add three cards (correct
    Nagging; relative Confirmshaming; different Hidden subscription) with
    wrong-card hints ≤ 20 words that never name Nagging. Add the Ghost Guide
    entry (two-sentence definition, where-you-meet-it, https US + EU sources on
    the allowlist, one tip, no quote over 25 words); carry the legal lines
    verbatim. Import `./Haunted`, `./Honest`, `./room.css`. Place the correct
    card LAST in the array (Room 8 first, Room 9 middle, Room 10 last — the
    correct-card position is not constant across rooms).
  - Tests: covered by task 4 and `npm run check:rooms`.

- [x] 2. Build the Haunted variant
  - File: `src/rooms/wanderwick/Haunted.tsx`, `src/rooms/wanderwick/room.css`
  - Render the fictional Wanderwick game screen: a small, decorative 3×3 grid
    of toy tiles (the puzzle board) with a pop-up card over its lower part. The
    pop-up asks "Enjoying Wanderwick? Turn on notifications!" and offers "Yes"
    and "Not now" (no real "No"). The pop-up card's question is the possessed
    element (id "nursery-prompt"), a real `<button>` whose accessible name is
    the question text (no aria-label); its "Yes" and "Not now" are SEPARATE
    sibling buttons in the card, never inside the possessed button. "Not now"
    closes the pop-up; about 3 s later it comes back, every time, with a
    counter rising ("Asked 2 times", "Asked 3 times"). Use Room 8's way for
    state and timers: a class component behind a thin function component, with
    `{ promptOpen, askCount }` and exactly one timer per "Not now", every timer
    cleared on unmount. The pop-up is a non-modal dialog (`role="dialog"`,
    `aria-labelledby`, no `aria-modal`); it never moves focus by itself when it
    returns and is NOT a live region. The possessed card behaves like Nagging
    and shows ghost signs when `signsActive`; honour `reducedMotion` (static
    dashed outline + the room's own "Something stirs here" label; the pop-up
    still comes back but with no fade or movement); honour `preview`
    (non-interactive, no id) for the split's before side. The counter uses
    lining, tabular figures in the UI face (Room 9's lesson). Keep every text
    at WCAG AA contrast; confine cracks/mist to the possessed pop-up. Fit the
    first screen at 1920×1080 and stay readable at 412px wide with no
    horizontal overflow; the ghost (120×140; about 72×84 under 600px) peeks
    beside the question inside the room's panel at its height, drawn whole, and
    never covers a button or any text (under 600px it may rise from a reserved
    strip under the question). Long label-and-value rows wrap under 600px
    instead of overlapping. No fixed or minimum heights that leave empty boxes
    on mobile.

- [x] 3. Build the Honest variant
  - File: `src/rooms/wanderwick/Honest.tsx`
  - Render the best-practice twin with no Nagging: the same board and one
    prompt with "Turn on" and "No, don't ask again"; once either choice is
    pressed the prompt is dismissed for good and never returns, so keeping
    playing takes one click. The single task action calls `onCompleteTask`.

- [x] 4. Write the room's own test
  - File: `src/rooms/wanderwick/wanderwick.test.tsx`
  - Assert (fake timers): the honest variant completes "keep playing" in one
    click; the possessed element is found by id "nursery-prompt" and is
    keyboard-reachable with a non-empty accessible name; "Not now" closes the
    pop-up and it returns about 3 s later with the counter up ("Asked 2
    times"); focus does not move when the pop-up returns; the pop-up is a
    non-modal dialog (role="dialog", aria-labelledby, no aria-modal) and NOT a
    live region; the "Yes"/"Not now" buttons are siblings, never inside the
    possessed button; the one timer is cleared on unmount; the honest "No,
    don't ask again" ends it for good (the prompt never returns); the pattern
    rule passes on honest and fails on haunted (variant-specific: haunted offers
    only "Yes"/"Not now" and returns with the counter up; honest has a real "No,
    don't ask again" and never returns); every text passes WCAG AA contrast in
    both variants (axe `color-contrast` enabled on both) and axe reports zero
    violations on both; with `prefers-reduced-motion` mocked on, a wrong spell
    card and the possessed element show the static indicator and run no
    animation.

- [x] 5. Register and gate
  - File: `src/engine/registry.ts`
  - Add `wanderwick: () => import('../rooms/wanderwick/room')`.
  - Run `npm run test`, `npm run check:rooms`, `npm run build` and
    `npm run check:size`; all must pass before the room is done.
