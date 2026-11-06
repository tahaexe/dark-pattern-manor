# Implementation Plan

Build order: types, the pattern vocabulary, and the relatives table first, then the pure reducer with its unit and property tests, then the shared components, then The Foyer (brand "The Gravemoor Gazette") end to end, then the room-check and bundle-size scripts, and finally a room spec template the other 11 rooms copy. No application code is written in the spec run itself; these tasks are for implementation.

- [x] 1. Define the room types
  - Files: `src/engine/types.ts`
  - Add `PatternName`, `SpellCard` (`pattern`, `role`, optional `hint`), `GuideLine`, `GuideEntry`, `HauntedProps`, `HonestProps`, and `RoomData` (id, slug, name, brand, brandKind, domain, pattern, task, possessedId, `Haunted`, `Honest`, three-tuple `cards`, `guide`).
  - Tests: compile-only; `npm run typecheck` passes (the three-card tuple and required-on-wrong-card hint are enforced by the type shape where possible).
  - Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.1

- [x] 2. Define the pattern vocabulary and the symmetric relatives table
  - Files: `src/engine/patterns.ts`, `src/engine/relatives.ts`, `src/engine/relatives.property.test.ts`
  - In `patterns.ts`, export `PATTERNS`: the frozen list of the 18 pattern types the steering names (12 room patterns + 6 wandering patterns). In `relatives.ts`, implement `RELATIVE_PAIRS` with exactly the 15 pairs from the design, plus `areRelatives(a, b)` (symmetric lookup) and `relativesOf(p)`.
  - Tests: unit tests that `PATTERNS` holds the 18 named types; that each listed relative pair is a relative in both directions and an unlisted pair is not; fast-check property that `areRelatives` is symmetric for all pattern-name pairs.
  - Requirements: 1.3 (design decision 1)

- [x] 3. Implement the pure room state machine (reducer)
  - Files: `src/engine/machine.ts`
  - Implement `RoomState` (with `whisperNonce`), `RoomEvent`, `initialState(room)`, and `reduce(state, event, room)` as a pure, total function covering every transition: `LANTERN`, `SELECT_POSSESSED`, `SELECT_OTHER` (stay + "Nothing haunts this."), `PICK` correct (→ `named`), `PICK` wrong (stay + hint + `flicker` + bumped `whisperNonce`, no progress change), `ADVANCE` (`named` → `honest`), `COMPLETE_TASK` (`honest` → `done`). Unexpected events are no-ops.
  - Tests: covered by tasks 4 and 5.
  - Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.10, 5.1, 5.2, 5.3

- [x] 4. Unit-test every state-machine transition
  - Files: `src/engine/machine.test.ts`
  - One test per transition in Requirement 2, asserting the resulting state tag and announcement, including the auto `named → honest` advance and the wrong-pick self-loop with hint, bumped `whisperNonce`, and no progress change.
  - Requirements: 6.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7

- [x] 5. Property-test the state machine with fast-check
  - Files: `src/engine/machine.property.test.ts`
  - Properties over random event sequences: correct card eventually reaches `honest`; a wrong pick keeps `picking`; no transition reaches a fail state; done count is monotonic (never decreases).
  - Requirements: 6.3, 2.10, 5.1, 5.2

- [x] 6. Implement the progress store
  - Files: `src/engine/progress.ts`, `src/engine/progress.test.ts`
  - `loadProgress`, `completeRoom(slug, nextSlug?)` (monotonic: only adds to completed/unlocked), `doneCount()`, backed by one `localStorage` key with an in-memory fallback; no cookies, no network, no reset mechanism.
  - Tests: completing a room increases the done count and unlocks the next; repeated completion never decreases the count; works when `localStorage` is unavailable.
  - Requirements: 2.8, 2.9, 5.1

- [x] 7. Room data correctness property tests
  - Files: `src/engine/roomData.property.test.ts`, `src/engine/shuffle.ts`, `src/engine/shuffle.test.ts`
  - Implement `shuffle` for the three cards; property tests over a valid-room generator and the live registry: cards length 3; exactly one correct/relative/different; each wrong card hint non-empty, ≤ 20 words, and never names the correct pattern; every card's pattern is one of the 18 pattern types; unique ids across rooms; guide US/EU lines non-empty; relatives validity rule (relative card is a relative, different card is neither pattern nor relative); shuffle yields a permutation of the same set.
  - Requirements: 6.2, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6 (design decisions 1, 2)

- [x] 8. Build the shared live region
  - Files: `src/ui/LiveRegion.tsx`, `src/ui/LiveRegion.test.tsx`
  - One `role="status" aria-live="polite"` element rendering `announcement` and `wrongHint`; the whisper is keyed on `whisperNonce` so a wrong card's hint is announced exactly once per pick and no re-render re-announces a stale hint.
  - Tests: renders announcement text; is polite; updates on state change; a repeated render with the same `whisperNonce` does not re-announce the whisper.
  - Requirements: 3.1, 2.4, 2.6, 5.2

- [x] 9. Build the lantern
  - Files: `src/ui/Lantern.tsx`, `src/ui/Lantern.test.tsx`
  - Real `<button>` labelled "Lantern (L)" that dispatches `LANTERN`; the `L` key triggers it while `haunted`.
  - Tests: button present with the labelled key hint; click and `L` key both dispatch; keyboard operable.
  - Requirements: 2.2, 3.3

- [x] 10. Build the spell picker
  - Files: `src/ui/SpellPicker.tsx`, `src/ui/SpellPicker.test.tsx`
  - Three real `<button>` cards (not `div role="button"`) labelled by pattern name, rendered in shuffled order, each with an inline-SVG symbol; selecting dispatches `PICK`; all stay enabled after a wrong pick.
  - Tests: three buttons by name; elements are `BUTTON`; wrong pick keeps all selectable; order is a permutation of the three cards.
  - Requirements: 2.5, 2.6, 3.3, 5.5

- [x] 11. Build the Before/After slider
  - Files: `src/ui/BeforeAfterSlider.tsx`, `src/ui/BeforeAfterSlider.test.tsx`
  - `<input type="range">` ARIA slider labelled "Before and After slider", keyboard operable, splitting haunted and honest twin; native range semantics — arrow keys step the value, `Home` → minimum (fully haunted), `End` → maximum (fully honest).
  - Tests: renders a range slider; labelled; the arrow keys change the value and move the split; `Home` sets the value to the minimum and `End` to the maximum.
  - Requirements: 3.6

- [x] 12. Build the Ghost Guide card
  - Files: `src/ui/GuideCard.tsx`, `src/ui/GuideCard.test.tsx`
  - Renders `GuideEntry`: two-sentence definition, where-you-meet-it, US line, EU line (each a real https source link), one tip; title in Cormorant Garamond; content only from `RoomData.guide`.
  - Tests: title heading present; US and EU source links present with https hrefs; no brand/pattern text hard-coded.
  - Requirements: 1.5, 8.3

- [x] 13. Build the Room component and the on-demand registry
  - Files: `src/engine/Room.tsx`, `src/engine/registry.ts`, `src/engine/Room.test.tsx`
  - `Room.tsx` holds the reducer with `useReducer`, renders per state (Haunted, lantern, spell picker, live region, then slider/honest twin/guide from `honest`), maps input to events, auto-dispatches `ADVANCE` on `named`, announces each state and moves focus to its heading, and persists progress on `done`. `registry.ts` maps slugs to lazy `import()` loaders and exposes `loadRoom(slug)`; no room is imported eagerly.
  - Tests: lantern → inspecting → pick possessed → picking → correct card → honest → complete task → done; focus moves to the new state's heading; loading a room uses dynamic import; **a single wrong pick fires the whisper exactly once and it is announced once in the one polite live region** (no re-announcement on unrelated re-renders); **the Before/After slider moves with the arrow keys and with `Home` and `End`** (value and split update accordingly).
  - Requirements: 2.1, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.3, 3.6, 5.2, 5.5, 7.1, 7.2

- [x] 14. Engine-level axe-core checks across all six states
  - Files: `src/engine/Room.axe.test.tsx`
  - Render one room in each of `haunted`, `inspecting`, `picking`, `named`, `honest`, `done`; assert zero axe violations in every state with `color-contrast` enabled.
  - Requirements: 6.4, 3.4

- [x] 15. Build The Foyer room data and components
  - Files: `src/rooms/gravemoor-gazette/room.ts`, `src/rooms/gravemoor-gazette/Haunted.tsx`, `src/rooms/gravemoor-gazette/Honest.tsx`, `src/rooms/gravemoor-gazette/room.css`; register in `src/engine/registry.ts` under the slug `gravemoor-gazette`
  - Fictional news brand "The Gravemoor Gazette" at `gravemoor-gazette.manor`; room id 1, name "The Foyer"; pattern Visual interference; task "reject the cookies"; possessed element id `foyer-reject`. Cards: correct = Visual interference; relative = Trick wording (+ hint ≤ 20 words, no "Visual interference"); different = Nagging (+ hint ≤ 20 words, no "Visual interference"). Guide entry with FTC (US, https on the allowlist) and EDPB/EUR-Lex (EU, https on the allowlist) source links and one tip; no quoted text over 25 words. Haunted: "Reject all" is a small plain text link with ghost signs on `foyer-reject`; "Accept all" is a full button. Honest: both "Reject all" and "Accept all" are equal buttons; task completes in one click. CSS keeps all text at WCAG AA contrast in both variants and confines cracks/mist to the possessed element; `prefers-reduced-motion` shows the static dashed outline and "Something stirs here" label.
  - Tests: covered by task 16.
  - Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 8.1, 8.2, 8.3

- [x] 16. The Foyer's own test file, including the reduced-motion static indicator
  - Files: `src/rooms/gravemoor-gazette/gravemoor-gazette.test.tsx`
  - Assert: the honest variant completes "reject the cookies" in one click; the possessed element is found by its id `foyer-reject`, is keyboard-reachable with a non-empty accessible name; the pattern rule passes on honest and fails on haunted — on honest, "Reject all" and "Accept all" are both buttons with equal font size, padding, and fill; on haunted, "Reject all" is a small plain text link (element and size/weight differ) — a variant-agnostic test is treated as broken; every text passes WCAG AA contrast in both variants (axe `color-contrast` on both); axe-core reports zero violations on both variants; **with `prefers-reduced-motion` mocked on, a wrong spell card shows a static, non-animated indicator in place of the light flicker — the test asserts no animation runs and the static indicator (dashed outline + "Something stirs here") is present** (Requirement 5.4); the possessed element's ghost signs likewise do not animate under reduced motion.
  - Requirements: 6.4, 2.7, 3.4, 3.5, 4.1, 4.2, 4.3, 5.4, 8.2 (design decisions 4, 5)

- [x] 17. Room data validation script
  - Files: `scripts/check-rooms.mjs`; add `"check:rooms": "node scripts/check-rooms.mjs"` to `package.json`
  - Validate, for every room's data: exactly 12 rooms with ids 1–12 (each used once) and each of the 12 room patterns used exactly once; the `brand` is one of the 12 approved fictional brands, the `slug` matches the room's folder, and the `domain` uses the `.manor` pseudo-domain; every spell card's `pattern` is one of the 18 pattern types the steering names; exactly one correct/relative/different card with the relatives validity rule (design decision 1) and the hint-quality rules (≤ 20 words, never names the correct pattern — design decision 2); the correct card is not in the same position in every room; the possessed element is found by its `possessedId`; both variants are built from the one `RoomData` and share the brand, content, and task; every Ghost Guide source URL is https and on the primary-source allowlist (`ftc.gov`, `eur-lex.europa.eu`, `edpb.europa.eu`); exactly one protection tip per room; and no quoted text over 25 words. On the first failure, print the room name and the failed rule, then exit non-zero.
  - Tests: run `npm run check:rooms` against The Foyer (passes); temporary deliberately-broken fixtures each fail with the room name and rule named (run `node scripts/check-rooms.mjs --self-test`) — wrong relative, over-long hint, duplicate id, a card pattern outside the 18, a non-`.manor` domain, a slug/folder mismatch, a non-allowlisted or non-https guide URL, a constant correct-card position across rooms, a quote over 25 words, and more than one tip.
  - Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 8.1, 8.4 (design decisions 1, 2, 3)

- [x] 18. Initial-bundle size gate
  - Files: `scripts/check-bundle-size.mjs`; add `"check:size": "node scripts/check-bundle-size.mjs"` to `package.json`; run it after `npm run build` in `.github/workflows/pages.yml`
  - Read the Vite build manifest, sum the compressed (gzip/brotli) size of the entry chunk and its static imports (engine + shared UI, no room chunks), and exit non-zero if the total exceeds 100 KB, printing the measured size and the 100 KB limit so a bundle over budget fails the build.
  - Tests: a unit test of the size-summing helper that a manifest under 100 KB passes and one over 100 KB fails (`src/engine/bundleSize.test.ts`); the real build is checked by `npm run build && npm run check:size`.
  - Requirements: 7.1, 7.2, 7.3

- [x] 19. Create the room spec template for the remaining 11 rooms
  - Files: `.kiro/specs/room-template/requirements.md`, `.kiro/specs/room-template/design.md`, `.kiro/specs/room-template/tasks.md`
  - A copyable spec (EARS requirements, design, numbered tasks) that a room author fills in per room: brand/kind/`.manor` domain, pattern (one of the 18, used once across rooms), task, possessed element (found by id), three cards (correct + relative + different, each wrong hint ≤ 20 words and never naming the pattern), guide entry with one tip and https US and EU sources on the allowlist (no quote over 25 words), Haunted and Honest components and CSS under `src/rooms/<brand-slug>/`, and the room's own `src/rooms/<brand-slug>/<brand-slug>.test.tsx` with the four per-room assertions and the axe/reduced-motion checks. Tasks reference `npm run check:rooms` and `npm run test` as the room's gate.
  - Tests: none (spec scaffolding only).
  - Requirements: 6.2, 6.4 (design decisions 3, 4, 5)
