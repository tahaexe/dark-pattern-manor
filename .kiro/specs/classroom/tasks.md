# Tasks — The classroom page

- [x] 1. Extract the shared checklist/wandering data
  - Create `src/app/checklist.ts` exporting `ChecklistItem` (line, room, title,
    pattern), `CHECKLIST` (twelve items, line text identical to the ending, with
    the pattern name per room), `WanderingGhost` (name, desc), and `WANDERING`
    (six items, unchanged).
  - Update `src/app/EndingPage.tsx` to import `CHECKLIST` and `WANDERING` from
    the new module and delete its local copies and now-unused interfaces.
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 2. Wire the `#/teach` route in `App`
  - Add `'teach'` to the `Route` type, a `parseHash` branch for `'/teach'`, a
    lazy `import('./ClassroomPage')` effect mirroring the ending, and a render
    branch that shows the page or the shared pending scene.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.6_

- [x] 3. Build the classroom page and its styles
  - Create `src/app/ClassroomPage.tsx`: the `h1`, intro prose, "Print this page"
    button calling `window.print()`, the lesson table and variants, the six
    questions, the printable checklist and wandering line from the shared data,
    and the sources list with external links (`target="_blank"`,
    `rel="noopener noreferrer"`). Focus the `h1` on entry.
  - Create `src/app/classroom.css`: manor look from tokens; the lesson table;
    link treatment; and a `@media print` block (ink on white, no backdrop, no
    candles, no motion, checklist `break-before: page`, external links print
    their URL, print button hidden).
  - _Requirements: 3.1–3.7, 4.1–4.5, 5.1–5.3, 7.1–7.6_

- [x] 4. Add the links into the page
  - `EndingPage`: a "For teachers" link to `#/teach`.
  - `ShareCard`: link the share text heading to `#/teach` (leave `SHARE_TEXT`
    and the share payload unchanged).
  - `TitleScreen`: a small footer link to `#/teach`.
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 5. Tests
  - Create `src/app/ClassroomPage.test.tsx`: headings in order; the twelve
    printable lines equal `EndingPage`'s twelve (shared data); the print button
    calls `window.print`; every external link has `rel="noopener noreferrer"`
    and `target="_blank"`; axe-core finds no violations.
  - Extend `App.test.tsx` with `parseHash('#/teach')` and a teach-route render.
  - Add small `#/teach`-link assertions to `ShareCard.test.tsx` and
    `TitleScreen.test.tsx`.
  - _Requirements: 8.1–8.5, 1.1, 6.2, 6.3_

- [x] 6. Verify
  - Run `npm test`, `npm run build`, `npm run check:rooms`, `npm run check:size`
    and `npm run qa:full -- 1`; fix anything that fails; report results.
  - _Requirements: 7.7, 7.8_
