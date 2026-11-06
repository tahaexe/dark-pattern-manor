# Design — Room 3: The Dining Room (brand Grimsupper)

> Copied from `.kiro/specs/room-template/` and filled for Room 3. This room
> plugs into the Room Engine; see `.kiro/specs/room-engine/design.md` for the
> engine contract.

## Files

All under `src/rooms/grimsupper/`:

- `room.ts` — the `RoomData` object (imports `./Haunted`, `./Honest`, `./room.css`).
- `Haunted.tsx` — the possessed brand page; the `HauntedProps` include
  `onSelectPossessed`, `onSelectOther`, `signsActive`, `reducedMotion` and an
  optional `preview` flag (true for the static "before" side of the split, in
  which the component is non-interactive and omits the possessed id).
- `Honest.tsx` — the honest twin; `HonestProps.onCompleteTask` fires the single
  task action.
- `room.css` — all room styling, confining cracks and mist to the possessed
  element; the frame and twin stay whole.
- `grimsupper.test.tsx` — the room's own test (see tasks).

Register the room in `src/engine/registry.ts`:

```ts
'grimsupper': () => import('../rooms/grimsupper/room'),
```

## RoomData

| Field | Value |
| --- | --- |
| id | 3 |
| slug | `grimsupper` |
| name | The Dining Room |
| brand | Grimsupper |
| brandKind | restaurant and meal-box shop |
| domain | `grimsupper.manor` |
| pattern | Confirmshaming |
| task | close the discount pop-up |
| possessedId | `dining-decline` |
| correct card | Confirmshaming (MIDDLE of the array) |
| relative card | Nagging (a relative of Confirmshaming) + hint |
| different card | Hidden costs (neither Confirmshaming nor a relative) + hint |

Against the engine's `RELATIVE_PAIRS`: `['Confirmshaming', 'Nagging']` is a
declared pair, so `areRelatives('Confirmshaming', 'Nagging') === true`;
Hidden costs is paired only with Hidden subscription, Sneaking, Comparison
prevention and Currency confusion, so
`areRelatives('Confirmshaming', 'Hidden costs') === false`.

The correct card is authored in the MIDDLE array position (Room 1 places
`correct` first; Room 2 places it last; Room 3 places it in the middle), so the
correct-card position is not constant across rooms.

## The possessed element and ghost signs

The possessed element is the discount pop-up's decline link — one control that
behaves like Confirmshaming. Its visible wording shames the player for saying
no: "No thanks, I'd rather pay full price and eat cold soup alone", rendered
small and dim beside a big, bright "Yes, give me 15% off" button. It carries
**no `aria-label`**, so its accessible name is the visible shaming sentence
itself (Label in Name, WCAG 2.5.3), exactly as Room 1's possessed link exposes
its visible "Reject all" text and Room 2's possessed line exposes its sentence.

Reuse the manor look (tokens, frame, banner classes) and the ghost/mist/flicker
approach from Rooms 1–2 (`src/rooms/gravemoor-gazette/room.css`,
`src/rooms/inkbone-books/room.css`): a ~120×140 ghost drawn in thin white ink
(stroke `--ghost` at 90%, fill at 18%) peeking beside the element without
covering its text, soft mist drifting around it, flicker between opacity 1 and
0.85 at most twice a second. Under `prefers-reduced-motion`, show the static
dashed outline and the room's own `.stirs-label` "Something stirs here" (shown
once, inside the room's panel) and run no animation.

The ghost is anchored to the possessed **decline link** itself, so it peeks
just right of the link, vertically centred at the link's height, and never
covers the link's text, the "Yes, give me 15% off" button, the pop-up heading
or body. At 1920 the pop-up sits in the first screen; under 600px a smaller
ghost (about 72×84) rises from a strip reserved under the link (as Room 2 does),
so it never covers the link's text or the button, and there is no horizontal
overflow at 412px wide.

The pop-up is a real dialog: `role="dialog"`, labelled by its heading
(`aria-labelledby`), with a sensible focus order. In the honest variant Escape
closes it (completing the task).

## The pattern rule (variant-specific)

Confirmshaming lives in how the "no" is worded and weighted, not in the offer
itself. On the **haunted** side the decline control is a small, dim text link
whose wording shames the player — "No thanks, I'd rather pay full price and eat
cold soup alone" — placed beneath a big bright "Yes, give me 15% off" button,
and there is no plain close affordance. On the **honest** side the two choices
are plain and equal — "Get 15% off" and "No thanks" — rendered as the same kind
of button, with a visible close (×) button, so declining carries no guilt and
closing takes one click.

The room's test asserts this difference holds on haunted (the decline control
is a plain text link, not a button, and its wording carries a guilt/shame
marker) and is gone on honest (both choices are equal `<button>` elements and
the decline wording is a plain "No thanks" with no shame marker), so a test
that passes on both variants is broken.

## Ghost Guide

Word for word from the task brief (legal lines are not rewritten):

- Definition (two sentences): The "no" button is written to make you feel
  foolish or guilty for saying no. A simple choice becomes a small insult.
- Where you meet it: discount and newsletter pop-ups, unsubscribe pages, "Are
  you sure?" screens.
- US: The FTC report lists "confirm shaming", with the example "No, I don't
  want to save money" (Appendix A). Source: `ftc.gov` staff report "Bringing
  Dark Patterns to Light" (the same PDF Room 1 links).
- EU: The Digital Services Act bars online platforms from interfaces that
  deceive or manipulate users or materially distort their free and informed
  choices (Art. 25(1)), unless the unfair-practices law or the GDPR already
  covers the practice (Art. 25(2)); Recital 67 mentions presenting choices in a
  non-neutral manner. Source: the Digital Services Act, Regulation (EU)
  2022/2065, on `eur-lex.europa.eu`.
- Protection tip: A guilt trip is a sales tactic, not a fact. Click the plain
  "no"; the page will survive.

No quoted passage exceeds 25 words.
