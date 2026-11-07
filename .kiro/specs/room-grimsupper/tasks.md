# Tasks — Room 3: The Dining Room (brand Grimsupper)

> Copied from `.kiro/specs/room-template/tasks.md` and worked top to bottom.
> The room's gate is `npm run test` and `npm run check:rooms`; both must pass.

- [x] 1. Author the room data
  - File: `src/rooms/grimsupper/room.ts`
  - Fill the `RoomData` from the design table: id 3, slug `grimsupper`, name
    "The Dining Room", brand "Grimsupper", brandKind "restaurant and meal-box
    shop", domain `grimsupper.manor`, pattern Confirmshaming, task "close the
    discount pop-up", possessedId "dining-decline". Add three cards (correct
    Confirmshaming; relative Nagging; different Hidden costs) with wrong-card
    hints ≤ 20 words that never name Confirmshaming. Add the Ghost Guide entry
    (two-sentence definition, where-you-meet-it, https US + EU sources on the
    allowlist, one tip, no quote over 25 words). Import `./Haunted`,
    `./Honest`, `./room.css`. Place the correct card in the MIDDLE of the array
    so the correct-card position differs from Rooms 1 and 2.
  - Tests: covered by task 4 and `npm run check:rooms`.

- [x] 2. Build the Haunted variant
  - File: `src/rooms/grimsupper/Haunted.tsx`, `src/rooms/grimsupper/room.css`
  - Render the fictional Grimsupper shop page under a discount pop-up. The
    possessed element (id "dining-decline") behaves like Confirmshaming — a
    small, dim decline link whose wording shames the player ("No thanks, I'd
    rather pay full price and eat cold soup alone") beside a big "Yes, give me
    15% off" button — and shows ghost signs when `signsActive`; honour
    `reducedMotion` (static outline + the room's own "Something stirs here"
    label); honour `preview` (non-interactive, no id) for the split's before
    side. Keep every text at WCAG AA contrast; confine cracks/mist to the
    possessed element. The pop-up is a real `role="dialog"` labelled by its
    heading. Fit the first screen at 1920×1080 and stay readable at 412px wide
    with no horizontal overflow; the ghost peeks beside the decline link at its
    height and never covers an input, a label, a button or the link's text.

- [x] 3. Build the Honest variant
  - File: `src/rooms/grimsupper/Honest.tsx`
  - Render the best-practice twin with no Confirmshaming: the same pop-up with
    two plain, equal choices ("Get 15% off" and "No thanks") and a visible
    close button, `role="dialog"` with Escape to close; the single task action
    (close) calls `onCompleteTask`, completing "close the discount pop-up" in
    one click.

- [x] 4. Write the room's own test
  - File: `src/rooms/grimsupper/grimsupper.test.tsx`
  - Assert: the honest variant completes "close the discount pop-up" in one
    click; the possessed element is found by id "dining-decline" and is
    keyboard-reachable with a non-empty accessible name (no aria-label, so the
    accessible name is its visible shaming text); the pattern rule passes on
    honest and fails on haunted (variant-specific: haunted decline is a dim
    text link with a guilt/shame marker, honest decline is a plain equal button
    with no shame marker); every text passes WCAG AA contrast in both variants
    (axe `color-contrast` enabled on both) and axe reports zero violations on
    both; with `prefers-reduced-motion` mocked on, a wrong spell card and the
    possessed element show the static indicator and run no animation.

- [x] 5. Register and gate
  - File: `src/engine/registry.ts`
  - Add `'grimsupper': () => import('../rooms/grimsupper/room')`.
  - Run `npm run test`, `npm run check:rooms`, `npm run build` and
    `npm run check:size`; all must pass before the room is done.

- [x] 6. Add the ghost's act (Confirmshaming performed)
  - File: `src/rooms/grimsupper/Haunted.tsx`, `src/rooms/grimsupper/room.css`
  - When `showSigns` (so only on the haunted page, never in `preview`), render
    the ghost holding a tiny frowning mask (`.act-mask`) and tilting it toward
    the player over a cycle ≥ 4 s. Transforms and opacity only, no layout shift
    (space reserved inside the already-sized ghost wrap), `pointer-events: none`,
    every act element `aria-hidden`; the mask sits beside the decline link,
    never over its text or focus ring. Do not re-implement or override the
    engine's shared atmosphere layer or common moments; the act stops when named
    via the shared unwind and is absent from the honest twin and the
    comparison's haunted preview.
  - Reduced motion: no movement; show the still frowning-mask pose with a short
    visible caption beside the ghost reading "a guilt trip", and keep the
    "Something stirs here" label.
  - Risk: the mask must not cover the decline link's text or its focus ring
    (`contrast_scan` stays at 0 flags).
  - Test: extend `src/rooms/grimsupper/grimsupper.test.tsx` — the act's element
    exists in the haunted view and is `aria-hidden`; it is absent in `preview`
    and in the honest twin; under `prefers-reduced-motion` the still pose and the
    "a guilt trip" caption render alongside "Something stirs here".
