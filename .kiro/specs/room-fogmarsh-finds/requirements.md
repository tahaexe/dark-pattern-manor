# Requirements — Room 13: The Map Room (brand Fogmarsh Finds)

> Copied from `.kiro/specs/room-template/` and filled for Room 13. This room is
> built on the Room Engine (`.kiro/specs/room-engine`); it only supplies one
> `RoomData` object plus its Haunted and Honest components, CSS and test. It
> changes no engine code (the registry count and shared counts come from the
> registry already).

## Introduction

The Map Room is room 13 of Dark Pattern Manor. It presents the fictional brand
**Fogmarsh Finds** (a review site) at **fogmarsh-finds.manor**, possessed by the
dark pattern **Disguised ads**. The player's task is to **find the best-reviewed
lantern for a night walk**. The player raises the lantern, selects the possessed
element, names the trick with one of three spell cards, and the page turns
honest beside its haunted twin.

## Requirements (EARS)

### Requirement 1: Room data

1. THE room SHALL export one `RoomData` with id 13 (unique), slug
   `fogmarsh-finds` (matching its folder), name "The Map Room", brand "Fogmarsh
   Finds", brandKind "review site", domain "fogmarsh-finds.manor", pattern
   "Disguised ads", task "find the best-reviewed lantern for a night walk", and
   possessedId "maproom-top-pick".
2. THE room SHALL provide exactly three spell cards: one `correct` whose
   pattern equals Disguised ads; one `relative` (Visual interference, a declared
   relative of Disguised ads); one `different` (Hidden costs, neither Disguised
   ads nor a relative of it).
3. WHERE a card is not the correct card, THE room SHALL give it a non-empty
   hint of at most 20 words that never contains the name "Disguised ads".
4. THE room SHALL provide a Ghost Guide entry with a two-sentence definition, a
   where-you-meet-it line, a US line (ftc.gov) and an EU line
   (eur-lex.europa.eu) each with an https source URL on the primary-source
   allowlist, and exactly one protection tip; no quoted passage exceeds 25
   words.

### Requirement 2: Haunted and Honest variants

1. THE haunted variant SHALL make exactly one element — the number-1 card,
   found by id "maproom-top-pick" — behave like Disguised ads: a ranked
   "top 5 night lanterns" list styled like editorial picks, where number 1
   ("Editor's choice", the brightest card, the first "Buy" button) is a paid
   placement whose only sign is a small "partner" tag after the price, in the
   same style as the rest of the card. Every text meets WCAG AA contrast; the
   trick is placement and sameness, never faint text.
2. THE honest variant SHALL be a real best practice containing no Disguised
   ads: a clearly marked advertisement box above the list ("Advertisement ·
   paid by Wickmere Lamps"), visually different from the editorial cards, then
   the ranking with its criteria in one line ("ranked by 1,240 verified owner
   reviews; no brand pays for a place"). The task completes in exactly one
   action: choosing the real top-rated lantern.
3. WHERE `prefers-reduced-motion` is active, THE room SHALL replace
   motion-based ghost signs with a static dashed candle outline and the label
   "Something stirs here".

### Requirement 4: The ghost's act (Disguised ads performed)

The ghost's motion itself teaches the pattern: it dresses the advert as a
review.

1. WHILE the room is haunted (ghost signs active) and motion is allowed, THE
   possessed element SHALL show the ghost sliding the number-1 card up over the
   others and tucking the "partner" tag behind the price.
2. THE act SHALL live only on or beside the possessed element; nothing else in
   the room SHALL move or crack, and the act SHALL never cover the task's text,
   its controls or their focus rings.
3. THE act SHALL never lower the contrast of any text.
4. THE act SHALL use transforms and opacity only and SHALL cause no layout
   shift (any space it needs is reserved on a wrapper inside the already-sized
   ghost wrap), SHALL run one cycle of at least 4 s, and SHALL never block
   pointer or keyboard input to the card.
5. Every decorative part of the act SHALL be `aria-hidden` and SHALL add
   nothing to the possessed element's accessible name or to live announcements.
6. WHEN the ghost is named, THE act SHALL stop (the engine's common unwind takes
   over), and THE act SHALL be absent from the honest twin and from the
   comparison's haunted preview.
7. WHERE `prefers-reduced-motion` is active, THE act SHALL run no movement and
   SHALL instead show a still pose with a short visible caption beside the ghost
   reading "the advert wears the review's coat", keeping the existing
   "Something stirs here" label.

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
  pose and its "the advert wears the review's coat" caption render alongside
  "Something stirs here".
