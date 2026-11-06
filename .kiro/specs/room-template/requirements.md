# Requirements — Room «N»: «Room name» (brand «Brand»)

> Copy this folder to `.kiro/specs/room-«brand-slug»/` and fill every «placeholder».
> This room is built on the Room Engine (`.kiro/specs/room-engine`); it only
> supplies one `RoomData` object plus its Haunted and Honest components, CSS
> and test. It changes no engine code.

## Introduction

«Room name» is room «N» of Dark Pattern Manor. It presents the fictional brand
**«Brand»** (a «brand kind» site) at **«brand-slug».manor**, possessed by the
dark pattern **«Pattern»**. The player's task is to **«task»** (for example,
"reject the cookies"). The player raises the lantern, selects the possessed
element, names the trick with one of three spell cards, and the page turns
honest beside its haunted twin.

## Requirements (EARS)

### Requirement 1: Room data

1. THE room SHALL export one `RoomData` with id «N» (unique, 1–12), slug
   `«brand-slug»` (matching its folder), name "«Room name»", brand "«Brand»",
   brandKind "«brand kind»", domain "«brand-slug».manor", pattern "«Pattern»",
   task "«task»", and possessedId "«possessed-id»".
2. THE room SHALL provide exactly three spell cards: one `correct` whose
   pattern equals «Pattern»; one `relative` that is a declared relative of
   «Pattern» in the engine relatives table; one `different` that is neither
   «Pattern» nor a relative of it.
3. WHERE a card is not the correct card, THE room SHALL give it a non-empty
   hint of at most 20 words that never contains the name «Pattern».
4. THE room SHALL provide a Ghost Guide entry with a two-sentence definition, a
   where-you-meet-it line, a US line and an EU line each with an https source
   URL on the primary-source allowlist (`ftc.gov`, `eur-lex.europa.eu`,
   `edpb.europa.eu`), and exactly one protection tip; no quoted passage exceeds
   25 words.

### Requirement 2: Haunted and Honest variants

1. THE haunted variant SHALL make exactly one element — the possessed element,
   found by id "«possessed-id»" — behave like «Pattern», with ghost signs that
   are perceivable by pointer, keyboard and screen reader and that never hide
   or lower the contrast of any text.
2. THE honest variant SHALL be a real best practice containing no instance of
   «Pattern», in which the task "«task»" completes in exactly one action.
3. WHERE `prefers-reduced-motion` is active, THE room SHALL replace motion-based
   ghost signs with a static dashed candle outline and the label "Something
   stirs here".

### Requirement 3: Fiction and honesty

1. THE room SHALL use only fictional brand name, colours, logo shape, people,
   products and prices; the domain SHALL use the `.manor` suffix.

## Correctness properties

- The room passes `npm run check:rooms` (all structural, card, relatives, hint,
  guide and fiction rules).
- The honest variant completes the task in one click.
- The pattern rule passes on the honest variant and fails on the haunted
  variant (a variant-agnostic test is treated as broken).
- Every text meets WCAG AA contrast in both variants; axe-core reports zero
  violations on both.
