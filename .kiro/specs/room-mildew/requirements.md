# Requirements — Room 9: The Study (brand Mildew Drive)

> Copied from `.kiro/specs/room-template/` and filled for Room 9.
> This room is built on the Room Engine (`.kiro/specs/room-engine`); it only
> supplies one `RoomData` object plus its Haunted and Honest components, CSS
> and test. It changes no engine code.

## Introduction

The Study is room 9 of Dark Pattern Manor. It presents the fictional brand
**Mildew Drive** (cloud storage for a household's old letters and ghost
memories) at **mildew.manor**, possessed by the dark pattern **Hidden costs**.
The player's task is to **find the real price**. The player raises the lantern,
selects the possessed element, names the trick with one of three spell cards,
and the page turns honest beside its haunted twin.

## Requirements (EARS)

### Requirement 1: Room data

1. THE room SHALL export one `RoomData` with id 9 (unique, 1–12), slug
   `mildew` (matching its folder), name "The Study", brand "Mildew Drive",
   brandKind "cloud storage for a household's old letters and ghost memories",
   domain "mildew.manor", pattern "Hidden costs", task "find the real price",
   and possessedId "study-fee-lines".
2. THE room SHALL provide exactly three spell cards: one `correct` whose
   pattern equals Hidden costs; one `relative` that is a declared relative of
   Hidden costs in the engine relatives table (Sneaking); one `different` that
   is neither Hidden costs nor a relative of it (Nagging). The correct card is
   authored in the MIDDLE of the array.
3. WHERE a card is not the correct card, THE room SHALL give it a non-empty
   hint of at most 20 words that never contains the name "Hidden costs".
4. THE room SHALL provide a Ghost Guide entry with a two-sentence definition, a
   where-you-meet-it line, a US line and an EU line each with an https source
   URL on the primary-source allowlist (`ftc.gov`, `eur-lex.europa.eu`,
   `edpb.europa.eu`), and exactly one protection tip; no quoted passage exceeds
   25 words.

### Requirement 2: Haunted and Honest variants

1. THE haunted variant SHALL make exactly one element — the possessed block of
   fee lines, found by id "study-fee-lines" — behave like Hidden costs: it is
   the last step of a three-step checkout (step indicator "1 Plan · 2 Details ·
   3 Pay", step 3 current), the plan card shouts "From £1/month", and only now,
   at the last step, the fees appear — "Service fee £1.50/month", "Required
   backup add-on £2.00/month", "Setup fee £4.99" — with the real total
   "£4.50/month + £4.99 today" beside a "Pay £9.49 today" button. The ghost
   signs are perceivable by pointer, keyboard and screen reader and never hide
   or lower the contrast of any text.
2. THE step indicator SHALL mark the current step with `aria-current="step"`;
   prices SHALL use tabular figures. The possessed fee block is NOT a live
   region.
3. THE honest variant SHALL be a real best practice containing no instance of
   Hidden costs: step 1 shows the whole price up front on the plan card
   ("£4.50/month, all fees included, + £4.99 setup"), with the same fee lines
   listed there, so finding the real price completes in exactly one action.
4. WHERE `prefers-reduced-motion` is active, THE room SHALL replace motion-based
   ghost signs with a static dashed candle outline and the room's own label
   "Something stirs here".

### Requirement 4: The ghost's act performs Hidden costs

1. WHILE the fee block is possessed (signs active and not in preview), THE
   ghost SHALL perform an act that teaches the pattern through motion: a long
   receipt unrolls from the ghost, fee by fee, at the last step, so the motion
   itself shows that the fees come last. The act SHALL live only on or beside
   the possessed element, use transforms and opacity only with no layout shift,
   never cover or dim the task's text, controls or focus rings, never block
   input, run one cycle of at least four seconds, and keep every act element
   `aria-hidden` so it adds nothing to the accessible name or to live
   announcements.
2. WHEN the ghost is named (the engine sets `data-moment='right'` and
   `data-fleeing` on `.room-scene`), THE room SHALL freeze every act element so
   the act stops for the shared unwind and flee, without re-implementing or
   overriding the shared flee. THE act SHALL be absent from the honest twin and
   from the comparison's haunted preview.
3. WHERE `prefers-reduced-motion` is active, THE act SHALL show no movement and
   instead hold a still pose — the receipt half-unrolled — with a short visible
   caption beside the ghost, "the fees come last", kept alongside the room's own
   "Something stirs here" label.

### Requirement 5: Fiction and honesty

1. THE room SHALL use only fictional brand name, colours, logo shape, people,
   products and prices; the domain SHALL use the `.manor` suffix.

## Correctness properties

- The room passes `npm run check:rooms` (all structural, card, relatives, hint,
  guide and fiction rules).
- The honest variant completes the task in one click.
- The pattern rule passes on the honest variant and fails on the haunted
  variant (a variant-agnostic test is treated as broken): the haunted checkout
  hides the fees until the last step (step 3), where the real total is
  £4.50/month + £4.99 today (£9.49 today); the honest checkout shows the whole
  price up front at step 1 with the same fee lines.
- The haunted total equals the sum of its lines (£4.50/month, £9.49 today), and
  the honest step-1 card shows the same total up front.
- Every text meets WCAG AA contrast in both variants; axe-core reports zero
  violations on both.
- The act element (the unrolling receipt) exists and is `aria-hidden` in the
  haunted view, is absent from the comparison's haunted preview and the honest
  twin, and under `prefers-reduced-motion` renders a still half-unrolled pose
  with the caption "the fees come last" beside the "Something stirs here" label.
