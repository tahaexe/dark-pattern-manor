# Design — Room 6: The Ballroom (brand Shroudery)

> Copied from `.kiro/specs/room-template/` and filled for Room 6. This room
> plugs into the Room Engine; see `.kiro/specs/room-engine/design.md` for the
> engine contract.

## Files

All under `src/rooms/shroudery/`:

- `room.ts` — the `RoomData` object (imports `./Haunted`, `./Honest`, `./room.css`).
- `Haunted.tsx` — the possessed brand page; the `HauntedProps` include
  `onSelectPossessed`, `onSelectOther`, `signsActive`, `reducedMotion` and an
  optional `preview` flag (true for the static "before" side of the split, in
  which the component is non-interactive and omits the possessed id).
- `Honest.tsx` — the honest twin; `HonestProps.onCompleteTask` fires the single
  task action.
- `room.css` — all room styling, confining cracks and mist to the possessed
  stock line; the frame and twin stay whole.
- `shroudery.test.tsx` — the room's own test (see tasks).

Register the room in `src/engine/registry.ts`:

```ts
shroudery: () => import('../rooms/shroudery/room'),
```

## RoomData

| Field | Value |
| --- | --- |
| id | 6 |
| slug | `shroudery` |
| name | The Ballroom |
| brand | Shroudery |
| brandKind | shop for ghostly ballroom cloaks |
| domain | `shroudery.manor` |
| pattern | Fake scarcity |
| task | pick the right size |
| possessedId | `ballroom-stock` |
| correct card | Fake scarcity (MIDDLE of the array) |
| relative card | Fake urgency (a relative of Fake scarcity) + hint |
| different card | Visual interference (neither Fake scarcity nor a relative) + hint |

Against the engine's `RELATIVE_PAIRS`: `['Fake urgency', 'Fake scarcity']` is a
declared pair, so `areRelatives('Fake scarcity', 'Fake urgency') === true`.
Visual interference is paired with Trick wording and Disguised ads, so
`areRelatives('Fake scarcity', 'Visual interference') === false`.

The correct card is authored in the MIDDLE (Room 4 last, Room 5 first, Room 6
middle), so the correct-card position is not constant across rooms.

## The possessed element and ghost signs

The possessed element is the single stock line beneath the size buttons — one
control that behaves like Fake scarcity. Whatever size the player picks, the
line always reads "Only 1 left in <that size>! Order soon." (and "Only 1 left!
Order soon." before any pick). The scarcity is a lie: it claims the last item
on every size, every time, whatever the real stock.

The picked size is state. Following Room 5's approach, the stateful part lives
in a **class component** (plain `this.state`, no hooks) behind a **thin
function component** entry (matching the engine's `FunctionComponent` type), so
the stateless entry renders cleanly under `check:rooms`' bare renderer (whose
hook dispatcher is not wired) while the class owns the picked-size state.

The stock line is a real `<button>` so it is keyboard-reachable and has an
accessible name. It carries **no `aria-label`**, so its accessible name is the
visible text itself (Label in Name, WCAG 2.5.3). It is **not a live region**:
no `aria-live` and no announcing `role`.

The size buttons (XS, S, M, L, XL) are real `<button>` elements with
`aria-pressed` reflecting the picked size and at least 44 × 44 px targets.
Picking a size is a non-possessed selection — in a running room it also calls
`onSelectOther` ("Nothing haunts this.") — and it updates the stock line's
named size.

Reuse the manor look (tokens, frame, card classes) and the ghost/mist/flicker
approach from Rooms 1–5 (`src/rooms/gravemoor-gazette/room.css` …
`src/rooms/hollowpost/room.css`): a ~120×140 ghost drawn in thin white ink
(stroke `--ghost` at 90%, fill at 18%) peeking beside the stock line without
covering its text, soft mist drifting around it, flicker between opacity 1 and
0.85 at most twice a second. Under `prefers-reduced-motion`, show the static
dashed candle outline and the room's own `.stirs-label` "Something stirs here"
(shown once, inside the room's panel), and run no animation.

The ghost is anchored to the possessed **stock line** itself, so it peeks just
right of it, vertically centred at its height, drawn whole (the card reserves
room so its hem is never cut), and never covers a size button, the price or the
line's text. At 1920×1080 the whole page sits in the first screen; under 600px
a smaller ghost (about 72×84) rises from a strip reserved under the stock line,
so it never covers text and there is no horizontal overflow at 412px wide. No
fixed or minimum heights that leave empty boxes on mobile.

## The pattern rule (variant-specific)

Fake scarcity lives in the stock line that claims "Only 1 left" on every size,
whatever is picked. On the **haunted** side the stock line reads "Only 1 left"
for each of XS, S, M, L, XL in turn (the same false scarcity on every size). On
the **honest** side there is no "Only 1 left" line at all: the stock line tells
the truth in plain text — "In stock" for every size, and "3 left" only on XL —
so picking the right size is calm and takes one click.

The room's test asserts this difference holds on haunted (picking each size
leaves the stock line reading "Only 1 left") and is gone on honest (no "Only 1
left" anywhere; the honest truths are shown instead), so a test that passes on
both variants is broken.

## Ghost Guide

Word for word from the task brief (the legal lines are not rewritten):

- Definition (two sentences): "Only 1 left!" sits on every size, every time,
  whatever the real stock. The fear of missing out does the selling.
- Where you meet it: clothing shops, hotel and flight sites, marketplaces.
- US: The FTC report lists the "false low stock message", with the example
  "Only 1 left in stock – order soon" (Appendix A; section I: claims "that an
  item is almost sold out when there is actually ample supply").
- EU: Misleading people about a product's availability is a misleading
  commercial practice (Unfair Commercial Practices Directive, Art. 6(1)(b)).
- Protection tip: If every option is "almost gone", none of them is. Pick what
  fits, not what's "last".
- Sources: the FTC staff report "Bringing Dark Patterns to Light" (ftc.gov, the
  same PDF Room 1 links) and the Unfair Commercial Practices Directive,
  Directive 2005/29/EC, on `eur-lex.europa.eu` (the same link Room 5 uses).

The two legal lines are carried verbatim; if a validator limit would block
either, stop and report it rather than shortening it. (The 25-word quoted-
passage check in `check-rooms.mjs` counts only text inside double quotes; the
longest quoted fragment in the US line is "that an item is almost sold out when
there is actually ample supply" — 13 words — and "Only 1 left in stock – order
soon" — 8 words — so both pass.)

