# Design — Room 1: The Foyer (brand The Gravemoor Gazette)

> This room plugs into the Room Engine; see `.kiro/specs/room-engine/design.md`
> for the engine contract.

## Files

All under `src/rooms/gravemoor-gazette/`:

- `room.ts` — the `RoomData` object (imports `./Haunted`, `./Honest`, `./room.css`).
- `Haunted.tsx` — the possessed brand page; the `HauntedProps` include
  `onSelectPossessed`, `onSelectOther`, `signsActive`, `reducedMotion` and an
  optional `preview` flag (true for the static "before" side of the split, in
  which the component is non-interactive and omits the possessed id).
- `Honest.tsx` — the honest twin; `HonestProps.onCompleteTask` fires the single
  task action.
- `room.css` — all room styling, confining cracks and mist to the possessed
  element; the frame and twin stay whole.
- `gravemoor-gazette.test.tsx` — the room's own test (see tasks).

Registered in `src/engine/registry.ts`:

```ts
'gravemoor-gazette': () => import('../rooms/gravemoor-gazette/room'),
```

## RoomData

| Field | Value |
| --- | --- |
| id | 1 |
| slug | `gravemoor-gazette` |
| name | The Foyer |
| brand | The Gravemoor Gazette |
| brandKind | news |
| domain | `gravemoor-gazette.manor` |
| pattern | Visual interference |
| task | reject the cookies |
| possessedId | `foyer-reject` |
| correct card | Visual interference |
| relative card | Trick wording (a relative of Visual interference) + hint |
| different card | Nagging (neither Visual interference nor a relative) + hint |

`areRelatives('Visual interference', 'Trick wording') === true` and
`areRelatives('Visual interference', 'Nagging') === false`.

## The possessed element and ghost signs

The possessed element is the "Reject all" control — a small plain text link
beside a bright "Accept all" button (the Visual interference trick: the quiet
option is made hard to see by size, weight and placement, never by lower
contrast). It carries the ghost signs: a ~120×140 ghost drawn in thin white ink
(stroke `--ghost` at 90%, fill at 18%) peeking over the link without covering
its text, soft mist drifting around it, flicker between opacity 1 and 0.85 at
most twice a second. The label keeps the top z-index so text is never covered.

## The ghost's act (Visual interference performed)

The ghost does not merely bob; its act performs the trick, teaching it through
motion. The ghost **breathes on "Reject all"**: a slow mist puff (the
`.act-breath` element) swells and fades over a cycle of at least 4 s, dimming
the link's **surround only** — a low-alpha radial glow placed behind the label
(below `.cookie-reject-label`'s z-index) so the link's text never loses
contrast and is never covered. At the same time the ghost **holds a finger to
its lips** (the `.act-finger` element), the gesture that says "look away".

Rules the act keeps:

- It lives only on/beside the possessed link; nothing else in the room moves or
  cracks. It uses transforms and opacity only and reserves its own space, so
  there is no layout shift. It is `pointer-events: none`, so it never blocks the
  link. Every act element is `aria-hidden` and adds nothing to the accessible
  name or to live announcements.
- It never dims the text: the breath glow sits under the label; contrast of
  "Reject all" is unchanged. `contrast_scan` must stay at 0 flags.
- It stops when the ghost is named — the engine's common unwind (on
  `.ghost-wrap`/`.ghost`) takes over — and it is absent from the honest twin and
  from the comparison's haunted `preview` (the act only renders when `showSigns`
  is true, i.e. `signsActive && !preview`).

### Reduced motion

Under `prefers-reduced-motion: reduce` the act runs no movement: the breath glow
holds one still frame and the ghost shows the still "finger to lips" pose. A
short visible caption beside the ghost reads **"it wants you to look away"**, and
the existing **"Something stirs here"** label is kept. All act animation is
disabled by the room's reduced-motion rules.

## The pattern rule (variant-specific)

The one structural difference: on the haunted side "Reject all" is a small plain
text link (`.cookie-reject`, transparent fill, underline, `font-weight: 400`,
`padding: 0`, `font-size: 0.875rem`) while "Accept all" is a full bright button
(`.cookie-accept`). On the honest side both are the same kind of control
(`.cookie-button-equal`, equal font size, padding and fill). The room's test
asserts the haunted asymmetry and the honest symmetry, so a test that passes on
both variants is broken.

## Ghost Guide

Two-sentence definition of Visual interference; where you meet it (cookie
banners, cancel screens, upgrade prompts, unsubscribe pages); a US line citing
an allowlisted `ftc.gov` source (the FTC dark-patterns report); an EU line
citing an allowlisted `edpb.europa.eu` source (the EDPB cookie-banner taskforce
report); one protection tip. Paraphrase sources; no quoted passage over 25
words.
