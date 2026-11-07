# Requirements — Room 1: The Foyer (brand The Gravemoor Gazette)

> This room is built on the Room Engine (`.kiro/specs/room-engine`); it only
> supplies one `RoomData` object plus its Haunted and Honest components, CSS
> and test. It changes no engine code.

## Introduction

The Foyer is room 1 of Dark Pattern Manor. It presents the fictional brand
**The Gravemoor Gazette** (a news site) at **gravemoor-gazette.manor**,
possessed by the dark pattern **Visual interference**. The player's task is to
**reject the cookies**. The player raises the lantern, selects the possessed
element, names the trick with one of three spell cards, and the page turns
honest beside its haunted twin.

## Requirements (EARS)

### Requirement 1: Room data

1. THE room SHALL export one `RoomData` with id 1 (unique, 1–12), slug
   `gravemoor-gazette` (matching its folder), name "The Foyer", brand "The
   Gravemoor Gazette", brandKind "news", domain "gravemoor-gazette.manor",
   pattern "Visual interference", task "reject the cookies", and possessedId
   "foyer-reject".
2. THE room SHALL provide exactly three spell cards: one `correct` whose
   pattern equals Visual interference; one `relative` (Trick wording, a
   declared relative of Visual interference); one `different` (Nagging, neither
   Visual interference nor a relative of it).
3. WHERE a card is not the correct card, THE room SHALL give it a non-empty
   hint of at most 20 words that never contains the name "Visual interference".
4. THE room SHALL provide a Ghost Guide entry with a two-sentence definition, a
   where-you-meet-it line, a US line and an EU line each with an https source
   URL on the primary-source allowlist (`ftc.gov`, `eur-lex.europa.eu`,
   `edpb.europa.eu`), and exactly one protection tip; no quoted passage exceeds
   25 words.

### Requirement 2: Haunted and Honest variants

1. THE haunted variant SHALL make exactly one element — the possessed element,
   found by id "foyer-reject" — behave like Visual interference (the "Reject
   all" choice is a small plain text link beside a bright "Accept all" button),
   with ghost signs that are perceivable by pointer, keyboard and screen reader
   and that never hide or lower the contrast of any text.
2. THE honest variant SHALL be a real best practice containing no Visual
   interference ("Reject all" and "Accept all" are equal buttons), in which the
   task "reject the cookies" completes in exactly one action.
3. WHERE `prefers-reduced-motion` is active, THE room SHALL replace motion-based
   ghost signs with a static dashed candle outline and the label "Something
   stirs here".

### Requirement 3: Fiction and honesty

1. THE room SHALL use only fictional brand name, colours, logo shape, people,
   products and prices; the domain SHALL use the `.manor` suffix.

### Requirement 4: The ghost's act (Visual interference performed)

The ghost's motion itself teaches the pattern: it tries to draw the eye away
from the quiet "Reject all" choice.

1. WHILE the room is haunted (ghost signs active) and motion is allowed, THE
   possessed element SHALL show the ghost breathing on "Reject all": a slow
   mist puff that dims the link's surround only — never its text — while the
   ghost holds a finger to its lips.
2. THE act SHALL live only on or beside the possessed element; nothing else in
   the room SHALL move or crack, and the act SHALL never cover the task's text,
   controls or their focus rings.
3. THE act SHALL never lower the contrast of the "Reject all" text; the mist
   puff SHALL dim only the surround and SHALL sit beneath the readable label.
4. THE act SHALL use transforms and opacity only and SHALL cause no layout
   shift (any space it needs is reserved), SHALL run one cycle of at least 4 s,
   and SHALL never block pointer or keyboard input to the link.
5. Every decorative part of the act SHALL be `aria-hidden` and SHALL add
   nothing to the possessed element's accessible name or to live announcements.
6. WHEN the ghost is named, THE act SHALL stop (the engine's common unwind takes
   over), and THE act SHALL be absent from the honest twin and from the
   comparison's haunted preview.
7. WHERE `prefers-reduced-motion` is active, THE act SHALL run no movement and
   SHALL instead show the still pose (ghost with a finger to its lips) with a
   short visible caption beside the ghost reading "it wants you to look away",
   keeping the existing "Something stirs here" label.

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
  pose and its caption render.
