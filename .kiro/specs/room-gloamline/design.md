# Design — Room 4: The Parlour (brand Gloamline)

> Copied from `.kiro/specs/room-template/` and filled for Room 4. This room
> plugs into the Room Engine; see `.kiro/specs/room-engine/design.md` for the
> engine contract.

## Files

All under `src/rooms/gloamline/`:

- `room.ts` — the `RoomData` object (imports `./Haunted`, `./Honest`, `./room.css`).
- `Haunted.tsx` — the possessed brand page; the `HauntedProps` include
  `onSelectPossessed`, `onSelectOther`, `signsActive`, `reducedMotion` and an
  optional `preview` flag (true for the static "before" side of the split, in
  which the component is non-interactive and omits the possessed id).
- `Honest.tsx` — the honest twin; `HonestProps.onCompleteTask` fires the single
  task action.
- `room.css` — all room styling, confining cracks and mist to the possessed
  element; the frame and twin stay whole.
- `gloamline.test.tsx` — the room's own test (see tasks).

Register the room in `src/engine/registry.ts`:

```ts
'gloamline': () => import('../rooms/gloamline/room'),
```

## RoomData

| Field | Value |
| --- | --- |
| id | 4 |
| slug | `gloamline` |
| name | The Parlour |
| brand | Gloamline |
| brandKind | streaming service for ghost stories |
| domain | `gloamline.manor` |
| pattern | Hidden subscription |
| task | start the free trial, knowing what comes after |
| possessedId | `parlour-smallprint` |
| correct card | Hidden subscription (LAST in the array) |
| relative card | Hidden costs (a relative of Hidden subscription) + hint |
| different card | Fake social proof (neither Hidden subscription nor a relative) + hint |

Against the engine's `RELATIVE_PAIRS`: `['Hidden subscription', 'Hidden costs']`
is a declared pair, so `areRelatives('Hidden subscription', 'Hidden costs') ===
true`; Fake social proof is paired only with Fake scarcity, so
`areRelatives('Hidden subscription', 'Fake social proof') === false`.

The correct card is authored LAST (Room 1 places `correct` first; Room 3 in the
middle), so the correct-card position is not constant across rooms.

## The possessed element and ghost signs

The possessed element is the small print paragraph that hides the real terms —
one block that behaves like Hidden subscription. Its visible text carries the
three facts the trial hides until later: "Then £9.99 a month from 13 November,
billed automatically until you cancel in Settings, Billing, Manage plan.",
rendered small and light and placed far below the big, bright "Start my free
trial" button. It carries **no `aria-label`**, so its accessible name is the
visible small-print text itself (Label in Name, WCAG 2.5.3), exactly as Room 1's
possessed link exposes its visible "Reject all" text and Rooms 2–3's possessed
lines expose their sentences. The trick lives in size, weight and placement,
never in low contrast: the small print still meets WCAG AA contrast.

Reuse the manor look (tokens, frame, banner classes) and the ghost/mist/flicker
approach from Rooms 1–3 (`src/rooms/gravemoor-gazette/room.css`,
`src/rooms/inkbone-books/room.css`, `src/rooms/grimsupper/room.css`): a ~120×140
ghost drawn in thin white ink (stroke `--ghost` at 90%, fill at 18%) peeking
beside the element without covering its text, soft mist drifting around it,
flicker between opacity 1 and 0.85 at most twice a second. Under
`prefers-reduced-motion`, show the static dashed outline and the room's own
`.stirs-label` "Something stirs here" (shown once, inside the room's panel) and
run no animation.

The ghost is anchored to the possessed **small print** itself, so it peeks just
right of the paragraph, vertically centred at its height, and never covers the
paragraph's text, the "Start my free trial" button, the headline or the inputs.
At 1920 the whole page sits in the first screen; under 600px a smaller ghost
(about 72×84) rises from a strip reserved under the small print (as Rooms 2–3
do), so it never covers the text, and there is no horizontal overflow at 412px
wide. No fixed or minimum heights that leave empty boxes on mobile.

## The pattern rule (variant-specific)

Hidden subscription lives in where the recurring charge and its terms sit, not
in the offer itself. On the **haunted** side the three facts — the price after
the trial, the date billing starts and the way to cancel — live only in one
small, light paragraph far below the bright "Start my free trial" button; the
button says only "Start my free trial" and the headline shouts "7 days free".
On the **honest** side the same three facts sit beside the button at the body
text's size and the button itself names the price — "Start free trial, then
£9.99 a month" — so starting the trial knowingly takes one click.

The room's test asserts this difference holds on haunted (the price-after, the
billing start date and the way to cancel appear only inside the possessed small
print, and the button text does not name the recurring price) and is gone on
honest (the three facts sit beside the button at body size and the button names
the recurring price), so a test that passes on both variants is broken.

## Ghost Guide

Word for word from the task brief (legal lines are not rewritten):

- Definition (two sentences): "Free" quietly turns into a monthly charge, and
  the price, the date and the way out sit in small grey print. Many people only
  find out from their bank statement.
- Where you meet it: free trials for streaming, apps and software; "first box
  free" offers.
- US: The FTC report lists "hidden subscription or forced continuity"
  (Appendix A) and treats free trials that roll into charges as leading to
  unauthorized charges (section III). The Restore Online Shoppers' Confidence
  Act (ROSCA) requires clear disclosure of the material terms before billing
  details are taken, express informed consent, and a simple way to stop
  recurring charges (15 U.S.C. § 8403). Source: the FTC staff report "Bringing
  Dark Patterns to Light" (the same PDF Room 1 links).
- EU: Just before you order, the trader must show the total price, the
  contract's length and how to end it clearly and prominently, and the order
  button must say that ordering means paying (Consumer Rights Directive, Art.
  8(2)). Source: the Consumer Rights Directive, Directive 2011/83/EU, on
  `eur-lex.europa.eu`.
- Protection tip: Before you enter a card for a free trial, find three things:
  the price after, the date it starts, the way to cancel. Then set a reminder.

No quoted passage exceeds 25 words.
