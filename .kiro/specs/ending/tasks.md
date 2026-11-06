# Implementation Plan

Build order: the continue affordance that lets room 12 reach the end, then the `#/end` route and lazy loading, then the Ending page (gate, heading, checklist, wandering ghosts), then the share card, then the link-preview metadata, then the look, and finally run every gate. Each task ends with its tests.

- [x] 1. Add the continue affordance and route the twelfth room to the end
  - Files: `src/engine/Room.tsx`, `src/app/App.tsx`, `src/engine/Room.test.tsx`, `src/app/App.test.tsx`
  - In `Room.tsx`, add an optional `nextHash` prop and render a keyboard-reachable continue link (`<a href={nextHash}>`) in the `honest`/`done` states — "Leave the manor" when `nextHash === '#/end'`, else "Leave this room". In `App.tsx`, compute `nextHash` (`#/room/${N+1}` for rooms 1–11, `#/end` for room 12) and pass it to `Room`.
  - Tests: Room renders a continue link to the given `nextHash` once honest; room 12's link points to `#/end`; no link before the honest step.
  - Requirements: 1.2

- [x] 2. Add the `#/end` route, its lazy load, and the title-page link
  - Files: `src/app/App.tsx`, `src/app/App.test.tsx`
  - Extend `Route` and `parseHash` with `end` (`#/end` → `{ route: 'end', room: 1 }`). Lazily `import('./EndingPage')` when `route === 'end'`, showing the existing in-manor loading status while it arrives. On the title page, render a link to `#/end` when `doneCount() >= 12`.
  - Tests: `parseHash('#/end')` returns the end route; opening `#/end` renders the Ending (gate form when not complete, full ending when complete); the title shows the end link only when twelve are complete.
  - Requirements: 1.1, 1.3, 1.6

- [x] 3. Build the Ending page: gate, heading, checklist, wandering ghosts
  - Files: `src/app/EndingPage.tsx`, `src/app/EndingPage.test.tsx`
  - Read `doneCount()`. Below 12: render the gate — a focusable `h1`, the line "Name all twelve ghosts first", and a back link to `#/`; render no checklist, wandering list, or share card. At 12: render the `h1` "The manor is quiet", the line "You named all twelve ghosts.", the `h2` "Ghost hunt in your own browser" with an `<ol>` of the twelve lines (word for word) each with a `#/room/N` link whose accessible name is the room's title, and the `h2` "Six ghosts still wander" with the six lines word for word. Keep exactly one `h1` and a clean heading outline.
  - Tests: the twelve checklist lines and six wandering lines render word for word; each checklist link points to `#/room/N` and names its room title; below 12, "Name all twelve ghosts first" shows and the checklist does not; exactly one `h1`; axe-core reports zero violations on the completed Ending.
  - Requirements: 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 6.5, 7.1, 7.2, 7.5

- [x] 4. Build the share card
  - Files: `src/app/ShareCard.tsx`, `src/app/ShareCard.test.tsx` (rendered by `EndingPage`)
  - Render the sentence "I named all twelve ghosts of Dark Pattern Manor.", the site URL derived from `import.meta.env.BASE_URL` + `location.origin` (no hard-coded host), and a "Share" button. On click: call `navigator.share({ title, text, url })` when it is a function (no clipboard); otherwise `navigator.clipboard.writeText(text + ' ' + url)` and announce "Copied" in a polite live region. No third-party request or script.
  - Tests: with `navigator.share` mocked, click calls it once with title/text/url and does not write the clipboard; without `navigator.share`, click writes the text and URL to the clipboard and announces "Copied".
  - Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.3

- [x] 5. Add the link-preview metadata and its test
  - Files: `index.html`, `src/app/indexHtmlMeta.test.ts`
  - Add `og:title` ("Dark Pattern Manor"), `og:description` ("Twelve haunted web pages, one dark pattern each: name the ghost, free the honest twin."), `og:type` ("website"), `og:image` (`/dark-pattern-manor/og-card.png`), `og:image:width` (1200), `og:image:height` (630), `og:image:alt` (non-empty), and `twitter:card` ("summary_large_image"). Do not create `public/og-card.png`.
  - Tests: read `index.html` and assert all required tags exist with the right content and that `og:image` ends with `og-card.png`.
  - Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 7.4

- [x] 6. Style the Ending in the manor's look
  - Files: `src/app/ending.css` (imported by `EndingPage.tsx`); the shared continue-link style in `src/styles/look.css`
  - Use the manor frame, tokens, and fonts; no new raster image. Single-column checklist by default; two columns above 1000 px so 1920 × 1080 is not cramped; readable at 412 px with no horizontal overflow; reduced motion runs no animation or transition; all text meets AA.
  - Tests: covered by the EndingPage axe-core test (task 3).
  - Requirements: 6.1, 6.2, 6.3, 6.4, 6.5

- [x] 7. Run every gate
  - `npm test` (102 node-test + all vitest), `npm run build`, `npm run check:rooms`, and `npm run check:size` all pass. The Ending builds as its own chunk; the initial bundle is 17.3 KB gzip, well under the 100 KB limit.
  - Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
