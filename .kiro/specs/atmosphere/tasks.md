# Tasks — atmosphere

Build order: the atmosphere's pure core first (with its tests), then the
component and its CSS, then wire it into the Room; next the common moments
(engine attribute + shared CSS + engine test); then teach manor-qa motion (pure
rules + their tests, session/walk/scan wiring, schemas, smoke); finally update
the docs and run every gate.

- [x] 1. The atmosphere pure core
  - Files: `src/ui/atmosphere-core.ts`
  - Export `MAX_FPS`, `FRAME_MS`, `MIN_MOTES`, `MAX_MOTES`, `MAX_DPR`,
    `BREATH_MIN`, `BREATH_MAX`, `BREATH_HZ`, `EXHALE_MS`; and the pure functions
    `backingScale`, `shouldDraw`, `moteCount`, `fogBands`, `breath`,
    `renderPlan`, `buildMotes`, `buildFog`, `exhaleProgress`.
  - Requirements: 1.2, 1.3, 1.6, 1.8, 1.12, 1.13

- [x] 2. The atmosphere core tests
  - Files: `src/ui/atmosphere-core.test.ts`
  - vitest: `shouldDraw` caps at 30 fps; `moteCount` in `[30,60]` over a grid
    and a fast-check property; `fogBands` is 2 or 3; `backingScale` is
    `min(max(1,dpr),2)`; `breath(t)` stays in `[0.85,1]` over a sweep;
    `renderPlan(true)='draw-once'`, `renderPlan(false)='animate'`;
    `exhaleProgress` is 0 at 0, monotonic, clamped to 1.
  - Requirements: 4.1 (properties P1–P4)

- [x] 3. The atmosphere component and CSS
  - Files: `src/ui/Atmosphere.tsx`, `src/styles/atmosphere.css`
  - One `<canvas class="atmosphere-canvas" aria-hidden="true">`, absolutely
    positioned to fill `.room`, `pointer-events: none`. Start after first paint
    (`requestIdleCallback` or `setTimeout` fallback); size to
    `backingScale(devicePixelRatio)`; build motes/fog from a seeded rng; animate
    at ≤30 fps gated by `shouldDraw`; draw the breathing glow (`breath`), the
    fog bands and the motes; pause while `document.hidden`; exhale once over
    ~1s when the `exhale` prop turns true; under reduced motion draw one still
    frame and start no loop; clean up every callback and listener on unmount; be
    a no-op when `getContext` is absent (jsdom).
  - Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.11, 1.12, 1.13

- [x] 4. Wire the atmosphere into the Room (lazy)
  - Files: `src/engine/Room.tsx`, `src/main.tsx` (import `atmosphere.css`)
  - Render `<Atmosphere exhale={showSplit} reducedMotion={reducedMotion} />` as
    a sibling of `.room-wall` inside the `aria-hidden` `.room` layer, lazy-loaded
    via a guarded dynamic import so it rides the room chunk. Import
    `atmosphere.css` once from the global style entry (`main.tsx`, alongside
    `look.css`).
  - Requirements: 1.1, 1.10

- [x] 5. The common moments — engine attribute
  - Files: `src/engine/Room.tsx`
  - Compute the moment from existing state: `right` from `named`/`honest`/`done`;
    `wrong` with `key = whisperNonce` while `picking` after a wrong pick; none
    otherwise. Render `data-moment` and `data-moment-key` on `.room-scene`.
  - Requirements: 2.1, 2.2

- [x] 6. The common moments — shared CSS
  - Files: `src/styles/atmosphere.css`
  - `data-moment='wrong'`: `candle-gutter` on `.room::after` (~300 ms dip) and
    `ghost-shake` once on `.ghost-wrap`; re-keyed by `data-moment-key` so it
    restarts on each wrong pick. `data-moment='right'`: `ghost-unwind` on
    `.ghost-wrap` as the lead-in before the room's own 600 ms flee. Transforms
    and opacity only. Under `prefers-reduced-motion: reduce`, all three off.
  - Requirements: 2.3, 2.4, 2.5, 2.6, 2.7

- [x] 7. The engine moment test
  - Files: `src/engine/Room.moment.test.tsx`
  - A wrong pick sets `data-moment="wrong"` with a `data-moment-key`; a second
    wrong pick changes the key; the right card leaves `data-moment="right"` and
    clears the wrong moment.
  - Requirements: 4.2 (property P5)

- [x] 8. manor-qa motion — pure rules and tests
  - Files: `scripts/mcp/motion.mjs`, `scripts/mcp/motion.test.mjs`
  - `wantsReducedMotion(args)` (default false, non-boolean → false);
    `CLS_LIMIT=0.01` and `clsWithinLimit(cls, limit?)`;
    `animationsAtRest(playStates)`. `node:test`: parsing defaults/booleans;
    CLS pass at ≤0.01 and fail above; at-rest passes for `[]`/`['finished']`/
    `['paused','finished']`, fails for `['running']`.
  - Requirements: 3.5 (properties P6, P7, P8)

- [x] 9. manor-qa motion — session, walk and scan wiring
  - Files: `scripts/mcp/session.mjs`, `scripts/mcp/walk.mjs`,
    `scripts/mcp/contrast-scan.mjs`
  - `openSession` takes `reducedMotion`, sets `prefers-reduced-motion: reduce`
    before the first navigation, and installs the buffered CLS observer plus the
    `__animStates()`/`__stirsVisible()`/`__clsReset()` helpers. `walk.mjs` reads
    `wantsReducedMotion`, resets and reads `window.__cls` per room, gates with
    `clsWithinLimit`, and — under reduced motion — checks `animationsAtRest` and
    the "Something stirs here" label; results keep their shape. `contrast-scan.mjs`
    accepts `reducedMotion`, passes it to the session, and echoes it in the JSON.
  - Requirements: 3.1, 3.2, 3.3, 3.4

- [x] 10. manor-qa motion — tool schemas and smoke
  - Files: `scripts/mcp/manor-qa.mjs`, `scripts/mcp/manor-qa-smoke.mjs`
  - Add the optional `reducedMotion` boolean (default false) to the shared
    `roomsSchema` used by `walk_rooms` and `contrast_scan`; keep the tool names
    and the text-content result shape. The smoke script runs one room with
    `reducedMotion: true` and prints its reduced-motion result.
  - Requirements: 3.2, 3.6

- [x] 11. Update the room-engine spec and the haunted-ui steering
  - Files: `.kiro/specs/room-engine/design.md`, `.kiro/steering/haunted-ui.md`
  - Room-engine design: a short section describing the atmosphere layer (one
    canvas on the backdrop, fog/motes/breathing glow, cheap, reduced-motion
    still, exhale on honest) and the common moments (engine `data-moment`,
    wrong gutter + head-shake, right unwind before the 600 ms flee). Steering:
    one "Atmosphere" rule and one "Common moments" rule.
  - Requirements: 4.3, 4.4

- [x] 12. Build and run every gate; call the manor-qa tools
  - Files: none (verification)
  - `npm run build`; call `walk_rooms` and `contrast_scan` for rooms "1-12",
    then again with `reducedMotion: true`, through the MCP server; fix every
    failure and re-run. Then `npm test`, `npm run check:rooms`,
    `npm run check:size`. Report each result before and after fixes.
  - Result: build OK; walk_rooms 1-12 all rooms ok (cls 0.0033–0.0034, 0
    console errors, ending 12 items); walk_rooms 1-12 reducedMotion all ok
    (cls 0, animations at rest, "Something stirs here" visible); contrast_scan
    1-12 and reducedMotion both 0 flags; `npm test`, `check:rooms`, `check:size`
    (21.9 KB) all pass. No failures, so no fixes were needed. The tools were run
    through the manor-qa MCP server over stdio (the IDE's MCP tool_call prompt
    was unavailable in this environment).
  - Requirements: 4.5
