# Implementation Plan

- [x] 1. The sound engine module (`src/audio/sound.ts`)
  - Lazy single `AudioContext` + master gain, created only inside a gesture; no-op when no constructor exists.
  - Toggle store: `isSoundOn`, `setSoundOn`, `subscribe`, backed by `localStorage['dpm-sound']` with a safe default of on.
  - `setRoomTag`, level helpers (`AMBIENCE_DB`, `CUE_DB`), `hasAudio`, `__resetForTests`.
  - The six cues: `lantern`, `cold`, `whisper`, `flee`, `honest`, `quiet`.
  - Ambience: `startAmbience`, `fadeOutAmbience`, `stopAmbience` with node + timer bookkeeping and the 2 s / 1.5 s fades and 2–6 s crackle schedule.
  - _Requirements: 1, 2, 3, 4, 6.5–6.9, 8.1, 8.2_

- [x] 2. The Sound toggle component (`src/audio/SoundToggle.tsx`)
  - A real `<button>` with an inline-SVG speaker icon and the visible word "Sound", `aria-pressed` tracking the store, subscribing for updates.
  - _Requirements: 6.1, 6.2, 7.1, 7.2_

- [x] 3. Toggle styles in `src/styles/manor.css`
  - `.sound-toggle` top-right inside the manor frame, 44×44 min target, tokens only, AA contrast, 3 px candle focus ring, calm under reduced motion, clear of the task bar / possessed element / ghost / cards at 1920×1080 and 412 px.
  - _Requirements: 6.3, 6.4, 7.1, 7.2, 7.3_

- [x] 4. Mount the toggle on every page (`src/app/App.tsx`)
  - Render `SoundToggle` once in the app shell so it shows on the title page, every room, and the ending in a sensible tab order.
  - _Requirements: 6.1, 6.3_

- [x] 5. Fire room cues and drive the ambience from `Room.tsx`
  - Effects on `state.tag` and `state.whisperNonce`: `lantern`, `cold`, `whisper` (with the hint), `flee`, `honest`; `setRoomTag` on every tag change; start/fade-out/stop the ambience; stop + `setRoomTag(null)` on unmount. No change to `machine.ts`.
  - _Requirements: 3, 4.2–4.6, 5_

- [x] 6. Fire the `quiet` cue from `EndingPage.tsx`
  - One mount effect: play `quiet()` once when all twelve are named.
  - _Requirements: 4.7, 5.1_

- [x] 7. Tests (`src/audio/sound.test.tsx`)
  - Fake AudioContext; lazy/gesture gate; toggle aria-pressed/stored/default/throwing storage; each room cue once and none with sound off; leaving a room stops ambience and clears timers (fake timers); no throw without AudioContext; axe-core on the title page and room 1.
  - _Requirements: 9_

- [x] 8. Verify everything
  - `npm test`, `npm run build`, `npm run check:rooms`, `npm run check:size`; report each result.
  - _Requirements: 8.3, 9.8_
