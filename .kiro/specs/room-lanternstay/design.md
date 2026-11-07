# Design — Room 7: The Portrait Gallery (brand Lanternstay)

> Copied from `.kiro/specs/room-template/` and filled for Room 7. This room
> plugs into the Room Engine; see `.kiro/specs/room-engine/design.md` for the
> engine contract.

## Files

All under `src/rooms/lanternstay/`:

- `room.ts` — the `RoomData` object (imports `./Haunted`, `./Honest`, `./room.css`).
- `Haunted.tsx` — the possessed brand page; the `HauntedProps` include
  `onSelectPossessed`, `onSelectOther`, `signsActive`, `reducedMotion` and an
  optional `preview` flag (true for the static "before" side of the split, in
  which the component is non-interactive and omits the possessed id).
- `Honest.tsx` — the honest twin; `HonestProps.onCompleteTask` fires the single
  task action.
- `room.css` — all room styling, confining cracks and mist to the possessed
  watchers badge; the frame and twin stay whole.
- `lanternstay.test.tsx` — the room's own test (see tasks).

Register the room in `src/engine/registry.ts`:

```ts
lanternstay: () => import('../rooms/lanternstay/room'),
```

## RoomData

| Field | Value |
| --- | --- |
| id | 7 |
| slug | `lanternstay` |
| name | The Portrait Gallery |
| brand | Lanternstay |
| brandKind | booking site for haunted inns |
| domain | `lanternstay.manor` |
| pattern | Fake social proof |
| task | choose a room by real reviews |
| possessedId | `gallery-watchers` |
| correct card | Fake social proof (LAST in the array) |
| relative card | Fake scarcity (a relative of Fake social proof) + hint |
| different card | Disguised ads (neither Fake social proof nor a relative) + hint |

Against the engine's `RELATIVE_PAIRS`: `['Fake scarcity', 'Fake social proof']`
is a declared pair, so `areRelatives('Fake social proof', 'Fake scarcity') ===
true`. Disguised ads is paired only with Visual interference, so
`areRelatives('Fake social proof', 'Disguised ads') === false`.

The correct card is authored LAST (Room 5 first, Room 6 middle, Room 7 last),
so the correct-card position is not constant across rooms.

## The possessed element and ghost signs

The haunted page shows two rooms of one inn side by side — two cards. The first,
**The Moonlit Suite**, carries the possessed watchers badge and three five-star
reviews with no dates and first names only ("Amazing!!! — Sam"). The second,
**The Ivy Room**, has fewer stars but two dated reviews marked "Stayed in
October 2026".

The possessed element is the single watchers **badge** on the first card — one
control that behaves like Fake social proof. It reads "38 people are looking at
this room right now": a **static** number — it never ticks, and it is **not** a
live region. The crowd itself is fake, and the glowing reviews are undated and
first-name-only, so a choice feels popular and safe when it is not.

The badge is a real `<button>` so it is keyboard-reachable and has an accessible
name. It carries **no `aria-label`**, so its accessible name is the visible text
itself (Label in Name, WCAG 2.5.3). It is **not a live region**: no `aria-live`
and no announcing `role`.

Star ratings are text plus an accessible label ("5 out of 5 stars"), not images
alone: a visual row of star glyphs marked `aria-hidden` sits beside a
`.visually-hidden` label that screen readers read, so the rating is perceivable
to every player in both variants.

This room needs no per-element state (the badge is a fixed static number and the
cards are static), so a plain function component is enough; there is no hook
state to hide from the `check:rooms` bare renderer. (Where a room needs state it
follows Room 5's way — a class component behind a thin function component; this
room does not.)

Reuse the manor look (tokens, frame, card classes) and the ghost/mist/flicker
approach from Rooms 1–6 (`src/rooms/gravemoor-gazette/room.css` …
`src/rooms/shroudery/room.css`): a ~120×140 ghost drawn in thin white ink
(stroke `--ghost` at 90%, fill at 18%) peeking beside the badge without covering
its text, a review or a button, soft mist drifting around it, flicker between
opacity 1 and 0.85 at most twice a second. Under `prefers-reduced-motion`, show
the static dashed candle outline and the room's own `.stirs-label` "Something
stirs here" (shown once, inside the room's panel), and run no animation.

The ghost is anchored to the possessed **watchers badge** itself, so it peeks
just right of it, vertically centred at its height, drawn whole (the card
reserves room so its hem is never cut), and never covers a button, a review or
the badge's text. At 1920×1080 the whole page sits in the first screen; under
600px the two cards stack, a smaller ghost (about 72×84) rises from a strip
reserved under the badge, so it never covers text and there is no horizontal
overflow at 412px wide. No fixed or minimum heights that leave empty boxes on
mobile.

## The ghost's act (the watchers are ghost heads)

The ghost performs the trick rather than only bobbing: beside the possessed
watchers badge, the "watchers" are a row of little ghost heads that **pop in and
out**, so the crowd you are told about is literally made of ghosts (Fake social
proof). The act is purely decorative — it renders inside the aria-hidden
`.ghost-signs` anchor, so it adds nothing to the badge's accessible name (the
counter text stays the name) or to any live announcement. It reserves its own
fixed box (`.watcher-heads`, about 132×30px, heads absolutely positioned) and
uses transforms and opacity only, so it causes **no layout shift**; one pop
cycle lasts **5 s** (≥ 4 s); it sets `pointer-events: none` so it never blocks
input; and the heads sit above the badge over empty space (z-index 1) while the
label text stays at z-index 3, so the act never covers the badge's text, a
review or a button.

When the ghost is named the act **freezes**: the engine sets
`data-moment='right'` on `.room-scene` (and `data-fleeing` during the hold), and
this room's CSS stops every act element — and the room's mist and badge flicker
— with `.room-scene[data-moment='right'] … { animation: none !important; }`, so
nothing keeps moving through the shared unwind and 600 ms flee. The shared
unwind/flee and the common moments stay owned by `src/styles/atmosphere.css`;
this room adds no flee of its own. The act is **absent** from the honest twin
and from the comparison's haunted **preview** (it lives inside `.ghost-signs`,
which renders only when `signsActive && !preview`).

Under `prefers-reduced-motion` the heads do not pop: they hold a calm still pose
(no transform, a steady low opacity) and a short visible caption **"who are
they?"** is shown beside the ghost, kept alongside the room's own "Something
stirs here" label — so the still pose asks the question the motion would
otherwise pose.

## The pattern rule (variant-specific)

Fake social proof lives in the watchers badge and the undated, first-name-only
five-star reviews on the first card. On the **haunted** side the first card
shows the badge "38 people are looking at this room right now" and three
five-star reviews that carry **no date** (first names only). On the **honest**
side there is **no** watchers badge (`#gallery-watchers` is absent) and **every**
review is dated and marked with its stay ("Stayed in October 2026"), so there is
no fake crowd and no undated praise — choosing a room by real reviews is calm and
takes one click.

The room's test asserts this difference holds on haunted (the badge is present
and static, and the first card has undated reviews) and is gone on honest (no
badge anywhere; every review carries a date), so a test that passes on both
variants is broken.

## Ghost Guide

Word for word from the task brief (the legal lines are not rewritten):

- Definition (two sentences): "38 people are looking at this room" and glowing
  reviews no guest ever wrote make a choice feel popular and safe. The crowd is
  made up.
- Where you meet it: hotel and travel sites, shops with "someone just bought
  this" pop-ups, review sections.
- US: The FTC report lists "false activity messages", with the example "24 other
  people are viewing this listing" (Appendix A; section I). An FTC rule in force
  since October 2024 bans fake consumer reviews and testimonials and fake
  social-media indicators (16 CFR Part 465, in force 21 October 2024).
- EU: Submitting or commissioning fake reviews, or claiming reviews come from
  real customers without checking, is unfair in all circumstances (Unfair
  Commercial Practices Directive, Annex I, points 23b and 23c).
- Protection tip: Trust dated reviews tied to real stays or purchases; ignore
  "people are looking" counters.
- Sources: the FTC staff report "Bringing Dark Patterns to Light" (ftc.gov, the
  same PDF Room 1 links) and the Unfair Commercial Practices Directive,
  Directive 2005/29/EC, on `eur-lex.europa.eu` (the same link Rooms 5 and 6
  use).

The legal lines are carried verbatim; if a validator limit would block either,
stop and report it rather than shortening it. (The 25-word quoted-passage check
in `check-rooms.mjs` counts only text inside double quotes, and only in
`definition`, `whereYouMeetIt` and `tip`. The longest quoted fragment in those
three fields is "38 people are looking at this room" — 7 words — so it passes.
The US and EU wording lives in the `sourceLabel` fields, which the quote check
does not scan.)
