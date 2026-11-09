# Design — Room 13: The Map Room (brand Fogmarsh Finds)

> This room plugs into the Room Engine; see `.kiro/specs/room-engine/design.md`
> for the engine contract.

## Files

All under `src/rooms/fogmarsh-finds/`:

- `room.ts` — the `RoomData` object (imports `./Haunted`, `./Honest`, `./room.css`).
- `Haunted.tsx` — the possessed brand page; `HauntedProps` include
  `onSelectPossessed`, `onSelectOther`, `signsActive`, `reducedMotion` and the
  optional `preview` flag.
- `Honest.tsx` — the honest twin; `HonestProps.onCompleteTask` fires the single
  task action.
- `room.css` — all room styling, confining cracks and mist to the possessed
  number-1 card; the frame and twin stay whole.
- `fogmarsh-finds.test.tsx` — the room's own test.

Registered in `src/engine/registry.ts` as
`'fogmarsh-finds': () => import('../rooms/fogmarsh-finds/room')`.

## RoomData

| Field | Value |
| --- | --- |
| id | 13 |
| slug | `fogmarsh-finds` |
| name | The Map Room |
| brand | Fogmarsh Finds |
| brandKind | review site |
| domain | `fogmarsh-finds.manor` |
| pattern | Disguised ads |
| task | find the best-reviewed lantern for a night walk |
| possessedId | `maproom-top-pick` |
| correct card | Disguised ads |
| relative card | Visual interference (a relative of Disguised ads) + hint |
| different card | Hidden costs (neither Disguised ads nor a relative) + hint |

Against the engine's `RELATIVE_PAIRS`, `['Visual interference', 'Disguised ads']`
is a declared pair, so Visual interference is the relative; Hidden costs is
paired with Hidden subscription, Sneaking, Comparison prevention and Currency
confusion but never with Disguised ads, so it is the (unrelated) different card.

## The possessed element and ghost signs

The possessed element is the number-1 "Editor's choice" card: it looks exactly
like the other editorial picks (same type size, weight and layout) but is a paid
placement, and its only honest sign is a small "partner" tag after the price, in
the same style as the rest of the card — so the trick is placement and sameness,
never faint text. It reuses the manor look (tokens, frame) and the
ghost/mist/flicker approach from Room 1: a ~120×140 ghost in thin white ink
peeking over the card without covering its text, soft mist, flicker between
opacity 1 and 0.85 at most twice a second. Under `prefers-reduced-motion`, a
static dashed candle outline and the "Something stirs here" label, no animation.

## The pattern rule (variant-specific)

On the haunted side, number 1 sits inside the ranked editorial list with no
"Ad"/"Sponsored"/"Advertisement" marking and no stated ranking criterion — it
reads as an impartial top pick while being paid. On the honest side, the paid
placement is lifted out into a clearly-marked "Advertisement · paid by Wickmere
Lamps" box, visually distinct from the editorial cards, and the ranking states
its criterion ("ranked by 1,240 verified owner reviews; no brand pays for a
place"). The test asserts the haunted number-1 card carries no ad marking while
sitting in the ranked list, and the honest page has a marked advertisement box
separate from a criterion-stated ranking — so a variant-agnostic test is broken.

## The ghost's act

The ghost slides the number-1 card up over the others and tucks the "partner"
tag behind the price (transforms and opacity only, no layout shift, one cycle of
4 s or more, never covering the task's text/controls/focus rings, aria-hidden).
Under reduced motion: a still pose with the caption "the advert wears the
review's coat" beside the ghost, plus the "Something stirs here" label. The
shared atmosphere and the common wrong/right moments come from the engine and
shared CSS — the room uses them and does not re-implement them.

## Ghost Guide

Two-sentence definition of Disguised ads; where you meet it; a US line citing an
`ftc.gov` source; an EU line citing an `eur-lex.europa.eu` source; one tip. The
US and EU lines are the exact wording from the room brief, carried in each
`GuideLine.sourceLabel`, linked to the primary source.
