# Design — Room 10: The Nursery (brand Wanderwick)

> Copied from `.kiro/specs/room-template/` and filled for Room 10. This room
> plugs into the Room Engine; see `.kiro/specs/room-engine/design.md` for the
> engine contract.

## Files

All under `src/rooms/wanderwick/`:

- `room.ts` — the `RoomData` object (imports `./Haunted`, `./Honest`, `./room.css`).
- `Haunted.tsx` — the possessed brand page; the `HauntedProps` include
  `onSelectPossessed`, `onSelectOther`, `signsActive`, `reducedMotion` and an
  optional `preview` flag (true for the static "before" side of the split, in
  which the component is non-interactive and omits the possessed id).
- `Honest.tsx` — the honest twin; `HonestProps.onCompleteTask` fires the single
  task action.
- `room.css` — all room styling, confining cracks and mist to the possessed
  pop-up card; the frame, the board and the honest twin stay whole.
- `wanderwick.test.tsx` — the room's own test (see tasks).

Register the room in `src/engine/registry.ts`:

```ts
wanderwick: () => import('../rooms/wanderwick/room'),
```

## RoomData

| Field | Value |
| --- | --- |
| id | 10 |
| slug | `wanderwick` |
| name | The Nursery |
| brand | Wanderwick |
| brandKind | toy-box puzzle game for the house's small ghosts |
| domain | `wanderwick.manor` |
| pattern | Nagging |
| task | keep playing |
| possessedId | `nursery-prompt` |
| correct card | Nagging (LAST in the array) |
| relative card | Confirmshaming (a relative of Nagging) + hint |
| different card | Hidden subscription (neither Nagging nor a relative) + hint |

Against the engine's `RELATIVE_PAIRS`: `['Confirmshaming', 'Nagging']` is a
declared pair, so `areRelatives('Nagging', 'Confirmshaming') === true`.
Hidden subscription is paired with Hidden costs and Hard to cancel, never with
Nagging, so `areRelatives('Nagging', 'Hidden subscription') === false`.

The correct card is authored LAST (Room 8 first, Room 9 middle, Room 10 last —
the correct-card position is not constant across rooms, which is all
`check:rooms` requires).

## The possessed element and ghost signs

The haunted page is the Wanderwick **game screen**: a small, decorative 3×3
grid of toy tiles (the puzzle board, non-interactive — it is only the fiction
of a game in progress) with a **pop-up card over its lower part**. The pop-up
asks "Enjoying Wanderwick? Turn on notifications!" and offers **"Yes"** and
**"Not now"** — there is no real **"No"**. Pressing "Not now" closes the pop-up;
about **3 s** later it comes back, **every time**, with a small counter that
rises: "Asked 2 times", "Asked 3 times", and so on.

The possessed element is the **pop-up card** (its question), id
"nursery-prompt". It is a real `<button>` (so it is keyboard-reachable and its
accessible name is the question text — Label in Name, WCAG 2.5.3, no
aria-label), and it carries the ghost that peeks beside the question. Its two
choices, "Yes" and "Not now", are **separate sibling `<button>`s** in the card,
**never inside** the possessed question button.

The pop-up is a **non-modal dialog**: the card's container has `role="dialog"`
and `aria-labelledby` pointing at the question's id, and **no** `aria-modal`.
It does **not** trap or move focus, and when it comes back after ~3 s it
**never moves focus by itself**. It is **not** a live region (no `aria-live`,
no announcing role), so a screen reader is not interrupted by each return.

This room needs per-element state and a timer, so it follows **Room 8's way**: a
**class component** (`NaggingBoard`) behind a thin function component. The class
holds `{ promptOpen: boolean; askCount: number }` and a single pending
`timerId`; `handleNotNow` sets `promptOpen: false` and starts exactly one timer
that, after 3000 ms, sets `promptOpen: true`, bumps `askCount`, and clears its
own handle; `componentWillUnmount` clears any pending timer, so no timer leaks
past the room. A class (not hooks) renders identically in the app, the tests
and the `check:rooms` bare renderer.

Numbers in the counter use **lining, tabular figures in the UI face** (Room 9's
lesson: the display face's old-style "1" reads as "I"), so "Asked 2 times"
never reads as "Asked I times" and the counter never changes width.

Reuse the manor look (tokens, frame, card classes) and the ghost/mist/flicker
approach from Rooms 1–9: a ~120×140 ghost drawn in thin white ink (stroke
`--ghost` at 90%, fill at 18%) peeking **inside the room's panel** beside the
possessed question, vertically centred at its height (Room 9's lesson: the
first ghost there sat out in the frame's border; this one stays inside the
panel), drawn whole, never covering a button or any text. Soft mist drifts
around it; flicker between opacity 1 and 0.85 at most twice a second. Under
`prefers-reduced-motion`, show the static dashed candle outline and the room's
own `.stirs-label` "Something stirs here" (shown once, inside the room's panel),
and run no animation; the pop-up still comes back after ~3 s but with no fade or
movement (the return is a state change, not an animation).

At 1920×1080 the whole page sits in the first screen; under 600px a smaller
ghost (about 72×84) rises from a strip reserved under the question, so it never
covers text and there is no horizontal overflow at 412px wide. Long label-and-
value rows (the counter) wrap under 600px instead of overlapping. No fixed or
minimum heights that leave empty boxes on mobile.

## The pattern rule (variant-specific)

Nagging lives in a prompt that offers only "Yes" and "Not now" (no real "No")
and comes **back** after it is dismissed, counting up each time. On the
**haunted** side the pop-up (`#nursery-prompt`) offers exactly "Yes" and "Not
now", there is no control that ends it for good, and ~3 s after "Not now" it
returns with the counter up ("Asked 2 times", "Asked 3 times"). On the
**honest** side the same prompt offers a real **"No, don't ask again"** and,
once either choice is pressed, it is dismissed **for good** and never returns
(`#nursery-prompt` is gone), so keeping playing takes one click.

The room's test asserts this difference holds on haunted (only "Yes"/"Not now";
the prompt returns ~3 s after "Not now" with the counter up) and is gone on
honest (a real "No, don't ask again"; once answered the prompt never returns),
so a test that passes on both variants is broken.

## Ghost Guide

Word for word from the task brief (the legal lines are not rewritten):

- Definition (two sentences): The same request pops up again and again until
  you give in, and "No" only means "not now". You pay with your attention until
  you say yes.
- Where you meet it: app rating prompts, notification and location requests,
  cookie re-prompts, upgrade pop-ups in games.
- US: The FTC report lists "nagging": asking repeatedly, or offering "Yes" and
  "Not Now" instead of "Yes" and "No" (Appendix A).
- EU: The Digital Services Act names "repeatedly requesting" a choice already
  made, "especially by presenting pop-ups", as a practice the Commission may
  issue guidelines on for online platforms (Art. 25(3)(b)).
- Protection tip: Look for a real "No" or "Don't ask again", and turn the
  prompts off in the app's settings.
- Sources: the FTC staff report "Bringing Dark Patterns to Light" (ftc.gov, the
  same PDF Room 1 links) and the Digital Services Act, Regulation (EU)
  2022/2065, on `eur-lex.europa.eu` (the same link Room 3 uses).

The legal lines are carried verbatim; if a validator limit would block either,
stop and report it rather than shortening it. (The 25-word quoted-passage check
in `check-rooms.mjs` counts only text inside double quotes, and only in
`definition`, `whereYouMeetIt` and `tip`. The quoted fragments there — "not
now", "No" and, in the tip, "No" and "Don't ask again" — are each well under 25
words. The longer quoted fragments in the US and EU lines live in the
`sourceLabel`s, which the quote check does not scan.)
