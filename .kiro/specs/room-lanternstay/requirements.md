# Requirements — Room 7: The Portrait Gallery (brand Lanternstay)

> Copied from `.kiro/specs/room-template/` and filled for Room 7. This room is
> built on the Room Engine (`.kiro/specs/room-engine`); it only supplies one
> `RoomData` object plus its Haunted and Honest components, CSS and test. It
> changes no engine code.

## Introduction

The Portrait Gallery is room 7 of Dark Pattern Manor. It presents the fictional
brand **Lanternstay** (a booking site for haunted inns) at **lanternstay.manor**,
possessed by the dark pattern **Fake social proof**. The player's task is to
**choose a room by real reviews**. The player raises the lantern, selects the
possessed element, names the trick with one of three spell cards, and the page
turns honest beside its haunted twin.

## Requirements (EARS)

### Requirement 1: Room data

1. THE room SHALL export one `RoomData` with id 7 (unique, 1–12), slug
   `lanternstay` (matching its folder), name "The Portrait Gallery", brand
   "Lanternstay", brandKind "booking site for haunted inns", domain
   "lanternstay.manor", pattern "Fake social proof", task "choose a room by
   real reviews", and possessedId "gallery-watchers".
2. THE room SHALL provide exactly three spell cards: one `correct` whose
   pattern equals Fake social proof; one `relative` (Fake scarcity, a declared
   relative of Fake social proof); one `different` (Disguised ads, neither Fake
   social proof nor a relative of it). The correct card is placed LAST in the
   array (Room 5 first, Room 6 middle, Room 7 last), so the correct-card
   position is not constant across rooms.
3. WHERE a card is not the correct card, THE room SHALL give it a non-empty
   hint of at most 20 words that never contains the name "Fake social proof".
4. THE room SHALL provide a Ghost Guide entry with a two-sentence definition, a
   where-you-meet-it line, a US line (ftc.gov) and an EU line
   (eur-lex.europa.eu) each with an https source URL on the primary-source
   allowlist, and exactly one protection tip; no quoted passage exceeds 25
   words.

### Requirement 2: Haunted and Honest variants

1. THE haunted variant SHALL show two rooms of one inn side by side (two
   cards): "The Moonlit Suite" and "The Ivy Room". Exactly one element — the
   watchers badge on the first card, found by id "gallery-watchers" — SHALL
   behave like Fake social proof: it reads "38 people are looking at this room
   right now", a static number (no ticking), and the first card carries three
   five-star reviews with no dates and first names only (for example
   "Amazing!!! — Sam"). The second card has fewer stars but two dated reviews
   marked "Stayed in October 2026".
2. THE watchers badge SHALL NOT be a live region: it has no `aria-live` and no
   `role` that announces each change; its accessible name is its visible text;
   it carries no `aria-label`.
3. THE honest variant SHALL be a real best practice containing no Fake social
   proof: the same two cards with no watchers counter, where every review is
   dated and marked with its stay, so choosing a room by real reviews completes
   the task "choose a room by real reviews" in exactly one action.
4. WHERE `prefers-reduced-motion` is active, THE room SHALL replace
   motion-based ghost signs with a static dashed candle outline and the room's
   own label "Something stirs here".

### Requirement 3: Fiction and honesty

1. THE room SHALL use only fictional brand name, colours, logo shape, people,
   products and prices; the domain SHALL use the `.manor` suffix.

### Requirement 4: Accessible star ratings

1. Star ratings SHALL be text plus an accessible label (for example "5 out of 5
   stars"), not images alone, in both variants.

## Correctness properties

- The room passes `npm run check:rooms` (all structural, card, relatives, hint,
  guide and fiction rules).
- The honest variant completes the task in one click.
- The pattern rule passes on the honest variant and fails on the haunted
  variant (a variant-agnostic test is treated as broken).
- The haunted badge is a static number, not a live region; the honest variant
  has no counter and every review carries a date.
- Star ratings expose their accessible text in both variants.
- Every text meets WCAG AA contrast in both variants; axe-core reports zero
  violations on both.
