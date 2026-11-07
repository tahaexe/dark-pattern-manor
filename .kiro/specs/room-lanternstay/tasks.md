# Tasks — Room 7: The Portrait Gallery (brand Lanternstay)

> Copied from `.kiro/specs/room-template/tasks.md` and worked top to bottom.
> The room's gate is `npm run test` and `npm run check:rooms`; both must pass.

- [x] 1. Author the room data
  - File: `src/rooms/lanternstay/room.ts`
  - Fill the `RoomData` from the design table: id 7, slug `lanternstay`, name
    "The Portrait Gallery", brand "Lanternstay", brandKind "booking site for
    haunted inns", domain `lanternstay.manor`, pattern Fake social proof, task
    "choose a room by real reviews", possessedId "gallery-watchers". Add three
    cards (correct Fake social proof; relative Fake scarcity; different
    Disguised ads) with wrong-card hints ≤ 20 words that never name Fake social
    proof. Add the Ghost Guide entry (two-sentence definition,
    where-you-meet-it, https US + EU sources on the allowlist, one tip, no quote
    over 25 words). Import `./Haunted`, `./Honest`, `./room.css`. Place the
    correct card LAST in the array (Room 5 first, Room 6 middle, Room 7 last),
    so the correct-card position is not constant across rooms.
  - Tests: covered by task 4 and `npm run check:rooms`.

- [x] 2. Build the Haunted variant
  - File: `src/rooms/lanternstay/Haunted.tsx`, `src/rooms/lanternstay/room.css`
  - Render the fictional Lanternstay page: two rooms of one inn side by side
    (two cards). The first, "The Moonlit Suite", carries the possessed watchers
    badge (id "gallery-watchers") reading "38 people are looking at this room
    right now" — a static number (no ticking, not a live region) — and three
    five-star reviews with no dates and first names only ("Amazing!!! — Sam").
    The second, "The Ivy Room", has fewer stars but two dated reviews marked
    "Stayed in October 2026". The badge behaves like Fake social proof. A plain
    function component is enough (no per-element state). The badge is a real
    button; it carries no `aria-label` (accessible name is its visible text) and
    is NOT a live region (no `aria-live`, no announcing role). Star ratings are
    text plus an accessible label ("5 out of 5 stars"), not images alone. The
    badge shows ghost signs when `signsActive`; honour `reducedMotion` (static
    dashed outline + the room's own "Something stirs here" label); honour
    `preview` (non-interactive, no id) for the split's before side. Keep every
    text at WCAG AA contrast; confine cracks/mist to the possessed badge. Fit
    the first screen at 1920×1080 and stay readable at 412px wide with no
    horizontal overflow (the two cards stack under 600px); the ghost (120×140;
    about 72×84 under 600px) peeks beside the badge at its height, drawn whole
    (reserve room so its hem is never cut), and never covers a button, a review
    or the badge's text (under 600px it may rise from a reserved strip under
    it). No fixed or minimum heights that leave empty boxes on mobile.

- [x] 3. Build the Honest variant
  - File: `src/rooms/lanternstay/Honest.tsx`
  - Render the best-practice twin with no Fake social proof: the same two cards
    with no watchers counter, where every review is dated and marked with its
    stay ("Stayed in October 2026"), so choosing a room by real reviews calmly
    completes "choose a room by real reviews" in one click. Star ratings keep
    their accessible label. The single task action (choosing a room) calls
    `onCompleteTask`.

- [x] 4. Write the room's own test
  - File: `src/rooms/lanternstay/lanternstay.test.tsx`
  - Assert: the honest variant completes "choose a room by real reviews" in one
    click; the possessed element is found by id "gallery-watchers" and is
    keyboard-reachable with a non-empty accessible name (no aria-label, so the
    accessible name is its visible text); the haunted badge is a static number
    and NOT a live region (no aria-live, no announcing role); the honest variant
    has no counter and every review carries a date; star ratings expose their
    accessible text ("N out of 5 stars") in both variants; the pattern rule
    passes on honest and fails on haunted (variant-specific: haunted has the
    badge and undated first-name reviews; honest has no badge and every review
    dated); every text passes WCAG AA contrast in both variants (axe
    `color-contrast` enabled on both) and axe reports zero violations on both;
    with `prefers-reduced-motion` mocked on, a wrong spell card and the
    possessed element show the static indicator and run no animation.

- [x] 5. Register and gate
  - File: `src/engine/registry.ts`
  - Add `lanternstay: () => import('../rooms/lanternstay/room')`.
  - Run `npm run test`, `npm run check:rooms`, `npm run build` and
    `npm run check:size`; all must pass before the room is done.

- [x] 6. Give the ghost an act that performs Fake social proof
  - Files: `src/rooms/lanternstay/Haunted.tsx`, `src/rooms/lanternstay/room.css`
  - Beside the possessed watchers badge, make the "watchers" a row of little
    ghost heads that pop in and out, so the crowd you are told about is
    literally made of ghosts. Keep it decorative: render it inside the
    aria-hidden `.ghost-signs` anchor so it adds nothing to the badge's
    accessible name (the counter text stays the name) or to live announcements.
    Reserve a fixed box and use transforms and opacity only (no layout shift);
    one cycle lasts at least 4 seconds; it never blocks input and never covers
    the badge's text, a review or a button. With `prefers-reduced-motion` show a
    still pose (heads do not pop) and a short caption "who are they?" beside the
    ghost, kept alongside "Something stirs here". Freeze every act element on
    `.room-scene[data-moment='right']` (do not re-implement the shared
    unwind/flee). The act is absent from the honest twin and from the
    comparison's haunted preview. Extend `lanternstay.test.tsx` to assert the
    act element exists in the haunted view and is aria-hidden, is gone in
    preview and honest, and that with reduced motion the still pose and caption
    render.
