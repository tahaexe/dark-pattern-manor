# Requirements Document

## Introduction

Dark Pattern Manor is a browser game whose tagline is "Every trick is a ghost. Name it to set the page free." Each of the 12 rooms is a fictional brand's website possessed by one real dark pattern. The player spots the trick, names it, and the page turns honest beside its haunted twin.

This document specifies the **Room Engine**, the core subsystem that drives a single room through its lifecycle. The Room Engine owns the typed room data, the room state machine (haunted → inspecting → picking → named → honest → done), accessibility guarantees, the ghost "signs" that give the possessed element away, the no-fail rule that a wrong guess costs nothing, the test coverage, the on-demand loading of room components, and the fiction-and-honesty rules that keep every brand fictional and every honest twin a real best practice.

The Room Engine must serve all 12 rooms without favouring any one. It is the contract between the per-room content (Haunted and Honest components, spell cards, Ghost Guide entries) and the shared app shell (routing, progress, shared UI). It enforces the data invariants and the loop rules that the rest of the game depends on.

## Glossary

- **Room_Engine**: The subsystem in `src/engine` that manages a room's state machine, renders its haunted and honest variants, and enforces the room data rules.
- **RoomData**: A single typed object describing one room: its unique numeric id, kebab-case slug, display name, fictional brand name, brand kind, dark-pattern name, task string, possessed-element id, haunted variant component, honest variant component, three spell cards, and Ghost Guide entry.
- **dark pattern**: A user-interface trick that manipulates people into decisions they would not otherwise make, such as Visual interference, Confirmshaming, or Hard to cancel.
- **haunted variant**: The room's fictional brand page in its possessed state, where the dark pattern is live and one element behaves like the trick.
- **honest variant**: The same room's best-practice page, shown beside the haunted twin, where the player's task takes one click.
- **possessed element**: The interactive element on the haunted page that holds the dark pattern and shows small signs (flicker, a cold breath, pushing the cursor).
- **spell card**: One of exactly three cards the player picks to name the dark pattern. One card is correct, one is a close relative, one is clearly different.
- **close-relative card**: A wrong spell card that names a dark pattern related to the correct one.
- **clearly-different card**: A wrong spell card that names a dark pattern unrelated to the correct one.
- **Ghost Guide entry**: The card that opens after the ghost flees: a two-sentence definition, a where-you-meet-it string, a US legal line (source label and URL), an EU legal line (source label and URL), and one protection tip.
- **Before/After slider**: The control that splits the haunted and honest versions, operable by keyboard as an ARIA slider.
- **comparison box**: The single box, shown from the honest state on, that stacks the haunted version and its honest twin in one cell and wipes the honest twin over the haunted version from the left up to the slider's value.
- **lantern**: The control (a button and the L key) that lights the lantern — turning the page to the inspecting state, which rings the possessed element, scrolls it into view, and focuses it. It is the hint, not a movable light.
- **miss counter**: A non-negative integer carried in the state, incremented each time the player selects a non-possessed element while haunted or inspecting. It drives stuck help; it is never a score, strike, or penalty.
- **live region**: An ARIA live region, set to polite, that announces state changes and whispers to assistive technology.
- **prefers-reduced-motion**: The user setting exposed through the CSS media query of the same name; when active it replaces all motion-based ghost signs with static signs.
- **task string**: The player's goal for the room, shown in the task bar (for example, "reject the cookies").
- **brand kind**: The kind of fictional site a room presents, such as news, streaming, groceries, or gym.

## Requirements

### Requirement 1: Room Data Model

**User Story:** As a developer, I want one typed RoomData object per room so that the engine can validate every room against the same rules.

#### Acceptance Criteria

1. WHEN the Room_Engine loads a room, THE Room_Engine SHALL provide a RoomData object containing a unique positive-integer id, a non-empty kebab-case slug, a non-empty display name, a non-empty fictional brand name, a non-empty brand kind, a non-empty dark-pattern name, a non-empty task string, a non-empty possessed-element id, a haunted variant component, and an honest variant component.
2. THE Room_Engine SHALL require each RoomData object to contain exactly three spell cards, each carrying a non-empty dark-pattern name.
3. THE Room_Engine SHALL require the three spell cards to contain exactly one correct card whose dark-pattern name matches the room's dark-pattern name, exactly one close-relative card, and exactly one clearly-different card.
4. WHERE a spell card is not the correct card, THE Room_Engine SHALL require that spell card to carry a non-empty hint string.
5. THE Room_Engine SHALL require each RoomData object to carry a Ghost Guide entry with a non-empty two-sentence definition, a non-empty where-you-meet-it string, a US legal line containing a non-empty source label and URL, an EU legal line containing a non-empty source label and URL, and a non-empty protection tip.
6. THE Room_Engine SHALL require all room ids to be unique across the set of rooms.

### Requirement 2: Room State Machine

**User Story:** As a player, I want each room to flow from a haunted page through naming the trick to an honest twin, so that the lesson lands without any dead ends, and I want my very first tap on the trick to work.

#### Acceptance Criteria

1. THE Room_Engine SHALL manage each room through a state machine whose states are haunted, inspecting, picking, named, honest, and done.
2. WHEN the player activates the lantern by pointer, keyboard, or the L key while the room is in the haunted state, THE Room_Engine SHALL transition to the inspecting state, which lights the lantern: a candle-coloured ring is drawn around the possessed element, the possessed element is scrolled into view and receives keyboard focus, and the live region announces "The lantern lights the trick. Tap it."
3. WHILE the room is in the haunted state, WHEN the player selects the possessed element by pointer, keyboard, or screen reader, THE Room_Engine SHALL transition straight to the picking state, without first lighting the lantern.
4. WHILE the room is in the haunted state, WHEN the player selects a non-possessed interactive element, THE Room_Engine SHALL remain in the haunted state, announce "Not that one. Look again, or light the lantern for a hint.", and increment the miss counter.
5. WHILE the room is in the inspecting state, WHEN the player selects the possessed element by pointer, keyboard, or screen reader, THE Room_Engine SHALL transition to the picking state.
6. WHILE the room is in the inspecting state, WHEN the player selects a non-possessed interactive element, THE Room_Engine SHALL remain in the inspecting state, announce "Nothing haunts this. Look for the candle ring.", and increment the miss counter.
7. WHILE the room is in the picking state, WHEN the player selects the correct spell card, THE Room_Engine SHALL transition to the named state and, without further player input, transition to the honest state.
8. WHILE the room is in the picking state, WHEN the player selects a wrong spell card, THE Room_Engine SHALL remain in the picking state and announce that card's hint.
9. WHEN the player activates the honest variant's task action a single time by pointer, keyboard, or screen reader, THE Room_Engine SHALL transition to the done state.
10. WHEN the room reaches the done state, THE Room_Engine SHALL save progress to localStorage and unlock the next room.
11. THE Room_Engine SHALL keep all progress data in localStorage on the player's device without setting cookies or making third-party network requests.
12. WHILE the room is in any state other than done, THE Room_Engine SHALL ensure that at least one path from the current state to the done state remains available before and after any player input.
13. WHILE the room is in the haunted state, WHEN twenty seconds pass with no transition out of haunted, OR WHEN the miss counter reaches two, THE Room_Engine SHALL glow the lantern button and end the instruction line with " Stuck? Light the lantern.", clearing the timer on every state change and on unmount.

### Requirement 3: Accessibility

**User Story:** As a player who uses keyboard or screen reader, I want the whole room to be operable and announced, so that I can play on equal terms with pointer users.

#### Acceptance Criteria

1. WHEN any state change occurs, THE Room_Engine SHALL announce the new state through a polite live region.
2. WHEN any state change occurs, THE Room_Engine SHALL move keyboard focus to a heading element that labels the new state, except when lighting the lantern moves focus to the possessed element.
3. THE Room_Engine SHALL allow every control to be operated by keyboard alone.
4. THE Room_Engine SHALL render text that meets WCAG AA contrast in both the haunted and honest states.
5. THE Room_Engine SHALL make the possessed element focusable with a non-empty accessible name, selectable by pointer, keyboard, and screen reader, and SHALL give it a tap area of at least 24 by 24 CSS pixels.
6. THE Room_Engine SHALL provide the Before/After slider as an ARIA slider operable by keyboard.
7. THE Room_Engine SHALL render the candle-coloured ring that marks the possessed element after the lantern is lit as an aria-hidden, pointer-events:none overlay, positioned inside the haunted frame from the possessed element's offsets and recomputed on resize.

### Requirement 9: The Before/After Comparison Wipe

**User Story:** As a player, once the ghost has fled, I want the honest twin to wipe over the haunted version in one comparison box so that I can see exactly what changed and move the reveal myself by keyboard or pointer.

#### Acceptance Criteria

1. WHEN the room enters the honest state, THE Room_Engine SHALL render a single comparison box that stacks the haunted version and its honest twin in the same grid cell so that the box is as tall as the taller version and neither version shifts the layout.
2. THE Room_Engine SHALL draw the haunted version underneath and the honest twin on top, and SHALL reveal the honest twin from the left edge up to the slider's value using `clip-path: inset(0 calc(100% - var(--split)) 0 0)`, where the honest layer carries a `--split` custom property equal to the slider's value as a percentage.
3. THE Room_Engine SHALL treat a slider value of 0 as fully haunted and 100 as fully honest.
4. WHEN the comparison box first appears AND prefers-reduced-motion is active, THE Room_Engine SHALL set the slider to 50 and hold it there without animation.
5. WHEN the comparison box first appears AND prefers-reduced-motion is not active, THE Room_Engine SHALL sweep the slider once from 0 to 50 over about 0.8 seconds and then rest at 50.
6. THE Room_Engine SHALL render, at the reveal edge, a decorative (`aria-hidden`) vertical divider in the candle colour with a small round grip.
7. THE Room_Engine SHALL render a small "Haunted" label in the top-right corner and a "Honest" label in the top-left corner, each visible only on its own side of the divider.
8. THE Room_Engine SHALL label the Before/After slider "Before and After slider" and step its value by 5 for the arrow keys, by 25 for Page Up and Page Down, to 0 for Home, and to 100 for End, clamped to the range 0–100, and SHALL set the slider's value from the pointer's x position when the player drags on the range or on the comparison box, without moving keyboard focus.
9. WHEN any element inside the honest layer of the comparison box receives keyboard focus, THE Room_Engine SHALL move the slider to 100 at once, so that a focused control is never hidden by the clip (WCAG 2.4.11).
10. THE Room_Engine SHALL keep the honest twin interactive (its single task action completes the room) and keep the haunted version non-interactive (preview mode), relying on `clip-path` so the clipped-away honest parts receive no pointer events.
11. THE Room_Engine SHALL give the comparison box `role="group"` with the accessible name "Haunted and honest versions", keep the haunted preview announced as it is today, and read nothing new on each slider step beyond the native range's value.
12. WHERE the viewport is narrower than 600 px, THE Room_Engine SHALL render the comparison box at full width with the same wipe behaviour.

### Requirement 4: Ghost Signs and Reduced Motion

**User Story:** As a player, I want the possessed element to give itself away with small signs, and to get static signs when I prefer reduced motion, so that the haunting is a clue and never a seizure risk or hidden content.

#### Acceptance Criteria

1. WHILE the room is in the haunted or inspecting state, THE Room_Engine SHALL display on the possessed element at least one sign perceivable by pointer, keyboard, and screen reader, being one of the following: a flicker that does not flash more than 3 times per second, a cold breath visual effect near the element, or a cursor displacement away from the honest action.
2. WHERE prefers-reduced-motion is active, THE Room_Engine SHALL replace motion-based signs with static signs perceivable by keyboard and screen reader, comprising a visible outline meeting WCAG AA contrast and a text label identifying the element as possessed.
3. THE Room_Engine SHALL keep all text content readable and all interactive elements operable while any ghost sign is displayed, so that the haunting remains a clue and never hides content.

### Requirement 5: No Fail State

**User Story:** As a player, I want a wrong guess to cost nothing, so that I can learn by trying without fear of losing progress.

#### Acceptance Criteria

1. THE Room_Engine SHALL provide no timer that penalises, no score, no strike counter, and no progress-reset mechanism; the miss counter and the twenty-second stuck-help timer only surface help and never deduct progress or block any path to done.
2. WHEN the player selects a wrong spell card, THE Room_Engine SHALL keep the player in the picking state, preserving room progress and position in the game sequence without any deduction or penalty.
3. WHEN the player selects a wrong spell card, THE Room_Engine SHALL trigger a light flicker.
4. WHERE prefers-reduced-motion is active, THE Room_Engine SHALL show a non-animated visual indicator instead of a light flicker.
5. WHEN the player selects a wrong spell card, THE Room_Engine SHALL keep all spell cards selectable and functional.

### Requirement 6: Testing Requirements

**User Story:** As a developer, I want automated tests for the engine, so that the room rules and loop stay correct as rooms are added.

#### Acceptance Criteria

1. THE Room_Engine SHALL ship with unit tests that pass under the project test command and assert the resulting state for every state-machine transition defined in Requirement 2, including the first-tap transition from haunted straight to picking and the miss counter.
2. THE Room_Engine SHALL ship with property-based tests using fast-check that pass under the project test command and verify every room data correctness property listed in the Correctness Properties section, including the spell-card shuffle property.
3. THE Room_Engine SHALL ship with property-based tests using fast-check that pass under the project test command and verify every state machine correctness property listed in the Correctness Properties section.
4. THE Room_Engine SHALL ship with axe-core checks that pass under the project test command and report zero violations for at least one room rendered in each of the six states: haunted, inspecting, picking, named, honest, and done.

### Requirement 7: Performance

**User Story:** As a player on a slow connection, I want the first load to stay small, so that the game starts quickly and rooms load only when I reach them.

#### Acceptance Criteria

1. THE Room_Engine SHALL ensure that the initial application bundle contains the Room_Engine code and the shared UI components, and excludes the room data, haunted variant component, honest variant component, and CSS of every room.
2. WHEN a room is entered, THE Room_Engine SHALL load that room's room data, haunted variant component, honest variant component, and CSS on demand through dynamic import.
3. THE Room_Engine SHALL ensure that the initial application bundle does not exceed 100 KB in compressed size.

### Requirement 8: Fiction and Honesty

**User Story:** As a player, I want fictional brands and honest best practices, so that the game teaches real patterns without impersonating or defaming real companies.

#### Acceptance Criteria

1. THE Room_Engine SHALL consider a RoomData object valid only when every brand-identifying value in that room — the brand name, the brand kind, the displayed colours, the logo shape, and every named person, product, and price shown in the room's content — is fictional, where a value is fictional when it is not a real brand's name or name stem, not a real brand's colours, not a real brand's logo shape, not a real person's name, not a real product name, and not a real product price.
2. THE Room_Engine SHALL render the honest variant as a functional best-practice page in which the room's task string completes in one action and that contains no instance of the dark pattern named in that room's RoomData.
3. THE Room_Engine SHALL render brand identity in a room solely from that room's RoomData, introducing no real-brand name, colours, logo shape, person, product, or price of its own.
4. IF a RoomData object contains a real brand's name or name stem, a real brand's colours, a real brand's logo shape, a real person's name, a real product name, or a real product price, THEN THE Room_Engine SHALL reject that RoomData object.

## Correctness Properties

These are the executable properties the Room Engine must satisfy, expressed for property-based testing with fast-check.

### Room data properties

- For every room, the spell card array has length exactly three.
- For every room, exactly one card is correct, exactly one is a close-relative, and exactly one is clearly-different.
- For every room, each non-correct card has a non-empty hint.
- Across all rooms, all room ids are unique.
- For every room, the Ghost Guide entry is non-empty and contains a US line with a non-empty source label and URL, and an EU line with a non-empty source label and URL.

### State machine properties

- From any state, dispatching the correct card always leads eventually to the honest state.
- From the haunted state, selecting the possessed element leads straight to picking (the first tap works).
- A wrong pick keeps the state in picking.
- Selecting a non-possessed element while haunted or inspecting keeps the state where it is and increments the miss counter; the miss counter never decreases within a room's life.
- No transition reaches a fail state, because no fail state exists.
- Progress (the done count) never decreases.

### Shuffle property

- Shuffling the three spell cards yields a permutation of the same three cards: the same set, in a possibly different order.

### Comparison-wipe properties

- When the comparison box first appears under prefers-reduced-motion, the slider's value is 50 and the honest layer's `--split` is `50%`.
- The slider's value is clamped to 0–100: the arrow keys move it by 5, Page Up and Page Down by 25, Home to 0, and End to 100.
- Focusing any control inside the honest layer moves the slider to 100.
- The honest twin's single task action completes the room at any slider value.
