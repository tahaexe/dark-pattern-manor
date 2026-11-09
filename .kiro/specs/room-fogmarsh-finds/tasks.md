# Tasks — Room 13: The Map Room (brand Fogmarsh Finds)

> The room's gate is `npm run test` and `npm run check:rooms`; both must pass.

- [ ] 1. Author the room data
  - File: `src/rooms/fogmarsh-finds/room.ts`
  - Fill the `RoomData`: id 13, slug `fogmarsh-finds`, name "The Map Room",
    brand "Fogmarsh Finds", brandKind "review site", domain
    "fogmarsh-finds.manor", pattern "Disguised ads", task "find the
    best-reviewed lantern for a night walk", possessedId "maproom-top-pick".
    Three cards: correct Disguised ads; relative Visual interference; different
    Hidden costs — with wrong-card hints ≤ 20 words that never name "Disguised
    ads". Add the Ghost Guide entry (two-sentence definition, where-you-meet-it,
    https US + EU sources on the allowlist, one tip, no quote over 25 words).
    Import `./Haunted`, `./Honest`, `./room.css`.

- [ ] 2. Build the Haunted variant
  - Files: `src/rooms/fogmarsh-finds/Haunted.tsx`, `.../room.css`
  - Render the ranked "top 5 night lanterns" list. The possessed element (id
    "maproom-top-pick") is the number-1 "Editor's choice" card — a paid
    placement that looks like the other editorial picks, with only a small
    "partner" tag after the price. Ghost signs when `signsActive`; honour
    `reducedMotion` (static outline + "Something stirs here" + the act caption)
    and `preview` (non-interactive, no id). Keep every text at WCAG AA contrast;
    confine cracks/mist to the possessed card.

- [ ] 3. Build the Honest variant
  - File: `src/rooms/fogmarsh-finds/Honest.tsx`
  - Render the best-practice twin: a clearly marked "Advertisement · paid by
    Wickmere Lamps" box above the list, visually distinct from the editorial
    cards, then the ranking with its criterion in one line. The single task
    action (choosing the real top-rated lantern) calls `onCompleteTask` in one
    click.

- [ ] 4. Write the room's own test
  - File: `src/rooms/fogmarsh-finds/fogmarsh-finds.test.tsx`
  - Assert: the honest variant completes the task in one click; the possessed
    element is found by id "maproom-top-pick" and is keyboard-reachable with a
    non-empty accessible name; the pattern rule passes on honest and fails on
    haunted (variant-specific); every text passes WCAG AA contrast in both
    variants (axe `color-contrast` enabled) and axe reports zero violations on
    both; with `prefers-reduced-motion` mocked on, a wrong spell card and the
    possessed element show the static indicator and run no animation; the Guide
    entry carries its US and EU sources.

- [ ] 5. Register and gate
  - File: `src/engine/registry.ts` (already added
    `'fogmarsh-finds': () => import('../rooms/fogmarsh-finds/room')`).
  - Run `npm run test`, `npm run check:rooms`, `npm run build` and
    `npm run check:size`; all must pass.
