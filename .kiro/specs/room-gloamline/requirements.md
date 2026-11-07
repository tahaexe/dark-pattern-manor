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

### Requirement 4: The ghost's act (Hidden subscription performed)

The ghost's motion itself teaches the pattern: it acts out the way the real
price is dragged out of sight, below the fold.

1. WHILE the room is haunted (ghost signs active) and motion is allowed, THE
   possessed element SHALL show the ghost dragging the small print further down
   with a hook and then letting it spring back.
2. THE act SHALL live only on or beside the possessed element; nothing else in
   the room SHALL move or crack, and the act SHALL never cover the small
   print's text, the task's controls or their focus rings.
3. THE act SHALL never lower the contrast of any text; the hook SHALL sit
   beside the small print, never over its label.
4. THE act SHALL use transforms and opacity only and SHALL cause no layout
   shift (any space it needs is reserved on a wrapper inside the already-sized
   ghost wrap), SHALL run one cycle of at least 4 s, and SHALL never block
   pointer or keyboard input to the small print.
5. Every decorative part of the act SHALL be `aria-hidden` and SHALL add
   nothing to the possessed element's accessible name or to live announcements.
6. WHEN the ghost is named, THE act SHALL stop (the engine's common unwind takes
   over), and THE act SHALL be absent from the honest twin and from the
   comparison's haunted preview.
7. WHERE `prefers-reduced-motion` is active, THE act SHALL run no movement and
   SHALL instead show the still pose (the hook resting on the small print) with
   a short visible caption beside the ghost reading "the price is hiding below",
   keeping the existing "Something stirs here" label.

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
- The act's element exists in the haunted view, is `aria-hidden`, is absent in
  `preview` and in the honest twin, and under `prefers-reduced-motion` the still
  pose and its "the price is hiding below" caption render alongside "Something
  stirs here".
