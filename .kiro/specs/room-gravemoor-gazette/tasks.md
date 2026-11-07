# Tasks — Room 1: The Foyer (brand The Gravemoor Gazette)

> The room's gate is `npm run test` and `npm run check:rooms`; both must pass.

- [x] 1. Author the room data
  - File: `src/rooms/gravemoor-gazette/room.ts`
  - `RoomData`: id 1, slug `gravemoor-gazette`, name "The Foyer", brand "The
    Gravemoor Gazette", brandKind "news", domain "gravemoor-gazette.manor",
    pattern "Visual interference", task "reject the cookies", possessedId
    "foyer-reject". Three cards (correct Visual interference; relative Trick
    wording; different Nagging) with wrong-card hints ≤ 20 words that never name
    "Visual interference". Ghost Guide entry (two-sentence definition,
    where-you-meet-it, https FTC + EDPB sources on the allowlist, one tip, no
    quote over 25 words). Import `./Haunted`, `./Honest`, `./room.css`.

- [x] 2. Build the Haunted variant
  - File: `src/rooms/gravemoor-gazette/Haunted.tsx`, `src/rooms/gravemoor-gazette/room.css`
  - Render the fictional brand page. The possessed element (id "foyer-reject")
    is the small plain "Reject all" text link beside the bright "Accept all"
    button, showing ghost signs when `signsActive`; honour `reducedMotion`
    (static outline + "Something stirs here"); honour `preview`
    (non-interactive, no id) for the split's before side. Keep every text at
    WCAG AA contrast; confine cracks/mist to the possessed element.

- [x] 3. Build the Honest variant
  - File: `src/rooms/gravemoor-gazette/Honest.tsx`
  - Render the best-practice twin with equal buttons (no Visual interference);
    the single "Reject all" click calls `onCompleteTask`, completing "reject the
    cookies" in one click.

- [ ] 4. Add the ghost's act (Visual interference performed)
  - File: `src/rooms/gravemoor-gazette/Haunted.tsx`, `src/rooms/gravemoor-gazette/room.css`
  - When `showSigns` (so only on the haunted page, never in `preview`), render
    the ghost breathing on "Reject all": a slow mist puff (`.act-breath`) that
    dims the link's surround only — never its text — over a cycle ≥ 4 s, plus
    the ghost holding a finger to its lips (`.act-finger`). Transforms and
    opacity only, no layout shift, `pointer-events: none`, every act element
    `aria-hidden`. Do not re-implement or override the engine's shared
    atmosphere layer or common moments; the act stops when named via the shared
    unwind.
  - Reduced motion: no movement; show the still finger-to-lips pose with a short
    visible caption beside the ghost reading "it wants you to look away", and
    keep the "Something stirs here" label.
  - Risk: the breath puff must not drop the "Reject all" link's contrast
    (`contrast_scan` stays at 0 flags).

- [ ] 5. Extend the room's own test
  - File: `src/rooms/gravemoor-gazette/gravemoor-gazette.test.tsx`
  - Keep the existing assertions (honest one-click; possessed by id and
    keyboard-reachable; variant-specific pattern rule; WCAG AA contrast and zero
    axe violations on both; reduced-motion static indicator). Add: the act's
    element exists in the haunted view and is `aria-hidden`; the act is absent in
    `preview` and in the honest twin; under `prefers-reduced-motion` the still
    pose and the "it wants you to look away" caption render alongside "Something
    stirs here".

- [x] 6. Register and gate
  - File: `src/engine/registry.ts` — `'gravemoor-gazette': () => import('../rooms/gravemoor-gazette/room')`.
  - Run `npm run test`, `npm run check:rooms`, `npm run build`,
    `npm run check:size`, and `walk_rooms`/`contrast_scan` (both motion modes)
    for room 1; all must pass before the room is done.
