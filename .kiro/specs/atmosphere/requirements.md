# Requirements — atmosphere

## Introduction

Dark Pattern Manor renders twelve rooms, each a fictional brand page possessed
by one dark pattern. The manor's mood lives in an **atmosphere layer** drawn on
the room's backdrop, behind the manor frame and every control: a slow drifting
fog, dust motes caught in candlelight, and a warm candlelight that breathes on
the walls. Alongside it the engine drives the **common haunted moments** every
room should feel, and `manor-qa` carries the **motion checks** that verify them.

This revision keeps the look but makes the layer **light to run**. The first
build drew everything — glow, fog and motes — on one canvas in a
`requestAnimationFrame` loop that ticked at the display's 60 Hz even when the
room was idle and nothing had changed, redrawing a radial gradient, two or three
fog gradients and sixty motes every painted frame; it kept running once the room
turned honest; and it created an `AudioContext` on mount even with the sound
off. Measured on that build in headless Chrome (fresh profile, room 1 idle):
at 1280×720, 1× CPU, all Chrome processes used about 27 % of a core and the page
drew 60 frames a second although nothing changed; at 4× CPU throttling the title
ran at about 14 fps with the main thread ~23 % busy.

A later pass moved the glow and fog off the per-frame canvas and onto CSS (the
glow an opacity `@keyframes`, the fog a once-drawn bitmap drifted by a CSS
`transform`), which cut the renderer's main-thread cost sharply. But both CSS
animations still ran at the display's refresh rate, and headless Chrome
composites in **software**: every recomposite of the large drifting fog layer
and the breathing glow was paid on the CPU each frame, so the GPU/compositor
process climbed even as the renderer fell (measured: renderer ~20 %→~6.6 %, but
the GPU process ~6 %→~26 %, all processes together ~26 %→~32 %, over the ≤15 %
target). A follow-up stepped both CSS animations, so the compositor updates them
only a couple of dozen times a second, and shrank the fog layer; the renderer
fell to ~7 % but all processes together still sat near ~24 % because the GPU
process stayed around ~17 %: each composite of the glow and fog layers is paid
on the CPU, and promoting those layers to their own compositor layer **all the
time** (`will-change` always on) leaves large promoted layers the software
compositor repaints even when the room is idle.

This revision closes both remaining gaps:

- the **adaptive still mode** switched on at random on a fast desktop, because
  it compared the capped loop's painted-frame count (≈20.8 fps, right at the
  20 fps floor) to that floor, so any slow first frame tripped it. It now
  measures how **late** the motes' own timer ticks arrive and how long each
  frame takes — not how many the capped loop draws — so the cap can never trip
  it;
- the **glow breath** now updates the compositor at most about **12** times a
  second (a slow breath), and the **glow and fog layers** are promoted to their
  own compositor layer (`will-change`) **only while they move**, so an idle,
  still, honest or hidden room keeps no large promoted layer the compositor
  repaints.

The atmosphere costs a fraction of the first build, and its moving layers update
the compositor only a couple of dozen times a second at most:

- the **glow** is a CSS layer whose breath is an opacity animation — no
  per-frame JavaScript — and its timing is **stepped** so the compositor updates
  its opacity about 12 times a second (a slow breath), not once per display
  frame;
- the **fog** is drawn once (to an offscreen canvas) and drifted by a CSS
  `transform` — nothing redraws it per frame — on a **stepped** timing so the
  compositor recomposites it only a couple of times a second, and the drifting
  layer is no wider than the scene plus its own drift (not twice the scene);
- the **glow and fog layers** are promoted to their own compositor layer
  (`will-change`) **only while they move**: the component sets a `data-moving`
  state while the loop animates and clears it the moment the room goes still,
  honest or hidden, so an idle room does not pay to recomposite a large promoted
  layer;
- the **motes** run on a small canvas at device-pixel-ratio 1, at most 24
  frames a second, woken by a timer (no idle 60 Hz rAF), and stop while the tab
  is hidden;
- while the tab is **hidden** the glow and fog CSS animations are paused as
  well (not only the motes loop), so a backgrounded room composites nothing;
- when the room turns **honest**, every atmosphere animation stops (CSS and
  canvas) — the honest page is calm and still;
- an **adaptive still mode** watches the first two seconds of a room and
  measures the device's cadence off the motes' **own timer ticks** — not the
  capped frame count: if the wakes arrive late by more than half the frame
  interval on average, or the median frame takes longer than 50 ms, or the
  measured tick rate falls below a floor well under the cap (12 fps), the
  atmosphere drops to its still pose for that visit (the same pose as reduced
  motion), silently. A fast desktop never trips it; a 4×-throttled CPU may;
- the **ghost signs and acts** animate only `transform` and `opacity` — no
  animated `filter`, `box-shadow` or layout property;
- the **`AudioContext`** is not created until the sound is first switched on,
  and is suspended while the sound is off or the tab is hidden.

### Terms

- **Atmosphere layer** — the component (`src/ui/Atmosphere.tsx`) that renders,
  inside the `aria-hidden` `.room` backdrop layer under every text, card and
  control, a CSS glow layer, a CSS-drifted fog image and one small motes canvas.
- **Breathing candlelight** — a warm radial glow whose opacity moves between
  1 and 0.85, at most twice a second, never a flash. It is a CSS layer animated
  with `opacity` only, on a stepped timing so the compositor updates it about
  12 times a second (a slow breath).
- **Drifting fog** — two or three soft, large, low-alpha bands painted once to
  an offscreen canvas (or image) and moved across the backdrop by a CSS
  `transform` animation on a stepped timing (a couple of updates a second); the
  bitmap is never repainted per frame and the moving layer is no wider than the
  scene plus its drift.
- **Layer promotion** — the glow and fog are promoted to their own compositor
  layer with `will-change` **only while they move**; the component adds a
  `data-moving` state while the loop animates and removes it when the room is
  still, honest or hidden, so no idle large layer stays promoted.
- **Motes** — 30–60 dust specks drawn on a small canvas at device-pixel-ratio
  1, repainted on a timer at most 24 times a second, paused when the tab is
  hidden or the room is honest.
- **Still pose** — the atmosphere at rest: the glow at full, the fog on one
  still frame, the motes drawn once and not animating, and the layers no longer
  promoted. It is used under reduced motion, once the room is honest, and when
  adaptive still mode engages.
- **Adaptive still mode** — a per-visit fallback: the component samples the
  motes' **own timer cadence** over the first ~2 s — the gap between successive
  wakes and the duration of each paint — and engages the still pose when the
  device cannot keep that cadence (late wakes, slow frames, or a tick rate below
  12 fps), with no message. The 24 fps cap alone never trips it.
- **Exhale** — the one-second settling as the room turns honest: the fog thins
  and the glow rises once, then the atmosphere holds its still pose.
- **Common moment** — a haunted beat shared by every room and driven by the
  engine: `wrong` (candles gutter, ghost shakes its head once) and `right`
  (ghost stops mid-gesture and unwinds upward before it flees; the page
  exhales).
- **Moment attribute** — `data-moment` on `.room-scene`, set by the engine.
- **Reduced motion** — `prefers-reduced-motion: reduce`; when active, no
  animation plays and the atmosphere shows its still pose.
- **Layout shift** — cumulative layout shift (CLS) as reported by a
  `PerformanceObserver` for `layout-shift` entries that are not
  `hadRecentInput`.

## Requirement 1 — The atmosphere layer, drawn cheaply

**User story:** As a player, I want the manor to feel alive — drifting fog,
dust in the candlelight, walls that breathe — without the page burning a core
(renderer or compositor) while nothing changes, so an idle room costs a
fraction of what it did.

#### Acceptance criteria

1. THE atmosphere layer SHALL be one component shared by every room, rendered
   inside the `aria-hidden` `.room` backdrop layer, beneath the manor frame, the
   task bar, the spell cards, the comparison box and every other text and
   control; its elements SHALL be `aria-hidden` and SHALL never receive pointer
   events, and `contrast_scan` SHALL continue to report zero flags.
2. THE warm candlelight glow SHALL be a CSS layer whose opacity breathes between
   1 and 0.85 at most twice per second, never dropping to a flash or to zero;
   the breath SHALL be a CSS `opacity` animation, with **no** per-frame
   JavaScript driving it, and its timing SHALL be stepped so the compositor
   updates the opacity about 12 times per second (a slow breath), never more
   than 24 times per second.
3. THE drifting fog SHALL be two or three soft, large, low-alpha bands painted
   once to an offscreen canvas (or image) and moved across the backdrop by a CSS
   `transform` animation whose timing is stepped so the compositor recomposites
   it only a couple of times per second; the fog bitmap SHALL NOT be repainted
   on a per-frame loop, and the drifting layer SHALL be no wider than the scene
   plus its own drift distance.
4. THE glow and fog layers SHALL be promoted to their own compositor layer
   (`will-change`) ONLY while they move: WHILE the atmosphere animates, the
   component SHALL mark them movable, and WHEN the room is still (reduced,
   honest or adaptive), or hidden, the component SHALL remove that promotion, so
   no idle large layer stays promoted for the software compositor to repaint.
5. THE motes SHALL be 30–60 dust specks drawn on a small canvas sized at
   device-pixel-ratio 1, repainted on a timer at most 24 times per second — not
   by an always-on `requestAnimationFrame` loop that ticks when nothing is due
   — and SHALL pause while the document is hidden and resume when it is visible.
6. WHILE the document is hidden, THE glow and fog CSS animations SHALL be paused
   as well (not only the motes loop), so a backgrounded room requests no
   compositor work; they SHALL resume when the document is visible again and the
   room is still haunted.
7. WHEN the atmosphere layer mounts, THE motes drawing SHALL begin only after
   the first paint (through `requestIdleCallback`, or a short `setTimeout`
   fallback), so it never delays the largest contentful paint.
8. WHEN the room unmounts, THE atmosphere layer SHALL stop its motes timer and
   any pending frame, cancel any pending idle/timeout callback, remove its
   listeners, and clear the `data-moving`/`data-hidden` states.
9. THE atmosphere layer SHALL add no new runtime dependency, and the initial
   application bundle SHALL stay within the `check:size` limit (100 KB
   compressed); the atmosphere MAY be lazy-loaded with the room to hold the
   budget.
10. THE atmosphere layer's elements SHALL be absolutely positioned inside a box
    that already exists (the `.room` layer), causing no layout shift; the
    cumulative layout shift of a room SHALL stay at or below 0.01.
11. WHERE `prefers-reduced-motion: reduce` is active, THE atmosphere layer SHALL
    run no animation at all (no CSS animation, no motes timer) and SHALL show
    its still pose: the glow at full, the fog on one still frame, the motes
    drawn once (or nothing), and the layers not promoted.
12. WHEN the room reaches the honest step (after the right card), THE atmosphere
    layer SHALL exhale once over about one second — the fog thinning and the
    glow rising — and THEN SHALL stop every animation (CSS and canvas), drop the
    layer promotion, and hold its still pose, so the honest page is calm and
    requests no animation frames.
13. THE atmosphere layer SHALL sample the motes' timer cadence over about the
    first two seconds of a visit — the gap between successive wakes and the
    duration of each paint — and SHALL switch to its still pose for the rest of
    that visit (the same pose as reduced motion), saying nothing, WHEN the
    device cannot keep that cadence: the wakes arriving late by more than half
    the frame interval on average, OR the median frame taking longer than 50 ms,
    OR the measured tick rate falling below a floor well under the cap (12 fps).
    The 24 fps cap alone SHALL never trip it, so a fast desktop never goes still;
    a 4×-throttled CPU may.

## Requirement 2 — The common haunted moments, composited only

**User story:** As a player, I want every room to react the same way when I
pick a card, and I want those reactions to be cheap to animate, so the feedback
is consistent, taught once, and never janks the page.

#### Acceptance criteria

1. THE common moments SHALL be driven by the engine from the state it already
   holds — the wrong-pick nonce and the `named`/`honest`/`done` state — and not
   by any per-room code, expressed as a `data-moment` attribute on
   `.room-scene` (`"wrong"` keyed on the wrong-pick nonce so the animation
   restarts on each wrong pick, `"right"` from the moment the room is named
   onward, absent when there is no moment).
2. WHEN the player picks a wrong card, THE common moments SHALL make the candles
   gutter — a brief dip of the warm light lasting about 300 ms — and the ghost
   shake its head once.
3. WHEN the player picks the right card, THE common moments SHALL make the ghost
   stop mid-gesture and unwind upward before it flees, keeping the existing
   ghost-flee timing of 600 ms, and THE page SHALL exhale (Requirement 1.12).
4. THE common moments, the ghost signs and every room's act SHALL animate only
   `transform` and `opacity` — never an animated `filter`, `box-shadow`, or a
   layout property (width, height, top, left, margin, padding). WHERE an effect
   uses one of those today, it SHALL be given an equivalent look with
   `transform`/`opacity` or a static version.
5. WHERE `prefers-reduced-motion: reduce` is active, THE common moments SHALL
   play no gutter, no head-shake and no unwind; the ghost SHALL simply fade.
6. THE common moments SHALL keep every text readable and every control operable
   while they play, never hiding content (the no-fail rule), and a wrong card
   SHALL still cost nothing.
7. WHILE the room is held named for the shared flee (`data-moment='right'`),
   every element inside the live haunted frame EXCEPT the shared `.ghost-wrap`
   (and its descendants) SHALL have its transitions and animations stopped, so
   no control's own transition (for example a size button's `transition:
   background-color`) can be caught moving mid-flight; only the shared unwind
   and flee on `.ghost-wrap` SHALL keep moving. This SHALL be one shared rule,
   not a per-room fix.

## Requirement 3 — Sound wakes only on demand

**User story:** As a player, I want the page to make and hold no audio engine
while the sound is off or I am not looking, so an idle room with the sound off
pays nothing for audio.

#### Acceptance criteria

1. THE `AudioContext` SHALL NOT be created at import, at page load, or on a
   room's mount; it SHALL be created only when the sound is first switched on
   (or when a sound cue is first requested while the sound is on).
2. WHILE the sound is off, THE engine SHALL hold no running `AudioContext`: if
   one was created earlier it SHALL be suspended, and none SHALL be created.
3. WHILE the document is hidden, THE `AudioContext` SHALL be suspended, and it
   SHALL resume when the document is visible again and the sound is on.
4. Turning the sound off SHALL stop every ambience layer and cue at once, as
   today, in addition to suspending the context.

## Requirement 4 — manor-qa learns motion and idle cost

**User story:** As Kiro, I want the QA tools to check that reduced motion stops
animation, that no room shifts its layout, and that an honest room is truly
still, so the atmosphere's look and its new lightness are both verified in a
real browser.

#### Acceptance criteria

1. WHEN `walk_rooms` or `contrast_scan` is called with `reducedMotion: true`,
   THE tool SHALL emulate `prefers-reduced-motion: reduce` through the browser's
   media emulation before the page loads, and SHALL default `reducedMotion` to
   `false`.
2. THE tools SHALL keep their existing names (`walk_rooms`, `contrast_scan`) and
   the existing shape of their results, extending only their JSON Schemas with
   the optional `reducedMotion` boolean.
3. WHEN `walk_rooms` runs a room with `reducedMotion: true`, THE tool SHALL
   additionally verify that no element in the room has a running animation and
   that the "Something stirs here" label is visible.
4. WHEN `walk_rooms` walks a room, THE tool SHALL observe layout-shift entries
   with a buffered `PerformanceObserver`, report the cumulative layout shift
   seen during that room's walk, and fail the room when it exceeds 0.01.
5. WHEN `walk_rooms` reaches a room's honest step (the comparison shown and the
   task done), THE tool SHALL confirm the room requests **no** animation frames
   for about two seconds — the honest page is still — and SHALL fail the room if
   any frame is requested in that window.
6. WHEN `walk_rooms` holds a room named for the shared flee, THE tool SHALL
   confirm that nothing but the shared `.ghost-wrap` flee is still moving inside
   the live haunted frame — including a control's own transition such as a size
   button's `transition: background-color` — and SHALL fail the room if any
   other element is animating or transitioning.
7. THE motion argument parsing and the pass/fail rules SHALL be pure functions
   with `node:test` tests: parsing `reducedMotion`, the CLS pass/fail rule, the
   "animations are at rest" rule, the "idle (no frames requested)" rule, and the
   named-hold offenders rule.
8. THE smoke script SHALL run at least one room with `reducedMotion: true`.

## Requirement 5 — Tests and documentation

**User story:** As a developer, I want the atmosphere's pure parts, the motes
loop's scheduling, the still states, the audio-context lifecycle and the
engine's moment wiring under test, and the specs and steering updated, so the
behaviour is pinned down and documented.

#### Acceptance criteria

1. THE atmosphere's pure parts SHALL be unit-tested with vitest: the frame-rate
   cap (at most 24 fps now), the mote and fog parameters (mote count in 30–60,
   two or three fog bands, motes canvas at DPR 1), the still-pose decision
   (animate vs still), and the adaptive-still decision measured on the timer's
   own cadence (late wakes, slow median frame, or a tick rate below 12 fps →
   still; a fast-desktop cadence → animate).
2. THE motes loop's scheduling and still states SHALL be testable in jsdom: the
   loop wakes on a timer (not an idle rAF), pauses while hidden, draws nothing
   once the room is honest, under reduced motion, or once adaptive still
   engages; adaptive still engages when the simulated wakes arrive late and not
   when they arrive on time (nor on a single late wake).
3. THE glow and fog CSS SHALL be tested where jsdom can read the stylesheet as
   text: the glow and fog animations carry a `steps(...)` timing so the
   compositor updates the glow about 12 times a second and the fog a couple of
   times a second; `will-change` appears only inside the `data-moving` rules (so
   no idle layer stays promoted); the hidden state pauses both; and the fog
   layer is no wider than the scene plus its drift.
4. THE `AudioContext` lifecycle SHALL be tested in jsdom: none is created on a
   room's mount, exactly one is created when the sound is first switched on, it
   is suspended while the sound is off and while the document is hidden, and it
   resumes when the sound is on and the document is visible.
5. THE engine SHALL have a vitest test that a wrong pick sets
   `data-moment="wrong"` on `.room-scene` (changing with the nonce on a second
   wrong pick) and that the right card clears it to `data-moment="right"`.
6. THE shared named-hold rule SHALL be tested where jsdom reads the stylesheet
   as text: during `data-moment='right'` every element inside the live haunted
   frame except `.ghost-wrap` (and its descendants) has its transitions and
   animations stopped, and the rule does not touch the shared flee on
   `.ghost-wrap`.
7. THE `walk_rooms` tool SHALL check that an honest room requests no animation
   frames for about two seconds.
8. THE room-engine spec and the `haunted-ui` steering doc SHALL describe the
   atmosphere layer and the common moments, including the new lightness and
   named-hold rules.
9. ALL existing gates SHALL still pass: `npm test`, `npm run build`,
   `npm run check:rooms`, `npm run check:size`, and `npm run qa:full`.

## Correctness properties

These are the executable invariants the tests pin down; each maps to a
requirement above.

- **P1 Frame budget.** For any elapsed time since the last drawn frame, the
  motes limiter draws a new frame only when at least `1000 / 24` ms have passed,
  so the motes draw rate never exceeds 24 fps (Req 1.5, 5.1).
- **P2 Mote and fog bounds.** The configured mote count is always in `[30, 60]`
  and the fog-band count is 2 or 3, for any viewport size; the motes canvas
  backing store is sized at DPR 1 (Req 1.3, 1.5, 5.1).
- **P3 Breath bound.** The breathing glow's opacity stays within `[0.85, 1]`
  for all phases and completes at most two cycles per second; it is a CSS
  animation, not JavaScript (Req 1.2).
- **P4 Still-pose decision.** The still-pose decision returns "still, do not
  animate" exactly when reduced motion is active, the room is honest, or
  adaptive still has engaged, and "animate" otherwise (Req 1.11, 1.12, 1.13,
  5.1).
- **P5 Adaptive still.** Given the motes' own cadence over the opening window —
  the inter-wake gaps and the frame durations — the adaptive-still rule engages
  (returns "still") exactly when the mean lateness exceeds half the frame
  interval, or the median frame exceeds 50 ms, or the measured tick rate is
  below 12 fps; a fast-desktop cadence (on-time wakes, instant frames) never
  engages (Req 1.13, 5.1).
- **P6 Moment attribute.** `data-moment` is absent while haunted/inspecting/
  picking with no wrong pick, becomes `"wrong"` with a fresh key on each wrong
  pick, and becomes `"right"` from `named` onward (Req 2.1, 5.5).
- **P7 CLS rule.** The CLS pass/fail rule flags a room exactly when its summed
  layout-shift value exceeds 0.01 (Req 4.4, 4.7).
- **P8 Animations at rest.** The "animations are at rest" rule passes exactly
  when the set of animations is empty or every animation's play state is
  finished, paused or idle (Req 4.3, 4.7).
- **P9 Idle rule.** The "idle" rule passes exactly when the number of animation
  frames requested in the sampled window is zero (Req 4.5, 4.7).
- **P10 reducedMotion parsing.** The argument parser reads `reducedMotion` as a
  boolean, defaulting to `false` when absent or non-boolean (Req 4.1, 4.7).
- **P11 Named-hold offenders.** The named-hold rule returns the offenders —
  every running animation/transition inside the live haunted frame whose target
  is not `.ghost-wrap` and not inside it — and passes a room exactly when that
  list is empty (Req 2.7, 4.6, 4.7).
