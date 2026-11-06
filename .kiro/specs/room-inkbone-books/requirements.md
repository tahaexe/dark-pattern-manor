# Requirements — Room 2: The Library (brand Inkbone Books)

> Copied from `.kiro/specs/room-template/` and filled for Room 2.
> This room is built on the Room Engine (`.kiro/specs/room-engine`); it only
> supplies one `RoomData` object plus its Haunted and Honest components, CSS
> and test. It changes no engine code.

## Introduction

The Library is room 2 of Dark Pattern Manor. It presents the fictional brand
**Inkbone Books** (a bookshop site) at **inkbone-books.manor**, possessed by the
dark pattern **Trick wording**. The player's task is to **sign up without the
newsletter**. The player raises the lantern, selects the possessed element, names
the trick with one of three spell cards, and the page turns honest beside its
haunted twin.

## Requirements (EARS)

### Requirement 1: Room data

1. THE room SHALL export one `RoomData` with id 2 (unique, 1–12), slug
   `inkbone-books` (matching its folder), name "The Library", brand "Inkbone
   Books", brandKind "bookshop", domain "inkbone-books.manor", pattern "Trick
   wording", task "sign up without the newsletter", and possessedId
   "library-newsletter".
2. THE room SHALL provide exactly three spell cards: one `correct` whose
   pattern equals Trick wording; one `relative` that is a declared relative of
   Trick wording in the engine relatives table (Preselection); one `different`
   that is neither Trick wording nor a relative of it (Fake urgency).
3. WHERE a card is not the correct card, THE room SHALL give it a non-empty
   hint of at most 20 words that never contains the name Trick wording.
4. THE room SHALL provide a Ghost Guide entry with a two-sentence definition, a
   where-you-meet-it line, a US line and an EU line each with an https source
   URL on the primary-source allowlist (`ftc.gov`, `eur-lex.europa.eu`,
   `edpb.europa.eu`), and exactly one protection tip; no quoted passage exceeds
   25 words.

### Requirement 2: Haunted and Honest variants

1. THE haunted variant SHALL make exactly one element — the possessed element,
   found by id "library-newsletter" — behave like Trick wording, with ghost
   signs that are perceivable by pointer, keyboard and screen reader and that
   never hide or lower the contrast of any text. The newsletter checkbox
   sentence is a double negative: leaving the box as it is subscribes you.
2. THE honest variant SHALL be a real best practice containing no instance of
   Trick wording — one plain, unticked opt-in sentence ("Send me the
   newsletter") — in which the task "sign up without the newsletter" completes
   in exactly one action (submit, with the box left alone).
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
