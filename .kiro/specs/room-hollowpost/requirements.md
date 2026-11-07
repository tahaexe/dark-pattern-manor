# Requirements — Room 5: The Conservatory (brand Hollowpost Tickets)

> Copied from `.kiro/specs/room-template/` and filled for Room 5. This room is
> built on the Room Engine (`.kiro/specs/room-engine`); it only supplies one
> `RoomData` object plus its Haunted and Honest components, CSS and test. It
> changes no engine code.

## Introduction

The Conservatory is room 5 of Dark Pattern Manor. It presents the fictional
brand **Hollowpost Tickets** (a ticket shop for a midnight séance concert) at
**hollowpost.manor**, possessed by the dark pattern **Fake urgency**. The
player's task is to **buy the ticket without rushing**. The player raises the
lantern, selects the possessed element, names the trick with one of three spell
cards, and the page turns honest beside its haunted twin.

## Requirements (EARS)

### Requirement 1: Room data

1. THE room SHALL export one `RoomData` with id 5 (unique, 1–12), slug
   `hollowpost` (matching its folder), name "The Conservatory", brand
   "Hollowpost Tickets", brandKind "ticket shop for a midnight séance concert",
   domain "hollowpost.manor", pattern "Fake urgency", task "buy the ticket
   without rushing", and possessedId "conservatory-countdown".
2. THE room SHALL provide exactly three spell cards: one `correct` whose
   pattern equals Fake urgency; one `relative` (Fake scarcity, a declared
   relative of Fake urgency); one `different` (Confirmshaming, neither Fake
   urgency nor a relative of it). The correct card is FIRST in the array.
3. WHERE a card is not the correct card, THE room SHALL give it a non-empty
   hint of at most 20 words that never contains the name "Fake urgency".
4. THE room SHALL provide a Ghost Guide entry with a two-sentence definition, a
   where-you-meet-it line, a US line (ftc.gov) and an EU line
   (eur-lex.europa.eu) each with an https source URL on the primary-source
   allowlist, and exactly one protection tip; no quoted passage exceeds 25
   words.

### Requirement 2: Haunted and Honest variants

1. THE haunted variant SHALL make exactly one element — the countdown banner,
   found by id "conservatory-countdown" — behave like Fake urgency: a red
   banner "Offer ends in 04:59" counts down second by second and, when it
   reaches 00:00, quietly starts again from 04:59 (the fake deadline). The
   reset is honest in the code: one `setInterval` timer drives the countdown
   and is cleared on unmount; no hidden trick. The banner shows ghost signs
   perceivable by pointer, keyboard and screen reader that never hide or lower
   the contrast of any text.
2. THE haunted countdown SHALL NOT be a live region: it has no `aria-live` and
   no `role="timer"` that announces each second; its accessible name is its
   visible banner text; the digits use tabular figures so the banner never
   changes width (no layout shift).
3. THE honest variant SHALL be a real best practice containing no Fake urgency:
   the same ticket page shows the price, the date of the concert and "Tickets
   on sale until 31 October" as plain text, with no countdown, so buying calmly
   (the task "buy the ticket without rushing") completes in exactly one action.
4. WHERE `prefers-reduced-motion` is active, THE room SHALL replace
   motion-based ghost signs with a static dashed candle outline and the room's
   own label "Something stirs here", AND the countdown stays still (shows 04:59,
   no ticking).

### Requirement 4: The ghost's act (Fake urgency performed)

1. WHILE the countdown banner is possessed and ghost signs are active (not in
   preview and not reduced motion), THE ghost SHALL perform an act that
   teaches Fake urgency through motion: it taps the countdown like a pocket
   watch and at each tap the seconds jump. The act SHALL live only on or beside
   the possessed banner; nothing else in the room moves or cracks; it SHALL use
   transforms and opacity only with no layout shift (reserving any space it
   needs); one cycle SHALL last at least 4 s; it SHALL never block input, never
   cover the task's text, controls or their focus rings, and never lower text
   contrast; and every act element SHALL be aria-hidden, adding nothing to the
   accessible name or to any live announcement (the countdown stays a
   non-live region).
2. WHERE `prefers-reduced-motion` is active, THE act SHALL show no movement and
   instead hold a still pose — the ghost holding the watch — with a short
   visible caption beside the ghost, "this clock lies", in addition to the
   existing "Something stirs here" label.
3. WHEN the ghost is named (the engine sets `data-moment='right'` and
   `data-fleeing` on `.room-scene`), THE act SHALL stop at once so nothing
   keeps tapping or jumping through the shared unwind and flee. The act SHALL
   be absent from the honest twin and from the comparison's haunted preview.

### Requirement 3: Fiction and honesty

1. THE room SHALL use only fictional brand name, colours, logo shape, people,
   products and prices; the domain SHALL use the `.manor` suffix.

## Correctness properties

- The room passes `npm run check:rooms` (all structural, card, relatives, hint,
  guide and fiction rules).
- The honest variant completes the task in one click.
- The pattern rule passes on the honest variant and fails on the haunted
  variant (a variant-agnostic test is treated as broken).
- The countdown resets from 00:00 back to 04:59; it carries no `aria-live` and
  no `role="timer"`; its single timer is cleared on unmount; under reduced
  motion it does not tick.
- Every text meets WCAG AA contrast in both variants; axe-core reports zero
  violations on both.
