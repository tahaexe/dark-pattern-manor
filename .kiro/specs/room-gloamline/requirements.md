# Requirements — Room 4: The Parlour (brand Gloamline)

> Copied from `.kiro/specs/room-template/` and filled for Room 4. This room is
> built on the Room Engine (`.kiro/specs/room-engine`); it only supplies one
> `RoomData` object plus its Haunted and Honest components, CSS and test. It
> changes no engine code.

## Introduction

The Parlour is room 4 of Dark Pattern Manor. It presents the fictional brand
**Gloamline** (a streaming service for ghost stories) at **gloamline.manor**,
possessed by the dark pattern **Hidden subscription**. The player's task is to
**start the free trial, knowing what comes after**. The player raises the
lantern, selects the possessed element, names the trick with one of three spell
cards, and the page turns honest beside its haunted twin.

## Requirements (EARS)

### Requirement 1: Room data

1. THE room SHALL export one `RoomData` with id 4 (unique, 1–12), slug
   `gloamline` (matching its folder), name "The Parlour", brand "Gloamline",
   brandKind "streaming service for ghost stories", domain "gloamline.manor",
   pattern "Hidden subscription", task "start the free trial, knowing what
   comes after", and possessedId "parlour-smallprint".
2. THE room SHALL provide exactly three spell cards: one `correct` whose
   pattern equals Hidden subscription; one `relative` (Hidden costs, a declared
   relative of Hidden subscription); one `different` (Fake social proof,
   neither Hidden subscription nor a relative of it). The correct card is LAST
   in the array.
3. WHERE a card is not the correct card, THE room SHALL give it a non-empty
   hint of at most 20 words that never contains the name "Hidden subscription".
4. THE room SHALL provide a Ghost Guide entry with a two-sentence definition, a
   where-you-meet-it line, a US line (ftc.gov) and an EU line
   (eur-lex.europa.eu) each with an https source URL on the primary-source
   allowlist, and exactly one protection tip; no quoted passage exceeds 25
   words.

### Requirement 2: Haunted and Honest variants

1. THE haunted variant SHALL make exactly one element — the possessed small
   print, found by id "parlour-smallprint" — behave like Hidden subscription:
   the price after the trial, the date billing starts and the way to cancel sit
   in one small, light paragraph far below the bright "Start my free trial"
   button, with ghost signs perceivable by pointer, keyboard and screen reader
   that never hide or lower the contrast of any text. The small print meets
   WCAG AA contrast.
2. THE honest variant SHALL be a real best practice containing no Hidden
   subscription: the three facts (price after, billing start date, how to
   cancel) sit beside the button at body-text size and the button reads "Start
   free trial, then £9.99 a month", so the task completes in exactly one
   action.
3. WHERE `prefers-reduced-motion` is active, THE room SHALL replace
   motion-based ghost signs with a static dashed candle outline and the label
   "Something stirs here".

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
