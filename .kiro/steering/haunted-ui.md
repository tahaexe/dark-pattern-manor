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

One shared layer (src/ui/Atmosphere.tsx) draws the living mood on the room's backdrop only: a slow drifting fog and 30–60 dust motes on a single aria-hidden canvas inside the `.room` layer, under every text, card and control — it never paints over them, and contrast_scan must stay at 0 flags. Warm candlelight breathes on the walls, its opacity moving between 1 and 0.85 at most twice a second (the flicker limit, never a flash). It is cheap: it starts after the first paint, draws at most 30 fps, pauses when the tab is hidden, caps the device pixel ratio at 2, adds no dependency, and stops on unmount with no layout shift. With prefers-reduced-motion: reduce it runs no animation and shows one still frame. When the ghost flees the page exhales once (the fog thins, the glow rises) over about a second, then stays calm.

## Common moments

Two haunted moments are the same in every room and are driven by the engine (from the wrong-pick nonce and the named state via a data attribute on `.room-scene`), not by each room: a wrong card makes the candles gutter (a brief dip, ~300 ms) and the ghost shake its head once; the right card makes the ghost stop mid-gesture and unwind upward before it flees (keeping the 600 ms flee) and the page exhale. With prefers-reduced-motion: reduce there is no gutter, no shake and no unwind — the ghost simply fades. Transforms and opacity only; nothing hides content and a wrong card still costs nothing.

## Look: Candlelit ink

**Mood:** A candlelit Victorian manor drawn in ink—dark aubergine wood, warm amber candlelight, parchment and antique gold, ghosts as thin white ink lines.

**Cracks and distortion:** Live only on the possessed element. The frame, task bar, cards, Ghost Guide and honest twin are always whole; nothing in the interface looks broken. When the ghost flees, its cracks and mist leave with it.

**Contrast:** The trick never lowers contrast. All text meets WCAG AA in both states; a haunted page lies with size, weight, placement, wording, defaults, timing and motion, never with unreadable text.

**Fonts:** Cormorant Garamond 600/700 for room names, card names and the Guide title (22px and up only); Atkinson Hyperlegible Next 400/700 for everything else (16px base, line height 1.5). Both SIL Open Font License, self-hosted through @fontsource.

**Colours:** Come only from src/styles/tokens.css. Focus: a 3px candle outline on dark surfaces; on parchment a 3px ink outline with a soft candle glow outside it.

**Motion:** Hover 120ms, card turn 200ms, ghost flee 600ms, honest split 400ms, ease-out. The flicker changes opacity between 1 and 0.85 at most twice a second. With prefers-reduced-motion: reduce, every animation and transition is off and the possessed element shows a static dashed candle outline and a small visible label "Something stirs here".

**One raster image:** the room's painted backdrop; no text ever sits on it. Frames, ghosts, card symbols, candles and every text are CSS and inline SVG.
