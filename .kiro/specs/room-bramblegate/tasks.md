# Tasks — Room 12: The Cellar (brand Bramblegate Fitness)

> Copied from `.kiro/specs/room-template/tasks.md` and worked top to bottom.
> The room's gate is `npm run test` and `npm run check:rooms`; both must pass.

- [x] 1. Author the room data
  - File: `src/rooms/bramblegate/room.ts`
  - Fill the `RoomData` from the design table: id 12, slug `bramblegate`, name
    "The Cellar", brand "Bramblegate Fitness", brandKind "gym for restless
    spirits", domain `bramblegate.manor`, pattern Hard to cancel, task "cancel
    the membership", possessedId "cellar-cancel". Add three cards (correct Hard
    to cancel; relative Hidden subscription; different Fake urgency) with
    wrong-card hints ≤ 20 words that never name "Hard to cancel". Add the Ghost
    Guide entry (two-sentence definition, where-you-meet-it, https US + EU
    sources on the allowlist, one tip, no quote over 25 words); carry the legal
    lines verbatim — the US line (FTC roadblocks to cancellation, ROSCA
    § 8403(3), the vacated 2024 click-to-cancel rule) and the EU line (DSA
    Art. 25(3)(c)). Import `./Haunted`, `./Honest`, `./room.css`. Place the
    correct card in the MIDDLE of the array (Room 10 last, Room 11 first, Room
    12 middle — the correct-card position is not constant across rooms).
  - Tests: covered by task 4 and `npm run check:rooms`.

- [x] 2. Build the Haunted variant
  - File: `src/rooms/bramblegate/Haunted.tsx`, `src/rooms/bramblegate/room.css`
  - Render the fictional Bramblegate Fitness account page: a line reading
    "Membership: Active, £39/month", a bright "Upgrade to Gold" button and a
    "Pause instead" button, and, small at the bottom, the possessed cancel line
    "To cancel, complete our 7-step exit survey or call 0800 000 000 between 3
    and 4 a.m." (id "cellar-cancel", a real `<button>` whose accessible name is
    the line text, no aria-label). The Upgrade and Pause buttons are real
    `<button>`s OUTSIDE the possessed button (never a control inside a button).
    There is NO cancel button on the haunted side. Use Room 8's way for state: a
    class component behind a thin function component (the haunted class holds no
    cancel state — there is nothing to cancel). The cancel line is NOT a live
    region. The possessed line behaves like Hard to cancel and shows ghost signs
    when `signsActive`; honour `reducedMotion` (static dashed outline + the
    room's own "Something stirs here" label); honour `preview` (non-interactive,
    no id) for the split's before side. Prices use lining, tabular figures in
    the UI face (Room 9's lesson). Keep every text at WCAG AA contrast; confine
    cracks/mist to the possessed cancel line. Fit the first screen at 1920×1080
    and stay readable at 412px wide with no horizontal overflow; the ghost
    (120×140; about 72×84 under 600px) peeks beside the cancel line inside the
    room's panel at its height, drawn whole, and never covers a button, a price
    or any text — because the line's upper neighbour is the Pause button (a
    control) and its text runs most of the line's width, the ghost rises into
    the empty space beside the line at 1920 (check where it lands), and under
    600px it rises from a reserved strip under the line. Long label-and-value
    rows wrap under 600px instead of overlapping. No fixed or minimum heights
    that leave empty boxes on mobile.

- [x] 3. Build the Honest variant
  - File: `src/rooms/bramblegate/Honest.tsx`
  - Render the best-practice twin with no Hard to cancel: the same account page
    ("Membership: Active, £39/month", the same Upgrade and Pause buttons) with a
    plain "Cancel membership" button beside the others; one click cancels and
    shows "Membership cancelled. A confirmation is on its way to your inbox.",
    so cancelling the membership is one click. The single task action (pressing
    "Cancel membership") calls `onCompleteTask`.

- [x] 4. Write the room's own test
  - File: `src/rooms/bramblegate/bramblegate.test.tsx`
  - Assert: the honest variant completes "cancel the membership" in one click
    (one "Cancel membership") and then shows "Membership cancelled. A
    confirmation is on its way to your inbox."; the possessed element is found
    by id "cellar-cancel" and is keyboard-reachable with a non-empty accessible
    name; the haunted page has NO cancel button and its possessed line names the
    7 steps (the "7-step exit survey") and the 3–4 a.m. window ("between 3 and 4
    a.m."); the Upgrade and Pause buttons are real buttons OUTSIDE the possessed
    button (never inside it); the cancel line is NOT a live region; the pattern
    rule passes on honest and fails on haunted (variant-specific: haunted no
    cancel button / 7-step / 3–4 a.m.; honest one-click Cancel membership +
    confirmation); every text passes WCAG AA contrast in both variants (axe
    `color-contrast` enabled on both) and axe reports zero violations on both;
    with `prefers-reduced-motion` mocked on, a wrong spell card and the
    possessed element show the static indicator and run no animation.

- [x] 5. Register and gate
  - File: `src/engine/registry.ts`
  - Add `bramblegate: () => import('../rooms/bramblegate/room')`.
  - Run `npm run test`, `npm run check:rooms`, `npm run build` and
    `npm run check:size`; all must pass before the room is done.
