# Tasks — Room 9: The Study (brand Mildew Drive)

> Copied from `.kiro/specs/room-template/tasks.md` and worked top to bottom.
> The room's gate is `npm run test` and `npm run check:rooms`; both must pass.

- [x] 1. Author the room data
  - File: `src/rooms/mildew/room.ts`
  - Fill the `RoomData` from the design table: id 9, slug `mildew`, name "The
    Study", brand "Mildew Drive", brandKind "cloud storage for a household's
    old letters and ghost memories", domain `mildew.manor`, pattern Hidden
    costs, task "find the real price", possessedId "study-fee-lines". Add three
    cards (correct Hidden costs; relative Sneaking; different Nagging) with
    wrong-card hints ≤ 20 words that never name Hidden costs. Add the Ghost
    Guide entry (two-sentence definition, where-you-meet-it, https US + EU
    sources on the allowlist, one tip, no quote over 25 words); carry the legal
    lines verbatim. Import `./Haunted`, `./Honest`, `./room.css`. Place the
    correct card in the MIDDLE of the array (Room 7 last, Room 8 first, Room 9
    middle — the correct-card position is not constant across rooms).
  - Tests: covered by task 4 and `npm run check:rooms`.

- [x] 2. Build the Haunted variant
  - File: `src/rooms/mildew/Haunted.tsx`, `src/rooms/mildew/room.css`
  - Render the fictional Mildew Drive checkout, the last of three steps. A step
    indicator "1 Plan · 2 Details · 3 Pay" marks step 3 as current with
    `aria-current="step"`. The plan card still shouts "From £1/month"; under
    it, only now at the last step, the fee lines appear: "Service fee
    £1.50/month", "Required backup add-on £2.00/month", "Setup fee £4.99", and
    the real total "£4.50/month + £4.99 today" beside a "Pay £9.49 today"
    button. The block of fee lines (id "study-fee-lines") is the possessed
    element and behaves like Hidden costs; it shows ghost signs when
    `signsActive`; honour `reducedMotion` (static dashed outline + the room's
    own "Something stirs here" label); honour `preview` (non-interactive, no
    id) for the split's before side. Prices use tabular figures. Keep every
    text at WCAG AA contrast; confine cracks/mist to the possessed fee block.
    Fit the first screen at 1920×1080 and stay readable at 412px wide with no
    horizontal overflow; the ghost (120×140; about 72×84 under 600px) peeks
    beside the fee lines at their height, drawn whole (reserve room so its hem
    is never cut), and never covers a button, a price or any text (check where
    it lands at 1920). Under 600px it may rise from a strip reserved under the
    block. No fixed or minimum heights that leave empty boxes on mobile.

- [x] 3. Build the Honest variant
  - File: `src/rooms/mildew/Honest.tsx`
  - Render the best-practice twin with no Hidden costs: step 1 shows the whole
    price up front on the plan card ("£4.50/month, all fees included, + £4.99
    setup"), with the same fee lines listed there (Service fee £1.50/month,
    Required backup add-on £2.00/month, Setup fee £4.99), so finding the real
    price takes one click. The single task action (a plain "See the real price"
    / continue action that reveals nothing new because it is already shown)
    calls `onCompleteTask`, completing "find the real price" in one click.

- [x] 4. Write the room's own test
  - File: `src/rooms/mildew/mildew.test.tsx`
  - Assert: the honest variant completes "find the real price" in one click;
    the possessed element is found by id "study-fee-lines" and is
    keyboard-reachable with a non-empty accessible name; the haunted total
    equals the sum of its lines (£1.50 + £2.00 + £1.00 base = £4.50/month, and
    £4.50 + £4.99 = £9.49 today); the honest step-1 card shows the same total
    (£4.50/month, + £4.99 setup) up front with the same fee lines;
    `aria-current="step"` marks the current step (step 3 on haunted, step 1 on
    honest); the pattern rule passes on honest and fails on haunted
    (variant-specific: haunted hides the fees until step 3; honest shows them at
    step 1); every text passes WCAG AA contrast in both variants (axe
    `color-contrast` enabled on both) and axe reports zero violations on both;
    with `prefers-reduced-motion` mocked on, a wrong spell card and the
    possessed element show the static indicator and run no animation.

- [x] 5. Register and gate
  - File: `src/engine/registry.ts`
  - Add `mildew: () => import('../rooms/mildew/room')`.
  - Run `npm run test`, `npm run check:rooms`, `npm run build` and
    `npm run check:size`; all must pass before the room is done.
