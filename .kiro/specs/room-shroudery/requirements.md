# Requirements — Room 6: The Ballroom (brand Shroudery)

> Copied from `.kiro/specs/room-template/` and filled for Room 6. This room is
> built on the Room Engine (`.kiro/specs/room-engine`); it only supplies one
> `RoomData` object plus its Haunted and Honest components, CSS and test. It
> changes no engine code.

## Introduction

The Ballroom is room 6 of Dark Pattern Manor. It presents the fictional brand
**Shroudery** (a shop for ghostly ballroom cloaks) at **shroudery.manor**,
possessed by the dark pattern **Fake scarcity**. The player's task is to **pick
the right size**. The player raises the lantern, selects the possessed element,
names the trick with one of three spell cards, and the page turns honest beside
its haunted twin.

## Requirements (EARS)

### Requirement 1: Room data

1. THE room SHALL export one `RoomData` with id 6 (unique, 1–12), slug
   `shroudery` (matching its folder), name "The Ballroom", brand "Shroudery",
   brandKind "shop for ghostly ballroom cloaks", domain "shroudery.manor",
   pattern "Fake scarcity", task "pick the right size", and possessedId
   "ballroom-stock".
2. THE room SHALL provide exactly three spell cards: one `correct` whose
   pattern equals Fake scarcity; one `relative` (Fake urgency, a declared
   relative of Fake scarcity); one `different` (Visual interference, neither
   Fake scarcity nor a relative of it). The correct card is in the MIDDLE of
   the array (Room 4 last, Room 5 first, Room 6 middle), so the correct-card
   position is not constant across rooms.
3. WHERE a card is not the correct card, THE room SHALL give it a non-empty
   hint of at most 20 words that never contains the name "Fake scarcity".
4. THE room SHALL provide a Ghost Guide entry with a two-sentence definition, a
   where-you-meet-it line, a US line (ftc.gov) and an EU line
   (eur-lex.europa.eu) each with an https source URL on the primary-source
   allowlist, and exactly one protection tip; no quoted passage exceeds 25
   words.

### Requirement 2: Haunted and Honest variants

1. THE haunted variant SHALL make exactly one element — the stock line, found
   by id "ballroom-stock" — behave like Fake scarcity: a cloak product page has
   size buttons XS, S, M, L, XL, and under them a single stock line that always
   reads "Only 1 left in <picked size>! Order soon." for whichever size is
   picked (and "Only 1 left! Order soon." before any pick), whatever the real
   stock. The stock line shows ghost signs perceivable by pointer, keyboard and
   screen reader that never hide or lower the contrast of any text.
2. THE haunted stock line SHALL NOT be a live region: it has no `aria-live` and
   no `role` that announces each change; its accessible name is its visible
   text; it carries no `aria-label`.
3. THE size buttons SHALL be real buttons with `aria-pressed` reflecting the
   picked size and targets of at least 44 × 44 px.
4. THE honest variant SHALL be a real best practice containing no Fake
   scarcity: the same cloak page where the stock line tells the truth in plain
   text ("In stock" for every size, "3 left" only on XL), so picking the right
   size calmly completes the task "pick the right size" in exactly one action.
5. WHERE `prefers-reduced-motion` is active, THE room SHALL replace
   motion-based ghost signs with a static dashed candle outline and the room's
   own label "Something stirs here".

### Requirement 3: Fiction and honesty

1. THE room SHALL use only fictional brand name, colours, logo shape, people,
   products and prices; the domain SHALL use the `.manor` suffix.

## Correctness properties

- The room passes `npm run check:rooms` (all structural, card, relatives, hint,
  guide and fiction rules).
- The honest variant completes the task in one click.
- The pattern rule passes on the honest variant and fails on the haunted
  variant (a variant-agnostic test is treated as broken).
- The haunted stock line reads "Only 1 left" for every size; the honest one
  does not; `aria-pressed` follows the picked size.
- Every text meets WCAG AA contrast in both variants; axe-core reports zero
  violations on both.
