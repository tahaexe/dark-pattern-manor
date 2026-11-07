# Requirements — The classroom page

## Introduction

A page for teachers who want to use Dark Pattern Manor in a lesson. It lives at
route `#/teach`, is reachable without finishing the game (the teacher may not
play all twelve rooms first), and is linked from the ending ("For teachers"),
from the share card's text, and from a small footer link on the title screen.

Its words are final product copy. The only parts that are not hand-written on
the page are the twelve checklist lines and the six wandering ghosts: those
come from the ending's own data, so the two pages can never drift. To guarantee
that, `CHECKLIST` and `WANDERING` are exported from one module and imported by
both `EndingPage` and the classroom page; the room and pattern names in
brackets come from that same data.

The page is a plain document of prose, a lesson table, a discussion list, the
printable checklist, the wandering ghosts, and a sources list of external
links. It carries a "Print this page" button and a print stylesheet so a
teacher can hand it out on paper. It obeys the same rules as every other page:
AA contrast, full keyboard and screen-reader use, headings in order, reduced
motion respected, nothing tracked, Lighthouse-friendly (no layout shift, no new
font, code-split like the other routes), and it stays inside the bundle budget.

## Requirement 1 — The route

**User story:** As a teacher, I want a stable address for the teaching page so
that I can open and share it directly.

#### Acceptance criteria

1. WHEN the location hash is `#/teach` THEN `parseHash` SHALL return the route
   that renders the classroom page, with no change to any existing route.
2. WHEN the classroom route is active THEN the app SHALL render the classroom
   page.
3. WHEN the classroom page is entered THEN its code SHALL load through a dynamic
   import, the same way the ending chunk does, so it never weighs on the initial
   bundle.
4. WHEN a visitor opens `#/teach` without having finished the game THEN the full
   classroom page SHALL render (it is never gated on progress).

#### Correctness properties

- `parseHash('#/teach')` returns `{ route: 'teach', room: 1 }`.
- `parseHash` still returns exactly the previous values for `''`, `'#/'`,
  `'#/look'`, `'#/end'`, `'#/room/1'`, `'#/room/12'`, and `null` for
  `'#/room/13'` and any unknown hash.

## Requirement 2 — One source for the checklist and the wandering ghosts

**User story:** As a maintainer, I want the checklist and the wandering ghosts
to live in exactly one place so that the ending and the classroom page can never
disagree.

#### Acceptance criteria

1. The twelve checklist items (line, room number, room title) and the six
   wandering ghosts (name, description) SHALL be defined once, in a single
   module, and exported from it.
2. `EndingPage` SHALL import `CHECKLIST` and `WANDERING` from that module rather
   than defining its own copies.
3. The classroom page SHALL import the same `CHECKLIST` and `WANDERING`.
4. The pattern name in each printable line's bracket SHALL come from the shared
   data, not be typed a second time on the page.

#### Correctness properties

- For every index `i`, the checklist line rendered on the classroom page equals
  `CHECKLIST[i].line`, and the twelve lines rendered on the classroom page equal
  the twelve lines rendered by `EndingPage`, in the same order.
- The six wandering-ghost names and descriptions rendered on the classroom page
  equal `WANDERING`, in order.
- The shared module adds the room title and pattern name needed for the
  classroom brackets without changing the lines the ending already shows.

## Requirement 3 — The page content, in order

**User story:** As a teacher, I want the page laid out as written so that it
reads as a usable lesson plan.

#### Acceptance criteria

1. The page SHALL have exactly one `h1`: "Teaching with Dark Pattern Manor".
2. The page SHALL render, in this order, the section headings: "A 45-minute
   lesson", "Six questions for discussion", "Twelve rules for the real web
   (printable)", and "Sources and further reading", each as an `h2`.
3. The headings SHALL form a correct outline (one `h1`, then `h2`s; no level is
   skipped).
4. The lesson section SHALL present the four-row timetable (5/20/10/10 minutes)
   and the shorter and longer variants, with the product copy word for word.
5. The discussion section SHALL present the six numbered questions, word for
   word.
6. The printable section SHALL present the twelve checklist lines, each followed
   by its room and pattern name in brackets drawn from the shared data, then the
   "Six more ghosts to watch for" line.
7. The sources section SHALL present the five readings and the closing italic
   line, word for word.

#### Correctness properties

- `getAllByRole('heading', { level: 1 })` has length 1 and reads "Teaching with
  Dark Pattern Manor".
- The `h2` headings appear in the exact documented order.
- Each printable line `i` on the page contains `CHECKLIST[i].line` and a bracket
  naming `CHECKLIST[i].title` and that room's pattern.

## Requirement 4 — Print

**User story:** As a teacher, I want to print the page cleanly so that I can
hand it out.

#### Acceptance criteria

1. The page SHALL offer a "Print this page" button that calls `window.print()`.
2. A print stylesheet SHALL render the page as ink on white with no backdrop, no
   candles, and no motion.
3. The printable checklist SHALL start on a new page (`break-before: page`).
4. In print, each external link SHALL show its URL after the link text.
5. The print button itself SHALL NOT appear in the printed output.

#### Correctness properties

- Activating the print button calls `window.print` exactly once.
- The print rules live in a `@media print` block and change colours to ink on
  white, hide the backdrop/atmosphere, and set `break-before: page` on the
  checklist section.

## Requirement 5 — External links

**User story:** As a teacher, I want the source links to open safely in a new
tab so that I keep my place on the lesson page.

#### Acceptance criteria

1. Every external (http/https) link SHALL open in a new tab (`target="_blank"`).
2. Every external link SHALL carry `rel="noopener noreferrer"`.
3. Internal navigation (the `#/…` links back into the game) SHALL remain plain
   in-page hash links.

#### Correctness properties

- Every anchor whose `href` starts with `http` has `target="_blank"` and
  `rel="noopener noreferrer"`.
- No `#/…` link carries `target="_blank"`.

## Requirement 6 — Links into the page

**User story:** As a teacher or player, I want to reach the teaching page from
the places a teacher would look.

#### Acceptance criteria

1. The completed ending SHALL carry a "For teachers" link to `#/teach`.
2. The share card's text SHALL link to `#/teach`.
3. The title screen SHALL carry a small footer link to `#/teach`.

#### Correctness properties

- The ending renders an anchor with `href="#/teach"`.
- The share card renders an anchor with `href="#/teach"`.
- The title screen renders an anchor with `href="#/teach"`.

## Requirement 7 — Accessibility, privacy and performance

**User story:** As any visitor, I want the teaching page to meet the same
standards as the rest of the manor.

#### Acceptance criteria

1. The rendered page SHALL report zero axe-core violations.
2. All text SHALL meet WCAG AA contrast in screen and print.
3. The page SHALL be fully usable by keyboard and screen reader.
4. WHERE `prefers-reduced-motion: reduce` is set THEN the page SHALL run no
   animation (it adds none of its own regardless).
5. The page SHALL set no cookies, make no third-party requests at load, and add
   no analytics.
6. The page SHALL add no new web font and SHALL cause no layout shift.
7. The page's code SHALL be split into its own chunk, and the initial bundle
   SHALL stay within the `check:size` limit.
8. The rooms SHALL continue to pass `npm run qa:full`.

#### Correctness properties

- `axe.run` on the rendered page returns zero violations.
- The page uses only existing font families from tokens; it imports no font.
- The classroom page is reached through a dynamic import in `App`, so it is not
  part of the initial bundle; `check:size` passes.

## Requirement 8 — Tests

**User story:** As a maintainer, I want the page covered so that its promises
hold over time.

#### Acceptance criteria

1. A test SHALL render every heading in order.
2. A test SHALL assert the twelve printable lines equal `EndingPage`'s twelve
   lines (both from the shared data).
3. A test SHALL assert the print button calls `window.print`.
4. A test SHALL assert every external link has `rel="noopener noreferrer"` (and
   `target="_blank"`).
5. A test SHALL assert axe-core finds no violations.
