# Requirements — Room 10: The Nursery (brand Wanderwick)

> Copied from `.kiro/specs/room-template/` and filled for Room 10.
> This room is built on the Room Engine (`.kiro/specs/room-engine`); it only
> supplies one `RoomData` object plus its Haunted and Honest components, CSS
> and test. It changes no engine code.

## Introduction

The Nursery is room 10 of Dark Pattern Manor. It presents the fictional brand
**Wanderwick** (a toy-box puzzle game for the house's small ghosts) at
**wanderwick.manor**, possessed by the dark pattern **Nagging**. The player's
task is to **keep playing**. The player raises the lantern, selects the
possessed element, names the trick with one of three spell cards, and the page
turns honest beside its haunted twin.

## Requirements (EARS)

### Requirement 1: Room data

1. THE room SHALL export one `RoomData` with id 10 (unique, 1–12), slug
   `wanderwick` (matching its folder), name "The Nursery", brand "Wanderwick",
   brandKind "toy-box puzzle game for the house's small ghosts", domain
   "wanderwick.manor", pattern "Nagging", task "keep playing", and possessedId
   "nursery-prompt".
2. THE room SHALL provide exactly three spell cards: one `correct` whose
   pattern equals Nagging; one `relative` that is a declared relative of
   Nagging in the engine relatives table (Confirmshaming); one `different` that
   is neither Nagging nor a relative of it (Hidden subscription). The correct
   card is authored LAST in the array (Room 8 first, Room 9 middle, Room 10
   last).
3. WHERE a card is not the correct card, THE room SHALL give it a non-empty
   hint of at most 20 words that never contains the name "Nagging".
4. THE room SHALL provide a Ghost Guide entry with a two-sentence definition, a
   where-you-meet-it line, a US line and an EU line each with an https source
   URL on the primary-source allowlist (`ftc.gov`, `eur-lex.europa.eu`,
   `edpb.europa.eu`), and exactly one protection tip; no quoted passage exceeds
   25 words.

### Requirement 2: Haunted and Honest variants

1. THE haunted variant SHALL make exactly one element — the possessed pop-up
   card, found by id "nursery-prompt" — behave like Nagging: over a small
   decorative puzzle board, a non-modal pop-up asks "Enjoying Wanderwick? Turn
   on notifications!" with "Yes" and "Not now" (no real "No"); "Not now" closes
   it; about 3 s later it comes back, every time, with a counter rising ("Asked
   2 times", "Asked 3 times"). The ghost signs are perceivable by pointer,
   keyboard and screen reader and never hide or lower the contrast of any text.
2. THE haunted variant SHALL hold its per-element state in a class component
   behind a thin function component (Room 8's way), starting exactly one timer
   per "Not now" and clearing every timer on unmount. The pop-up's "Yes" and
   "Not now" are their own buttons beside/below the question (never a button
   inside a button). The pop-up is a non-modal dialog (`role="dialog"`,
   `aria-labelledby`, no `aria-modal`); it never moves focus by itself when it
   comes back and is not a live region.
3. THE honest variant SHALL be a real best practice containing no instance of
   Nagging: the same board and one prompt with "Turn on" and "No, don't ask
   again"; once answered it never returns, so keeping playing takes one click
   (pressing either choice dismisses it for good and returns to the board).
4. WHERE `prefers-reduced-motion` is active, THE room SHALL replace motion-based
   ghost signs with a static dashed candle outline and the room's own label
   "Something stirs here"; the pop-up still comes back after ~3 s but with no
   fade or movement.
5. THE haunted variant SHALL give the ghost an act that performs the trick: the
   ghost knocks on the pop-up again after each "Not now" (the pop-up gives a
   small bump each time it nags back), so the motion itself teaches Nagging.
   The act SHALL live only on or beside the possessed pop-up (nothing else in
   the room moves or cracks), use transforms and opacity only with no layout
   shift, run a cycle of 4 s or more, never block input, and never cover the
   question text, the buttons or their focus rings or lower any text's
   contrast; every act element SHALL be aria-hidden and add nothing to the
   accessible name or to live announcements. WHEN the ghost is named (the
   engine sets `data-moment='right'` on `.room-scene`), THE act SHALL stop so it
   does not move through the shared unwind and flee, and THE act SHALL be absent
   from the honest twin and from the comparison's haunted preview. WHERE
   `prefers-reduced-motion` is active, THE act SHALL show no movement and
   instead hold a still pose (the ghost mid-knock) with a short visible caption
   beside the ghost, "it will ask again" (keeping the "Something stirs here"
   label).

### Requirement 3: Fiction and honesty

1. THE room SHALL use only fictional brand name, colours, logo shape, people,
   products and prices; the domain SHALL use the `.manor` suffix.

## Correctness properties

- The room passes `npm run check:rooms` (all structural, card, relatives, hint,
  guide and fiction rules).
- The honest variant completes the task in one click.
- The pattern rule passes on the honest variant and fails on the haunted
  variant (a variant-agnostic test is treated as broken): the haunted prompt
  offers only "Yes" / "Not now" and comes back ~3 s after "Not now" with the
  counter up; the honest prompt offers a real "No, don't ask again" and, once
  answered, never returns.
- Every text meets WCAG AA contrast in both variants; axe-core reports zero
  violations on both.
