# Tasks — Room 8: The Pantry (brand Mothmilk Market)

> Copied from `.kiro/specs/room-template/tasks.md` and worked top to bottom.
> The room's gate is `npm run test` and `npm run check:rooms`; both must pass.

- [x] 1. Author the room data
  - File: `src/rooms/mothmilk/room.ts`
  - Fill the `RoomData` from the design table: id 8, slug `mothmilk`, name "The
    Pantry", brand "Mothmilk Market", brandKind "night grocer for the
    household's ghosts", domain `mothmilk.manor`, pattern Sneaking, task "pay
    only for what you picked", possessedId "pantry-sneaked-line". Add three
    cards (correct Sneaking; relative Preselection; different Confirmshaming)
    with wrong-card hints ≤ 20 words that never name Sneaking. Add the Ghost
    Guide entry (two-sentence definition, where-you-meet-it, https US + EU
    sources on the allowlist, one tip, no quote over 25 words); carry the legal
    lines verbatim. Import `./Haunted`, `./Honest`, `./room.css`. Place the
    correct card FIRST in the array (the correct-card position is not constant
    across rooms).
  - Tests: covered by task 4 and `npm run check:rooms`.

- [x] 2. Build the Haunted variant
  - File: `src/rooms/mothmilk/Haunted.tsx`, `src/rooms/mothmilk/room.css`
  - Render the fictional Mothmilk Market checkout basket: the two picked items
    ("Mothmilk, 1 pint £1.20", "Cobweb loaf £2.40"), a third sneaked line
    nobody picked ("Ghost Protection £2.99", id "pantry-sneaked-line") already
    in the basket, a total that includes it ("Pay £6.59"). The sneaked line is
    the possessed element with its OWN "Remove" button beside it (never a
    button inside a button). Removing it takes it out and updates the total to
    £3.60; about 1.5 s later it quietly comes back and the total returns to
    £6.59. Use Room 5's way for state and timers: a class component behind a
    thin function component, exactly one timer per removal, every timer cleared
    on unmount. The total is NOT a live region. The possessed line behaves like
    Sneaking and shows ghost signs when `signsActive`; honour `reducedMotion`
    (static dashed outline + the room's own "Something stirs here" label; the
    line still comes back but with no fade or movement); honour `preview`
    (non-interactive, no id) for the split's before side. Prices use tabular
    figures. Keep every text at WCAG AA contrast; confine cracks/mist to the
    possessed line. Fit the first screen at 1920×1080 and stay readable at
    412px wide with no horizontal overflow; the ghost (120×140; about 72×84
    under 600px) peeks beside the line at its height, drawn whole (reserve room
    so its hem is never cut), and never covers a button, a price or the line's
    text (under 600px it may rise from a reserved strip under it). No fixed or
    minimum heights that leave empty boxes on mobile.

- [x] 3. Build the Honest variant
  - File: `src/rooms/mothmilk/Honest.tsx`
  - Render the best-practice twin with no Sneaking: the basket holds only the
    two picked items and "Pay £3.60"; Ghost Protection is offered OUTSIDE the
    basket as an unticked, plainly priced option, so paying only for what you
    picked takes one click. The single task action (Pay £3.60) calls
    `onCompleteTask`.

- [x] 4. Write the room's own test
  - File: `src/rooms/mothmilk/mothmilk.test.tsx`
  - Assert (fake timers): the honest variant completes "pay only for what you
    picked" in one click; the possessed element is found by id
    "pantry-sneaked-line" and is keyboard-reachable with a non-empty accessible
    name; the sneaked line comes back about 1.5 s after "Remove" and the total
    follows (£6.59 → £3.60 → £6.59); the timer is cleared on unmount; the total
    is NOT a live region; the honest basket totals £3.60 with Ghost Protection
    unticked outside it; the pattern rule passes on honest and fails on haunted
    (variant-specific: haunted has the sneaked line + £6.59 total that returns
    after removal; honest has no sneaked line + £3.60); every text passes WCAG
    AA contrast in both variants (axe `color-contrast` enabled on both) and axe
    reports zero violations on both; with `prefers-reduced-motion` mocked on, a
    wrong spell card and the possessed element show the static indicator and
    run no animation.

- [x] 5. Register and gate
  - File: `src/engine/registry.ts`
  - Add `mothmilk: () => import('../rooms/mothmilk/room')`.
  - Run `npm run test`, `npm run check:rooms`, `npm run build` and
    `npm run check:size`; all must pass before the room is done.

- [x] 6. Give the ghost an act that performs Sneaking
  - File: `src/rooms/mothmilk/Haunted.tsx`, `src/rooms/mothmilk/room.css`,
    `src/rooms/mothmilk/mothmilk.test.tsx`
  - Add an act on/beside the possessed sneaked line that enacts the trick: the
    ghost visibly carries the "Ghost Protection £2.99" line item back into the
    basket (`.act-carry` inside `.ghost-wrap`), on a cycle of at least four
    seconds, transforms and opacity only, reserving its own space (no layout
    shift), never blocking input and never covering the line's text, its price,
    the Remove button or their focus rings. Keep every act element
    `aria-hidden` so it adds nothing to the accessible name or to live
    announcements. Do NOT re-implement or override the shared atmosphere layer
    or the common moments (wrong-card gutter/head-shake, right-card
    unwind/exhale); reuse them. Freeze the act when the ghost is named with
    `.room-scene[data-moment='right'] .act-carry { animation: none; }` so
    nothing keeps moving through the shared unwind and flee. Under
    `prefers-reduced-motion` show no movement: a still pose (the ghost holding
    the line item) with a short visible caption beside it, "it slips back in",
    kept alongside the "Something stirs here" label. Keep the act out of the
    honest twin and the comparison's haunted preview. Extend the room's test to
    assert the act element exists in the haunted view and is aria-hidden, is
    gone in preview and honest, and that reduced motion renders the still pose
    and its caption. Re-run `npm run test`, `npm run check:rooms`,
    `npm run build` and `npm run check:size`, and `walk_rooms` / `contrast_scan`
    for room 8 in both motion modes; all must pass.
