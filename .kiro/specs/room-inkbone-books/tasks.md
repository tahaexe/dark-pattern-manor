# Tasks — Room 2: The Library (brand Inkbone Books)

> Copied from `.kiro/specs/room-template/tasks.md` and worked top to bottom.
> The room's gate is `npm run test` and `npm run check:rooms`; both must pass.

- [x] 1. Author the room data
  - File: `src/rooms/inkbone-books/room.ts`
  - Fill the `RoomData` from the design table: id 2, slug `inkbone-books`,
    name "The Library", brand "Inkbone Books", brandKind "bookshop", domain
    `inkbone-books.manor`, pattern Trick wording, task "sign up without the
    newsletter", possessedId "library-newsletter". Add three cards (correct
    Trick wording; relative Preselection; different Fake urgency) with
    wrong-card hints ≤ 20 words that never name Trick wording. Add the Ghost
    Guide entry (two-sentence definition, where-you-meet-it, https US + EU
    sources on the allowlist, one tip, no quote over 25 words). Import
    `./Haunted`, `./Honest`, `./room.css`. Place the correct card last in the
    array so the correct-card position differs from Room 1.
  - Tests: covered by task 4 and `npm run check:rooms`.

- [x] 2. Build the Haunted variant
  - File: `src/rooms/inkbone-books/Haunted.tsx`, `src/rooms/inkbone-books/room.css`
  - Render the fictional Inkbone Books sign-up form. The possessed element (id
    "library-newsletter") behaves like Trick wording — a newsletter checkbox
    whose sentence is a double negative, so leaving the box as it is subscribes
    you — and shows ghost signs when `signsActive`; honour `reducedMotion`
    (static outline + "Something stirs here"); honour `preview` (non-interactive,
    no id) for the split's before side. Keep every text at WCAG AA contrast;
    confine cracks/mist to the possessed element. Fit the first screen at
    1920×1080 and stay readable at 412px wide with no horizontal overflow.

- [x] 3. Build the Honest variant
  - File: `src/rooms/inkbone-books/Honest.tsx`
  - Render the best-practice twin with no Trick wording: one plain, unticked
    opt-in sentence ("Send me the newsletter"); the single task action (submit,
    box left alone) calls `onCompleteTask`, completing "sign up without the
    newsletter" in one click.

- [x] 4. Write the room's own test
  - File: `src/rooms/inkbone-books/inkbone-books.test.tsx`
  - Assert: the honest variant completes "sign up without the newsletter" in one
    click; the possessed element is found by id "library-newsletter" and is
    keyboard-reachable with a non-empty accessible name; the pattern rule passes
    on honest and fails on haunted (variant-specific: haunted sentence is a
    double negative / flip, honest is a single plain opt-in); every text passes
    WCAG AA contrast in both variants (axe `color-contrast` enabled on both) and
    axe reports zero violations on both; with `prefers-reduced-motion` mocked on,
    a wrong spell card and the possessed element show the static indicator and
    run no animation.

- [x] 5. Register and gate
  - File: `src/engine/registry.ts`
  - Add `'inkbone-books': () => import('../rooms/inkbone-books/room')`.
  - Run `npm run test`, `npm run check:rooms`, `npm run build` and
    `npm run check:size`; all must pass before the room is done.
