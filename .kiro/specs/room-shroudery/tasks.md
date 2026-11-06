# Tasks — Room 6: The Ballroom (brand Shroudery)

> Copied from `.kiro/specs/room-template/tasks.md` and worked top to bottom.
> The room's gate is `npm run test` and `npm run check:rooms`; both must pass.

- [x] 1. Author the room data
  - File: `src/rooms/shroudery/room.ts`
  - Fill the `RoomData` from the design table: id 6, slug `shroudery`, name
    "The Ballroom", brand "Shroudery", brandKind "shop for ghostly ballroom
    cloaks", domain `shroudery.manor`, pattern Fake scarcity, task "pick the
    right size", possessedId "ballroom-stock". Add three cards (correct Fake
    scarcity; relative Fake urgency; different Visual interference) with
    wrong-card hints ≤ 20 words that never name Fake scarcity. Add the Ghost
    Guide entry (two-sentence definition, where-you-meet-it, https US + EU
    sources on the allowlist, one tip, no quote over 25 words). Import
    `./Haunted`, `./Honest`, `./room.css`. Place the correct card in the MIDDLE
    of the array (Room 4 last, Room 5 first, Room 6 middle), so the
    correct-card position is not constant across rooms.
  - Tests: covered by task 4 and `npm run check:rooms`.

- [x] 2. Build the Haunted variant
  - File: `src/rooms/shroudery/Haunted.tsx`, `src/rooms/shroudery/room.css`
  - Render the fictional Shroudery page: a cloak product page with the price
    and size buttons XS, S, M, L, XL. The possessed element (id
    "ballroom-stock") behaves like Fake scarcity — a single stock line under
    the size buttons that always reads "Only 1 left in <picked size>! Order
    soon." for whichever size is picked (and "Only 1 left! Order soon." before
    any pick), whatever the real stock. The picked size is state: follow Room
    5's way — a class component (plain state, no hooks) behind a thin function
    component (matching the engine's `FunctionComponent`), so the stateless
    entry renders under `check:rooms`' bare renderer while the class owns the
    picked size. The size buttons are real buttons with `aria-pressed` on the
    picked size and at least 44 × 44 px targets. The stock line shows ghost
    signs when `signsActive`; honour `reducedMotion` (static dashed outline +
    the room's own "Something stirs here" label); honour `preview`
    (non-interactive, no id) for the split's before side. The stock line is NOT
    a live region (no `aria-live`, no announcing role) and carries no
    `aria-label`; its accessible name is its visible text. Keep every text at
    WCAG AA contrast; confine cracks/mist to the possessed stock line. Fit the
    first screen at 1920×1080 and stay readable at 412px wide with no
    horizontal overflow; the ghost (120×140; about 72×84 under 600px) peeks
    beside the stock line at its height, drawn whole (reserve room so its hem
    is never cut), and never covers a size button, the price or the line's text
    (under 600px it may rise from a reserved strip under it). No fixed or
    minimum heights that leave empty boxes on mobile.

- [x] 3. Build the Honest variant
  - File: `src/rooms/shroudery/Honest.tsx`
  - Render the best-practice twin with no Fake scarcity: the same cloak page
    where the stock line tells the truth in plain text ("In stock" for every
    size, "3 left" only on XL), so picking the right size calmly completes
    "pick the right size" in one click. The single task action calls
    `onCompleteTask`.

- [x] 4. Write the room's own test
  - File: `src/rooms/shroudery/shroudery.test.tsx`
  - Assert: the honest variant completes "pick the right size" in one click;
    the possessed element is found by id "ballroom-stock" and is
    keyboard-reachable with a non-empty accessible name (no aria-label, so the
    accessible name is its visible text); the pattern rule passes on honest and
    fails on haunted (variant-specific: on haunted the stock line reads "Only 1
    left" for every size; on honest it does not — it shows "In stock" / "3
    left"); the haunted stock line says "Only 1 left" for every size and the
    honest one does not; `aria-pressed` follows the picked size; the stock line
    has no aria-live and no aria-label; every text passes WCAG AA contrast in
    both variants (axe `color-contrast` enabled on both) and axe reports zero
    violations on both; with `prefers-reduced-motion` mocked on, a wrong spell
    card and the possessed element show the static indicator and run no
    animation.

- [x] 5. Register and gate
  - File: `src/engine/registry.ts`
  - Add `shroudery: () => import('../rooms/shroudery/room')`.
  - Run `npm run test`, `npm run check:rooms`, `npm run build` and
    `npm run check:size`; all must pass before the room is done.
