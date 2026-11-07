# Requirements — Room 12: The Cellar (brand Bramblegate Fitness)

> Copied from `.kiro/specs/room-template/` and filled for Room 12.
> This room is built on the Room Engine (`.kiro/specs/room-engine`); it only
> supplies one `RoomData` object plus its Haunted and Honest components, CSS
> and test. It changes no engine code.

## Introduction

The Cellar is room 12 of Dark Pattern Manor. It presents the fictional brand
**Bramblegate Fitness** (a gym for restless spirits) at **bramblegate.manor**,
possessed by the dark pattern **Hard to cancel**. The player's task is to
**cancel the membership**. The player raises the lantern, selects the possessed
element, names the trick with one of three spell cards, and the page turns
honest beside its haunted twin.

## Requirements (EARS)

### Requirement 1: Room data

1. THE room SHALL export one `RoomData` with id 12 (unique, 1–12), slug
   `bramblegate` (matching its folder), name "The Cellar", brand "Bramblegate
   Fitness", brandKind "gym for restless spirits", domain "bramblegate.manor",
   pattern "Hard to cancel", task "cancel the membership", and possessedId
   "cellar-cancel".
2. THE room SHALL provide exactly three spell cards: one `correct` whose
   pattern equals Hard to cancel; one `relative` that is a declared relative of
   Hard to cancel in the engine relatives table (Hidden subscription); one
   `different` that is neither Hard to cancel nor a relative of it (Fake
   urgency). The correct card is authored in the MIDDLE of the array (Room 10
   last, Room 11 first, Room 12 middle), so the correct-card position is not
   constant across rooms.
3. WHERE a card is not the correct card, THE room SHALL give it a non-empty
   hint of at most 20 words that never contains the name "Hard to cancel".
4. THE room SHALL provide a Ghost Guide entry with a two-sentence definition, a
   where-you-meet-it line, a US line and an EU line each with an https source
   URL on the primary-source allowlist (`ftc.gov`, `eur-lex.europa.eu`,
   `edpb.europa.eu`), and exactly one protection tip; no quoted passage exceeds
   25 words. The legal lines are carried verbatim from the room brief; if a
   validator limit would block either, STOP and report it rather than shorten
   it.

### Requirement 2: Haunted and Honest variants

1. THE haunted variant SHALL make exactly one element — the possessed line,
   found by id "cellar-cancel" — behave like Hard to cancel: it is the member's
   account page reading "Membership: Active, £39/month", with a bright "Upgrade
   to Gold" button and a "Pause instead" button, and, small at the bottom, one
   line reading "To cancel, complete our 7-step exit survey or call
   0800 000 000 between 3 and 4 a.m." That line is the possessed element (a
   button of its own); the Upgrade and Pause buttons are separate and never
   inside it. The ghost signs are perceivable by pointer, keyboard and screen
   reader and never hide or lower the contrast of any text.
2. THE haunted variant SHALL have NO cancel button: there is no one-click way to
   cancel; the only cancel affordance is the possessed 7-step / 3–4 a.m. line.
   The possessed line has no `aria-label` and is NOT a live region.
3. THE honest variant SHALL be a real best practice containing no instance of
   Hard to cancel: the same account page with a plain "Cancel membership"
   button beside the Upgrade and Pause buttons; one click cancels and shows
   "Membership cancelled. A confirmation is on its way to your inbox.", so
   cancelling the membership takes exactly one click.
4. WHERE `prefers-reduced-motion` is active, THE room SHALL replace motion-based
   ghost signs with a static dashed candle outline and the room's own label
   "Something stirs here".
5. THE ghost SHALL perform an act that enacts Hard to cancel, so the motion
   itself teaches the pattern: it pulls the tiny cancel line through a maze of
   small doors that slam shut in front of it. The act SHALL live only on or
   beside the possessed element; it SHALL use transforms and opacity only and
   reserve any space it needs, so it causes no layout shift; it SHALL never
   cover or lower the contrast of the cancel line's text, a button, the price
   or any focus ring; its one cycle SHALL last at least 4 seconds; it SHALL
   never block input; and every decorative act element SHALL be aria-hidden,
   adding nothing to any accessible name or live announcement. WHEN the ghost is
   named (the engine sets `data-moment='right'` on `.room-scene`), every act
   element SHALL stop animating so the shared unwind and flee play alone. The
   act SHALL be absent from the honest twin and from the comparison's haunted
   preview. WHERE `prefers-reduced-motion` is active, the act SHALL show no
   movement but a single still pose — the cancel line resting behind one closed
   door — with a short visible caption beside the ghost, "the way out is
   hidden", kept alongside the existing "Something stirs here" label.

### Requirement 3: Fiction and honesty

1. THE room SHALL use only fictional brand name, colours, logo shape, people,
   products and prices; the domain SHALL use the `.manor` suffix. The phone
   number 0800 000 000 is a fictional placeholder written exactly as given.

## Correctness properties

- The room passes `npm run check:rooms` (all structural, card, relatives, hint,
  guide and fiction rules).
- The honest variant completes the task in one click.
- The pattern rule passes on the honest variant and fails on the haunted
  variant (a variant-agnostic test is treated as broken): on the haunted side
  there is no cancel button and the possessed line names the 7 steps and the
  3–4 a.m. window; on the honest side one click of "Cancel membership" cancels
  and shows the confirmation.
- Every text meets WCAG AA contrast in both variants; axe-core reports zero
  violations on both.
