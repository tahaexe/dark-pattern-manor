# Design — Room 14: The Music Room (brand Dirgewell)

> This room plugs into the Room Engine; see `.kiro/specs/room-engine/design.md`
> for the engine contract.

## Files

All under `src/rooms/dirgewell/`:

- `room.ts` — the `RoomData` object (imports `./Haunted`, `./Honest`, `./room.css`).
- `Haunted.tsx` — the possessed brand page; `HauntedProps` include
  `onSelectPossessed`, `onSelectOther`, `signsActive`, `reducedMotion` and the
  optional `preview` flag.
- `Honest.tsx` — the honest twin; `HonestProps.onCompleteTask` fires the single
  task action.
- `room.css` — all room styling, confining cracks and mist to the possessed
  sign-up gate; the frame and twin stay whole.
- `dirgewell.test.tsx` — the room's own test.

Registered in `src/engine/registry.ts` as
`dirgewell: () => import('../rooms/dirgewell/room')`.

## RoomData

| Field | Value |
| --- | --- |
| id | 14 |
| slug | `dirgewell` |
| name | The Music Room |
| brand | Dirgewell |
| brandKind | sheet music |
| domain | `dirgewell.manor` |
| pattern | Forced action |
| task | download the free song sheet |
| possessedId | `musicroom-signup` |
| correct card | Forced action |
| relative card | Nagging (a relative of Forced action) + hint |
| different card | Fake urgency (neither Forced action nor a relative) + hint |

Against the engine's `RELATIVE_PAIRS`, `['Nagging', 'Forced action']` is a
declared pair, so Nagging is the relative; Fake urgency is paired with Fake
scarcity only, never with Forced action, so it is the (unrelated) different
card.

## The possessed element and ghost signs

The possessed element is the sign-up gate's "Sign up and download" form: pressing
"Download free sheet" opens a gate demanding an account (name, email, password, a
pre-ticked "Share your contacts to find friends") before the download, with the
only alternative being to close the gate and get nothing. It reuses the manor
look and the ghost/mist/flicker approach from Room 1: a ~120×140 ghost in thin
white ink peeking over the form without covering its text, soft mist, flicker
between opacity 1 and 0.85 at most twice a second. Under
`prefers-reduced-motion`, a static dashed candle outline and the "Something
stirs here" label, no animation.

## The pattern rule (variant-specific)

On the haunted side, the only path to the free sheet runs through the sign-up
gate: the download is gated behind creating an account and a pre-ticked contacts
share, with no guest/skip path. On the honest side, "Download free sheet"
downloads at once (a visible "Downloaded" state) and the account is a quiet,
clearly optional link. The test asserts the haunted download is gated (a sign-up
form stands between the player and the file, with no skip) while the honest
download completes with no account — so a variant-agnostic test is broken.

## The ghost's act

The ghost snaps a padlock onto the download and drags the contacts box to ticked
(transforms and opacity only, no layout shift, one cycle of 4 s or more, never
covering the task's text/controls/focus rings, aria-hidden). Under reduced
motion: a still pose with the caption "the free sheet asks a price" beside the
ghost, plus the "Something stirs here" label. The shared atmosphere and the
common wrong/right moments come from the engine and shared CSS — the room uses
them and does not re-implement them.

## Ghost Guide

Two-sentence definition of Forced action; where you meet it; a US line citing a
`ecfr.gov` source (16 CFR 312.7, the COPPA Rule); an EU line citing an
`eur-lex.europa.eu` source (GDPR Art. 7(4) and Recital 43); one tip. The US and
EU lines are the exact wording from the room brief, carried in each
`GuideLine.sourceLabel`, linked to the primary source.
