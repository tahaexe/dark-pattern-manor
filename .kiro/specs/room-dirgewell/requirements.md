# Requirements — Room 14: The Music Room (brand Dirgewell)

> Copied from `.kiro/specs/room-template/` and filled for Room 14. This room is
> built on the Room Engine (`.kiro/specs/room-engine`); it only supplies one
> `RoomData` object plus its Haunted and Honest components, CSS and test. It
> changes no engine code.

## Introduction

The Music Room is room 14 of Dark Pattern Manor. It presents the fictional brand
**Dirgewell** (a sheet music site) at **dirgewell.manor**, possessed by the dark
pattern **Forced action**. The player's task is to **download the free song
sheet**. The player raises the lantern, selects the possessed element, names the
trick with one of three spell cards, and the page turns honest beside its
haunted twin.

## Requirements (EARS)

### Requirement 1: Room data

1. THE room SHALL export one `RoomData` with id 14 (unique), slug `dirgewell`
   (matching its folder), name "The Music Room", brand "Dirgewell", brandKind
   "sheet music", domain "dirgewell.manor", pattern "Forced action", task
   "download the free song sheet", and possessedId "musicroom-signup".
2. THE room SHALL provide exactly three spell cards: one `correct` whose
   pattern equals Forced action; one `relative` (Nagging, a declared relative
   of Forced action); one `different` (Fake urgency, neither Forced action nor a
   relative of it).
3. WHERE a card is not the correct card, THE room SHALL give it a non-empty
   hint of at most 20 words that never contains the name "Forced action".
4. THE room SHALL provide a Ghost Guide entry with a two-sentence definition, a
   where-you-meet-it line, a US line (ecfr.gov, 16 CFR 312.7) and an EU line
   (eur-lex.europa.eu) each with an https source URL on the primary-source
   allowlist, and exactly one protection tip; no quoted passage exceeds 25
   words.

### Requirement 2: Haunted and Honest variants

1. THE haunted variant SHALL make exactly one element — the sign-up gate's
   form, found by id "musicroom-signup" — behave like Forced action: the
   "Download free sheet" button opens a gate ("Create your account to
   download") with name, email, password, a ticked "Share your contacts to find
   friends" and a "Sign up and download" button, and the only other way is
   closing the gate (no download). Every text meets WCAG AA contrast.
2. THE honest variant SHALL be a real best practice containing no Forced
   action: "Download free sheet" downloads at once (a visible "Downloaded"
   state; no real file needed), beside a quiet optional link "Save it to an
   account (optional)". The task completes in exactly one action.
3. WHERE `prefers-reduced-motion` is active, THE room SHALL replace
   motion-based ghost signs with a static dashed candle outline and the label
   "Something stirs here".

### Requirement 4: The ghost's act (Forced action performed)

The ghost's motion itself teaches the pattern: it puts a price on the free
download.

1. WHILE the room is haunted (ghost signs active) and motion is allowed, THE
   possessed element SHALL show the ghost snapping a padlock onto the download
   and dragging the contacts box to ticked.
2. THE act SHALL live only on or beside the possessed element; nothing else in
   the room SHALL move or crack, and the act SHALL never cover the task's text,
   its controls or their focus rings.
3. THE act SHALL never lower the contrast of any text.
4. THE act SHALL use transforms and opacity only and SHALL cause no layout
   shift (any space it needs is reserved on a wrapper inside the already-sized
   ghost wrap), SHALL run one cycle of at least 4 s, and SHALL never block
   pointer or keyboard input to the form.
5. Every decorative part of the act SHALL be `aria-hidden` and SHALL add
   nothing to the possessed element's accessible name or to live announcements.
6. WHEN the ghost is named, THE act SHALL stop (the engine's common unwind takes
   over), and THE act SHALL be absent from the honest twin and from the
   comparison's haunted preview.
7. WHERE `prefers-reduced-motion` is active, THE act SHALL run no movement and
   SHALL instead show a still pose with a short visible caption beside the ghost
   reading "the free sheet asks a price", keeping the existing "Something stirs
   here" label.

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
  pose and its "the free sheet asks a price" caption render alongside "Something
  stirs here".
