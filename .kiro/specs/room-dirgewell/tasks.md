# Tasks — Room 14: The Music Room (brand Dirgewell)

> The room's gate is `npm run test` and `npm run check:rooms`; both must pass.

- [ ] 1. Author the room data
  - File: `src/rooms/dirgewell/room.ts`
  - Fill the `RoomData`: id 14, slug `dirgewell`, name "The Music Room", brand
    "Dirgewell", brandKind "sheet music", domain "dirgewell.manor", pattern
    "Forced action", task "download the free song sheet", possessedId
    "musicroom-signup". Three cards: correct Forced action; relative Nagging;
    different Fake urgency — with wrong-card hints ≤ 20 words that never name
    "Forced action". Add the Ghost Guide entry (two-sentence definition,
    where-you-meet-it, https US (ecfr.gov) + EU (eur-lex.europa.eu) sources on
    the allowlist, one tip, no quote over 25 words). Import `./Haunted`,
    `./Honest`, `./room.css`.

- [ ] 2. Build the Haunted variant
  - Files: `src/rooms/dirgewell/Haunted.tsx`, `.../room.css`
  - Render the sheet-music page. The possessed element (id "musicroom-signup")
    is the sign-up gate's form: "Download free sheet" opens a gate ("Create your
    account to download") with name, email, password, a pre-ticked "Share your
    contacts to find friends" and a "Sign up and download" button; the only
    other way is closing the gate. Ghost signs when `signsActive`; honour
    `reducedMotion` (static outline + "Something stirs here" + the act caption)
    and `preview` (non-interactive, no id). Keep every text at WCAG AA contrast;
    confine cracks/mist to the possessed form.

- [ ] 3. Build the Honest variant
  - File: `src/rooms/dirgewell/Honest.tsx`
  - Render the best-practice twin: "Download free sheet" downloads at once (a
    visible "Downloaded" state; no real file), beside a quiet optional link
    "Save it to an account (optional)". The single task action calls
    `onCompleteTask` in one click.

- [ ] 4. Write the room's own test
  - File: `src/rooms/dirgewell/dirgewell.test.tsx`
  - Assert: the honest variant completes the task in one click; the possessed
    element is found by id "musicroom-signup" and is keyboard-reachable with a
    non-empty accessible name; the pattern rule passes on honest and fails on
    haunted (variant-specific); every text passes WCAG AA contrast in both
    variants (axe `color-contrast` enabled) and axe reports zero violations on
    both; with `prefers-reduced-motion` mocked on, a wrong spell card and the
    possessed element show the static indicator and run no animation; the Guide
    entry carries its US and EU sources.

- [ ] 5. Register and gate
  - File: `src/engine/registry.ts` (already added
    `dirgewell: () => import('../rooms/dirgewell/room')`).
  - Run `npm run test`, `npm run check:rooms`, `npm run build` and
    `npm run check:size`; all must pass.
