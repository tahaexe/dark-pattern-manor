# Implementation Plan

- [x] 1. Add the room-slug seam and the layered-ambience scaffold in `sound.ts`
  - Add module-level `roomSlug` state and `setRoomSlug(slug: string | null)`, mirroring `roomTag`.
  - Add `AMBIENCE_GAIN`-relative `layerPeak(scale)` helper and a module array recording each ambience layer's peak, reset on `startAmbience()`, read by `__ambienceLayerPeaks()`.
  - Export `creakDelayMs(rand = Math.random)` returning an integer in `[8000, 20000]`.
  - Keep all existing invariants and exports unchanged.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.5_

- [x] 2. Build the shared ambience layers in `startAmbience()`
  - Factor the room tone into `buildRoomTone` (unchanged character, connected through `amb.gain`, scale 0.9).
  - Add `buildWind` (band and level drift slowly, scale 0.5), `buildClock` (soft muffled tick ~1/s, far back, scale 0.25), and `buildCreak` (low wooden creak every `creakDelayMs()`, scale 0.6, re-scheduling).
  - Connect every layer into the single `amb.gain`; record every node on `amb.nodes` and every timer on `amb.timers`; record each layer peak.
  - Keep the ~2 s fade-in and the honest-page fade-out and leave-room stop behaviour.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 3. Add the voice table and the twelve voice builders
  - Add `VOICES: Record<string, VoiceBuilder>` with one builder per slug and export `VOICE_SLUGS`.
  - Implement the twelve subtle builders (draught, page turn, cutlery, fire, fast clock, waltz, murmur, jar lid, pen scratch, music box, rain, drip), each below the ambience target, no sudden loud sound.
  - In `startAmbience()`, run `VOICES[roomSlug]` if present; an unknown slug adds no voice and never throws.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 4. Make the three existing cues fuller
  - `whisper()`: add the candle gutter (short airy dip) under the shh, within `CUE_GAIN`, starting and ending at 0.
  - `flee()`: add the ghost's unwinding sigh rising into the existing glide, keeping ~0.6 s length.
  - `honest()`: grow to a warm, resolved three-note chord, same ~0.6 s decay, peak at the cue target.
  - Do not touch `lantern`, `cold`, `quiet`, the triggers, or `machine.ts`.
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 5. Wire the room slug from the view
  - In `Room.tsx`, call `setRoomSlug(room.slug)` where the ambience starts and `setRoomSlug(null)` in the unmount cleanup beside `stopAmbience()`.
  - No reducer change; existing reducer tests untouched.
  - _Requirements: 3.3, 4.6_

- [x] 6. Tests for the soundscape invariants
  - Voice table covers exactly the twelve registry slugs (set equality against `roomSlugs()`).
  - Every ambience layer peak is `> 0` and strictly `< DB(AMBIENCE_DB)`.
  - Turning sound off stops every ambience layer and leaves no pending scheduler timer.
  - fast-check property: `creakDelayMs(rand)` is always within `[8000, 20000]`.
  - An unknown slug starts the ambience without throwing.
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 7. Documentation
  - Update the README's sound line to describe the layered ambience with a per-room voice and the fuller moment cues.
  - Add one short "Sound" rule to `.kiro/steering/haunted-ui.md`: subtle, synthesized in code, no sudden loud sounds, fully playable in silence.
  - _Requirements: 6.1, 6.2_

- [x] 8. Run the gates and report
  - Run `npm test`, `npm run build`, `npm run check:rooms`, `npm run check:size`; report each result and every file changed.
  - _Requirements: 5.6_
