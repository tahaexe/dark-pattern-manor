# Design — Room 8: The Pantry (brand Mothmilk Market)

> Copied from `.kiro/specs/room-template/` and filled for Room 8. This room
> plugs into the Room Engine; see `.kiro/specs/room-engine/design.md` for the
> engine contract.

## Files

All under `src/rooms/mothmilk/`:

- `room.ts` — the `RoomData` object (imports `./Haunted`, `./Honest`, `./room.css`).
- `Haunted.tsx` — the possessed brand page; the `HauntedProps` include
  `onSelectPossessed`, `onSelectOther`, `signsActive`, `reducedMotion` and an
  optional `preview` flag (true for the static "before" side of the split, in
  which the component is non-interactive and omits the possessed id).
- `Honest.tsx` — the honest twin; `HonestProps.onCompleteTask` fires the single
  task action.
- `room.css` — all room styling, confining cracks and mist to the possessed
  sneaked basket line; the frame and twin stay whole.
- `mothmilk.test.tsx` — the room's own test (see tasks).

Register the room in `src/engine/registry.ts`:

```ts
mothmilk: () => import('../rooms/mothmilk/room'),
```

## RoomData

| Field | Value |
| --- | --- |
| id | 8 |
| slug | `mothmilk` |
| name | The Pantry |
| brand | Mothmilk Market |
| brandKind | night grocer for the household's ghosts |
| domain | `mothmilk.manor` |
| pattern | Sneaking |
| task | pay only for what you picked |
| possessedId | `pantry-sneaked-line` |
| correct card | Sneaking (FIRST in the array) |
| relative card | Preselection (a relative of Sneaking) + hint |
| different card | Confirmshaming (neither Sneaking nor a relative) + hint |

Against the engine's `RELATIVE_PAIRS`: `['Sneaking', 'Preselection']` is a
declared pair, so `areRelatives('Sneaking', 'Preselection') === true`.
Confirmshaming is paired only with Nagging, so `areRelatives('Sneaking',
'Confirmshaming') === false`.

The correct card is authored FIRST (Room 5 first, Room 6 middle, Room 7 last,
Room 8 first again — the correct-card position is not constant across rooms,
which is all `check:rooms` requires).

## The possessed element and ghost signs

The haunted page is a **checkout basket** for Mothmilk Market. It holds the two
items the visitor picked —

- "Mothmilk, 1 pint £1.20"
- "Cobweb loaf £2.40"

— and a **third line nobody picked**, "Ghost Protection £2.99", already in the
basket. The total includes it ("Pay £6.59").

The possessed element is the **sneaked line** (id "pantry-sneaked-line"). It
carries its **own** "Remove" button beside it — never a button inside a button:
the line is a `<div>` (the positioning context and the thing styled as
possessed), and the "Remove" control is a sibling `<button>` within the same
row. Removing the line takes it out and updates the total to £3.60; about
**1.5 s** later it quietly comes back (the trick), and the total returns to
£6.59. Each removal and each return updates the total.

This room needs per-element state and timers, so it follows **Room 5's way**: a
**class component** (`SneakedBasket`) behind a thin function component. The
class holds `{ sneakedPresent: boolean }` and a single pending `timerId`;
`handleRemove` sets `sneakedPresent: false` and starts exactly one timer that,
after 1500 ms, sets `sneakedPresent: true` and clears its own handle;
`componentWillUnmount` clears any pending timer, so no timer leaks past the
room. A class (not hooks) renders identically in the app, the tests and the
`check:rooms` bare renderer.

The total is plain text; it is **not** a live region (no `aria-live`, no
announcing role). Prices use tabular figures so the total never changes width.

Reuse the manor look (tokens, frame, card classes) and the ghost/mist/flicker
approach from Rooms 1–7 (`src/rooms/gravemoor-gazette/room.css` …
`src/rooms/lanternstay/room.css`): a ~120×140 ghost drawn in thin white ink
(stroke `--ghost` at 90%, fill at 18%) peeking beside the sneaked line without
covering its text, its "Remove" button or a price, soft mist drifting around
it, flicker between opacity 1 and 0.85 at most twice a second. Under
`prefers-reduced-motion`, show the static dashed candle outline and the room's
own `.stirs-label` "Something stirs here" (shown once, inside the room's panel),
and run no animation; the sneaked line still comes back after ~1.5 s but with
no fade or movement.

The ghost is anchored to the possessed **sneaked line** itself, so it peeks just
right of it, vertically centred at its height, drawn whole (the basket reserves
room so its hem is never cut), and never covers a button, a price or the line's
text. At 1920×1080 the whole page sits in the first screen; under 600px a
smaller ghost (about 72×84) rises from a strip reserved under the line, so it
never covers text and there is no horizontal overflow at 412px wide. No fixed or
minimum heights that leave empty boxes on mobile.

## The pattern rule (variant-specific)

Sneaking lives in the unchosen "Ghost Protection" line that returns after it is
removed and in a total that silently includes it. On the **haunted** side the
basket contains the sneaked line "Ghost Protection £2.99", the total is £6.59
(it includes the sneaked line), and removing the line only hides it for ~1.5 s
before it comes back and the total returns to £6.59. On the **honest** side
there is **no** sneaked line in the basket (`#pantry-sneaked-line` is absent),
the total is **£3.60** (only the two picked items), and Ghost Protection is
offered **outside** the basket as an **unticked**, plainly priced option, so
paying only for what you picked takes one click.

The room's test asserts this difference holds on haunted (the sneaked line is
present, the total includes it, and it returns ~1.5 s after "Remove") and is
gone on honest (no sneaked line; total £3.60; Ghost Protection unticked outside
the basket), so a test that passes on both variants is broken.

## Ghost Guide

Word for word from the task brief (the legal lines are not rewritten):

- Definition (two sentences): Something you never chose ("Ghost Protection
  £2.99") slips into your basket and comes back when you take it out. You pay
  for it unless you notice.
- Where you meet it: checkout pages, ticket and travel booking, insurance and
  warranty add-ons, donation add-ons.
- US: The FTC report lists "sneak-into-basket": "Automatically adding items to
  the shopping cart without a shopper's permission" (Appendix A).
- EU: A trader needs your express consent for any extra payment; if it was
  inferred from a default you had to reject, you're entitled to a refund
  (Consumer Rights Directive, Art. 22).
- Protection tip: Read the basket line by line before you pay; anything you
  didn't add is a ghost.
- Sources: the FTC staff report "Bringing Dark Patterns to Light" (ftc.gov, the
  same PDF Room 1 links) and the Consumer Rights Directive, Directive
  2011/83/EU, on `eur-lex.europa.eu` (the same link Room 4 uses).

The legal lines are carried verbatim; if a validator limit would block either,
stop and report it rather than shortening it. (The 25-word quoted-passage check
in `check-rooms.mjs` counts only text inside double quotes, and only in
`definition`, `whereYouMeetIt` and `tip`. The only quoted fragment in those
three fields is "Ghost Protection £2.99" — 3 words — so it passes. The US quote
"Automatically adding items to the shopping cart without a shopper's permission"
is 11 words and lives in the `us.sourceLabel`, which the quote check does not
scan.)
