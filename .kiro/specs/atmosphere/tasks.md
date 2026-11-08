# Tasks — atmosphere

The original build shipped the atmosphere, the common moments and the motion QA
(tasks 1–11 below, left `[x]`). This revision makes the layer light to run:
the glow becomes a CSS opacity animation, the fog is drawn once and drifted by a
CSS transform, the motes run on a small DPR-1 canvas woken by a timer at ≤24 fps
and stop when hidden, the honest page goes fully still, an adaptive still mode
kicks in on a slow device, the ghost signs/acts use transform/opacity only, and
the AudioContext is created only on first sound-on and suspended while off or
hidden. A follow-up (tasks 23–25) makes the moving CSS layers cheap for the
compositor too and stills the whole haunted frame during the shared flee. A
second follow-up (tasks 26–28) fixes the adaptive still mode tripping at random
on a fast desktop and cuts the compositor cost further. Each change comes with
tests; the walk gains an idle check; the gates run last.

- [x] 1. The atmosphere pure core (original)
- [x] 2. The atmosphere core tests (original)
- [x] 3. The atmosphere component and CSS (original)
- [x] 4. Wire the atmosphere into the Room (lazy) (original)
- [x] 5. The common moments — engine attribute (original)
- [x] 6. The common moments — shared CSS (original)
- [x] 7. The engine moment test (original)
- [x] 8. manor-qa motion — pure rules and tests (original)
- [x] 9. manor-qa motion — session, walk and scan wiring (original)
- [x] 10. manor-qa motion — tool schemas and smoke (original)
- [x] 11. Room-engine spec and haunted-ui steering (original)

- [x] 12. Lighten the pure core
  - Files: `src/ui/atmosphere-core.ts`, `src/ui/atmosphere-core.test.ts`
  - Lowered the motes cap to 24 fps (`MAX_FPS = 24`), added `MOTES_DPR = 1`,
    `stillPose`, `adaptiveStillEngages`, `averageFps`, `ADAPTIVE_FPS_FLOOR`,
    `ADAPTIVE_WINDOW_MS`; dropped the unused `backingScale`/`renderPlan`/`MAX_DPR`.
    Core tests updated (24 fps cap, DPR 1, stillPose, adaptiveStillEngages,
    averageFps). 32 tests pass.
  - Requirements: 1.3, 1.5, 1.11, 1.12, 1.13, 5.1 (P1, P2, P4, P5)

- [x] 13. The glow as a CSS layer
  - Files: `src/ui/Atmosphere.tsx`, `src/styles/atmosphere.css`
  - `.atmosphere-glow` div with a CSS radial background, breathing via
    `@keyframes atmosphere-breath` (opacity 1↔0.85, 0.5 s). `data-still` pauses
    it full; `data-exhale` holds it full; reduced motion off. No per-frame JS.
  - Requirements: 1.2, 1.11, 1.12 (P3)

- [x] 14. The fog drawn once, drifted by CSS
  - Files: `src/ui/Atmosphere.tsx`, `src/styles/atmosphere.css`
  - `.atmosphere-fog` canvas painted once on start, drifted by
    `@keyframes atmosphere-fog-drift` (CSS transform). `data-still` pauses it;
    `data-exhale` fades it to 40%; reduced motion shows one still frame.
  - Requirements: 1.3, 1.11, 1.12

- [x] 15. The motes on a small timer-woken canvas
  - Files: `src/ui/Atmosphere.tsx`
  - `.atmosphere-motes` canvas at DPR 1; a `setTimeout(FRAME_MS)` wake requests
    one rAF to paint, then re-arms — ≤24 frame requests/s, not 60. Paused while
    hidden, resumes on visibility. Starts after first paint. Samples the first
    ~2 s; adaptive still engages on a slow device. Honest/reduced → draw once,
    no loop. Torn down on unmount. Test seam `__atmosphereProbe()`.
  - Requirements: 1.5, 1.7, 1.8, 1.11, 1.12, 1.13 (P1, P2, P4, P5)

- [x] 16. Still on honest, exhale then calm
  - Files: `src/ui/Atmosphere.tsx` (Room.tsx unchanged — already passes `exhale`)
  - `exhale` runs the one-second settle then the still pose: CSS animations
    paused, motes loop stopped, so the honest page requests no animation frames.
  - Requirements: 1.12, 4.5

- [x] 17. Ghost signs and acts: transform/opacity only
  - Files: `src/rooms/inkbone-books/room.css`, `src/rooms/gravemoor-gazette/room.css`,
    `src/rooms/inkbone-books/inkbone-books.test.tsx`
  - Replaced the animated `text-shadow` glow on the Library's "not"s with an
    opacity-pulsed `::before` candle halo. Removed the animated-element `filter:
    blur` on Room 1's `.mist` and `.act-breath` (baked the softness into the
    gradient) so the idle room's drifting/breathing composites without a
    per-frame blurred repaint. Updated the Library test to the new structure.
  - Requirements: 2.4

- [x] 18. AudioContext on first sound-on; suspend while off/hidden
  - Files: `src/audio/sound.ts`, `src/audio/sound.test.tsx`
  - Added an `armed` gate: the context is created only once sound is armed by a
    gesture (the toggle or the first captured pointer/key), never on a fresh
    room's mount. `setSoundOn(false)` suspends the context; a `visibilitychange`
    listener suspends while hidden and resumes while visible+on; a context born
    while hidden stays suspended. New lifecycle tests added. 34 tests pass.
  - Requirements: 3.1, 3.2, 3.3, 3.4, 5.4

- [x] 19. manor-qa: the idle (no-frames) rule and the walk's honest check
  - Files: `scripts/mcp/motion.mjs`, `scripts/mcp/motion.test.mjs`,
    `scripts/mcp/session.mjs`, `scripts/mcp/walk.mjs`
  - Added `idleWithinWindow(framesRequested)` + its `node:test`; a
    `window.__rafCount`/`__rafReset()` wrapper installed before app code; the
    walk resets it after the honest task, waits ~2 s, reads it, and fails the
    room on any requested frame.
  - Requirements: 4.5, 4.7 (P9)

- [x] 20. Motes-loop and still-state tests
  - Files: `src/ui/atmosphere-loop.test.ts` (new)
  - jsdom tests (stub 2D ctx, controllable clock, synchronous rAF, fake timers):
    the loop wakes on a timer and paints ≤24 fps; it does not exceed the cap;
    it pauses hidden and resumes; it draws once and starts no loop under reduced
    motion and when honest; adaptive still engages on a slow device and not a
    fast one; it tears down on unmount.
  - Requirements: 5.2

- [x] 21. Update the room-engine spec and the haunted-ui steering
  - Files: `.kiro/specs/room-engine/design.md`, `.kiro/steering/haunted-ui.md`
  - Documented the lightness rules: CSS glow, drawn-once/CSS-drifted fog,
    timer-woken ≤24 fps DPR-1 motes, still-on-honest, adaptive still,
    transform/opacity-only signs, lazy/suspended audio context.
  - Requirements: 5.8

- [x] 22. Build and run every gate
  - Files: none (verification)
  - Result: `npm test` all green; `npm run build` OK; `npm run check:size`
    30.3 KB ≤ 100 KB; `npm run qa:full` ALL CLEAR — all 12 rooms at both sizes,
    both motion modes.
  - Requirements: 5.9

- [x] 23. Make the moving CSS layers cheap for the compositor too
  - Files: `src/styles/atmosphere.css`, `src/ui/Atmosphere.tsx`,
    `src/ui/atmosphere-css.test.ts` (new)
  - Stepped the glow breath (`steps(12, jump-none)` over 500 ms) and the fog
    drift (`steps(120)` over 60 s), so headless Chrome's software compositor no
    longer pays per display frame. Shrank the fog layer from `200% / -50%` to
    `118% / -9%` with a `translateX(-8% … 8%)` drift. Added a `data-hidden`
    state so the glow and fog animations pause while the tab is hidden. New
    stylesheet-as-text test.
  - Requirements: 1.2, 1.3, 1.6, 5.3

- [x] 24. One shared named-hold rule stills the whole haunted frame
  - Files: `src/styles/atmosphere.css`, `src/ui/atmosphere-named-hold.test.ts`
  - Added one rule next to the possessed-element freeze:
    `.room-scene[data-moment='right'] .manor-frame *:not(.ghost-wrap):not(.ghost-wrap *) { transition: none; animation: none; }`
    so during the shared flee every control in the live haunted frame is still —
    including room 6's `.cloak-size` buttons.
  - Requirements: 2.7, 4.6, 5.6

- [x] 25. Build and run every gate (first compositor revision)
  - Files: none (verification)
  - Ran `npm test`, `npm run build`, `npm run check:size`, `npm run qa:full`.
    Committed as work in progress; the second follow-up (26–28) addresses the
    two measurements that were still over target.
  - Requirements: 5.9

- [x] 26. Adaptive still: measure lateness, not the capped frame count
  - Files: `src/ui/atmosphere-core.ts`, `src/ui/atmosphere-core.test.ts`,
    `src/ui/Atmosphere.tsx`, `src/ui/atmosphere-loop.test.ts`
  - The old rule compared the capped loop's painted-frame count (≈20.8 fps) to a
    20 fps floor, so the cap sat on the floor and a slow first frame tripped the
    still mode at random on a fast desktop (one profile ~20.8 fps, the other
    frozen at 0 fps, swapping run to run). Replaced it: `adaptiveStillEngages`
    now takes an `AdaptiveSample` (inter-wake gaps, frame durations, tick count,
    window) and engages when the mean wake lateness exceeds half the frame
    interval (`ADAPTIVE_LATE_FACTOR = 0.5`), OR the median frame exceeds 50 ms
    (`ADAPTIVE_MEDIAN_FRAME_MS`), OR the measured tick rate falls below 12 fps
    (`ADAPTIVE_FPS_FLOOR`, well under the 24 cap). Added pure `median` and
    `meanLateness` helpers. The component records each wake's gap and paint
    duration over the opening window (resetting the cadence clock across a hidden
    pause) and feeds the sample to the rule. A fast desktop (on-time wakes,
    instant frames) never trips; a 4×-throttled CPU does. Core tests cover
    `median`, `meanLateness`, the three engage conditions, the fast-desktop and
    single-slow-frame non-engage cases; the loop test engages on far-late wakes
    and stays animating on on-time wakes and a single late wake.
  - Requirements: 1.13, 5.1, 5.2 (P5)

- [x] 27. Fewer composites: slower breath, promote only while moving
  - Files: `src/styles/atmosphere.css`, `src/ui/Atmosphere.tsx`,
    `src/ui/atmosphere-css.test.ts`
  - The breath was stepped at 24 opacity updates/s; it is a slow breath, so it
    is now `steps(6, jump-none)` over 500 ms (~12 updates/s). Moved `will-change`
    out of the glow/fog base rules into two rules gated on `data-moving`
    (`will-change: opacity` / `transform`), and the component sets `data-moving`
    only while the loop animates — clearing it when the room goes still, honest,
    hidden, or unmounts — so an idle/still room keeps no large promoted layer the
    software compositor repaints. The look is unchanged. The stylesheet-as-text
    test asserts the glow steps ≤6, `will-change` appears only inside the
    `data-moving` rules (two occurrences), and the base rules carry no
    `will-change`.
  - Requirements: 1.2, 1.4, 5.3

- [x] 28. Build and run every gate (this revision)
  - Files: `scripts/mcp/contrast-scan.mjs` (QA reliability, see below)
  - Ran `npm test`, `npm run build`, `npm run check:size`, `npm run qa:full`
    (all 12 rooms, both sizes, both motion modes). All green; qa:full ALL CLEAR.
  - While verifying, the full qa run surfaced a pre-existing, intermittent
    contrast flag — room 1's honest "Accept all" at the phone size reading a
    false ~1.27:1. The honest button is genuinely AA (parchment text on an ink
    fill, ~12:1); the flag was a QA-scanner artifact (a `captureBeyondViewport`
    paint transient composited the parchment cell where the ink button sits),
    not a room defect. Made `contrast_scan` deterministic without touching any
    room's look: (1) walk only the REVEALED cell at each slider end
    (`.comparison-haunted` at 0, `.comparison-honest` at 100) so the
    clipped-under twin's identical "Accept all" is never sampled; (2) drive the
    slider by a native `input` event (not only a focus-dependent key) and poll
    `--split` + the revealed cell's geometry until settled; (3) clear focus and
    hover (blur + move the virtual mouse off the controls) so no button is
    caught in its hover/focus colour; (4) take TWO screenshot captures a moment
    apart and keep only flags that reproduce in BOTH, so a paint transient
    cannot raise a false flag while a real low-contrast still does. 0/8 repeats
    flagged after the fix; qa:full ALL CLEAR.
  - Requirements: 5.9
