# Design — Room 5: The Conservatory (brand Hollowpost Tickets)

> Copied from `.kiro/specs/room-template/` and filled for Room 5. This room
> plugs into the Room Engine; see `.kiro/specs/room-engine/design.md` for the
> engine contract.

## Files

All under `src/rooms/hollowpost/`:

- `room.ts` — the `RoomData` object (imports `./Haunted`, `./Honest`, `./room.css`).
- `Haunted.tsx` — the possessed brand page; the `HauntedProps` include
  `onSelectPossessed`, `onSelectOther`, `signsActive`, `reducedMotion` and an
  optional `preview` flag (true for the static "before" side of the split, in
  which the component is non-interactive and omits the possessed id).
- `Honest.tsx` — the honest twin; `HonestProps.onCompleteTask` fires the single
  task action.
- `room.css` — all room styling, confining cracks and mist to the possessed
  countdown banner; the frame and twin stay whole.
- `hollowpost.test.tsx` — the room's own test (see tasks).

Register the room in `src/engine/registry.ts`:

```ts
hollowpost: () => import('../rooms/hollowpost/room'),
```

## RoomData

| Field | Value |
| --- | --- |
| id | 5 |
| slug | `hollowpost` |
| name | The Conservatory |
| brand | Hollowpost Tickets |
| brandKind | ticket shop for a midnight séance concert |
| domain | `hollowpost.manor` |
| pattern | Fake urgency |
| task | buy the ticket without rushing |
| possessedId | `conservatory-countdown` |
| correct card | Fake urgency (FIRST in the array) |
| relative card | Fake scarcity (a relative of Fake urgency) + hint |
| different card | Confirmshaming (neither Fake urgency nor a relative) + hint |

Against the engine's `RELATIVE_PAIRS`: `['Fake urgency', 'Fake scarcity']` is a
declared pair, so `areRelatives('Fake urgency', 'Fake scarcity') === true`.
Confirmshaming is paired only with Nagging, so
`areRelatives('Fake urgency', 'Confirmshaming') === false`.

The correct card is authored FIRST (Room 1 first, Room 2 last, Room 3 middle,
Room 4 last), so the correct-card position is not constant across rooms.

## The possessed element and ghost signs

The possessed element is the red countdown banner — one control that behaves
like Fake urgency. Its visible text reads "Offer ends in 04:59" and the clock
ticks down second by second; when it reaches 00:00 it quietly starts again
from 04:59. The reset is **honest in the code**: a single `setInterval` drives
the countdown, decrementing a `secondsLeft` state once a second and wrapping
from 0 back to 299 (04:59), and it is cleared on unmount with the effect's
cleanup. There is no hidden second timer and no concealment — the reset is the
real behaviour of a fake deadline.

The banner is a real `<button>` so it is keyboard-reachable and has an
accessible name. It carries **no `aria-label`**, so its accessible name is the
visible banner text itself (Label in Name, WCAG 2.5.3), exactly as Rooms 1–4's
possessed controls expose their visible text. It is **not a live region**: it
has no `aria-live` and no `role="timer"`, so a screen reader is not forced to
announce every second — the ticking is a visual sign, not an audible nag. The
digits are rendered with `font-variant-numeric: tabular-nums` so the banner
never changes width as the digits change (no layout shift).

Reuse the manor look (tokens, frame, banner classes) and the
ghost/mist/flicker approach from Rooms 1–4
(`src/rooms/gravemoor-gazette/room.css` … `src/rooms/gloamline/room.css`): a
~120×140 ghost drawn in thin white ink (stroke `--ghost` at 90%, fill at 18%)
peeking beside the banner without covering its text, soft mist drifting around
it, flicker between opacity 1 and 0.85 at most twice a second. Under
`prefers-reduced-motion`, show the static dashed candle outline and the room's
own `.stirs-label` "Something stirs here" (shown once, inside the room's
panel), run no animation, AND freeze the countdown at 04:59 (the interval is
not started under reduced motion, so the clock does not tick).

The ghost is anchored to the possessed **banner** itself, so it peeks just
right of the banner, vertically centred at its height, and never covers the
banner's text, the "Buy ticket" button or the price. At 1920 the whole page
sits in the first screen; under 600px a smaller ghost (about 72×84) rises from
a strip reserved under the banner (as Rooms 2–4 do), so it never covers the
text, and there is no horizontal overflow at 412px wide. No fixed or minimum
heights that leave empty boxes on mobile.

## The pattern rule (variant-specific)

Fake urgency lives in the invented, resetting deadline, not in the offer
itself. On the **haunted** side the countdown banner is present and its clock,
on reaching 00:00, resets back to 04:59 — a deadline that never actually
arrives. On the **honest** side there is no countdown at all; the only deadline
is a fixed calendar date shown as plain text, "Tickets on sale until 31
October", so nothing pushes the player to decide now.

The room's test asserts this difference holds on haunted (a countdown banner
exists and, driven by fake timers, resets from 00:00 back to 04:59) and is gone
on honest (no countdown banner; the deadline is a fixed calendar date), so a
test that passes on both variants is broken.

## Ghost Guide

Word for word from the task brief (the legal lines are not rewritten):

- Definition (two sentences): A countdown or "ends tonight" banner pushes you
  to decide now, but the deadline is invented and resets when it runs out.
  Hurry shrinks the time you spend comparing.
- Where you meet it: ticket sites, flash sales, travel booking, online courses.
- US: The FTC report lists the "baseless countdown timer": a fake clock "that
  just goes away or resets when it times out" (Appendix A; section I, false
  beliefs).
- EU: Falsely saying a product or offer is available only for a very limited
  time, to force a quick decision, is unfair in all circumstances (Unfair
  Commercial Practices Directive, Annex I, point 7).
- Protection tip: Reload or come back later: a real deadline doesn't move. If
  the clock resets, so can you.
- Sources: the FTC staff report "Bringing Dark Patterns to Light" (ftc.gov, the
  same PDF Room 1 links) and the Unfair Commercial Practices Directive,
  Directive 2005/29/EC, on `eur-lex.europa.eu`.

No quoted passage exceeds 25 words.
