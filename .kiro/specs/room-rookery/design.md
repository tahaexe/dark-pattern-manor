# Design — Room 11: The Attic (brand Rookery Air)

> Copied from `.kiro/specs/room-template/` and filled for Room 11. This room
> plugs into the Room Engine; see `.kiro/specs/room-engine/design.md` for the
> engine contract.

## Files

All under `src/rooms/rookery/`:

- `room.ts` — the `RoomData` object (imports `./Haunted`, `./Honest`, `./room.css`).
- `Haunted.tsx` — the possessed brand page; the `HauntedProps` include
  `onSelectPossessed`, `onSelectOther`, `signsActive`, `reducedMotion` and an
  optional `preview` flag (true for the static "before" side of the split, in
  which the component is non-interactive and omits the possessed id).
- `Honest.tsx` — the honest twin; `HonestProps.onCompleteTask` fires the single
  task action.
- `room.css` — all room styling, confining cracks and mist to the possessed
  summary line; the frame, the booking card and the honest twin stay whole.
- `rookery.test.tsx` — the room's own test (see tasks).

Register the room in `src/engine/registry.ts`:

```ts
rookery: () => import('../rooms/rookery/room'),
```

## RoomData

| Field | Value |
| --- | --- |
| id | 11 |
| slug | `rookery` |
| name | The Attic |
| brand | Rookery Air |
| brandKind | airline for crows and travelling ghosts |
| domain | `rookery.manor` |
| pattern | Preselection |
| task | buy only the ticket |
| possessedId | `attic-preselect` |
| correct card | Preselection (FIRST in the array) |
| relative card | Sneaking (a relative of Preselection) + hint |
| different card | Fake social proof (neither Preselection nor a relative) + hint |

Against the engine's `RELATIVE_PAIRS`: `['Sneaking', 'Preselection']` is a
declared pair, so `areRelatives('Preselection', 'Sneaking') === true`.
Fake social proof is paired only with Fake scarcity, never with Preselection,
so `areRelatives('Preselection', 'Fake social proof') === false`.

The correct card is authored FIRST (Room 9 middle, Room 10 last, Room 11
first — the correct-card position is not constant across rooms, which is all
`check:rooms` requires).

## The possessed element and ghost signs

The haunted page is the Rookery Air **extras step** of a booking for one
ticket, "Gloomhaven to Hollow Point, £95". Below the ticket line sits the
**possessed summary line**, a button that reads **"3 extras added for your
trip"** (id "attic-preselect"). Under that summary are the three extras, each a
real, labelled checkbox already **ticked**:

- "Travel insurance £12"
- "Priority boarding £8"
- "Lucky charm £3"

The total reads **"£118"** (95 + 12 + 8 + 3) beside a **"Pay £118"** button.

The possessed element is the **summary line** itself, id "attic-preselect". It
is a real `<button>` (so it is keyboard-reachable and its accessible name is
the visible summary text — Label in Name, WCAG 2.5.3, no aria-label), and it
carries the ghost that peeks beside it, **inside the room's panel**. The three
extras are real `<input type="checkbox">` controls **outside** the possessed
button (never a control inside a button); each has its whole label clickable
(the `<label>` wraps both the box and the text) and each box is at least
**24×24 px**. Unticking any box lowers the total, and unticking all three gives
**£95** with "Pay £95".

The summary line is **not** a live region (no `aria-live`, no announcing role),
so a screen reader is not interrupted as the total follows a tick.

This room needs per-element state (which extras are ticked) and the running
total, so it follows **Room 8's way**: a **class component**
(`PreselectBoard`) behind a thin function component. The class holds
`{ extras: Record<key, boolean> }` starting all `true` on haunted; each
checkbox toggles its key and the total is recomputed from the state each render
so it always follows. (There is no timer here, so nothing to clear; the class
is used for parity with Rooms 8–10 and because the room-data validation gate
renders through Preact's bare `render`, whose hook dispatcher is not wired.)

Prices in the UI face use **lining, tabular figures** (Room 9's lesson: the
display face's old-style "1" reads as "I"), so "£118" never reads as "£II8" and
the price column never changes width.

Reuse the manor look (tokens, frame, card classes) and the ghost/mist/flicker
approach from Rooms 1–10: a ~120×140 ghost drawn in thin white ink (stroke
`--ghost` at 90%, fill at 18%) peeking **inside the room's panel** beside the
possessed summary line, vertically centred at its height (Room 9's lesson: the
first ghost there sat out in the frame's border; this one stays inside the
panel), drawn whole, never covering a button, a checkbox or any text. Soft mist
drifts around it; flicker between opacity 1 and 0.85 at most twice a second.
Under `prefers-reduced-motion`, show the static dashed candle outline and the
room's own `.stirs-label` "Something stirs here" (shown once, inside the room's
panel), and run no animation.

The summary line's neighbours are controls: the ticket line above and the first
checkbox below. At 1920×1080 the whole page sits in the first screen; the ghost
rises **into the empty space beside the summary line** (into the panel's right
margin, clear of the ticket line, the checkboxes and the Pay button — Rooms
8–10 had to move theirs off a button; this one checks where it lands at 1920
and rises into empty space because the line's neighbours are controls). Under
600px a smaller ghost (about 72×84) rises from a **strip reserved under** the
summary line, so it never covers text and there is no horizontal overflow at
412px wide. Long label-and-price rows wrap under 600px instead of overlapping.
No fixed or minimum heights that leave empty boxes on mobile.

## The pattern rule (variant-specific)

Preselection lives in defaults chosen for the company, not the user: extras are
ticked before you arrive, and if you don't untick them you pay for them. On the
**haunted** side the three extras (`#attic-preselect`'s list) start **ticked**,
so the total is **£118** and the button says **"Pay £118"**; buying only the
ticket means noticing and unticking all three. On the **honest** side the same
three extras start **unticked** (opt-in), so the total is **£95** and the
button says **"Pay £95"**; buying only the ticket is already one click.

The room's test asserts this difference holds on haunted (three extras ticked,
total £118, "Pay £118"; unticking all three gives £95) and is gone on honest
(three extras unticked, total £95, "Pay £95"), so a test that passes on both
variants is broken.

## Ghost Guide

Word for word from the task brief (the legal lines are not rewritten):

- Definition (two sentences): Extras are ticked before you arrive: travel
  insurance, priority boarding, a "lucky charm". If you don't untick them, you
  pay.
- Where you meet it: flight and travel booking, software installers, newsletter
  boxes, privacy settings.
- US: The FTC report lists "preselection": a default good for the company, not
  the user, such as trip insurance "automatically tacked on to a purchase
  unless the customer notices and opts out" (Appendix A).
- EU: Airlines must show optional extras clearly at the start of booking and
  add them only on an opt-in basis (Regulation (EC) 1008/2008, Art. 23(1)); a
  default you must reject is not consent to an extra payment (Consumer Rights
  Directive, Art. 22).
- Protection tip: Scan every ticked box before you pay. A tick you didn't make
  is a choice someone made for you.
- Sources: the FTC staff report "Bringing Dark Patterns to Light" (ftc.gov, the
  same PDF Room 1 links) and Regulation (EC) No 1008/2008 on
  `eur-lex.europa.eu`, as the steering's allowlist allows.

The legal lines are carried verbatim; if a validator limit would block either,
stop and report it rather than shortening it. (The 25-word quoted-passage check
in `check-rooms.mjs` counts only text inside double quotes, and only in
`definition`, `whereYouMeetIt` and `tip`. The quoted fragments there — "lucky
charm" in the definition — are well under 25 words. The longer quoted fragment
in the US line lives in the `sourceLabel`, which the quote check does not scan.)
