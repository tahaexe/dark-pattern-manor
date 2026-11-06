# Tasks — Room 11: The Attic (brand Rookery Air)

> Copied from `.kiro/specs/room-template/tasks.md` and worked top to bottom.
> The room's gate is `npm run test` and `npm run check:rooms`; both must pass.

- [x] 1. Author the room data
  - File: `src/rooms/rookery/room.ts`
  - Fill the `RoomData` from the design table: id 11, slug `rookery`, name
    "The Attic", brand "Rookery Air", brandKind "airline for crows and
    travelling ghosts", domain `rookery.manor`, pattern Preselection, task
    "buy only the ticket", possessedId "attic-preselect". Add three cards
    (correct Preselection; relative Sneaking; different Fake social proof) with
    wrong-card hints ≤ 20 words that never name Preselection. Add the Ghost
    Guide entry (two-sentence definition, where-you-meet-it, https US + EU
    sources on the allowlist, one tip, no quote over 25 words); carry the legal
    lines verbatim. Import `./Haunted`, `./Honest`, `./room.css`. Place the
    correct card FIRST in the array (Room 9 middle, Room 10 last, Room 11
    first — the correct-card position is not constant across rooms).
  - Tests: covered by task 4 and `npm run check:rooms`.

- [x] 2. Build the Haunted variant
  - File: `src/rooms/rookery/Haunted.tsx`, `src/rooms/rookery/room.css`
  - Render the fictional Rookery Air extras step: the ticket line "Gloomhaven
    to Hollow Point, £95", a possessed summary line "3 extras added for your
    trip" (id "attic-preselect", a real `<button>` whose accessible name is the
    summary text, no aria-label), then the three extras — "Travel insurance
    £12", "Priority boarding £8", "Lucky charm £3" — each a real, labelled
    `<input type="checkbox">` OUTSIDE the possessed button (never a control
    inside a button), at least 24×24 px with its whole label clickable, all
    three ticked. The total reads "£118" beside a "Pay £118" button; unticking
    follows the total (£118 → £95). Use Room 8's way for state: a class
    component behind a thin function component holding which extras are ticked,
    the total recomputed each render. The summary line is NOT a live region.
    The possessed line behaves like Preselection and shows ghost signs when
    `signsActive`; honour `reducedMotion` (static dashed outline + the room's
    own "Something stirs here" label); honour `preview` (non-interactive, no
    id) for the split's before side. Prices use lining, tabular figures in the
    UI face (Room 9's lesson). Keep every text at WCAG AA contrast; confine
    cracks/mist to the possessed summary line. Fit the first screen at
    1920×1080 and stay readable at 412px wide with no horizontal overflow; the
    ghost (120×140; about 72×84 under 600px) peeks beside the summary line
    inside the room's panel at its height, drawn whole, and never covers a
    button, a checkbox or any text — because the line's neighbours are controls
    (the ticket line above, the first checkbox below), the ghost rises into the
    empty space beside the line at 1920 (check where it lands), and under 600px
    it rises from a reserved strip under the line. Long label-and-price rows
    wrap under 600px instead of overlapping. No fixed or minimum heights that
    leave empty boxes on mobile.

- [x] 3. Build the Honest variant
  - File: `src/rooms/rookery/Honest.tsx`
  - Render the best-practice twin with no Preselection: the same ticket line
    and the same three extras, all unticked (opt-in), so the total is "£95" and
    the button says "Pay £95"; buying only the ticket is one click. The single
    task action (pressing "Pay £95") calls `onCompleteTask`.

- [x] 4. Write the room's own test
  - File: `src/rooms/rookery/rookery.test.tsx`
  - Assert: the honest variant completes "buy only the ticket" in one click
    (one "Pay £95"); the possessed element is found by id "attic-preselect" and
    is keyboard-reachable with a non-empty accessible name; the haunted extras
    start ticked and the total is £118 ("Pay £118"); unticking all three gives
    £95 ("Pay £95"); the honest extras start unticked with "Pay £95"; every
    checkbox has its label (a non-empty accessible name) and is at least 24×24
    px; the checkboxes are real inputs OUTSIDE the possessed button (never
    inside it); the summary line is NOT a live region; the pattern rule passes
    on honest and fails on haunted (variant-specific: haunted three ticked /
    £118; honest three unticked / £95); every text passes WCAG AA contrast in
    both variants (axe `color-contrast` enabled on both) and axe reports zero
    violations on both; with `prefers-reduced-motion` mocked on, a wrong spell
    card and the possessed element show the static indicator and run no
    animation.

- [x] 5. Register and gate
  - File: `src/engine/registry.ts`
  - Add `rookery: () => import('../rooms/rookery/room')`.
  - Run `npm run test`, `npm run check:rooms`, `npm run build` and
    `npm run check:size`; all must pass before the room is done.
