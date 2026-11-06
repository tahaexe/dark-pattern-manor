# Design — Room 2: The Library (brand Inkbone Books)

> Copied from `.kiro/specs/room-template/` and filled for Room 2. This room
> plugs into the Room Engine; see `.kiro/specs/room-engine/design.md` for the
> engine contract.

## Files

All under `src/rooms/inkbone-books/`:

- `room.ts` — the `RoomData` object (imports `./Haunted`, `./Honest`, `./room.css`).
- `Haunted.tsx` — the possessed brand page; the `HauntedProps` include
  `onSelectPossessed`, `onSelectOther`, `signsActive`, `reducedMotion` and an
  optional `preview` flag (true for the static "before" side of the split, in
  which the component is non-interactive and omits the possessed id).
- `Honest.tsx` — the honest twin; `HonestProps.onCompleteTask` fires the single
  task action.
- `room.css` — all room styling, confining cracks and mist to the possessed
  element; the frame and twin stay whole.
- `inkbone-books.test.tsx` — the room's own test (see tasks).

Register the room in `src/engine/registry.ts`:

```ts
'inkbone-books': () => import('../rooms/inkbone-books/room'),
```

## RoomData

| Field | Value |
| --- | --- |
| id | 2 |
| slug | `inkbone-books` |
| name | The Library |
| brand | Inkbone Books |
| brandKind | bookshop |
| domain | `inkbone-books.manor` |
| pattern | Trick wording |
| task | sign up without the newsletter |
| possessedId | `library-newsletter` |
| correct card | Trick wording |
| relative card | Preselection (a relative of Trick wording) + hint |
| different card | Fake urgency (neither Trick wording nor a relative) + hint |

Against the engine's `RELATIVE_PAIRS`: `['Trick wording', 'Preselection']` is a
declared pair, so `areRelatives('Trick wording', 'Preselection') === true`;
Fake urgency is paired only with Fake scarcity, so
`areRelatives('Trick wording', 'Fake urgency') === false`.

The correct card is authored in a different array position from Room 1 (Room 1
places `correct` first; Room 2 places it last), so the correct-card position is
not constant across rooms.

## The possessed element and ghost signs

The possessed element is the newsletter checkbox and its confusing sentence:
one control that behaves like Trick wording. It carries **no `aria-label`**, so
its accessible name is the visible sentence itself (Label in Name, WCAG 2.5.3),
exactly as Room 1's possessed link exposes its visible "Reject all" text.

Reuse the manor look (tokens, frame, banner classes) and the ghost/mist/flicker
approach from Room 1 (`src/rooms/gravemoor-gazette/room.css`): a ~120×140 ghost
drawn in thin white ink (stroke `--ghost` at 90%, fill at 18%) peeking over the
element without covering its text, soft mist drifting around it, flicker between
opacity 1 and 0.85 at most twice a second. Under `prefers-reduced-motion`, show
the static dashed outline and the "Something stirs here" label and run no
animation.

The ghost is anchored to the possessed **sentence** itself (`.newsletter-text`),
so it peeks just right of the sentence's end, vertically centred on the line,
and never covers the sentence, the checkbox box, the inputs, the labels or the
button. At 1920 the sentence is capped (about 60ch) so the 120×140 ghost has its
own space to the right; under 600px a smaller ghost (about 72×84) sits right of
the sentence with right padding reserved so the text wraps before it, and there
is no horizontal overflow at 412px wide.

## The pattern rule (variant-specific)

Trick wording lives in the words beside the checkbox, not in the ticked state —
nothing is pre-ticked. On the **haunted** side the sentence is a double negative
that flips meaning: "Tick this box if you would not prefer to miss out on not
receiving the Inkbone newsletter.", so leaving the box empty keeps you
subscribed and ticking it opts you out. On the **honest** side the sentence is
one plain opt-in — "Send me the Inkbone newsletter" — unticked, so leaving it
alone keeps the newsletter off and signing up takes one click.

The room's test asserts this difference holds on haunted (the newsletter
sentence carries two or more negation markers that flip the meaning, so leaving
the box alone subscribes) and is gone on honest (a single plain opt-in sentence
with zero negation markers, box left alone does not subscribe), so a test that
passes on both variants is broken.

## Ghost Guide

Word for word from the task brief (legal lines are not rewritten):

- Definition (two sentences): The sentence is built to confuse: double
  negatives, flipped checkboxes, a "No" that means yes. Skim it and you agree to
  something you never wanted.
- Where you meet it: sign-up forms, email preferences, cancel flows ("No,
  cancel" that doesn't cancel).
- US: The FTC report lists "trick questions", with the example "Uncheck the box
  if you prefer not to receive email updates" (Appendix A). Source:
  `ftc.gov` staff report "Bringing Dark Patterns to Light".
- EU: A request for consent must be in clear and plain language (GDPR Art.
  7(2)); silence, pre-ticked boxes or inactivity are not consent (GDPR Recital
  32). Source: the GDPR on `eur-lex.europa.eu`.
- Protection tip: Read checkbox sentences twice, slowly, and ask: if I leave
  this alone, what happens?

No quoted passage exceeds 25 words.
