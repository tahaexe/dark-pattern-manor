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

## Look: Candlelit ink

**Mood:** A candlelit Victorian manor drawn in ink—dark aubergine wood, warm amber candlelight, parchment and antique gold, ghosts as thin white ink lines.

**Cracks and distortion:** Live only on the possessed element. The frame, task bar, cards, Ghost Guide and honest twin are always whole; nothing in the interface looks broken. When the ghost flees, its cracks and mist leave with it.

**Contrast:** The trick never lowers contrast. All text meets WCAG AA in both states; a haunted page lies with size, weight, placement, wording, defaults, timing and motion, never with unreadable text.

**Fonts:** Cormorant Garamond 600/700 for room names, card names and the Guide title (22px and up only); Atkinson Hyperlegible Next 400/700 for everything else (16px base, line height 1.5). Both SIL Open Font License, self-hosted through @fontsource.

**Colours:** Come only from src/styles/tokens.css. Focus: a 3px candle outline on dark surfaces; on parchment a 3px ink outline with a soft candle glow outside it.

**Motion:** Hover 120ms, card turn 200ms, ghost flee 600ms, honest split 400ms, ease-out. The flicker changes opacity between 1 and 0.85 at most twice a second. With prefers-reduced-motion: reduce, every animation and transition is off and the possessed element shows a static dashed candle outline and a small visible label "Something stirs here".

**One raster image:** the room's painted backdrop; no text ever sits on it. Frames, ghosts, card symbols, candles and every text are CSS and inline SVG.
