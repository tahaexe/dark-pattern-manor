# Requirements Document

## Introduction

Dark Pattern Manor already has Sound: a quiet haunted ambience, six short cues, and a Sound toggle, all synthesized in code with the Web Audio API (see the `sound` spec). This document specifies **Soundscape**: a richer, layered ambience with a distinct voice for each of the twelve rooms, and fuller versions of the three haunted-moment cues that already exist.

Soundscape changes nothing the player triggers. It adds no new game event, no new control, and no new storage. It only deepens what is already heard while a room is haunted, inspecting or picking, and makes the existing wrong-card, right-card and honest-page cues fuller. Every rule the `sound` spec keeps is kept here too: one `AudioContext` born only inside a user gesture, a silent no-op without Web Audio, one master gain, the ambience about -20 dBFS and the cues about -12 dBFS so the sum never clips, the one `localStorage` key `dpm-sound`, no audio files, no network, and a game that is fully playable in silence. Sound off still stops everything at once.

Under `prefers-reduced-motion` the sound keeps playing: sound is not motion. Nothing is a jump scare; no screams, no sudden loud sounds; every layer is quiet and slowly varying so the bed never loops audibly.

## Glossary

- **Soundscape**: The richer ambience and fuller cues added on top of the existing Sound subsystem in `src/audio/sound.ts`.
- **ambience**: The continuous bed heard only while a room is haunted, inspecting or picking. With Soundscape it is built from several small synthesized layers summed under one ambience gain.
- **layer**: One small synthesized source within the ambience (room tone, wind, distant clock, house settling, or a room's voice), each quiet and slowly varying.
- **room voice**: One extra ambience layer chosen by the room's slug, so each room sounds like its place. Every one of the twelve rooms has exactly one voice; no other slug does.
- **voice table**: The map from room slug to the voice layer, held in `sound.ts`.
- **cue**: A short one-shot sound tied to one game event (`lantern`, `cold`, `whisper`, `flee`, `honest`, `quiet`).
- **haunted room**: A room whose state-machine tag is `haunted`, `inspecting`, or `picking` — the states in which the ambience plays.
- **AMBIENCE_DB / CUE_DB**: The two level targets in dB below full scale, -20 and -12, exported from `sound.ts`. Each ambience layer's peak sits at or below `AMBIENCE_DB`.
- **creak scheduler**: The timer that fires the house-settling creak at random intervals.
- **no-op**: A function that does nothing and throws nothing, used when no `AudioContext` is available.
- **FS**: Full scale, the maximum undistorted amplitude; sound levels are given in dB below FS.

## Requirements

### Requirement 1: The rules are kept at the top of the module (invariants)

**User Story:** As a developer, I want the Soundscape to keep every rule the Sound subsystem already keeps, so that richer sound never breaks autoplay, clipping, privacy or the silent fallback.

#### Acceptance Criteria

1. THE Soundscape SHALL use exactly one `AudioContext`, created lazily and only inside a user gesture, never at module import or page load.
2. IF neither `window.AudioContext` nor `window.webkitAudioContext` exists, THEN every Soundscape function SHALL be a no-op that does nothing and throws nothing.
3. THE Soundscape SHALL route every layer and every cue through the one master gain.
4. THE Soundscape SHALL hold the whole ambience (the sum of all its layers) at about -20 dB below full scale and each cue at about -12 dB below full scale, so the summed signal stays at or below full scale and nothing clips.
5. THE Soundscape SHALL persist no state other than the single `localStorage` key `dpm-sound`, download no audio file, and make no third-party network request.
6. WHEN sound is turned off, THE Soundscape SHALL stop every layer and every cue at once.
7. WHERE `prefers-reduced-motion` is active, THE Soundscape SHALL keep the ambience and cues playing unchanged, because sound is not motion.

### Requirement 2: The layered ambience

**User Story:** As a player, I want the haunted bed to feel like a living house, so that the manor is alive without any single sound repeating or distracting me.

#### Acceptance Criteria

1. WHILE a room's state is `haunted`, `inspecting`, or `picking` AND sound is on, THE Soundscape SHALL play an ambience built from small synthesized layers, each quiet and slowly varying so the bed never loops audibly.
2. THE ambience SHALL include the room tone that exists today: noise through a low-pass filter around 300 Hz with a slow random drift.
3. THE ambience SHALL include wind through the hall: filtered noise whose band and level drift slowly.
4. THE ambience SHALL include a distant clock: a soft, muffled tick about once a second, far back in the mix.
5. THE ambience SHALL include the house settling: an occasional low wooden creak at random intervals between 8 and 20 seconds.
6. WHILE a room's state is `named`, `honest`, or `done`, THE Soundscape SHALL NOT play the ambience.
7. WHEN a room opens haunted, THE ambience SHALL fade in; WHEN a room turns honest, THE ambience SHALL fade out as it does today.
8. WHEN the player leaves the room, THE Soundscape SHALL stop and disconnect every ambience node and clear every ambience timer (room tone, wind, clock, creak, and voice).

### Requirement 3: A voice for each room

**User Story:** As a player, I want each room to sound like its place, so that the Foyer, the Library and the Cellar each have their own quiet character.

#### Acceptance Criteria

1. THE Soundscape SHALL hold a voice table mapping each of the twelve room slugs to exactly one extra ambience layer.
2. THE voice table SHALL cover all twelve room slugs (`gravemoor-gazette`, `inkbone-books`, `grimsupper`, `gloamline`, `hollowpost`, `shroudery`, `lanternstay`, `mothmilk`, `mildew`, `wanderwick`, `rookery`, `bramblegate`) and no other slug.
3. WHEN a room is haunted, THE Soundscape SHALL play the voice chosen by that room's slug as one more ambience layer, below the room tone and below every cue.
4. THE room voices SHALL be: The Foyer (`gravemoor-gazette`) a draught under the door; The Library (`inkbone-books`) a page turning now and then; The Dining Room (`grimsupper`) a faint clink of cutlery; The Parlour (`gloamline`) a fire crackling low; The Conservatory (`hollowpost`) the clock's tick louder and a little too fast; The Ballroom (`shroudery`) a far-off, detuned waltz phrase; The Portrait Gallery (`lanternstay`) murmuring that never forms words; The Pantry (`mothmilk`) a jar lid rattling; The Study (`mildew`) a pen scratching; The Nursery (`wanderwick`) a slow, slightly out-of-tune music box; The Attic (`rookery`) rain on the roof; The Cellar (`bramblegate`) water dripping.
5. THE Soundscape SHALL keep every voice subtle: no jump scare, no scream, no sudden loud sound; each voice's peak SHALL stay at or below the ambience target.
6. IF a room's slug is not in the voice table, THEN the ambience SHALL still play its other layers and SHALL NOT throw.

### Requirement 4: Fuller cues for the existing moments

**User Story:** As a player, I want the wrong card, the right card and the honest page to sound fuller, so that the moments that already exist have more body, without any new moment being added.

#### Acceptance Criteria

1. THE Soundscape SHALL add body to the three existing moment cues only, firing on the same triggers, at the same levels, with no new trigger in any room.
2. WHEN a wrong card is chosen, THE Soundscape SHALL play a candle gutter — a short airy dip — together with the existing whisper, at the same moment as the whispered hint.
3. WHEN the correct card is chosen, THE Soundscape SHALL play the ghost's unwinding sigh rising into the existing flee glide, keeping the flee's existing length.
4. WHEN the room's task is completed on the honest page, THE Soundscape SHALL play a warm, resolved chord, and the ambience SHALL fade as it does today.
5. THE fuller cues SHALL each stay within the cue level (about -12 dBFS peak) and SHALL begin and end at amplitude 0 so there is no click.
6. THE Soundscape SHALL NOT change where cues fire: they stay driven from the view (`Room.tsx` and `EndingPage.tsx`), and `machine.ts` stays pure and untouched.

### Requirement 5: Testing (correctness properties)

**User Story:** As a developer, I want the Soundscape covered by tests that run without a real audio device, so that its invariants hold as the game changes.

#### Acceptance Criteria

1. THE tests SHALL assert that the voice table's keys are exactly the twelve room slugs — covering all twelve and nothing else.
2. THE tests SHALL assert that every ambience layer's peak gain stays strictly below the ambience target `DB(AMBIENCE_DB)` (no layer alone reaches the whole-ambience level).
3. THE tests SHALL assert that turning sound off stops every ambience layer at once (every layer node stopped and disconnected, no timer left pending).
4. THE tests SHALL assert, with a fast-check property test, that the creak scheduler's chosen intervals always fall within 8 to 20 seconds.
5. THE tests SHALL assert that a room whose slug has no voice still starts its ambience without throwing.
6. THE existing Sound tests SHALL still pass, and so SHALL `npm test`, `npm run build`, `npm run check:rooms`, and `npm run check:size`.

### Requirement 6: Documentation

**User Story:** As a reader of the project, I want the sound line and the steering to name the richer soundscape, so that the docs match the code.

#### Acceptance Criteria

1. THE README's sound line SHALL be updated to describe the layered ambience with a per-room voice and the fuller moment cues.
2. THE haunted-UI steering document SHALL gain one short "Sound" rule: subtle, synthesized in code, no sudden loud sounds, fully playable in silence.
