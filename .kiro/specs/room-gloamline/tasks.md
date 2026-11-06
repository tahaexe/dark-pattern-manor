# Tasks — Room 4: The Parlour (brand Gloamline)

> Copied from `.kiro/specs/room-template/tasks.md` and worked top to bottom.
> The room's gate is `npm run test` and `npm run check:rooms`; both must pass.

- [x] 1. Author the room data
  - File: `src/rooms/gloamline/room.ts`
  - Fill the `RoomData` from the design table: id 4, slug `gloamline`, name
    "The Parlour", brand "Gloamline", brandKind "streaming service for ghost
    stories", domain `gloamline.manor`, pattern Hidden subscription, task
    "start the free trial, knowing what comes after", possessedId
    "parlour-smallprint". Add three cards (correct Hidden subscription;
    relative Hidden costs; different Fake social proof) with wrong-card hints
    ≤ 20 words that never name Hidden subscription. Add the Ghost Guide entry
    (two-sentence definition, where-you-meet-it, https US + EU sources on the
    allowlist, one tip, no quote over 25 words). Import `./Haunted`,
    `./Honest`, `./room.css`. Place the correct card LAST in the array (Room 1
    places it first, Room 3 in the middle), so the correct-card position is not
    constant across rooms.
  - Tests: covered by task 4 and `npm run check:rooms`.

- [x] 2. Build the Haunted variant
  - File: `src/rooms/gloamline/Haunted.tsx`, `src/rooms/gloamline/room.css`
  - Render the fictional Gloamline sign-up page: a big "7 days free" headline
    and a bright "Start my free trial" button. The possessed element (id
    "parlour-smallprint") behaves like Hidden subscription — the price after
    the trial, the date billing starts and the way to cancel sit in one small
    paragraph far below the button ("Then £9.99 a month from 13 November,
    billed automatically until you cancel in Settings, Billing, Manage plan.")
    — rendered small and light, far below the button. It shows ghost signs when
    `signsActive`; honour `reducedMotion` (static outline + the room's own
    "Something stirs here" label); honour `preview` (non-interactive, no id)
    for the split's before side. Keep every text at WCAG AA contrast (the small
    print still meets AA); confine cracks/mist to the possessed element. The
    possessed small print carries no aria-label, so its accessible name is its
    visible text. Fit the first screen at 1920×1080 and stay readable at 412px
    wide with no horizontal overflow; the ghost (120×140; about 72×84 under
    600px) peeks beside the small print at its height, drawn whole, and never
    covers an input, a label, a button or the small print's text (under 600px
    it may rise from a reserved strip under it).

- [x] 3. Build the Honest variant
  - File: `src/rooms/gloamline/Honest.tsx`
  - Render the best-practice twin with no Hidden subscription: the same page
    with the three facts (the price after, the start date of billing, how to
    cancel) beside the button at the body text's size, and the button reads
    "Start free trial, then £9.99 a month"; the single task action (the button)
    calls `onCompleteTask`, completing "start the free trial, knowing what
    comes after" in one click.

- [x] 4. Write the room's own test
  - File: `src/rooms/gloamline/gloamline.test.tsx`
  - Assert: the honest variant completes "start the free trial, knowing what
    comes after" in one click; the possessed element is found by id
    "parlour-smallprint" and is keyboard-reachable with a non-empty accessible
    name (no aria-label, so the accessible name is its visible small-print
    text); the pattern rule passes on honest and fails on haunted
    (variant-specific: on haunted the three facts — price after, billing start
    date, way to cancel — live only in the small print far below the button,
    not beside it, and the button does not name the price; on honest the three
    facts sit beside the button at body-text size and the button names the
    price); every text passes WCAG AA contrast in both variants (axe
    `color-contrast` enabled on both) and axe reports zero violations on both;
    with `prefers-reduced-motion` mocked on, a wrong spell card and the
    possessed element show the static indicator and run no animation.

- [x] 5. Register and gate
  - File: `src/engine/registry.ts`
  - Add `'gloamline': () => import('../rooms/gloamline/room')`.
  - Run `npm run test`, `npm run check:rooms`, `npm run build` and
    `npm run check:size`; all must pass before the room is done.
