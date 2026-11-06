# Requirements — Room 8: The Pantry (brand Mothmilk Market)

> Copied from `.kiro/specs/room-template/` and filled for Room 8.
> This room is built on the Room Engine (`.kiro/specs/room-engine`); it only
> supplies one `RoomData` object plus its Haunted and Honest components, CSS
> and test. It changes no engine code.

## Introduction

The Pantry is room 8 of Dark Pattern Manor. It presents the fictional brand
**Mothmilk Market** (a night grocer for the household's ghosts) at
**mothmilk.manor**, possessed by the dark pattern **Sneaking**. The player's
task is to **pay only for what you picked**. The player raises the lantern,
selects the possessed element, names the trick with one of three spell cards,
and the page turns honest beside its haunted twin.

## Requirements (EARS)

### Requirement 1: Room data

1. THE room SHALL export one `RoomData` with id 8 (unique, 1–12), slug
   `mothmilk` (matching its folder), name "The Pantry", brand "Mothmilk
   Market", brandKind "night grocer for the household's ghosts", domain
   "mothmilk.manor", pattern "Sneaking", task "pay only for what you picked",
   and possessedId "pantry-sneaked-line".
2. THE room SHALL provide exactly three spell cards: one `correct` whose
   pattern equals Sneaking; one `relative` that is a declared relative of
   Sneaking in the engine relatives table (Preselection); one `different` that
   is neither Sneaking nor a relative of it (Confirmshaming). The correct card
   is authored FIRST in the array.
3. WHERE a card is not the correct card, THE room SHALL give it a non-empty
   hint of at most 20 words that never contains the name "Sneaking".
4. THE room SHALL provide a Ghost Guide entry with a two-sentence definition, a
   where-you-meet-it line, a US line and an EU line each with an https source
   URL on the primary-source allowlist (`ftc.gov`, `eur-lex.europa.eu`,
   `edpb.europa.eu`), and exactly one protection tip; no quoted passage exceeds
   25 words.

### Requirement 2: Haunted and Honest variants

1. THE haunted variant SHALL make exactly one element — the possessed sneaked
   basket line, found by id "pantry-sneaked-line" — behave like Sneaking: a
   third line "Ghost Protection £2.99" nobody picked is already in the basket,
   the total includes it, and when the player removes the line it quietly comes
   back about 1.5 s later, with the total updated each time. The ghost signs
   are perceivable by pointer, keyboard and screen reader and never hide or
   lower the contrast of any text.
2. THE haunted variant SHALL hold its per-element state in a class component
   behind a thin function component (Room 5's way), starting exactly one timer
   per removal and clearing every timer on unmount. The possessed line's
   "Remove" button is its own button beside the line (never a button inside a
   button). The total is NOT a live region.
3. THE honest variant SHALL be a real best practice containing no instance of
   Sneaking: the basket holds only the two picked items and "Pay £3.60"; Ghost
   Protection is offered outside the basket as an unticked, plainly priced
   option. The task "pay only for what you picked" completes in exactly one
   action (one click of "Pay £3.60").
4. WHERE `prefers-reduced-motion` is active, THE room SHALL replace motion-based
   ghost signs with a static dashed candle outline and the room's own label
   "Something stirs here"; the sneaked line still comes back without any fade
   or movement.

### Requirement 3: Fiction and honesty

1. THE room SHALL use only fictional brand name, colours, logo shape, people,
   products and prices; the domain SHALL use the `.manor` suffix.

## Correctness properties

- The room passes `npm run check:rooms` (all structural, card, relatives, hint,
  guide and fiction rules).
- The honest variant completes the task in one click.
- The pattern rule passes on the honest variant and fails on the haunted
  variant (a variant-agnostic test is treated as broken): the haunted basket
  holds a sneaked "Ghost Protection" line that returns ~1.5 s after removal and
  a total that includes it; the honest basket holds only the two picked items,
  totals £3.60, and offers Ghost Protection as an unticked option outside it.
- Every text meets WCAG AA contrast in both variants; axe-core reports zero
  violations on both.
