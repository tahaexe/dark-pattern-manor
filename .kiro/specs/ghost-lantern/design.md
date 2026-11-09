# Design Document

## Overview

The Ghost Lantern is a self-contained bookmarklet. Its whole program is a small IIFE built to `dist/lantern.js` by a second Vite build; the bookmarklet is `javascript:` plus the URL-encoded bundle. When the player clicks it, the IIFE runs on the current page: it reads the DOM with a set of pure detectors, draws a candle-style mark over each suspect, and opens a small panel listing every suspect with its pattern, the sign the detector saw, and a link to the manor room that teaches it. A second click, "Put out the lantern", or Escape removes everything and restores focus.

The design is shaped by the four promises, each a requirement with a test:

1. **Local only, nothing sent.** The program is one bundle with no imports left; it reaches no network API and no storage. Everything it adds lives under one host with a **closed** shadow root. The only URL-bearing nodes are the manor links, plain anchors carrying only a room number.
2. **Hints, not verdicts.** Every chip reads `Possible: <pattern>`; the panel opens with the fixed warning text; there is no score, grade, "illegal", or "scam".
3. **Runs only when asked.** Nothing runs before the click; a single global flag toggles the lit state; putting out removes every node, listener, timer, and observer and restores focus.
4. **No real company shown marked.** Every demo, test, and text uses the fictional practice page or the manor's own pages.

The lantern shares no runtime with the app. It is a separate Vite build with its own entry (`src/lantern/main.ts`), so the app's initial bundle never grows by the lantern's size. The detectors and the words file are plain modules the lantern entry imports; the app imports none of them except the practice page, which imports the same detectors' shared data only through running the built bundle (it fetches and runs `dist/lantern.js`, exactly as the bookmarklet does), keeping the app bundle clean.

### Design goals

- The detectors are pure functions over a root `Element`. They can be unit-tested and property-tested in jsdom with no browser, no rendering, and no overlay.
- Thresholds are conservative: the lantern marks a clear sign or nothing. A false alarm is worse than a miss, because the lantern must be trusted enough to look.
- The overlay touches the page as little as possible: one host node, a closed shadow root, constructed stylesheets, `transform`-placed marks that follow scroll and resize, and a full teardown.
- Strict pages are the common case worth getting right: no `innerHTML`, constructed stylesheets with a `<style>` fallback, and a measured record of what a strict CSP allows.

## Architecture

### The pieces

```
src/lantern/
  words.ts          every phrase list and every player-facing string (English, v1)
  patterns.ts       the v1 pattern → manor room-number map and pattern labels
  types.ts          Suspect, Detector, Measure, Style, and the detector-root contract
  helpers.ts        shared DOM reads (text, controls, label, look predicates)
  detect.ts         runAllDetectors(root, hostEl, opts): Suspect[]  (skips the host)
  detectors/
    preselection.ts
    visual-interference.ts
    fake-urgency.ts
    fake-scarcity.ts
    fake-social-proof.ts
    confirmshaming.ts
    trick-wording.ts
  overlay.ts        the host, closed shadow root, constructed stylesheet, marks, panel
  lantern.css       the lantern's styles (loaded as a string into the shadow root)
  lantern.ts        light() / putOut() / isLit(): the lit-state machine and the flag
  main.ts           the IIFE entry: on run, toggle via the global flag
  *.test.ts         jsdom unit, property, and string tests
```

### The lit-state machine (`lantern.ts`, `main.ts`)

`main.ts` is the bundle's entry. When the bundle runs it reads one global flag under a single unique name (`window.__ghostLantern__`). If the flag is absent the lantern lights; if present it puts out. This is what makes a second click of the same bookmarklet put the lantern out rather than stack a second copy.

```
run():
  if window.__ghostLantern__  -> window.__ghostLantern__.putOut()  // second click
  else                        -> light()
```

`light()`:

1. Remember `document.activeElement` (to restore on put-out).
2. Create the host element, attach a **closed** shadow root, and load the lantern's CSS into it (constructed stylesheet, `<style>` fallback).
3. Run the detectors over `document.body`, skipping any node inside the host.
4. Draw a mark for each suspect and build the panel.
5. Add the scroll/resize listener (one, passive) and a `ResizeObserver` to keep marks on their elements; add the key handler for Escape.
6. Set `window.__ghostLantern__ = { putOut }`.
7. Move focus into the panel heading.

`putOut()`:

1. Remove the scroll/resize listener, disconnect the `ResizeObserver`, clear any timer, remove the key handler.
2. Remove the host from the DOM (which takes the shadow root, marks, and panel with it).
3. Restore focus to the remembered element.
4. Delete `window.__ghostLantern__`.

Because every node lives under the one host and every listener/observer/timer is held in `putOut`'s closure, put-out is total: the DOM returns to zero lantern nodes and nothing of the lantern runs.

### The detectors (`src/lantern/detectors/*`, `detect.ts`)

Each detector is `(root: Element) => Suspect[]` where `Suspect = { element: Element; pattern: PatternName; sign: string; room: number }`. `detect.ts` exports `runAllDetectors(root, host, opts)` which runs every detector and drops any suspect whose element is the host or inside it (so the lantern never marks itself — Requirement 5.11), and de-duplicates suspects that share an element (keeping the first). `opts` carries the injectable `measure`, `style`, and `changed` observers so the live overlay (and tests) can supply layout, look, and timing; all default to pure, conservative no-ops (getBoundingClientRect, getComputedStyle, "no change"). All text and phrase lists come from `words.ts`.

The detectors and their rules (conservative by design — Requirement 2):

- **Preselection** (room 11): a `checkbox`/`switch` input (or `[role=switch]`) that is `checked` at load **and** whose associated label text matches one of the offer words in `words.ts` (offers, newsletter, partner, share, insurance, protection, donation, "add"). It explicitly excludes labels that read like a gate to continue (terms, privacy, age, "I agree", "accept the"). Sign: "A box is ticked for you, and it is an extra, not something you must accept."
- **Visual interference** (room 1): within a cookie/consent box (a container whose text matches the consent words — cookies, consent, "we value your privacy", GDPR), find the accept control (text matches accept words) and the refuse control (text matches refuse words). Mark when (a) a refuse control is a plain link **by tag** (an `<a>` or a text-only element, not a `<button>`/button-styled control) beside a button accept, or (b) the refuse control is **dressed as a link by its look** — it has no visible fill (a background colour whose alpha is below 0.1 and no background image) and no visible border (border width 0, style none, or a border colour alpha of 0) — while the accept control has a visible fill (a background colour alpha of at least 0.5, or a background image), **even when the refuse is itself a `<button>`**, or (c) the refuse control's box area is under half the accept's area, or (d) there is no refuse control in the first layer at all (only "Manage"/"Settings"/"Options"), in which case the box is marked. It does not mark when both accept and refuse **look** like buttons, or both look like links, or are buttons of a similar size (area ratio within a band). The look is read through an **injectable `style` function beside `measure`** (`src/lantern/types.ts` `Style`, default `getComputedStyle`; `helpers.ts` has the pure `looksLikeLink`/`looksLikeButton`/`colorAlpha` predicates), so the look rule is testable in jsdom (which has no real cascade) by passing a stub. Sign names what it saw: link vs button (tag), a refuse "dressed as a faint link next to a solid accept button" (look), a smaller box, or no refuse offered. The look rule is what catches the Foyer, whose "Reject all" is a `<button>` styled as a text link (no fill, no border, underlined) beside the gold filled "Accept all": by tag it is a button, so rule (a) misses it and its touch-target area (74×44 vs 124×50, ratio 0.525) sits just above rule (c)'s "under half" threshold, but by its look it is plainly a faint link beside a solid button, which is also the common real-world form of this trick.
- **Fake urgency** (room 5): find a node whose text matches a countdown shape (`mm:ss` or `hh:mm:ss`) near (same small subtree as) one of the selling words (ends, left, hurry, expires, offer). Watch its text for about **a second** and mark only if the text changed. The watch is **1.1 s**, deliberately about one tick of a seconds countdown rather than longer: a countdown that shows seconds changes its displayed text within a second, so a one-tick watch is enough to catch it moving while keeping the lantern quick to light — a longer (e.g. three-second) watch would only delay every mark on the page without catching any countdown a one-tick watch misses. (In jsdom and the walk this is driven by a short observation window; the detector takes an injectable `observe`/`changed` so tests can supply a change deterministically.) Sign: "A countdown next to selling words is ticking down while you watch." It does not mark a clock with no selling words near it.
- **Fake scarcity** (room 6): text matching "only N left", "selling fast", "almost gone", "in high demand". Sign: "This claims the stock is nearly gone. The lantern cannot know the real stock."
- **Fake social proof** (room 7): text matching "N people are viewing", "N bought today" (and the viewing/bought variants in `words.ts`). Sign: "This claims a crowd is here. The lantern cannot know the real numbers."
- **Confirmshaming** (room 3): a decline control (button or link) whose text matches a shaming phrase in `words.ts` (starts "No thanks, I don't want", "I'd rather pay", "I don't like", "No, I hate", etc.). Sign: "The decline option is worded to make you feel bad." A plain "No thanks" (or "No" / "Decline" / "Cancel") is not marked.
- **Trick wording** (room 2): a checkbox's label whose text carries two negations (two of: un-/not/don't/never/no), the classic "untick this box if you do not want … not". Sign: "This box's wording has two negatives, so what ticking it does is unclear."

Each detector reads only the DOM it is given, calls no network or storage API, and allocates nothing outside the returned array. The `room` on each suspect comes from `patterns.ts` (`PATTERN_ROOM`), so the panel's "Learn it in the manor" link is `#/room/<room>`.

### The overlay and the panel (`overlay.ts`, `lantern.css`)

**The host and shadow root.** `light()` creates one `<div>` (the host), appends it to `document.documentElement`, and attaches a **closed** shadow root (`attachShadow({ mode: 'closed' })`). All marks and the panel are built inside that root with `createElement` + `textContent` only (Requirement 6.1). The lantern's CSS is loaded into the root via a constructed stylesheet:

```
try {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(CSS);              // CSS is a bundled string constant
  root.adoptedStyleSheets = [sheet];
} catch {
  const style = document.createElement('style');
  style.textContent = CSS;             // fallback where adoptedStyleSheets is missing
  root.appendChild(style);
}
```

Because the host carries a closed shadow root, the page's CSS cannot select into the lantern, and the lantern's CSS is scoped to the root, so the page's own styles and layout do not change (Requirement 5.1). The host itself is `position: fixed; inset: 0; pointer-events: none; z-index: 2147483647`, so marks sit above the page without taking the page's pointer events; the panel and the marks re-enable `pointer-events: auto` on themselves.

**The marks.** For each suspect the overlay builds a `.gl-mark` box and a `.gl-chip`. The mark is placed from the suspect's `getBoundingClientRect()` with `transform: translate(x, y)` and an explicit width/height, inside the fixed host, so it never shifts the page's layout (no layout property is animated; placement is by `transform`). The chip reads `Possible: <pattern>` (Requirement 3.1). A single passive `scroll`/`resize` listener and a `ResizeObserver` on `document.body` re-run a `place()` that updates every mark's transform; this is throttled with `requestAnimationFrame` and the pending frame is cancelled in `putOut`. Under prefers-reduced-motion the outline is still (no flicker keyframes); otherwise the outline flickers between opacity 1 and 0.85 at most twice a second (the manor flicker limit), by `opacity` only.

**The panel.** A `.gl-panel` with `role="dialog"`, `aria-modal="false"` (it does not trap the page), `aria-labelledby` pointing at its heading. Fixed bottom-right, 320 px wide, full width under a phone media query. It holds the heading ("The Ghost Lantern"), the warning paragraph (Requirement 3.2/3.3), the list, and the "Put out the lantern" button. Each list item shows the pattern name, the sign, a "Show me" button (scrolls the suspect into view and moves focus to its mark — Requirement 5.5), and a "Learn it in the manor" anchor to `https://tahaexe.github.io/dark-pattern-manor/#/room/<n>` with `target="_blank" rel="noopener noreferrer"` (Requirement 5.6). The marks carry `tabindex=-1` so "Show me" can focus them. All colours come from the manor palette inlined into `lantern.css` (the bundle cannot load `tokens.css`): candle `#f0be77`, parchment `#e9dfca`, ink `#1d1417`, so the chip is ink on parchment and the panel meets AA (Requirement 5.10).

**Escape and put-out.** The key handler (on `window`, capturing) closes on Escape. "Put out the lantern" and a second bookmarklet click call the same `putOut`.

### The words file (`words.ts`)

One module holds every phrase list (consent words, accept words, refuse words, offer words, shaming phrases, scarcity phrases, social-proof phrases, selling words, negations) and every player-facing string (the heading, the warning text builder `warningText(n)`, the zero text, the chip builder `chip(pattern)`, the "Show me", "Learn it in the manor", and "Put out the lantern" labels, and each detector's sign, including the Visual interference look sign "The refuse choice is dressed as a faint link next to a solid accept button."). English only in v1. Keeping it in one file makes the "no verdict word" test a single scan and makes a future translation a single file.

### The second Vite build and the bookmarklet (`vite.lantern.config.ts`, `scripts/build-lantern.mjs`)

A second Vite config builds `src/lantern/main.ts` in library/IIFE mode:

```
build: {
  lib: { entry: 'src/lantern/main.ts', formats: ['iife'], name: 'GhostLantern', fileName: () => 'lantern.js' },
  outDir: 'dist',
  emptyOutDir: false,         // keep the app build in dist/
  minify: 'esbuild',
  target: 'es2020',
}
```

`npm run build` runs the app build then the lantern build (`vite build --config vite.lantern.config.ts`), so `dist/lantern.js` sits beside the app in `dist/` (where the static server and the ending page's `./lantern.js` fetch find it). The IIFE leaves no `import`. The bookmarklet is produced on demand (not stored): `javascript:` + `encodeURIComponent(contents of dist/lantern.js)`. `check:lantern` builds that string to assert its length.

Because the lantern is a separate entry never imported by `src/main.tsx`, the app's initial bundle does not include it (Requirement 7.3); `check:size` already walks only the app entry's static imports, so it stays unaffected.

### The practice page (`#/lantern-practice`, `src/app/LanternPractice.tsx`, `lantern-practice.css`)

A new route in `App.tsx` (parsed in `parseHash`, lazy-loaded like the ending). "Hollowmere Goods" is a fictional shop. For each v1 pattern it renders one haunted instance and its honest twin side by side:

- Preselection: a newsletter checkbox ticked at load (haunted) vs unticked (honest).
- Visual interference: a cookie box with a button "Accept all" and a tiny "reject" link (haunted) vs equal "Accept all" / "Reject all" buttons (honest).
- Fake urgency: a ticking `mm:ss` countdown by "offer ends" (haunted) vs a plain shipping estimate (honest).
- Fake scarcity: "Only 2 left!" (haunted) vs "In stock" (honest).
- Fake social proof: "17 people are viewing this" (haunted) vs a dated, sourced review count (honest).
- Confirmshaming: a decline button "No thanks, I like paying full price" (haunted) vs "No thanks" (honest).
- Trick wording: "Untick this box if you do not want to not receive offers" (haunted) vs "Email me offers" unticked (honest).

"Try the lantern here" fetches `./lantern.js` from the game's own site and runs it (the same path the bookmarklet runs), so the practice button exercises the real bundle, not a dev copy. The page names no real company, product, person, or price (Requirement 8.3, 11). The countdown's tick is a `setInterval` the page owns (not the lantern) so the urgency detector sees a changing value.

### The ending-page install link (`EndingPage.tsx`, `ending.css`)

A new section on the ending page: a heading "Take the lantern with you", the draggable "Ghost Lantern" link, the install line "Drag this to your bookmarks bar, then click it on any page.", and a link to `#/lantern-practice`. On mount, the page fetches `./lantern.js` from its own origin, builds the bookmarklet string, and sets the link's `href` through a ref with `setAttribute` (a framework may refuse a `javascript:` href in JSX). Until the fetch resolves the link reads "Preparing the lantern…", has no `href`, and is not draggable (`draggable={false}`); once ready it reads "Ghost Lantern", is draggable, and carries the `javascript:` href. The fetch is same-origin to the game's own site, which is allowed — this is the one network call, and it is the app's, not the lantern's; the lantern bundle itself still makes no request. No lantern code is imported into the app bundle (the href is a fetched string).

## Components and Interfaces

### `Suspect`, `Detector`, `Measure` and `Style` (`src/lantern/types.ts`)

```ts
export interface Suspect {
  element: Element;
  pattern: string; // a v1 pattern label from words.ts
  sign: string;    // a short plain sentence
  room: number;    // the manor room that teaches it (1–12)
}
export type Detector = (root: Element) => Suspect[];

export type Measure = (el: Element) => { width: number; height: number };

export interface ControlStyle {
  backgroundColor: string;
  backgroundImage: string;
  borderTopWidth: string;
  borderTopStyle: string;
  borderTopColor: string;
}
export type Style = (el: Element) => ControlStyle;
```

`Measure` (default `getBoundingClientRect`) and `Style` (default `getComputedStyle`) are injectable so the visual-interference size and look rules stay testable in jsdom, which has neither real layout nor a real cascade.

### `runAllDetectors` (`src/lantern/detect.ts`)

```ts
export interface DetectOptions { measure?: Measure; style?: Style; changed?: Changed }
export function runAllDetectors(root: Element, host?: Element, opts?: DetectOptions): Suspect[];
```

Runs every detector, drops suspects inside `host`, de-dupes by element, returns the list in document order.

### The lit-state API (`src/lantern/lantern.ts`)

```ts
export function light(): void;
export function putOut(): void;
export function isLit(): boolean;
```

`main.ts` calls `isLit() ? putOut() : light()`; the single flag is `window.__ghostLantern__`.

### The practice page and ending-link props

The practice page and the ending link both use a tiny shared helper `runBundle(src: string)` that injects and runs the fetched bundle text once (through a `<script>` element the page removes immediately, or `new Function` where CSP allows), identical in intent to the bookmarklet. The helper lives in the app, not the lantern.

## Data Models

### `PATTERN_ROOM` (`src/lantern/patterns.ts`)

| Pattern label | Room |
| --- | --- |
| Visual interference | 1 |
| Trick wording | 2 |
| Confirmshaming | 3 |
| Fake urgency | 5 |
| Fake scarcity | 6 |
| Fake social proof | 7 |
| Preselection | 11 |

These seven are v1. The labels match the manor's `patterns.ts` names exactly, so the "Learn it in the manor" links land on the room that teaches each one. The real-browser room step (below) derives the covered rooms from this map crossed with the manor registry, so the rooms it visits are not hard-coded numbers.

## Error Handling

- A detector that encounters odd markup returns no suspect rather than throwing; `runAllDetectors` wraps each detector in a try/catch so one bad detector cannot stop the rest (the property test asserts no throw, but the guard is defence in depth on a page the lantern did not write).
- If `adoptedStyleSheets` is missing, the overlay falls back to a `<style>` element; if even that is blocked by CSP, the walk's strict-page step records it and the README states it as a limit.
- Put-out is idempotent: calling it when not lit is a no-op; the flag's presence is the single source of truth.
- The ending page's `fetch('./lantern.js')` failing leaves the link in its "Preparing the lantern…" state (no `href`, not draggable) and shows a short fallback line; it never throws into the render path and never blocks the rest of the ending.

## Testing Strategy

### Detector unit tests (`src/lantern/detectors/*.test.ts`)

One file per detector: a planted instance is marked with the right pattern, sign, and room; the honest twin is not marked; the negative cases in Requirement 2 (both-buttons cookie box, a plain "No thanks", a clock with no selling words, a terms checkbox) are not marked. The visual-interference test also covers the **look rule** with an injected `style` stub: a transparent, borderless refuse `<button>` beside a filled accept is marked with the "dressed as a faint link" sign; two filled controls are not marked, and two transparent controls of equal size are not marked.

### Room-coverage test (`src/lantern/rooms.lantern.test.tsx`)

Renders each of the seven v1 rooms' Haunted component and asserts its pattern's detector marks it; renders all twelve rooms' Honest component and asserts no detector marks any of them. This reuses the room components directly (jsdom), proving the detectors agree with the game. jsdom has neither layout nor a real cascade, so the test injects **both** a `measure` (sizes) and a `style` for the Foyer that match its CSS: the possessed `.cookie-reject` reads as transparent with no border (a faint link), and `.cookie-accept` and the honest `.cookie-button-equal` read as filled (solid buttons), so the Foyer's haunted page is marked by the look rule and its honest twin (two solid equal buttons) is not.

### Property tests (`src/lantern/detect.property.test.ts`)

fast-check generates small random DOM trees; for every tree, `runAllDetectors` never throws, and no returned suspect is the host or inside it (the host is injected into the generated tree).

### Overlay/teardown tests (`src/lantern/lantern.test.ts`)

`light()` then `putOut()` leaves `document` with zero `.gl-*`/host nodes; a spy on `addEventListener`/`removeEventListener`, `setInterval`/`clearInterval`, and a `ResizeObserver` stub confirms every add is matched by a remove; focus is restored; a second `light()` while lit is handled by `main.ts`'s toggle. A network-guard test replaces `fetch`, `XMLHttpRequest`, `navigator.sendBeacon`, `WebSocket`, `EventSource`, and `window.open` with throwing spies and asserts `light()`/`putOut()` call none.

### String tests (`src/lantern/words.test.ts`)

`warningText(0/1/2/5)` equals the exact specified strings (singular "trick" at 1); the zero text is exact; no string in `words.ts` contains "illegal", "scam", "score", or "grade"; `chip(p)` is `Possible: ${p}`.

### The `check:lantern` gate (`scripts/check-lantern.mjs`)

After `npm run build`: assert `dist/lantern.js` exists, its minified size ≤ 30 KB, it contains none of the forbidden tokens (`fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`, `window.open`, `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`), and `javascript:` + `encodeURIComponent(bundle)` is under 64,000 characters. Its pure helpers (token scan, size check, bookmarklet length) are unit-tested by `node --test scripts/check-lantern.test.mjs`, run under `npm run test:lantern`.

### The walk's lantern step (`scripts/mcp/lantern-walk.mjs`, wired into the walk)

Added to the full run and counted like a room:

1. Navigate to `#/lantern-practice` at both sizes. Click "Try the lantern here" (or run the fetched bundle as the button does). Assert the panel opens with `N` equal to the planted count, every `.gl-mark` is visible and sits over its suspect (`document.elementFromPoint` at the suspect's centre is the suspect or the mark above it), Escape closes, focus returns to the pre-light element, and no lantern node remains.
2. **The real-browser room step.** Run the same built bundle on each **v1 room's** haunted page at 1280×720 and expect at least one mark of **that room's own pattern**; run it on the title page and expect **no** mark. The covered rooms are taken **from the registry**, not from hard-coded numbers: the step SSR-loads `src/engine/registry.ts` (every room's `id`, `slug`, `pattern`) and `src/lantern/patterns.ts` (`PATTERN_ROOM`) once at the start of the walk and keeps the rooms whose `pattern` is one of the seven v1 patterns (so it currently resolves to rooms 1, 2, 3, 5, 6, 7 and 11, but follows the data if the registry changes). For each covered room the step navigates to `#/room/<id>`, waits for the room to be ready, lets the urgency countdown tick, runs the bundle, reads the lantern's probe, and fails if no mark carries that room's pattern. It then navigates to the title (`#/`), runs the bundle, and fails if any mark appears. This catches a detector that passes the jsdom room test (which injects sizes and styles) but misses the real rendered page — the Foyer bug that opened this follow-up: its "Reject all" button's real touch-target area sat just above the size threshold, so only the look rule, measured in a real browser here, proves the opening room is caught. A miss is a hard failure in `qa:full`, counted like a room failure through the same `{ checks, fail }` shape.
3. Serve the same page with the strict CSP header on a **test-only** path: the walk's session gains an optional `strictCsp` flag; when set, `openSession` issues `Network.enable` + `Network.setExtraHTTPHeaders` with `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; require-trusted-types-for 'script'` before navigation. Run the bundle through the devtools protocol and report the computed outline style of a mark, the panel's computed background, and whether any console error appeared. This is a report, not a hard gate, so a browser that blocks the fallback still yields a measurement for the README.

### Test commands

- `npm run test` — Vitest plus the Node suites (unchanged entry points; the lantern's `*.test.ts(x)` are picked up by Vitest, and `check-lantern.test.mjs` by a Node glob).
- `npm run build` — app build then the lantern build.
- `npm run check:lantern` — the lantern bundle gate.
- `npm run check:size` — the app initial-bundle gate (must be unaffected by the lantern).
- `npm run qa:full` — the real-browser walk at both sizes and both motion modes, plus the new lantern-practice step, the real-browser room step, and the strict-CSP measurement.
