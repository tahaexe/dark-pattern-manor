# Requirements Document

## Introduction

Dark Pattern Manor's tagline is "Every trick is a ghost. Name it to set the page free." Today the title screen at route `#/` is a plain dark page with a small heading, a short subtitle, and a "Start" button. This document specifies a **Title Screen** that becomes the manor's front hall: the same painted foyer backdrop the rooms use, a large central heading in the candle colour, the tagline, a floating ink-line ghost, one line of three short facts, and a primary button whose label and destination follow the player's progress.

This document also specifies a small **Sound engine fix**: when a player opens a room's address directly, no user gesture has happened yet, but the room's effect calls `startAmbience` on mount, which creates the `AudioContext` before any user activation and makes the browser log "The AudioContext was not allowed to start". The fix defers context creation until the first real gesture when the platform reports no user activation yet.

The title screen must stay light (no new image, no new font file, the bundle budget passes), meet WCAG AA contrast on the darkened backdrop, be fully reachable by keyboard and screen reader, hold still under `prefers-reduced-motion`, fit above the fold at both 1920×1080 and 412×915 with no layout shift, and keep today's behaviours that other code depends on (the heading has `tabindex -1` and takes focus when the player returns to the title; the Sound toggle stays top-right).

## Glossary

- **Title_Screen**: The component rendered at route `#/`, living in `src/app/TitleScreen.tsx` with its own CSS and its own test.
- **foyer backdrop**: The single painted raster image `src/assets/foyer.webp`, shown by the rooms through `look.css`, reused full-bleed behind the title.
- **vignette**: A CSS darkening layer over the backdrop so every text on it meets WCAG AA contrast.
- **InkGhost**: The thin white ink-line ghost drawing, the same SVG as room 1's ghost, extracted to a shared component `src/ui/InkGhost.tsx`.
- **progress**: The player's completed-room state, read through `src/engine/progress.ts` (`doneCount`, `loadProgress`).
- **room order**: The product order of the twelve rooms and their display names, derived from the registry's slug order (`src/engine/registry.ts`) and a lightweight name list in the initial bundle.
- **next unfinished room**: The first room, in room order, not yet in the player's completed set.
- **candle style**: The rooms' candle-coloured button look (gold/candle fill, 44 px target, 3 px candle focus ring) drawn only from `src/styles/tokens.css`.
- **above the fold**: Visible without scrolling at the given viewport.
- **user activation**: `navigator.userActivation`, whose `hasBeenActive` is true once the page has had a real user gesture.
- **Sound_Engine**: The subsystem in `src/audio/sound.ts`.

## Requirements

### Requirement 1: The front hall backdrop

**User Story:** As a player arriving at the manor, I want the title screen to feel like the manor's front hall, so that the game's mood is set before I enter.

#### Acceptance Criteria

1. THE Title_Screen SHALL show the foyer backdrop `src/assets/foyer.webp` full-bleed behind its content, reusing the room backdrop defined in `look.css` and adding no new image.
2. THE Title_Screen SHALL darken the backdrop with a vignette so that every text rendered on it meets WCAG AA contrast.
3. THE Title_Screen SHALL report zero axe-core violations with the `color-contrast` rule enabled, at the no-room-done, mid-progress, and all-complete states.

### Requirement 2: Heading, tagline, and facts

**User Story:** As a player, I want a clear title, the game's promise, and a few honest facts, so that I know what this is and that it respects me.

#### Acceptance Criteria

1. THE Title_Screen SHALL show the heading "Dark Pattern Manor" large and central in Cormorant Garamond 700 in the candle colour with a soft glow.
2. THE Title_Screen SHALL size the heading responsively with `clamp()`, about 3 rem at a 412 px wide viewport up to about 6.5 rem at 1920 px.
3. THE Title_Screen SHALL show, directly under the heading, the tagline word for word: "Every trick is a ghost. Name it to set the page free." in Atkinson Hyperlegible Next.
4. THE Title_Screen SHALL show one line of three short facts, word for word, separated by middle dots: "12 haunted rooms · No account, nothing tracked · Plays by keyboard and screen reader".

### Requirement 3: The ink-line ghost

**User Story:** As a player, I want a ghost drifting beside the title, so that the front hall feels haunted without hiding anything.

#### Acceptance Criteria

1. THE Title_Screen SHALL show the ink-line ghost beside the heading, the same SVG drawing as room 1's ghost, reused as a shared component `src/ui/InkGhost.tsx`.
2. WHERE room 1 can switch to the shared `InkGhost` with no change to room 1's rendered output, THE change SHALL switch room 1 to it; OTHERWISE room 1 SHALL be left alone.
3. THE Title_Screen SHALL render the ghost about 140 px tall at a 1920 px wide viewport and smaller on a phone.
4. THE Title_Screen SHALL mark the ghost `aria-hidden`.
5. WHERE `prefers-reduced-motion` is active, THE Title_Screen SHALL not move the ghost.
6. THE Title_Screen SHALL reserve the ghost's box so its presence causes no layout shift.

### Requirement 4: The progress-aware primary button

**User Story:** As a returning player, I want the button to take me where I left off, so that I never have to hunt for my place.

#### Acceptance Criteria

1. WHILE no room is complete, THE Title_Screen SHALL show a primary button labelled "Enter the manor" whose destination is `#/room/1`.
2. WHILE 1 to 11 rooms are complete, THE Title_Screen SHALL show a primary button labelled "Continue: <next unfinished room's name>" (for example "Continue: The Conservatory") whose destination is that room, AND SHALL show a quieter secondary link labelled "Start from the Foyer" whose destination is `#/room/1` and which does not erase progress.
3. WHILE all 12 rooms are complete, THE Title_Screen SHALL show, as the primary control, the link "The manor is quiet" whose destination is `#/end`, AND SHALL show a secondary link labelled "Walk the rooms again" whose destination is `#/room/1`.
4. THE Title_Screen SHALL give every button and link a target at least 44 by 44 CSS pixels, the rooms' candle button style, and a visible focus ring, taking colours only from `src/styles/tokens.css`.
5. THE Title_Screen SHALL derive the next unfinished room's number and name from the registry's room order and a lightweight room-name list in the initial bundle, loading no room chunk.

### Requirement 5: Kept behaviours and placement

**User Story:** As a player who leaves and returns, I want focus and the Sound toggle to behave as before, so that nothing regresses.

#### Acceptance Criteria

1. THE Title_Screen SHALL keep the heading's `tabindex` of -1 so it is programmatically focusable.
2. WHEN the player returns to the title screen, THE application SHALL move focus to the heading, as today.
3. THE application SHALL keep the Sound toggle top-right, unchanged.
4. THE `App` component SHALL render the Title_Screen and SHALL hold none of the title screen's own markup.

### Requirement 6: Weight and layout

**User Story:** As a player on a phone or a desktop, I want the front hall to fit the screen and load light, so that it is instant and never shifts.

#### Acceptance Criteria

1. THE Title_Screen SHALL place the heading, the tagline, the facts line, and the primary button above the fold at both 1920×1080 and 412×915, with no scrolling needed to see them.
2. THE Title_Screen SHALL cause no layout shift, reserving the ghost's box.
3. THE Title_Screen SHALL add no new image and no new font file.
4. THE initial bundle SHALL stay within budget so that `npm run check:size` passes.

### Requirement 7: The sound gesture-gate fix

**User Story:** As a player who opens a room's address directly, I want no console warning and no blocked audio, so that sound starts cleanly on my first gesture.

#### Acceptance Criteria

1. WHEN `navigator.userActivation` exists AND `navigator.userActivation.hasBeenActive` is false, THE Sound_Engine's `ensureContext` SHALL create nothing and return null.
2. WHEN `ensureContext` defers because there has been no user activation, THE Sound_Engine SHALL listen once, in the capture phase on `window`, for the first `pointerdown` or `keydown`.
3. WHEN that first gesture fires, THE Sound_Engine SHALL create the AudioContext AND, IF sound is on AND the current room tag is `haunted`, `inspecting`, or `picking`, SHALL start the ambience.
4. WHERE `navigator.userActivation` does not exist (jsdom, older browsers), THE Sound_Engine SHALL keep today's behaviour of creating the context on demand.
5. WHEN `navigator.userActivation.hasBeenActive` is true, THE Sound_Engine SHALL keep today's behaviour of creating the context on demand.

### Requirement 8: Testing

**User Story:** As a developer, I want both changes covered by tests, so that they stay correct.

#### Acceptance Criteria

1. THE Title_Screen tests SHALL assert the heading, the tagline, and the facts line word for word.
2. THE Title_Screen tests SHALL assert the primary control's text and destination for 0, 3, and 12 rooms complete, and the secondary link for 3 and 12 complete.
3. THE Title_Screen tests SHALL assert the ghost is `aria-hidden`.
4. THE Title_Screen tests SHALL assert focus returns to the heading.
5. THE Title_Screen tests SHALL assert axe-core finds no violations at the 0, 3, and 12 complete states.
6. THE Sound_Engine tests SHALL assert that, with a fake `navigator.userActivation` whose `hasBeenActive` is false, mounting a haunted room creates no AudioContext; that after a `keydown` on window it creates exactly one and the ambience starts; and that with `hasBeenActive` true today's behaviour holds.
7. THE existing tests SHALL still pass, and so SHALL `npm run build`, `npm run check:rooms`, and `npm run check:size`.
