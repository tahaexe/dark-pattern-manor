# Requirements — Room 11: The Attic (brand Rookery Air)

> Copied from `.kiro/specs/room-template/` and filled for Room 11.
> This room is built on the Room Engine (`.kiro/specs/room-engine`); it only
> supplies one `RoomData` object plus its Haunted and Honest components, CSS
> and test. It changes no engine code.

## Introduction

The Attic is room 11 of Dark Pattern Manor. It presents the fictional brand
**Rookery Air** (an airline for crows and travelling ghosts) at
**rookery.manor**, possessed by the dark pattern **Preselection**. The player's
task is to **buy only the ticket**. The player raises the lantern, selects the
possessed element, names the trick with one of three spell cards, and the page
turns honest beside its haunted twin.

## Requirements (EARS)

### Requirement 1: Room data

1. THE room SHALL export one `RoomData` with id 11 (unique, 1–12), slug
   `rookery` (matching its folder), name "The Attic", brand "Rookery Air",
   brandKind "airline for crows and travelling ghosts", domain
   "rookery.manor", pattern "Preselection", task "buy only the ticket", and
   possessedId "attic-preselect".
2. THE room SHALL provide exactly three spell cards: one `correct` whose
   pattern equals Preselection; one `relative` that is a declared relative of
   Preselection in the engine relatives table (Sneaking); one `different` that
   is neither Preselection nor a relative of it (Fake social proof). The
   correct card is authored FIRST in the array (Room 9 middle, Room 10 last,
   Room 11 first), so the correct-card position is not constant across rooms.
3. WHERE a card is not the correct card, THE room SHALL give it a non-empty
   hint of at most 20 words that never contains the name "Preselection".
4. THE room SHALL provide a Ghost Guide entry with a two-sentence definition, a
   where-you-meet-it line, a US line and an EU line each with an https source
   URL on the primary-source allowlist (`ftc.gov`, `eur-lex.europa.eu`,
   `edpb.europa.eu`), and exactly one protection tip; no quoted passage exceeds
   25 words.

### Requirement 2: Haunted and Honest variants

1. THE haunted variant SHALL make exactly one element — the possessed line,
   found by id "attic-preselect" — behave like Preselection: it is the booking's
   extras step for one ticket "Gloomhaven to Hollow Point, £95", where three
   extras are already ticked — "Travel insurance £12", "Priority boarding £8",
   "Lucky charm £3" — and the total reads "£118" beside a "Pay £118" button.
   Above the extras list a line reads "3 extras added for your trip"; that line
   is the possessed element (a button of its own). The ghost signs are
   perceivable by pointer, keyboard and screen reader and never hide or lower
   the contrast of any text.
2. THE haunted variant SHALL hold its per-element state in a class component
   behind a thin function component (Room 8's way): the three extras start
   ticked and the total follows every tick. The checkboxes are real, labelled
   `<input type="checkbox">` controls OUTSIDE the possessed button (never inside
   a button), each at least 24×24 px with its whole label clickable. Unticking
   works and the total follows (£118 → £95). The possessed summary line has no
   `aria-label` and is NOT a live region.
3. THE honest variant SHALL be a real best practice containing no instance of
   Preselection: the same extras, all unticked (opt-in), and "Pay £95", so
   buying only the ticket takes one click.
4. WHERE `prefers-reduced-motion` is active, THE room SHALL replace motion-based
   ghost signs with a static dashed candle outline and the room's own label
   "Something stirs here".

### Requirement 3: Fiction and honesty

1. THE room SHALL use only fictional brand name, colours, logo shape, people,
   products and prices; the domain SHALL use the `.manor` suffix.

## Correctness properties

- The room passes `npm run check:rooms` (all structural, card, relatives, hint,
  guide and fiction rules).
- The honest variant completes the task in one click.
- The pattern rule passes on the honest variant and fails on the haunted
  variant (a variant-agnostic test is treated as broken): on the haunted side
  the three extras start ticked and the total is £118 with "Pay £118"; on the
  honest side the three extras start unticked and the total is £95 with
  "Pay £95".
- Every text meets WCAG AA contrast in both variants; axe-core reports zero
  violations on both.
