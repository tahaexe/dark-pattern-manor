# Tasks — Room 5: The Conservatory (brand Hollowpost Tickets)

> Copied from `.kiro/specs/room-template/tasks.md` and worked top to bottom.
> The room's gate is `npm run test` and `npm run check:rooms`; both must pass.

- [x] 1. Author the room data
  - File: `src/rooms/hollowpost/room.ts`
  - Fill the `RoomData` from the design table: id 5, slug `hollowpost`, name
    "The Conservatory", brand "Hollowpost Tickets", brandKind "ticket shop for
    a midnight séance concert", domain `hollowpost.manor`, pattern Fake urgency,
    task "buy the ticket without rushing", possessedId "conservatory-countdown".
    Add three cards (correct Fake urgency; relative Fake scarcity; different
    Confirmshaming) with wrong-card hints ≤ 20 words that never name Fake
    urgency. Add the Ghost Guide entry (two-sentence definition,
    where-you-meet-it, https US + EU sources on the allowlist, one tip, no quote
    over 25 words). Import `./Haunted`, `./Honest`, `./room.css`. Place the
    correct card FIRST in the array (Room 1 first, Room 2 last, Room 3 middle,
    Room 4 last), so the correct-card position is not constant across rooms.
  - Tests: covered by task 4 and `npm run check:rooms`.

- [x] 2. Build the Haunted variant
  - File: `src/rooms/hollowpost/Haunted.tsx`, `src/rooms/hollowpost/room.css`
  - Render the fictional Hollowpost Tickets page: the price, the concert date,
    and a bright "Buy ticket" button. The possessed element (id
    "conservatory-countdown") behaves like Fake urgency — a red banner "Offer
    ends in 04:59" counting down; when it reaches 00:00 it quietly starts again
    from 04:59 (the fake). The reset is honest in the code: one `setInterval`
    timer drives the countdown and is cleared on unmount; nothing is hidden.
    The banner is the possessed element: it shows ghost signs when
    `signsActive`; honour `reducedMotion` (static dashed outline + the room's
    own "Something stirs here" label; the countdown stays still at 04:59 and
    does not tick); honour `preview` (non-interactive, no id, no running timer)
    for the split's before side. The countdown is NOT a live region (no
    aria-live, no role="timer" announcing each second); its accessible name is
    its visible text; the digits use tabular figures so the banner never
    changes width (no layout shift). The possessed banner carries no aria-label.
    Keep every text at WCAG AA contrast; confine cracks/mist to the possessed
    banner. Fit the first screen at 1920×1080 and stay readable at 412px wide
    with no horizontal overflow; the ghost (120×140; about 72×84 under 600px)
    peeks beside the banner at its height, drawn whole, and never covers the
    banner's text, the price or the button (under 600px it may rise from a
    reserved strip under it). No fixed or minimum heights that leave empty
    boxes on mobile.

  Note: the countdown's state and timer live in a class component (its
  lifecycle clears the one timer on unmount); the room's `Haunted` entry is a
  thin function component (matching the engine's `FunctionComponent` type)
  that renders it, so the stateless entry renders cleanly under the
  `check:rooms` bare renderer while the class owns the ticking state.

- [x] 3. Build the Honest variant
  - File: `src/rooms/hollowpost/Honest.tsx`
  - Render the best-practice twin with no Fake urgency: the same ticket page
    with the price, the date of the concert and "Tickets on sale until 31
    October" as plain text, and no countdown at all; the single task action
    (the "Buy ticket" button) calls `onCompleteTask`, so buying calmly
    completes "buy the ticket without rushing" in one click.

- [x] 4. Write the room's own test
  - File: `src/rooms/hollowpost/hollowpost.test.tsx`
  - Assert: the honest variant completes "buy the ticket without rushing" in
    one click; the possessed element is found by id "conservatory-countdown"
    and is keyboard-reachable with a non-empty accessible name (no aria-label,
    so the accessible name is its visible banner text); the pattern rule passes
    on honest and fails on haunted (variant-specific: on haunted a countdown
    banner is present and resets from 00:00 back to 04:59; on honest there is
    no countdown and the deadline is a fixed calendar date "Tickets on sale
    until 31 October"); the countdown resets from 00:00 to 04:59 under fake
    timers; the countdown has no aria-live and no role="timer"; the one timer
    is cleared on unmount (no further ticks after unmount); under reduced motion
    the countdown does not tick (stays at 04:59); every text passes WCAG AA
    contrast in both variants (axe `color-contrast` enabled on both) and axe
    reports zero violations on both; with `prefers-reduced-motion` mocked on, a
    wrong spell card and the possessed element show the static indicator and
    run no animation.

- [x] 5. Register and gate
  - File: `src/engine/registry.ts`
  - Add `hollowpost: () => import('../rooms/hollowpost/room')`.
  - Run `npm run test`, `npm run check:rooms`, `npm run build` and
    `npm run check:size`; all must pass before the room is done.
