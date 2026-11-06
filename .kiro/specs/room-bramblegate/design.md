# Design — Room 12: The Cellar (brand Bramblegate Fitness)

> Copied from `.kiro/specs/room-template/` and filled for Room 12. This room
> plugs into the Room Engine; see `.kiro/specs/room-engine/design.md` for the
> engine contract.

## Files

All under `src/rooms/bramblegate/`:

- `room.ts` — the `RoomData` object (imports `./Haunted`, `./Honest`, `./room.css`).
- `Haunted.tsx` — the possessed brand page; the `HauntedProps` include
  `onSelectPossessed`, `onSelectOther`, `signsActive`, `reducedMotion` and an
  optional `preview` flag (true for the static "before" side of the split, in
  which the component is non-interactive and omits the possessed id).
- `Honest.tsx` — the honest twin; `HonestProps.onCompleteTask` fires the single
  task action.
- `room.css` — all room styling, confining cracks and mist to the possessed
  cancel line; the frame, the account card and the honest twin stay whole.
- `bramblegate.test.tsx` — the room's own test (see tasks).

Register the room in `src/engine/registry.ts`:

```ts
bramblegate: () => import('../rooms/bramblegate/room'),
```

## RoomData

| Field | Value |
| --- | --- |
| id | 12 |
| slug | `bramblegate` |
| name | The Cellar |
| brand | Bramblegate Fitness |
| brandKind | gym for restless spirits |
| domain | `bramblegate.manor` |
| pattern | Hard to cancel |
| task | cancel the membership |
| possessedId | `cellar-cancel` |
| correct card | Hard to cancel (MIDDLE of the array) |
| relative card | Hidden subscription (a relative of Hard to cancel) + hint |
| different card | Fake urgency (neither Hard to cancel nor a relative) + hint |

Against the engine's `RELATIVE_PAIRS`: `['Hard to cancel', 'Hidden subscription']`
is a declared pair, so `areRelatives('Hard to cancel', 'Hidden subscription')
=== true`. Fake urgency is paired only with Fake scarcity, never with Hard to
cancel, so `areRelatives('Hard to cancel', 'Fake urgency') === false`.

The correct card is authored in the MIDDLE (Room 10 last, Room 11 first, Room
12 middle — the correct-card position is not constant across rooms, which is
all `check:rooms` requires).

## The possessed element and ghost signs

The haunted page is the Bramblegate Fitness **member's account page**. It reads
**"Membership: Active, £39/month"**, then offers a bright **"Upgrade to Gold"**
button and a **"Pause instead"** button. Small at the bottom sits one line:
**"To cancel, complete our 7-step exit survey or call 0800 000 000 between 3
and 4 a.m."**

The possessed element is that bottom **cancel line**, id "cellar-cancel". It is
a real `<button>` (so it is keyboard-reachable and its accessible name is the
visible line text — Label in Name, WCAG 2.5.3, no aria-label), and it carries
the ghost that peeks beside it, **inside the room's panel**. The "Upgrade to
Gold" and "Pause instead" buttons are real `<button>`s **outside** the
possessed button — never a control inside a button. There is **no cancel
button** on the haunted side: the maze (7 steps, a 3–4 a.m. call) is the only
way out, which is exactly the Hard to cancel trick.

The cancel line is **not** a live region (no `aria-live`, no announcing role),
so a screen reader is not interrupted by the ghost signs.

This room keeps **Room 8's way** for parity with Rooms 8–11: a **class
component** (`CellarBoard` on haunted, `CancelBoard` on honest) behind a thin
function component. The honest class holds whether the membership is cancelled
yet (`{ cancelled: boolean }`); pressing "Cancel membership" sets it true,
renders the confirmation and fires `onCompleteTask`. The haunted class holds no
mutable cancel state (there is nothing to cancel); it is a class only for parity
and because the room-data validation gate renders through Preact's bare
`render`, whose hook dispatcher is not wired. There is no timer, so nothing to
clear on unmount.

Prices in the UI face use **lining, tabular figures** (Room 9's lesson: the
display face's old-style "1" reads as "I"), so "£39" never reads as "£I9" and
the price column never changes width.

Reuse the manor look (tokens, frame, card classes) and the ghost/mist/flicker
approach from Rooms 1–11: a ~120×140 ghost drawn in thin white ink (stroke
`--ghost` at 90%, fill at 18%) peeking **inside the room's panel** beside the
possessed cancel line, drawn whole, never covering a button, a price or any
text. Soft mist drifts around it; flicker between opacity 1 and 0.85 at most
twice a second. Under `prefers-reduced-motion`, show the static dashed candle
outline and the room's own `.stirs-label` "Something stirs here" (shown once,
inside the room's panel), and run no animation.

The cancel line is the **last** element in the panel, so its neighbour above is
the Pause button (a control). At 1920×1080 the whole page sits in the first
screen; because the line's upper neighbour is a control and its text runs most
of the line's width, the ghost rises into the **empty space beside the cancel
line** — into the panel's right margin, past the line's text, clear of the
Upgrade/Pause buttons and the price (Rooms 8–11 had to move theirs off a
button, price or neighbouring control; this one checks where it lands at 1920
and rises from the empty space beside the line). Under 600px a smaller ghost
(about 72×84) rises from a **strip reserved under** the cancel line, so it never
covers text and there is no horizontal overflow at 412px wide. Long
label-and-value rows wrap under 600px instead of overlapping. No fixed or
minimum heights that leave empty boxes on mobile.

## The pattern rule (variant-specific)

Hard to cancel lives in the asymmetry between joining and leaving: joining is
one click, but leaving is a maze. On the **haunted** side there is **no cancel
button**; the only way out is the possessed line naming a **7-step** exit survey
or a call **between 3 and 4 a.m.**, so cancelling is never one click. On the
**honest** side a plain **"Cancel membership"** button sits beside the others
and **one click** cancels, showing **"Membership cancelled. A confirmation is on
its way to your inbox."**

The room's test asserts this difference holds on haunted (no cancel button; the
possessed line names the 7 steps and the 3–4 a.m. window) and is gone on honest
(a one-click "Cancel membership" that shows the confirmation), so a test that
passes on both variants is broken.

## Ghost Guide

Word for word from the task brief (the legal lines are not rewritten):

- Definition (two sentences): Joining takes one click; leaving takes seven
  pages, a phone call at 3 a.m. or a chat that keeps offering deals. The maze is
  the point.
- Where you meet it: gyms, newspapers, streaming, software subscriptions,
  memberships.
- US: The FTC report lists "roadblocks to cancellation": easy to sign up, hard
  to cancel, e.g. a phone line open only at limited hours (Appendix A; section
  III). ROSCA requires a simple way to stop recurring charges (15 U.S.C.
  § 8403(3)). The FTC's 2024 "click-to-cancel" rule was vacated by the Eighth
  Circuit on 8 July 2025 (Custom Communications v. FTC, No. 24-3137), so the
  game never rests on it.
- EU: The Digital Services Act names "making the procedure for terminating a
  service more difficult than subscribing to it" as a practice the Commission
  may issue guidelines on for online platforms (Art. 25(3)(c)).
- Protection tip: Before you subscribe, find the cancel path. Cancel in writing
  if you can and keep the confirmation.
- Sources: the FTC staff report "Bringing Dark Patterns to Light" (ftc.gov, the
  same PDF Room 1 links) and the Digital Services Act, Regulation (EU)
  2022/2065, on `eur-lex.europa.eu` (the same link Rooms 3 and 10 use), as the
  steering's allowlist allows.

The legal lines are carried verbatim; if a validator limit would block either,
stop and report it rather than shortening it. (The 25-word quoted-passage check
in `check-rooms.mjs` counts only text inside double quotes, and only in
`definition`, `whereYouMeetIt` and `tip`. The quoted fragments there — none in
the definition, where-you-meet-it or tip — are well under 25 words. The longer
quoted fragments in the US line live in the `sourceLabel`, which the quote check
does not scan.)
