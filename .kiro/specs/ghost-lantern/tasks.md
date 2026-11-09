# Implementation Plan

- [x] 1. The words file and the pattern→room map
  - [x] 1.1 `src/lantern/words.ts`: every phrase list (consent, accept, refuse, offer, shaming, scarcity, social-proof, selling, negations) and every player-facing string — the heading, `warningText(n)`, the zero text, `chip(pattern)`, "Show me", "Learn it in the manor", "Put out the lantern", and each detector's sign; English only. (R2.2, R3)
  - [x] 1.2 `src/lantern/patterns.ts`: `PATTERN_ROOM` for the seven v1 patterns, labels matching the manor's `patterns.ts`. (R2.11)
  - [x] 1.3 `src/lantern/words.test.ts`: `warningText` 0/1/2/5 exact (singular at 1); zero text exact; no "illegal"/"scam"/"score"/"grade" anywhere; `chip` is `Possible: <p>`. (R3, R10.4)

- [x] 2. The detectors (one per pattern, pure)
  - [x] 2.1 `src/lantern/types.ts` (`Suspect`, `Detector`, `Measure`) and the seven detector modules under `src/lantern/detectors/`, each a pure `(root) => Suspect[]` with conservative thresholds and an injectable observe for urgency. (R2.1, R2.3–2.9)
  - [x] 2.2 `src/lantern/detect.ts`: `runAllDetectors(root, host?, opts)` — run all, drop suspects inside the host, de-dupe by element, document order, each detector try/caught. (R2.1, R5.11)
  - [x] 2.3 One `*.test.ts` per detector: planted marked (right pattern/sign/room), honest twin not marked, and each R2 negative case not marked. (R10.1)

- [x] 3. The overlay, the host and the panel
  - [x] 3.1 `src/lantern/lantern-css.ts` (string-loaded): host (fixed, pointer-events none, top z-index), `.gl-mark` (3px dashed candle outline, transform-placed), `.gl-chip` (ink on parchment, `Possible: …`), `.gl-panel` (fixed bottom-right, 320px, full width on phone, AA), flicker keyframes off under reduced motion, transform/opacity only. (R5.2, R5.3, R5.9, R5.10)
  - [x] 3.2 `src/lantern/overlay.ts`: build the host + **closed** shadow root, constructed stylesheet with `<style>` fallback, marks (createElement/textContent only), the panel (role=dialog, aria-labelledby, warning text, list, Show me, manor links with rel=noopener noreferrer, Put out), scroll/resize + ResizeObserver placement (rAF-throttled), a read-only probe for the walk. (R5.1, R5.4–5.8, R6.1, R6.2)
  - [x] 3.3 `src/lantern/lantern.ts`: `light()`/`putOut()`/`isLit()`, remember/restore focus, the single `window.__ghostLantern__` flag, full teardown of nodes/listeners/observer/timer, urgency 3-second watch. (R4.2–4.4, R5.5)
  - [x] 3.4 `src/lantern/main.ts`: the IIFE entry — `isLit() ? putOut() : light()`. (R4.1, R4.3)
  - [x] 3.5 `src/lantern/lantern.test.ts`: light→putOut leaves zero nodes and matched add/remove for listeners/observer/timer; focus restored; the network-guard test (fetch/open/sendBeacon spies, none called). (R1.2, R1.6, R4.2, R10.4)

- [x] 4. Property tests
  - [x] 4.1 `src/lantern/detect.property.test.ts`: fast-check small DOMs; `runAllDetectors` never throws and never returns a suspect that is the host or inside it (host injected into the tree). (R10.3)

- [x] 5. Room coverage
  - [x] 5.1 `src/lantern/rooms.lantern.test.tsx`: each of the seven v1 rooms' Haunted marked by its detector; all twelve rooms' Honest marked by none. (R10.2)

- [x] 6. The second Vite build and the bookmarklet
  - [x] 6.1 `vite.lantern.config.ts`: IIFE lib build of `src/lantern/main.ts` → `dist/lantern.js`, minified, `emptyOutDir: false`, no import left. (R7.1)
  - [x] 6.2 `package.json`: `build` runs the app build then the lantern build; add `check:lantern`; keep `check:size` reading only the app entry. (R7.1, R7.3)
  - [x] 6.3 `scripts/check-lantern.mjs` + `scripts/check-lantern.test.mjs`: assert `dist/lantern.js` exists, ≤ 30 KB minified, none of the forbidden tokens, bookmarklet string < 64,000 chars; pure helpers unit-tested; wired into `npm test` via `test:lantern`. (R1.5, R7.4, R10.5)

- [x] 7. The practice page
  - [x] 7.1 `src/app/LanternPractice.tsx` + `lantern-practice.css`: "Hollowmere Goods", each v1 pattern planted once beside its honest twin, fictional names only, a self-owned ticking countdown, and "Try the lantern here" running the fetched `./lantern.js`. (R8, R11)
  - [x] 7.2 `src/app/App.tsx`: parse and route `#/lantern-practice` (lazy, like the ending). (R8.1)
  - [x] 7.3 `src/app/LanternPractice.test.tsx`: the seven planted instances and seven honest twins render; running the detectors over the page marks exactly the planted set; no real-company strings. (R8, R11)

- [x] 8. The ending-page install link
  - [x] 8.1 `src/app/EndingPage.tsx` + `ending.css` + `src/app/runBundle.ts`: a "Take the lantern with you" section — the draggable "Ghost Lantern" link (href set via ref/setAttribute from a fetched `./lantern.js`), the install line, the practice-page link; "Preparing the lantern…" and not draggable until ready; no lantern import into the app bundle. (R9)
  - [x] 8.2 `src/app/EndingLantern.test.tsx`: the link starts as "Preparing the lantern…" not draggable; after the fetch resolves it reads "Ghost Lantern", is draggable, and its href starts `javascript:`; the install line and practice link are present. (R9)

- [x] 9. The walk's lantern step and the strict-CSP measurement
  - [x] 9.1 `scripts/mcp/session.mjs`: an optional `strictCsp` flag that issues `Network.enable` + `Network.setExtraHTTPHeaders` (the strict CSP) before navigation. (R6.3)
  - [x] 9.2 `scripts/mcp/lantern-walk.mjs` + wiring in `scripts/mcp/manor-qa.mjs` (the `walk_lantern` tool) and `manor-qa-full.mjs` (the summary): run on `#/lantern-practice` at both sizes — panel N equals planted count, marks visible and over their elements, Escape closes, focus returns, no node remains; then the strict-CSP measurement (mark outline, panel background, console errors) reported, not gated. Counted in the summary via `r.fail`. (R10.6, R10.7)
  - [x] 9.3 Pure helper `marksOverElements` tested in `scripts/mcp/lantern-walk.test.mjs`; the `tools/list` protocol test updated to the four tools. (R10.6)

- [x] 10. README
  - [x] 10.1 `README.md`: a "Ghost Lantern" section — what it does, the four promises in plain words, how to install, and its limits **as measured** (strict policies render cleanly; cross-origin frames it cannot read; pages in other languages may show no marks); the manor-qa section lists the new `walk_lantern` tool. (R6.4, R7)

- [x] 11. Gates
  - [x] 11.1 Ran `npm test`, `npm run build`, `npm run check:rooms`, `npm run check:size`, `npm run check:lantern`, and `npm run qa:full` (all rooms, both sizes, both motion modes, the lantern step). All pass; the strict-policy measurement shows the marks and panel keep their styles with no console error.
