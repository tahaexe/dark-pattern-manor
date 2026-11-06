# Tasks — Room «N»: «Room name» (brand «Brand»)

> Copy to `.kiro/specs/room-«brand-slug»/tasks.md` and work top to bottom.
> The room's gate is `npm run test` and `npm run check:rooms`; both must pass.

- [ ] 1. Author the room data
  - File: `src/rooms/«brand-slug»/room.ts`
  - Fill the `RoomData` from the design table: id «N», slug `«brand-slug»`,
    name, brand, brandKind, `.manor` domain, pattern «Pattern», task,
    possessedId. Add three cards (correct «Pattern»; relative «Relative
    pattern»; different «Different pattern») with wrong-card hints ≤ 20 words
    that never name «Pattern». Add the Ghost Guide entry (two-sentence
    definition, where-you-meet-it, https US + EU sources on the allowlist, one
    tip, no quote over 25 words). Import `./Haunted`, `./Honest`, `./room.css`.
  - Tests: covered by task 4 and `npm run check:rooms`.

- [ ] 2. Build the Haunted variant
  - File: `src/rooms/«brand-slug»/Haunted.tsx`, `src/rooms/«brand-slug»/room.css`
  - Render the fictional brand page. The possessed element (id
    "«possessed-id»") behaves like «Pattern» and shows ghost signs when
    `signsActive`; honour `reducedMotion` (static outline + "Something stirs
    here"); honour `preview` (non-interactive, no id) for the split's before
    side. Keep every text at WCAG AA contrast; confine cracks/mist to the
    possessed element.

- [ ] 3. Build the Honest variant
  - File: `src/rooms/«brand-slug»/Honest.tsx`
  - Render the best-practice twin with no «Pattern»; the single task action
    calls `onCompleteTask`, completing "«task»" in one click.

- [ ] 4. Write the room's own test
  - File: `src/rooms/«brand-slug»/«brand-slug».test.tsx`
  - Assert: the honest variant completes "«task»" in one click; the possessed
    element is found by id "«possessed-id»" and is keyboard-reachable with a
    non-empty accessible name; the pattern rule passes on honest and fails on
    haunted (variant-specific); every text passes WCAG AA contrast in both
    variants (axe `color-contrast` enabled on both) and axe reports zero
    violations on both; with `prefers-reduced-motion` mocked on, a wrong spell
    card and the possessed element show the static indicator and run no
    animation.

- [ ] 5. Register and gate
  - File: `src/engine/registry.ts`
  - Add `'«brand-slug»': () => import('../rooms/«brand-slug»/room')`.
  - Run `npm run test`, `npm run check:rooms`, `npm run build` and
    `npm run check:size`; all must pass before the room is done.
