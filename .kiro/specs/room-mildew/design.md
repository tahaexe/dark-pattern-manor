# Design — Room 9: The Study (brand Mildew Drive)

> Copied from `.kiro/specs/room-template/` and filled for Room 9. This room
> plugs into the Room Engine; see `.kiro/specs/room-engine/design.md` for the
> engine contract.

## Files

All under `src/rooms/mildew/`:

- `room.ts` — the `RoomData` object (imports `./Haunted`, `./Honest`, `./room.css`).
- `Haunted.tsx` — the possessed brand page; the `HauntedProps` include
  `onSelectPossessed`, `onSelectOther`, `signsActive`, `reducedMotion` and an
  optional `preview` flag (true for the static "before" side of the split, in
  which the component is non-interactive and omits the possessed id).
- `Honest.tsx` — the honest twin; `HonestProps.onCompleteTask` fires the single
  task action.
- `room.css` — all room styling, confining cracks and mist to the possessed
  fee block; the frame and twin stay whole.
- `mildew.test.tsx` — the room's own test (see tasks).

Register the room in `src/engine/registry.ts`:

```ts
mildew: () => import('../rooms/mildew/room'),
```

## RoomData

| Field | Value |
| --- | --- |
| id | 9 |
| slug | `mildew` |
| name | The Study |
| brand | Mildew Drive |
| brandKind | cloud storage for a household's old letters and ghost memories |
| domain | `mildew.manor` |
| pattern | Hidden costs |
| task | find the real price |
| possessedId | `study-fee-lines` |
| correct card | Hidden costs (MIDDLE of the array) |
| relative card | Sneaking (a relative of Hidden costs) + hint |
| different card | Nagging (neither Hidden costs nor a relative) + hint |

Against the engine's `RELATIVE_PAIRS`, `['Hidden costs', 'Sneaking']` is a
declared pair, so `areRelatives('Hidden costs', 'Sneaking') === true`. Nagging
is paired only with Confirmshaming, Forced action and Addictive design, so
`areRelatives('Hidden costs', 'Nagging') === false`.

The correct card is authored in the MIDDLE (Room 5 first, Room 6 middle, Room 7
last, Room 8 first, Room 9 middle — the correct-card position is not constant
across rooms, which is all `check:rooms` requires).

## The possessed element and ghost signs

The haunted page is the **last step of a three-step checkout** for Mildew
Drive. A step indicator reads "1 Plan · 2 Details · 3 Pay" and marks **step 3**
as current with `aria-current="step"`. The plan card still shouts the
advertised price, "From £1/month". Under it — and only now, at the last step —
the fees appear:

- "Service fee £1.50/month"
- "Required backup add-on £2.00/month"
- "Setup fee £4.99"

and the real total, "£4.50/month + £4.99 today", beside a "Pay £9.49 today"
button. The £4.50/month is the £1 base plus the £1.50 service fee plus the £2.00
required add-on; the £9.49 today is that £4.50 first month plus the £4.99 setup.

The possessed element is the **block of fee lines** (id "study-fee-lines"). It
is a real `<button>` so it is keyboard-reachable and its accessible name is its
visible text (Label in Name, WCAG 2.5.3 — no aria-label). It is the positioning
context for the ghost that peeks beside it. The fee block is NOT a live region
(no `aria-live`, no announcing role). Prices use tabular figures so the total
never changes width.

This room needs no per-element state or timers (the fees are a fixed reveal at
the last step, the total is static), so a plain function component is enough: no
hooks, so it renders identically in the app, the tests and the `check:rooms`
bare renderer — the same approach as Rooms 1–7's static rooms.

Reuse the manor look (tokens, frame, card classes) and the ghost/mist/flicker
approach from Rooms 1–8 (`src/rooms/gravemoor-gazette/room.css` …
`src/rooms/mothmilk/room.css`): a ~120×140 ghost drawn in thin white ink
(stroke `--ghost` at 90%, fill at 18%) peeking beside the fee block without
covering its text, a price or the Pay button, soft mist drifting around it,
flicker between opacity 1 and 0.85 at most twice a second. Under
`prefers-reduced-motion`, show the static dashed candle outline and the room's
own `.stirs-label` "Something stirs here" (shown once, inside the room's panel),
and run no animation.

The ghost is anchored to the possessed fee block itself, so it peeks beside it,
vertically centred at its height, drawn whole (the checkout reserves room so its
hem is never cut). At 1920×1080 the whole page sits in the first screen and the
ghost sits in the empty margin beside the block, never over a price, a line or
the "Pay £9.49 today" button (Room 8 had to move its ghost off a button; the fee
block's ghost is anchored to the block's left margin and checked against the
Pay button's position). Under 600px a smaller ghost (about 72×84) rises from a
strip reserved under the block, so it never covers text and there is no
horizontal overflow at 412px wide. No fixed or minimum heights that leave empty
boxes on mobile.

## The pattern rule (variant-specific)

Hidden costs live in the fees that appear **only at the last step** of the
haunted checkout: the plan card shouts "From £1/month", but step 3 reveals the
service fee, the required backup add-on and the setup fee, and the real total of
£4.50/month + £4.99 today. On the **haunted** side the step indicator marks
step 3 current (`aria-current="step"` on step 3), the fee block
`#study-fee-lines` is present with the three fee lines and the £9.49-today
total, and the advertised "From £1/month" is nowhere near the true total. On the
**honest** side the step indicator marks step 1 current (`aria-current="step"`
on step 1), there is **no** `#study-fee-lines` late-reveal block, and the plan
card shows the whole price up front ("£4.50/month, all fees included, + £4.99
setup") with the same fee lines listed there, so finding the real price takes
one click.

The room's test asserts this difference holds on haunted (fees hidden until step
3; `aria-current="step"` on step 3; total £9.49 today = the sum of the lines)
and is gone on honest (fees up front at step 1; `aria-current="step"` on step 1;
same total shown before you commit), so a test that passes on both variants is
broken.

## Ghost Guide

Word for word from the task brief (the legal lines are not rewritten):

- Definition (two sentences): The first price you see ("From £1/month") isn't
  what you pay; fees appear only at the last step. By then you've spent time and
  feel committed.
- Where you meet it: ticketing, food delivery, hotels ("resort fees"),
  subscriptions, rentals.
- US: The FTC report calls it "drip pricing": advertising part of the price and
  adding mandatory charges late, such as a "convenience fee" that appears only
  at checkout (Appendix A; section II). Since May 2025 an FTC rule requires the
  total price up front for live-event tickets and short-term lodging (16 CFR
  Part 464, effective 12 May 2025).
- EU: Before you're bound, the trader must tell you the total price including
  taxes and all extra charges (Consumer Rights Directive, Art. 6(1)(e)).
- Protection tip: Go to the final step before you decide; compare totals, not
  "from" prices.
- Sources: the FTC staff report "Bringing Dark Patterns to Light" (ftc.gov, the
  same PDF Room 1 links) and the Consumer Rights Directive, Directive
  2011/83/EU, on `eur-lex.europa.eu` (the same link Rooms 4 and 8 use).

The legal lines are carried verbatim; if a validator limit would block either,
stop and report it rather than shortening it. The 25-word quoted-passage check
in `check-rooms.mjs` counts only text inside double quotes, and only in
`definition`, `whereYouMeetIt` and `tip`. The quoted fragments in those three
fields are "From £1/month" (2 words) in the definition and "resort fees" (2
words) in the where-you-meet-it line — both well under 25 words — so they pass.
The longer quoted fragments ("drip pricing", "convenience fee") live in the
`us.sourceLabel`, which the quote check does not scan.
