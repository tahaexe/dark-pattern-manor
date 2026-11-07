# Requirements — atmosphere

## Introduction

Dark Pattern Manor renders twelve rooms, each a fictional brand page possessed
by one dark pattern. Today the manor's mood lives in static CSS: a painted
backdrop, a warm vignette, per-room ghost signs. The rooms feel still, and
each room re-authors its own haunted beats (flicker, mist, flee), so the two
moments every player should feel — a wrong card making the candles gutter and
the ghost shake its head, and the right card making the ghost unwind and the
page exhale — are not shared and not consistent.

This document specifies the **atmosphere layer** and the **common haunted
moments**, plus the motion checks that let `manor-qa` verify them in a real
browser.

The atmosphere layer is **one** component drawn on the room's backdrop, behind
the manor frame and every control: a slow drifting fog, dust motes caught in
candlelight, and a warm candlelight that breathes on the walls. It is cheap
(starts after first paint, caps its frame rate, pauses when hidden, stops on
unmount), causes no layout shift, respects `prefers-reduced-motion`, and adds
no dependency. When the ghost flees, the page exhales once and then stays calm.

The common moments are driven by the **engine** from the state it already holds
(the wrong-pick nonce and the named state), not by each room. The engine marks
the scene with a data attribute; shared CSS animates `.ghost`/`.ghost-wrap`
(which every room already renders) with transforms and opacity only.

`manor-qa` learns motion: `walk_rooms` and `contrast_scan` take an optional
`reducedMotion` boolean (emulated through the browser's media emulation before
the page loads); the reduced-motion walk additionally asserts no animation is
running and the "Something stirs here" label is visible; and `walk_rooms`
reports the cumulative layout shift per room and fails a room above 0.01.

### Terms

- **Atmosphere layer** — the single component (`src/ui/Atmosphere.tsx`) that
  draws fog, motes and breathing candlelight on one `<canvas>` inside the
  `aria-hidden` `.room` backdrop layer, under every text, card and control.
- **Breathing candlelight** — a warm radial glow whose opacity moves between
  1 and 0.85, at most twice a second, never a flash.
- **Exhale** — the one-second settling after the right card: the fog thins and
  the glow rises once, softly, then stays calm in the honest state.
- **Common moment** — a haunted beat shared by every room and driven by the
  engine: `wrong` (candles gutter, ghost shakes its head once) and `right`
  (ghost stops mid-gesture and unwinds upward before it flees; the page
  exhales).
- **Moment attribute** — `data-moment` on `.room-scene`, set by the engine:
  `"wrong"` keyed on the wrong-pick nonce so the animation restarts on each
  wrong pick, `"right"` from the `named`/`honest`/`done` states, absent
  otherwise.
- **Reduced motion** — the user setting exposed by
  `prefers-reduced-motion: reduce`; when active, no animation plays.
- **Layout shift** — cumulative layout shift (CLS) as reported by a
  `PerformanceObserver` for `layout-shift` entries that are not
  `hadRecentInput`.

## Requirement 1 — The atmosphere layer

**User story:** As a player, I want the manor to feel alive — drifting fog,
dust in the candlelight, walls that breathe — so the haunting has a mood,
without any text or control ever being painted over or made unreadable.

#### Acceptance criteria

1. THE atmosphere layer SHALL be one component shared by every room, drawing on
   a single `<canvas>` placed inside the `aria-hidden` `.room` backdrop layer,
   beneath the manor frame, the task bar, the spell cards, the comparison box
   and every other text and control.
2. THE atmosphere layer SHALL draw a slow drifting fog as two or three soft,
   large, low-alpha bands, and between 30 and 60 dust motes caught in
   candlelight.
3. THE atmosphere layer SHALL draw a warm radial candlelight glow whose opacity
   moves between 1 and 0.85 and changes at most twice per second, never
   dropping to a flash or to zero.
4. THE atmosphere layer's canvas SHALL be `aria-hidden` and SHALL never receive
   pointer events, so no text, card or control is covered for pointer, keyboard
   or screen-reader users; `contrast_scan` SHALL continue to report zero flags.
5. WHEN the atmosphere layer mounts, THE atmosphere layer SHALL begin drawing
   only after the first paint (through `requestIdleCallback`, or a short
   `setTimeout` fallback), so it never delays the largest contentful paint.
6. THE atmosphere layer SHALL draw at most 30 frames per second.
7. WHILE the document is hidden (`document.hidden` / `visibilitychange`), THE
   atmosphere layer SHALL pause its animation, and SHALL resume when the
   document is visible again.
8. THE atmosphere layer SHALL size its canvas to the device pixel ratio capped
   at 2.
9. WHEN the room unmounts, THE atmosphere layer SHALL stop its animation loop,
   cancel any pending idle/timeout/frame callback, and remove its listeners.
10. THE atmosphere layer SHALL add no new runtime dependency, and the initial
    application bundle SHALL stay within the `check:size` limit (100 KB
    compressed); the atmosphere MAY be lazy-loaded with the room to hold the
    budget.
11. THE atmosphere layer's canvas SHALL be absolutely positioned inside a box
    that already exists (the `.room` layer), causing no layout shift; the
    cumulative layout shift of a room SHALL stay at or below 0.01.
12. WHERE `prefers-reduced-motion: reduce` is active, THE atmosphere layer SHALL
    run no animation at all and SHALL draw at most one still frame of fog and
    glow (or nothing), once.
13. WHEN the room reaches the honest step (after the right card), THE atmosphere
    layer SHALL exhale once over about one second — the fog thinning and the
    glow rising — and THEN SHALL stay calm for the honest state; WHERE reduced
    motion is active, THE exhale SHALL be a single still redraw with no
    animation.

## Requirement 2 — The common haunted moments

**User story:** As a player, I want every room to react the same way when I
pick a card — the candles gutter and the ghost shakes its head on a wrong pick,
and the ghost unwinds and the page exhales on the right one — so the feedback
is consistent and taught once, not re-invented per room.

#### Acceptance criteria

1. THE common moments SHALL be driven by the engine from the state it already
   holds — the wrong-pick nonce and the `named`/`honest`/`done` state — and not
   by any per-room code.
2. THE engine SHALL express the current moment as a `data-moment` attribute on
   the `.room-scene` element: `"wrong"` keyed on the wrong-pick nonce (so the
   attribute changes on each wrong pick and the animation restarts), `"right"`
   from the moment the room is named onward, and absent when there is no moment.
3. WHEN the player picks a wrong card, THE common moments SHALL make the candles
   gutter — a brief dip of the warm light lasting about 300 ms — and the ghost
   shake its head once.
4. WHEN the player picks the right card, THE common moments SHALL make the ghost
   stop mid-gesture and unwind upward before it flees, keeping the existing
   ghost-flee timing of 600 ms, and THE page SHALL exhale (Requirement 1.13).
5. WHERE `prefers-reduced-motion: reduce` is active, THE common moments SHALL
   play no gutter, no head-shake and no unwind; the ghost SHALL simply fade.
6. THE common moments SHALL be implemented with a data attribute on
   `.room-scene` and shared CSS using transforms and opacity only, and SHALL
   animate the `.ghost` / `.ghost-wrap` elements that every room already
   renders; WHERE a room names those elements differently, THE shared class
   SHALL be added rather than the room's elements renamed.
7. THE common moments SHALL keep every text readable and every control operable
   while they play, never hiding content (the no-fail rule), and a wrong card
   SHALL still cost nothing.

## Requirement 3 — manor-qa learns motion

**User story:** As Kiro, I want the QA tools to check motion — that reduced
motion really stops animation and shows the static sign, and that no room
shifts its layout — so the atmosphere and the common moments are verified in a
real browser.

#### Acceptance criteria

1. WHEN `walk_rooms` or `contrast_scan` is called with `reducedMotion: true`,
   THE tool SHALL emulate `prefers-reduced-motion: reduce` through the
   browser's media emulation before the page loads, and SHALL default
   `reducedMotion` to `false`.
2. THE tools SHALL keep their existing names (`walk_rooms`, `contrast_scan`) and
   the existing shape of their results, extending only their JSON Schemas with
   the optional `reducedMotion` boolean.
3. WHEN `walk_rooms` runs a room with `reducedMotion: true`, THE tool SHALL
   additionally verify that no element in the room has a running animation —
   `document.getAnimations()` is empty, or every animation is finished or
   paused — and that the "Something stirs here" label is visible.
4. WHEN `walk_rooms` walks a room, THE tool SHALL observe layout-shift entries
   with a buffered `PerformanceObserver`, report the cumulative layout shift
   seen during that room's walk, and fail the room when its cumulative layout
   shift exceeds 0.01.
5. THE motion argument parsing and the pass/fail rules SHALL be pure functions
   with `node:test` tests: parsing `reducedMotion` from tool arguments, the
   CLS pass/fail rule, and the "animations are at rest" rule.
6. THE smoke script SHALL run at least one room with `reducedMotion: true`.

## Requirement 4 — Tests and documentation

**User story:** As a developer, I want the atmosphere's pure parts and the
engine's moment wiring under test, and the specs and steering updated, so the
behaviour is pinned down and documented.

#### Acceptance criteria

1. THE atmosphere's pure parts SHALL be unit-tested with vitest: the frame-rate
   limiter (at most 30 fps), the mote and fog parameters (mote count in 30–60,
   two or three fog bands, device-pixel-ratio capped at 2), and the
   reduced-motion still-frame decision (animate vs draw once).
2. THE engine SHALL have a vitest test that a wrong pick sets
   `data-moment="wrong"` on `.room-scene` (changing with the nonce on a second
   wrong pick) and that the right card clears it to `data-moment="right"`.
3. THE room-engine spec SHALL be updated to describe the atmosphere layer and
   the common moments.
4. THE `haunted-ui` steering doc SHALL carry one short "Atmosphere" rule (fog
   and motes on the backdrop only, the flicker limit, the reduced-motion still)
   and one "Common moments" rule.
5. ALL existing gates SHALL still pass: `npm test`, `npm run build`,
   `npm run check:rooms`, and `npm run check:size`.

## Correctness properties

These are the executable invariants the tests pin down; each maps to a
requirement above.

- **P1 Frame budget.** For any elapsed time since the last drawn frame, the
  limiter draws a new frame only when at least `1000 / 30` ms have passed, so
  the draw rate never exceeds 30 fps (Req 1.6, 4.1).
- **P2 Mote and fog bounds.** The configured mote count is always in `[30, 60]`
  and the fog-band count is 2 or 3, for any viewport size the parameter builder
  is given; the backing-store scale equals `min(devicePixelRatio, 2)` (Req 1.2,
  1.8, 4.1).
- **P3 Breath bound.** The breathing glow's opacity stays within `[0.85, 1]`
  for all phases and completes at most two cycles per second (Req 1.3).
- **P4 Reduced-motion still.** The still-frame decision returns "draw once, do
  not animate" exactly when reduced motion is active, and "animate" otherwise
  (Req 1.12, 4.1).
- **P5 Moment attribute.** For the engine's state sequence, `data-moment` is
  absent while haunted/inspecting/picking with no wrong pick, becomes `"wrong"`
  with a fresh key on each wrong pick, and becomes `"right"` from `named`
  onward (Req 2.2, 4.2).
- **P6 CLS rule.** The CLS pass/fail rule flags a room exactly when its summed
  layout-shift value exceeds 0.01 (Req 3.4, 3.5).
- **P7 Animations at rest.** The "animations are at rest" rule passes exactly
  when the set of animations is empty or every animation's play state is
  finished or paused (Req 3.3, 3.5).
- **P8 reducedMotion parsing.** The argument parser reads `reducedMotion` as a
  boolean, defaulting to `false` when absent or non-boolean (Req 3.1, 3.5).
