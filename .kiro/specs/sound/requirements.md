# Requirements Document

## Introduction

Dark Pattern Manor is a browser game whose tagline is "Every trick is a ghost. Name it to set the page free." This document specifies **Sound**: a quiet haunted ambience and a few short cues, all synthesized in code with the Web Audio API. No audio files are downloaded and nothing needs licensing. A Sound toggle appears on every page.

Sound is atmosphere layered on a game that is already complete and fully playable in silence. It must never block on autoplay policy, never play before the player has acted, never clip, never interfere with the task bar or the possessed element or the spell cards, and never break the no-fail, accessibility, and privacy promises the rest of the game keeps. Under `prefers-reduced-motion` the sound keeps playing: sound is not motion.

## Glossary

- **Sound**: The subsystem in `src/audio` that synthesizes a haunted ambience and short cues with the Web Audio API and exposes a Sound toggle.
- **AudioContext**: The Web Audio entry point (`window.AudioContext` or `window.webkitAudioContext`). The one the game uses is created lazily, only inside a user gesture.
- **user gesture**: A click, a key press, or a tap — a user-initiated event that browsers accept as the moment to start audio.
- **master gain**: The single `GainNode` every sound passes through, held quiet so nothing clips.
- **ambience**: The continuous bed heard only while a room is haunted: a low room tone plus occasional soft candle crackles.
- **cue**: A short (0.2–1.2 s) one-shot sound tied to one game event, exposed as a named function so a test can see which played.
- **Sound toggle**: The on/off control shown top-right inside the manor frame on every page, with a speaker icon and the visible word "Sound".
- **haunted room**: A room whose state machine tag is `haunted`, `inspecting`, or `picking` — the states in which the ambience plays.
- **dpm-sound**: The `localStorage` key under which the player's on/off choice is remembered (`"on"` or `"off"`).
- **no-op**: A function that does nothing and throws nothing, used when no AudioContext is available.
- **FS**: Full scale, the maximum undistorted amplitude; sound levels are given in dB below FS.

## Requirements

### Requirement 1: Lazy, gesture-gated audio

**User Story:** As a player, I want sound to start only after I act, so that the browser never blocks it and nothing plays before I have touched the game.

#### Acceptance Criteria

1. THE Sound subsystem SHALL NOT create an AudioContext at module import or at page load.
2. WHEN the first user gesture occurs with sound on, THE Sound subsystem SHALL create exactly one AudioContext and reuse it for all later sound.
3. WHILE sound is off, WHEN a user gesture occurs, THE Sound subsystem SHALL NOT create an AudioContext.
4. IF neither `window.AudioContext` nor `window.webkitAudioContext` exists, THEN THE Sound subsystem SHALL make every sound function a no-op that does nothing and throws nothing.
5. WHEN the AudioContext exists but is suspended by the browser, THE Sound subsystem SHALL resume it inside a user gesture before playing.

### Requirement 2: Levels and no clipping

**User Story:** As a player, I want the sound to stay quiet and clean, so that it is atmosphere and never a loud or distorted surprise.

#### Acceptance Criteria

1. THE Sound subsystem SHALL route every sound through one master gain.
2. THE Sound subsystem SHALL hold the ambience at about -20 dB below full scale.
3. THE Sound subsystem SHALL hold the cues at about -12 dB below full scale.
4. THE Sound subsystem SHALL keep the summed signal at or below full scale so that no sound clips.

### Requirement 3: The haunted ambience

**User Story:** As a player, I want a quiet room tone and the odd candle crackle while a room is haunted, so that the manor feels alive without distracting me.

#### Acceptance Criteria

1. WHILE a room's state is `haunted`, `inspecting`, or `picking` AND sound is on, THE Sound subsystem SHALL play an ambience of a low room tone — noise through a low-pass filter around 300 Hz with a slow random drift — and, at random intervals of 2 to 6 seconds, a soft candle crackle of a few very short filtered noise clicks.
2. WHEN a room opens with the ambience playing, THE Sound subsystem SHALL fade the ambience in over about 2 seconds.
3. WHEN a room turns honest, THE Sound subsystem SHALL fade the ambience out over about 1.5 seconds.
4. WHEN the player leaves the room, THE Sound subsystem SHALL stop and disconnect every ambience node and clear every ambience timer.
5. WHILE a room's state is `named`, `honest`, or `done`, THE Sound subsystem SHALL NOT play the ambience.

### Requirement 4: The cues

**User Story:** As a player, I want a short sound at each key moment, so that the lantern, the cold breath, the whisper, the ghost fleeing, the honest chime and the ending each have a voice.

#### Acceptance Criteria

1. THE Sound subsystem SHALL expose each cue as a named function so a test can see which played, each cue lasting between 0.2 and 1.2 seconds.
2. WHEN the lantern turns on, THE Sound subsystem SHALL play `lantern`: a soft low "whoomph" — a noise burst through a falling low-pass sweep.
3. WHEN the possessed element is selected, THE Sound subsystem SHALL play `cold`: a cold breath — band-passed noise swelling in and out.
4. WHEN a wrong spell card is chosen, THE Sound subsystem SHALL play `whisper`: a short whispered "shh" — band-passed noise around 2–4 kHz with a fast attack and a short tail — at the same moment as the whispered hint.
5. WHEN the correct spell card is chosen, THE Sound subsystem SHALL play `flee`: an airy rising glide — a sine from about 220 Hz to 880 Hz with a light tremolo, under a noise breath.
6. WHEN the room's task is completed on the honest page, THE Sound subsystem SHALL play `honest`: a warm soft chime of two sine partials a fifth apart with about a 0.6 s decay.
7. WHEN the ending page opens with all twelve rooms named, THE Sound subsystem SHALL play `quiet` once: a gentle three-note descending chime.
8. WHILE sound is off, WHEN any cue event occurs, THE Sound subsystem SHALL play nothing.

### Requirement 5: Where cues fire (purity of the machine)

**User Story:** As a developer, I want cues fired from the view, not the reducer, so that the state machine stays pure and its tests stay unchanged.

#### Acceptance Criteria

1. THE Sound subsystem SHALL fire room cues from effects in `Room.tsx` that watch the state machine's tag and the wrong-pick count, and the `quiet` cue from an effect in `EndingPage.tsx`.
2. THE Sound subsystem SHALL NOT be called from inside `machine.ts`, and `machine.ts` SHALL remain pure with its existing tests unchanged.
3. WHEN a wrong card is chosen, THE Sound subsystem SHALL play `whisper` exactly once per wrong pick, keyed on the wrong-pick count, never re-firing on an unrelated re-render.

### Requirement 6: The Sound toggle

**User Story:** As a player, I want one clear Sound button on every page, so that I can turn the manor's sound on or off whenever I like.

#### Acceptance Criteria

1. THE Sound toggle SHALL appear on the title page, every room, and the ending page, placed top-right inside the manor frame with a small inline-SVG speaker icon and the visible word "Sound".
2. THE Sound toggle SHALL set `aria-pressed` to true when sound is on and false when sound is off.
3. THE Sound toggle SHALL present a target at least 44 by 44 CSS pixels and be reachable by keyboard in a sensible tab order.
4. THE Sound toggle SHALL NOT cover the task bar, the possessed element, the ghost, or the spell cards at a 1920 by 1080 viewport or at a 412 px wide viewport.
5. THE Sound subsystem SHALL default sound to on while staying silent until the player's first gesture.
6. WHEN the player turns sound off, THE Sound subsystem SHALL stop everything at once, including the ambience.
7. WHEN the player turns sound on again, THE Sound subsystem SHALL resume the ambience if a room is currently haunted.
8. THE Sound subsystem SHALL remember the choice in `localStorage` under the key `dpm-sound` with the value `"on"` or `"off"`.
9. IF `localStorage` throws, THEN THE Sound subsystem SHALL use the default and SHALL NOT throw.

### Requirement 7: Look and accessibility

**User Story:** As a player who uses a keyboard or screen reader or who prefers reduced motion, I want the toggle to match the manor and stay calm, so that it is usable and never jarring.

#### Acceptance Criteria

1. THE Sound toggle SHALL take its colours only from `src/styles/tokens.css` and SHALL meet WCAG AA contrast.
2. THE Sound toggle SHALL show a visible focus ring: a 3 px candle outline on dark surfaces.
3. WHERE `prefers-reduced-motion` is active, THE Sound toggle SHALL present no animation, AND THE Sound subsystem SHALL keep the ambience and cues playing, because sound is not motion.
4. THE Sound toggle SHALL report zero axe-core violations on the title page and on room 1.

### Requirement 8: Privacy and budget

**User Story:** As a player on a slow connection who cares about privacy, I want sound to add almost nothing to the download and to send nothing anywhere, so that the game stays small and private.

#### Acceptance Criteria

1. THE Sound subsystem SHALL synthesize all sound in code, downloading no audio file and requiring no licence.
2. THE Sound subsystem SHALL set no cookie and make no third-party network request; its only persisted state is the `dpm-sound` key in `localStorage`.
3. THE Sound subsystem SHALL add well under 3 KB gzipped to the initial bundle, and `npm run check:size` SHALL still pass under the 100 KB limit.

### Requirement 9: Testing

**User Story:** As a developer, I want the sound covered by tests that run without a real audio device, so that the behaviour stays correct as the game changes.

#### Acceptance Criteria

1. THE Sound subsystem SHALL ship tests that pass under `npm test`, using a small fake AudioContext.
2. THE tests SHALL assert that no AudioContext is created at import or before a gesture, exactly one is created after the first gesture with sound on, and none with sound off.
3. THE tests SHALL assert the toggle's `aria-pressed`, the stored value, the default, and that a throwing `localStorage` does not throw.
4. THE tests SHALL assert that each room event plays the right cue once — the lantern, selecting the possessed element, each wrong card (whisper together with the hint), the right card (flee), completing the task (honest) — and that with sound off none plays.
5. THE tests SHALL assert that leaving a room stops the ambience and clears its timers, using fake timers.
6. THE tests SHALL assert that nothing throws when no AudioContext exists.
7. THE tests SHALL include axe-core checks reporting zero violations on the title page and on room 1 with the toggle present.
8. THE existing tests SHALL still pass, and so SHALL `npm run build`, `npm run check:rooms`, and `npm run check:size`.
