# Requirements — Room 3: The Dining Room (brand Grimsupper)

> Copied from `.kiro/specs/room-template/` and filled for Room 3.
> This room is built on the Room Engine (`.kiro/specs/room-engine`); it only
> supplies one `RoomData` object plus its Haunted and Honest components, CSS
> and test. It changes no engine code.

## Introduction

The Dining Room is room 3 of Dark Pattern Manor. It presents the fictional brand
**Grimsupper** (a restaurant and meal-box shop) at **grimsupper.manor**,
possessed by the dark pattern **Confirmshaming**. The player's task is to
**close the discount pop-up**. The player raises the lantern, selects the
possessed element, names the trick with one of three spell cards, and the page
turns honest beside its haunted twin.

## Requirements (EARS)

### Requirement 1: Room data

1. THE room SHALL export one `RoomData` with id 3 (unique, 1–12), slug
   `grimsupper` (matching its folder), name "The Dining Room", brand
   "Grimsupper", brandKind "restaurant and meal-box shop", domain
   "grimsupper.manor", pattern "Confirmshaming", task "close the discount
   pop-up", and possessedId "dining-decline".
2. THE room SHALL provide exactly three spell cards: one `correct` whose
   pattern equals Confirmshaming; one `relative` that is a declared relative of
   Confirmshaming in the engine relatives table (Nagging); one `different` that
   is neither Confirmshaming nor a relative of it (Hidden costs). The correct
   card SHALL sit in the MIDDLE of the array (Room 1 places it first, Room 2
   last), so the correct-card position is not constant across rooms.
3. WHERE a card is not the correct card, THE room SHALL give it a non-empty
   hint of at most 20 words that never contains the name Confirmshaming.
4. THE room SHALL provide a Ghost Guide entry with a two-sentence definition, a
   where-you-meet-it line, a US line and an EU line each with an https source
   URL on the primary-source allowlist (`ftc.gov`, `eur-lex.europa.eu`,
   `edpb.europa.eu`), and exactly one protection tip; no quoted passage exceeds
   25 words.

### Requirement 2: Haunted and Honest variants

1. THE haunted variant SHALL make exactly one element — the possessed element,
   found by id "dining-decline" — behave like Confirmshaming, with ghost signs
   that are perceivable by pointer, keyboard and screen reader and that never
   hide or lower the contrast of any text. The decline link's wording shames
   the player for saying no ("No thanks, I'd rather pay full price and eat cold
   soup alone"), small and dim beside a big "Yes, give me 15% off" button.
2. THE honest variant SHALL be a real best practice containing no instance of
   Confirmshaming — the same pop-up with two plain, equal choices ("Get 15% off"
   and "No thanks") and a visible close button — in which the task "close the
   discount pop-up" completes in exactly one action.
3. WHERE `prefers-reduced-motion` is active, THE room SHALL replace motion-based
   ghost signs with a static dashed candle outline and the label "Something
   stirs here".

### Requirement 4: The ghost's act (Confirmshaming performed)

The ghost's motion itself teaches the pattern: it acts out the guilt the
decline wording presses on the player.

1. WHILE the room is haunted (ghost signs active) and motion is allowed, THE
   possessed element SHALL show the ghost holding a tiny frowning mask and
   tilting it toward the player.
2. THE act SHALL live only on or beside the possessed element; nothing else in
   the room SHALL move or crack, and the act SHALL never cover the decline
   link's text, the task's controls or their focus rings.
3. THE act SHALL never lower the contrast of any text; the mask SHALL sit
   beside the link, never over its label.
4. THE act SHALL use transforms and opacity only and SHALL cause no layout
   shift (any space it needs is reserved inside the already-sized ghost wrap),
   SHALL run one cycle of at least 4 s, and SHALL never block pointer or
   keyboard input to the link.
5. Every decorative part of the act SHALL be `aria-hidden` and SHALL add
   nothing to the possessed element's accessible name or to live announcements.
6. WHEN the ghost is named, THE act SHALL stop (the engine's common unwind takes
   over), and THE act SHALL be absent from the honest twin and from the
   comparison's haunted preview.
7. WHERE `prefers-reduced-motion` is active, THE act SHALL run no movement and
   SHALL instead show the still pose (the ghost holding the frowning mask) with
   a short visible caption beside the ghost reading "a guilt trip", keeping the
   existing "Something stirs here" label.

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
  pose and its "a guilt trip" caption render alongside "Something stirs here".
