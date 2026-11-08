# Haunted UI rules

## Fiction and honesty

Every brand is fictional: no real brand's name stem, colours or logo shape; no real people, products or prices. The honest twin of every room is a real best practice, not a joke.

## No fail state

There is no fail state. The haunting is the lesson, never decoration that hides content. A wrong spell card costs nothing: the light flickers and a whispered hint names the difference.

## Accessibility

- The whole game is playable by keyboard and screen reader. Players select the possessed element by pointer, keyboard or screen reader.
- prefers-reduced-motion stops flicker and mist.
- All text meets WCAG AA contrast in both states (haunted and honest).

## Ghost interaction

The possessed element gives itself away with small signs: flicker, a cold breath, pushing the cursor. Three spell cards: one right, one close relative, one clearly different.

When the ghost flees, the page splits into the haunted version and its honest twin with a Before/After slider; the task then takes one click. A Ghost Guide card opens: two-sentence definition, where you meet it, a US line and an EU line with sources, one protection tip.

## Atmosphere

One shared layer (src/ui/Atmosphere.tsx) draws the living mood on the room's backdrop only — a slow drifting fog, 30–60 dust motes caught in candlelight, and a warm glow that breathes on the walls — inside the aria-hidden `.room` layer, under every text, card and control. It never paints over them, causes no layout shift, and contrast_scan must stay at 0 flags.

It must be **light to run** — for the renderer AND the compositor. An idle room costs a fraction of a core, not a whole one, and nothing should recomposite at the display's refresh rate (headless Chrome composites in software, so a CSS animation that changes opacity or transform every frame is paid on the CPU each frame):

- The breathing **glow** is a CSS layer whose opacity is a CSS `@keyframes` animation between 1 and 0.85 at most twice a second (the flicker limit, never a flash). No per-frame JavaScript drives it, and its timing is **stepped** (`steps(...)`) so the compositor updates the opacity at most about 24 times a second, not once per display frame.
- The **fog** is drawn **once** (to an offscreen canvas or an image) and drifted by a CSS `transform`; nothing redraws it per frame. The drift timing is **stepped** too, so the big layer recomposites only a couple of times a second, and the moving layer is **no wider than the scene plus its own drift** (not twice the scene), so each recomposite copies less area.
- The **motes** run on a small canvas at device-pixel-ratio 1, at most **24 frames a second**, woken by a timer (never an always-on 60 Hz requestAnimationFrame loop), and stop while the tab is hidden. They start only after the first paint and tear down on unmount. No dependency is added.
- While the tab is **hidden** the glow and fog CSS animations are paused as well (the component sets a `data-hidden` state on visibilitychange), not only the motes loop, so a backgrounded room composites nothing. They resume when the tab is visible again and the room is still haunted.
- When the room turns **honest** (the comparison shown and the task done) the page exhales once over about a second (the fog thins, the glow rises) and then **every** atmosphere animation stops — CSS and canvas — so the honest page is calm and requests no animation frames.
- **Adaptive still:** if the first ~2 seconds of a visit run below 20 fps, the atmosphere switches to its still pose for that visit (the same pose as reduced motion) and says nothing.
- With prefers-reduced-motion: reduce it runs no animation and shows one still frame.

## Common moments

Two haunted moments are the same in every room and are driven by the engine (from the wrong-pick nonce and the named state via a data attribute on `.room-scene`), not by each room: a wrong card makes the candles gutter (a brief dip, ~300 ms) and the ghost shake its head once; the right card makes the ghost stop mid-gesture and unwind upward before it flees (keeping the 600 ms flee) and the page exhale. With prefers-reduced-motion: reduce there is no gutter, no shake and no unwind — the ghost simply fades.

While the room is held named for the shared flee (`data-moment='right'`), **every** element inside the live haunted frame except the shared `.ghost-wrap` (and its descendants) is held still: one shared rule in atmosphere.css (`.room-scene[data-moment='right'] .manor-frame *:not(.ghost-wrap):not(.ghost-wrap *) { transition: none; animation: none; }`) stops not only the possessed element's own transitions but any control's — for example a size button's `transition: background-color` — so nothing but the shared unwind and flee can be caught moving mid-hold. It is one shared rule, not a per-room fix, scoped to the right moment only.

Every ghost sign and every room's act animates **transform and opacity only** — never an animated `filter`, `box-shadow`, `text-shadow` or layout property (width, height, top, left, margin, padding). Where an effect wants a glow or a blur, bake it into a gradient or a static drop-shadow and move or fade that with transform/opacity. Nothing hides content and a wrong card still costs nothing.

## Sound

Sound is subtle atmosphere, never a scare, and is synthesized entirely in code with the Web Audio API — no audio files, no network — through one master gain held quiet (the whole ambience about -20 dBFS, the cues about -12 dBFS, so nothing clips). While a room is haunted the ambience layers a room tone, wind through the hall, a distant clock and the house settling, plus one quiet voice per room chosen by its slug; three fuller cues mark the wrong card (a candle gutter under the whisper), the right card (the ghost's unwinding sigh into the flee) and the honest page (a warm resolved chord). No jump scares, no screams, no sudden loud sounds; every layer is quiet and slowly varying so the bed never loops audibly.

The AudioContext is **never** created at import, at load, or merely on a room's mount: it is born only once sound is armed by a real gesture (the Sound toggle, or the first pointer/key after a room asks to play), and it is **suspended** while the sound is off or the tab is hidden. So an idle or backgrounded room with the sound untouched holds no running audio engine. With prefers-reduced-motion the sound keeps playing — sound is not motion. The game is fully playable in silence, and turning Sound off stops everything at once.

## Look: Candlelit ink

**Mood:** A candlelit Victorian manor drawn in ink—dark aubergine wood, warm amber candlelight, parchment and antique gold, ghosts as thin white ink lines.

**Cracks and distortion:** Live only on the possessed element. The frame, task bar, cards, Ghost Guide and honest twin are always whole; nothing in the interface looks broken. When the ghost flees, its cracks and mist leave with it.

**Contrast:** The trick never lowers contrast. All text meets WCAG AA in both states; a haunted page lies with size, weight, placement, wording, defaults, timing and motion, never with unreadable text.

**Fonts:** Cormorant Garamond 600/700 for room names, card names and the Guide title (22px and up only); Atkinson Hyperlegible Next 400/700 for everything else (16px base, line height 1.5). Both SIL Open Font License, self-hosted through @fontsource.

**Colours:** Come only from src/styles/tokens.css. Focus: a 3px candle outline on dark surfaces; on parchment a 3px ink outline with a soft candle glow outside it.

**Motion:** Hover 120ms, card turn 200ms, ghost flee 600ms, honest split 400ms, ease-out. The flicker changes opacity between 1 and 0.85 at most twice a second. Animate transform and opacity only — never filter, box-shadow, text-shadow or layout. With prefers-reduced-motion: reduce, every animation and transition is off and the possessed element shows a static dashed candle outline and a small visible label "Something stirs here".

**One raster image:** the room's painted backdrop; no text ever sits on it. Frames, ghosts, card symbols, candles and every text are CSS and inline SVG.
