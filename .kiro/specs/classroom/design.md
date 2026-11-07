# Design — The classroom page

## Overview

The classroom page is a new route, `#/teach`, rendering a static document for
teachers. It reuses the manor frame, tokens and fonts; it adds no image and no
font. It is code-split like the ending: `App` loads it with a dynamic
`import('./ClassroomPage')` only when the teach route is active, so it never
enters the initial bundle.

The twelve checklist lines and the six wandering ghosts are the ending's own
data. To make drift impossible, that data moves into a new shared module,
`src/app/checklist.ts`, which both `EndingPage` and `ClassroomPage` import. The
module keeps the exact line text the ending already uses and adds, per
checklist item, the pattern name needed for the classroom brackets.

## Architecture

### Shared data module: `src/app/checklist.ts`

Exports:

- `interface ChecklistItem { line: string; room: number; title: string; pattern: string; }`
- `const CHECKLIST: ReadonlyArray<ChecklistItem>` — the twelve items, line text
  identical to today's ending, each gaining a `pattern` field
  (e.g. `'visual interference'`).
- `interface WanderingGhost { name: string; desc: string; }`
- `const WANDERING: ReadonlyArray<WanderingGhost>` — the six items, unchanged.

`EndingPage` deletes its local `CHECKLIST`/`WANDERING` and imports them from
here. `EndingPage` already renders only `item.line`, `item.room`, `item.title`
and the wandering fields, so the added `pattern` field does not change its
output. The two interfaces move with the data; `EndingPage` keeps behaving
exactly as before (its tests are unchanged and must still pass).

The pattern names, by room, come from `product.md`:

1 visual interference · 2 trick wording · 3 confirmshaming ·
4 hidden subscription · 5 fake urgency · 6 fake scarcity ·
7 fake social proof · 8 sneaking · 9 hidden costs · 10 nagging ·
11 preselection · 12 hard to cancel.

The bracket on each printable line reads `(The Foyer: visual interference)` —
`(${title}: ${pattern})` — matching the product copy exactly.

### Route wiring: `src/app/App.tsx`

- `Route` gains `'teach'`.
- `parseHash` gains `if (hash === '/teach') return { route: 'teach', room: 1 };`
  placed beside the other static routes; every other branch is untouched.
- A `Classroom` component state and a `useEffect` mirror the ending's lazy load:
  when `route === 'teach'`, `import('./ClassroomPage')` sets the component; a
  pending/ error scene reuses the same `room-scene room-scene-pending` fallback
  the ending uses, so there is no layout shift and no new markup pattern.
- In the render switch, a `route === 'teach'` branch renders `<Classroom />`
  (or the pending scene), mirroring the `end` branch.

### The page: `src/app/ClassroomPage.tsx` + `classroom.css`

A single default-export component. Structure:

- `div.room-scene.classroom` with the aria-hidden `.room` backdrop (same as the
  ending), then a `.manor-frame.classroom-card` holding the document.
- `h1` "Teaching with Dark Pattern Manor", `tabIndex={-1}`, focused on entry via
  a ref in a `useEffect`, matching the ending and room pattern.
- The intro prose: three paragraphs (the lead with bold lead-in, "Good for",
  "Why it matters") written as product copy. Bold lead-ins use `<strong>`.
- A "Print this page" button, `type="button"`, `onClick={() => window.print()}`,
  class `classroom-print` with `data-print-hide` so the print stylesheet hides
  it.
- `section` "A 45-minute lesson" (`h2`): a `<table>` with a header row
  (Time / What happens) and four body rows; then the "Shorter" and "Longer"
  paragraphs.
- `section` "Six questions for discussion" (`h2`): an ordered list of six items,
  each with a bold lead-in.
- `section` "Twelve rules for the real web (printable)" (`h2`), class
  `classroom-checklist-section` (the one that gets `break-before: page` in
  print): the italic sub-line, an ordered list built from `CHECKLIST` —
  `{item.line} ({item.title}: {item.pattern})` — then the "Six more ghosts to
  watch for" paragraph built from `WANDERING` names.
- `section` "Sources and further reading" (`h2`): a list of five readings, each
  a `<cite>`-styled entry with one external link; then the closing italic line.

All external links use a small helper prop set: `target="_blank"`,
`rel="noopener noreferrer"`. Internal links (none needed in the body besides the
nav helpers already elsewhere) stay plain `#/…`.

### Links into the page

- `EndingPage`: add a "For teachers" link to `#/teach` near the back link.
- `ShareCard`: the share text heading links to `#/teach`. The share *sentence*
  stays the product text; it is wrapped in an anchor to `#/teach` so a reader of
  the card can reach the teaching page. The shared `SHARE_TEXT` string is
  unchanged (so the Web Share payload is unchanged); only the rendered heading
  gains the link.
- `TitleScreen`: a small footer link under the actions, `#/teach`, labelled
  "For teachers".

## Styling: `classroom.css`

Mirrors `ending.css`: frame, tokens and fonts only; no raster image. Key rules:

- `.classroom .classroom-card { max-width: 900px; }` — a readable measure.
- Body text in `--font-ui` at the 16px base, headings in `--font-display` at
  22px+ (`--font-size-xl`/`3xl`), colours `--ink` on `--parchment`; all meet AA.
- The lesson table: full width, `border-collapse`, parchment-edge rules, the
  Time column narrow; readable at 412px (the table scrolls inside a
  `overflow-x:auto` wrapper only if needed, but the two-column layout fits).
- Links in body/sources: `--ink` with underline, `--bronze` on hover/focus,
  3px candle/ink focus ring, matching the ending's link treatment.
- Lists: ordered lists keep their numbering; `break-inside: avoid` on items.

### Print stylesheet (`@media print`)

- `.room`, `.title-vignette`, the atmosphere canvas and the sound toggle: hidden
  (`display: none`). Backdrop and candles gone.
- `.manor-frame.classroom-card`: no border image, white background, black
  (`#000`) text, no shadow, full width, no margin.
- `*`: `animation: none; transition: none;` within the page scope.
- `[data-print-hide]` (the print button, the sound toggle): `display: none`.
- `.classroom-checklist-section { break-before: page; }`.
- External links print their URL: `a[href^="http"]::after { content: " (" attr(href) ")"; }`
  so the destination appears after the link text on paper.
- Internal `#/…` links do not print their href (the rule targets `http` only).

## Performance and accessibility

- Code-split: the page and its CSS travel in the dynamically-imported chunk, so
  the initial bundle is unchanged and `check:size` passes.
- No new font: only `--font-display` and `--font-ui` are used.
- No layout shift: the pending scene reserves the `room-scene` box exactly as
  the ending route does; the page itself is static content in a frame.
- Reduced motion: the page animates nothing; the shared atmosphere already
  honours `prefers-reduced-motion`, and print disables all motion anyway.
- Privacy: no network calls, no storage writes, no analytics. External links are
  the only outbound references and are user-initiated.
- axe-core: one `h1`, ordered headings, a real `<table>` with a header row,
  real lists, buttons and links with discernible text — a clean tree.

## Testing: `ClassroomPage.test.tsx`

- Renders the single `h1` and the four `h2`s in the documented order.
- The twelve printable lines equal `EndingPage`'s twelve lines: assert each
  printable item contains `CHECKLIST[i].line`, and that the list rendered here
  matches a reference render of `EndingPage`'s checklist lines (both pull from
  the shared module, so they are equal by construction; the test proves it).
- The print button calls `window.print`: spy on `window.print`, click the
  button, expect one call.
- Every external link has `target="_blank"` and `rel="noopener noreferrer"`.
- axe-core reports zero violations.

`App.test.tsx` gains a `parseHash('#/teach')` assertion and a route-render
assertion; the existing `parseHash` cases stay. `EndingPage.test.tsx` and
`ShareCard.test.tsx` keep passing unchanged (the share text string and the
ending's output are unchanged); `ShareCard.test.tsx` and `TitleScreen.test.tsx`
may gain a small assertion for the new `#/teach` link.
