# Implementation Plan

- [x] 1. Extract the shared ink-line ghost (`src/ui/InkGhost.tsx`)
  - The exact SVG drawing from room 1's `Haunted.tsx` (same `viewBox`, paths, circles, class names), `aria-hidden`, with `class`/`width`/`height` props defaulting to room 1's current values so the markup is byte-identical by default.
  - _Requirements: 3.1_

- [x] 2. Switch room 1 to `InkGhost` only if its output is unchanged (`src/rooms/gravemoor-gazette/Haunted.tsx`)
  - Replace the inline `<svg>` with `<InkGhost />` using the defaults; run room 1's own test to confirm no change; if anything changes, revert room 1 and leave it alone.
  - _Requirements: 3.2_

- [x] 3. Add the room-name list to the registry (`src/engine/registry.ts`)
  - Export `ROOM_NAMES` in product order (index = room number − 1); static strings only, no new import.
  - _Requirements: 4.5_

- [x] 4. Build the title screen component (`src/app/TitleScreen.tsx`)
  - Foyer backdrop (`.room`/`.room-wall`), `<h1 tabindex={-1}>` heading, tagline, facts line, the `InkGhost` in a reserved `aria-hidden` box, and the progress-aware primary/secondary anchors computed from `loadProgress`/`doneCount`/`roomSlugs`/`ROOM_NAMES`, loading no room chunk. Imports its own CSS.
  - _Requirements: 1.1, 2.1, 2.3, 2.4, 3.1, 3.3, 3.4, 4.1, 4.2, 4.3, 4.5, 5.1_

- [x] 5. Style the title screen (`src/app/title-screen.css`)
  - Vignette over the backdrop for AA contrast; heading in Cormorant Garamond 700, candle colour, soft glow, `clamp(3rem … 6.5rem)`; tagline/facts in Atkinson Hyperlegible Next; ghost box `clamp`-sized (~140 px at 1920 px), gentle float stopped under `prefers-reduced-motion`, box reserved; candle button + link styles with 44 px targets and a 3 px candle focus ring; a centred column that fits above the fold at 1920×1080 and 412×915 with no layout shift; tokens only; no new image or font.
  - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.4, 3.3, 3.5, 3.6, 4.4, 6.1, 6.2, 6.3_

- [x] 6. Render the title screen from `App.tsx` and drop the inline title markup (`src/app/App.tsx`)
  - Import and render `<TitleScreen />` for the title route; remove `.title-screen`/`.start-button`/`.title-end-link` markup, `handleStart`, and the inline end-link logic; keep the Sound toggle top-right and the "focus the h1 on the title route" effect.
  - _Requirements: 5.2, 5.3, 5.4_

- [x] 7. Title screen tests (`src/app/TitleScreen.test.tsx`)
  - Heading/tagline/facts word for word; primary text + destination and secondary link for 0, 3, 12 complete; ghost `aria-hidden`; focus returns to the heading; axe-core zero violations at 0, 3, 12 complete.
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 8. Update the App tests for the new anchors (`src/app/App.test.tsx`)
  - Replace the "Start" button interactions with the new "Enter the manor" anchor and hash navigation; keep the unchanged title/subtitle/end-link assertions passing.
  - _Requirements: 5.4_

- [x] 9. Fix the sound gesture gate (`src/audio/sound.ts`)
  - In `ensureContext`, when `navigator.userActivation` exists and `hasBeenActive` is false, create nothing, return null, and arm a one-time capture-phase `pointerdown`/`keydown` listener on `window` that creates the context on the first gesture and restarts the ambience when sound is on and the room tag is haunted/inspecting/picking. Keep today's behaviour where `userActivation` is absent or already active. Clear the pending arm in `__resetForTests`.
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 10. Sound gesture-gate tests (`src/audio/sound.test.tsx`)
  - Fake `navigator.userActivation`: `hasBeenActive=false` → mounting a haunted room creates no context; a `keydown` on window creates exactly one and the ambience starts; absent and `hasBeenActive=true` keep today's behaviour. Existing sound tests still pass.
  - _Requirements: 8.6_

- [x] 11. Verify everything
  - `npm test`, `npm run build`, `npm run check:rooms`, `npm run check:size`; report each result.
  - _Requirements: 6.4, 8.7_
```
npm test        → 405 vitest tests pass (33 files) + 102 hook tests pass
npm run build   → tsc clean, Vite built in ~0.4s
npm run check:rooms → all 12 rooms ok
npm run check:size  → initial bundle 20.5 KB gzip ≤ 100 KB
```
