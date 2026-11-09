# Requirements Document

## Introduction

Dark Pattern Manor teaches people to name twelve dark patterns inside a fictional haunted house. The **Ghost Lantern** carries that lesson out of the manor and onto the real web. It is a bookmarklet: one `javascript:` URL the player keeps on their bookmarks bar. On any page, one click lights it. The lantern reads the page **in the browser only**, outlines the elements that show clear signs of a dark pattern in the manor's candle style, and opens a small panel listing each one with the pattern's name, the sign it saw, and a link to the manor room that teaches it. One more click, or Escape, puts it out and removes everything it added.

The lantern gives **hints, not verdicts**. It never says a page is a scam or illegal; it points at signs a person can check. The whole program lives inside the bookmarklet — it loads nothing from anywhere, sends nothing anywhere, and stores nothing. It runs only when the player asks it to, and when put out it leaves no trace.

This document specifies the lantern: its detectors, its overlay and panel, its bundle and bookmarklet, the in-app practice page and ending-page install link, the checks that prove its promises, and the README section that records what it does and its measured limits.

## Glossary

- **the lantern**: The whole Ghost Lantern program, delivered as a bookmarklet and built to `dist/lantern.js`.
- **the bookmarklet**: A `javascript:` URL that is the string `javascript:` followed by the URL-encoded contents of `dist/lantern.js`. Clicking it lights the lantern on the current page.
- **a detector**: A pure function over a root `Element` that returns the suspects of one dark pattern on that root, each as `{ element, pattern, sign }`. One detector per pattern.
- **a suspect**: One marked element found by a detector: the element, the pattern name, and the sign (a short plain sentence of what the detector saw).
- **the sign**: A short plain sentence naming what the detector saw on the element (for example, "A box is ticked for you at load.").
- **the host**: The single element the lantern adds to the page, carrying a **closed** shadow root under which the overlay, the marks and the panel live, so the page's CSS cannot reach them and the lantern's CSS cannot reach the page.
- **a mark**: The positioned box the lantern draws above a suspect — a 3 px dashed candle-coloured outline plus an ink-on-parchment chip reading `Possible: <pattern>` — which follows scroll and resize and is removed when the lantern is put out.
- **the panel**: The fixed bottom-right dialog the lantern opens, listing the warning text and each suspect.
- **the warning text**: The fixed opening text of the panel (see Requirement 3), which names the count and states plainly that these are hints, not proof.
- **"Learn it in the manor"**: The per-suspect link to `https://tahaexe.github.io/dark-pattern-manor/#/room/<n>`, opened in a new tab with `rel="noopener noreferrer"`, carrying only the room number and no page data.
- **the practice page**: The in-app route `#/lantern-practice`, a fictional shop "Hollowmere Goods" with every v1 pattern planted once beside an honest twin, and a "Try the lantern here" button that runs the same bundle.
- **v1**: The first version, covering only the seven clear-sign patterns listed in Requirement 2.
- **a strict page**: A page served with a Content Security Policy that forbids inline script and requires Trusted Types for script (`require-trusted-types-for 'script'`), used to measure the lantern's behaviour under a strict policy.
- **prefers-reduced-motion**: The CSS media query of the same name; when active the lantern shows a still outline and no flicker.

## Requirements

### Requirement 1: Local only, nothing sent

**User Story:** As a person running a bookmarklet on a page I did not write, I want it to do everything in my own browser and send nothing anywhere, so that running it leaks none of what is on my screen.

#### Acceptance Criteria

1. THE lantern SHALL contain its whole program inside the bookmarklet and SHALL load no script, stylesheet, font, or image from any origin.
2. THE lantern SHALL never call `fetch`, `XMLHttpRequest`, `navigator.sendBeacon`, `WebSocket`, `EventSource`, or `window.open`.
3. THE lantern SHALL create no element carrying a URL attribute except the "Learn it in the manor" links, which are plain anchors the player chooses to click, carrying no page data — only the room number — in their `href`.
4. THE lantern SHALL use no storage: no `localStorage`, `sessionStorage`, cookies, or IndexedDB.
5. THE built bundle `dist/lantern.js` SHALL contain none of the literal tokens `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`, `window.open`, `localStorage`, `sessionStorage`, `indexedDB`, or `document.cookie`.
6. THE feature SHALL ship with tests that assert the detectors and the overlay cause no such call and create no such URL-bearing element other than the manor links.

### Requirement 2: The detectors (v1 clear signs)

**User Story:** As a player testing a page, I want the lantern to mark only clear signs of a dark pattern, so that it rarely cries wolf and I can trust each hint enough to look.

#### Acceptance Criteria

1. THE lantern SHALL provide one detector per v1 pattern, each a pure function over a root `Element` returning an array of suspects `{ element, pattern, sign }`, where `sign` is a short plain sentence of what it saw.
2. THE lantern SHALL hold every phrase list and every player-facing string in one words file (`src/lantern/words.ts`), English only in v1.
3. THE lantern SHALL set every threshold conservatively, preferring fewer marks and fewer false alarms over catching every case.
4. THE Preselection detector SHALL mark a checkbox or switch that is already on at load AND whose label speaks of offers, newsletters, partners, sharing, insurance, protection, donations, or "add"; and SHALL NOT mark a control the user must accept to continue (terms, privacy, age).
5. THE Visual interference detector SHALL, inside a cookie or consent box, mark a refuse control that is a plain link beside an accept button, OR a refuse control dressed as a faint link — no visible fill (a background colour alpha below 0.1 and no background image) and no visible border (border width 0, style none, or a border colour alpha of 0) — beside an accept control with a visible fill (a background colour alpha of at least 0.5, or a background image), even when the refuse is itself a `<button>`, OR a refuse control whose box area is under half the accept control's area, OR SHALL mark the box itself when it offers no refuse control in the first layer (only "Manage options" or "Settings"); and SHALL NOT mark when both the accept and refuse controls look like buttons, or both look like links, or are buttons of a similar size. IT SHALL read each control's look through an injectable `style` function beside `measure` (defaulting to `getComputedStyle`), so the rule stays testable in jsdom.
6. THE Fake urgency detector SHALL mark a countdown in `mm:ss` or `hh:mm:ss` form near one of the selling words "ends", "left", "hurry", "expires", or "offer" whose text changes while watched for about a second (one tick of a seconds countdown); and SHALL NOT mark a clock with no selling words near it. WHERE the watch is about a second (the implementation uses 1.1 s) because a countdown showing seconds changes its text within a second, so a one-tick watch is enough to see it move while keeping the lantern quick to light; a longer watch would only delay the marks without catching any more moving countdowns.
7. THE Fake scarcity detector SHALL mark text matching "only N left", "selling fast", "almost gone", or "in high demand"; and THE Fake social proof detector SHALL mark text matching "N people are viewing" or "N bought today"; and each SHALL give a sign saying the lantern cannot know the real stock or numbers.
8. THE Confirmshaming detector SHALL mark a decline control whose words shame the user (for example "No thanks, I don't want ...", "I'd rather pay full price", "I don't like saving"); and SHALL NOT mark a plain "No thanks".
9. THE Trick wording detector SHALL mark a checkbox label that carries two negations (for example "uncheck this box if you do not want ... not").
10. THE lantern SHALL NOT, in v1, attempt to detect sneaking, hidden costs, hidden subscription, nagging, or hard to cancel; the zero-count panel text covers these.
11. EACH detector SHALL, for a given suspect, carry the manor room number of the pattern it names, so the panel can link to that room.

### Requirement 3: Hints, not verdicts

**User Story:** As a player, I want the lantern's words to point at signs I can check and never to pronounce a verdict, so that it teaches me to look rather than telling me what to think.

#### Acceptance Criteria

1. EACH mark's chip SHALL read exactly `Possible: <pattern>`.
2. WHEN the panel opens with `N` suspects and `N` is at least one, THE panel SHALL open with this text: "The Ghost Lantern found N possible tricks on this page. These are hints, not proof: the lantern reads only what is on the screen and it can be wrong. Look for yourself before you decide." WHERE the noun "tricks" is "trick" for `N` of one, and the count word "N" is the number.
3. WHEN the panel opens with `N` equal to zero, THE panel SHALL open with this text: "The Ghost Lantern found no clear signs here. That does not mean the page is honest: some tricks only show in a flow, like a cancel path or a basket that changes."
4. THE lantern SHALL show no score, no grade, and no word such as "illegal" or "scam".

### Requirement 4: Runs only when asked

**User Story:** As a person who has not clicked the lantern, I want nothing of it running, and after I put it out I want no trace of it left, so that it costs me nothing until I ask and nothing after I am done.

#### Acceptance Criteria

1. THE lantern SHALL run no code before the bookmarklet is clicked.
2. WHEN the lantern is put out (by clicking the bookmarklet a second time, by "Put out the lantern", or by Escape), THE lantern SHALL remove every node it added and SHALL leave no listener, timer, or observer it added running.
3. THE lantern SHALL mark that it is lit by setting one global flag under a single unique name on `window`, and SHALL remove that flag when put out, so a second click of the bookmarklet puts it out rather than lighting a second copy.
4. THE lantern SHALL restore keyboard focus to where it was before the lantern lit when it is put out.

### Requirement 5: The overlay and the panel

**User Story:** As a player using pointer, keyboard, or screen reader, I want the lantern's marks and panel to be clear, reachable, and separate from the page, so that I can read each hint and act on it without the page's styles fighting the lantern.

#### Acceptance Criteria

1. THE lantern SHALL place everything it adds under one host element with a **closed** shadow root, so the page's CSS cannot change the lantern and the lantern changes neither the page's styles nor its layout.
2. THE lantern SHALL draw each suspect's mark as a positioned box above the element: a 3 px dashed outline in the manor's candle colour and a small ink-on-parchment chip reading `Possible: <pattern>`, following scroll and resize, and removed with the rest when put out.
3. THE panel SHALL be fixed, bottom right, 320 px wide (full width on a phone), with `role="dialog"`, a heading, and `aria-labelledby` naming that heading.
4. THE panel SHALL show the warning text (Requirement 3) and the list of suspects, each item carrying the pattern, the sign, a "Show me" control, and a "Learn it in the manor" link.
5. WHEN the player activates "Show me" on an item, THE lantern SHALL scroll that suspect into view and move keyboard focus to its mark.
6. THE "Learn it in the manor" link SHALL point at `https://tahaexe.github.io/dark-pattern-manor/#/room/<n>`, open in a new tab, and carry `rel="noopener noreferrer"`.
7. THE panel SHALL carry a "Put out the lantern" control that puts the lantern out.
8. WHEN the player presses Escape, THE lantern SHALL close.
9. WHERE prefers-reduced-motion is active, THE lantern SHALL show no flicker and SHALL keep the outline still.
10. THE panel's text SHALL meet WCAG AA contrast.
11. THE lantern SHALL never mark anything inside its own host.

### Requirement 6: Strict pages

**User Story:** As a player on a page served with a strict security policy, I want the lantern still to show its marks and panel, so that the pages that most need checking are not the ones where the lantern fails silently.

#### Acceptance Criteria

1. THE lantern SHALL build every node with `createElement` and `textContent` and SHALL use no `innerHTML`, so that a page requiring Trusted Types for script still renders the lantern.
2. THE lantern SHALL put its styles into the shadow root through a constructed stylesheet (`new CSSStyleSheet`, `replaceSync`, `adoptedStyleSheets`), and SHALL fall back to a `<style>` element only where `adoptedStyleSheets` is missing.
3. THE feature SHALL measure the lantern on a page served with the header `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; require-trusted-types-for 'script'` and SHALL record whether the marks and the panel got their styles (the computed outline style and the panel background) and whether any console error appeared.
4. THE README's limits SHALL be written from that measurement, not from memory.

### Requirement 7: The bundle and the bookmarklet

**User Story:** As a player installing the lantern, I want one small bookmarklet that contains the whole program, so that I can keep it on my bookmarks bar and it runs with no network.

#### Acceptance Criteria

1. THE build SHALL produce `dist/lantern.js` through a second Vite build in IIFE format, minified, with no `import` left in the output.
2. THE bookmarklet SHALL be the string `javascript:` followed by the URL-encoded contents of `dist/lantern.js`.
3. THE app's own initial bundle SHALL NOT grow by the lantern's size; the lantern SHALL not be imported by the app's entry.
4. THE built `dist/lantern.js` SHALL be at most 30 KB minified, and the bookmarklet string SHALL stay under 64,000 characters.

### Requirement 8: The practice page

**User Story:** As a player, I want a safe practice page with every pattern planted once and an honest twin of each, so that I can learn what the lantern marks and see that it leaves the honest versions alone.

#### Acceptance Criteria

1. THE app SHALL provide a route `#/lantern-practice` showing a fictional shop "Hollowmere Goods" using only fictional names, with each v1 pattern planted once and an honest twin of each beside it.
2. THE practice page SHALL carry a "Try the lantern here" control that runs the same lantern bundle on the practice page.
3. THE practice page SHALL name no real company, product, person, or price.

### Requirement 9: The ending-page install link

**User Story:** As a player who finished the manor, I want to pick up the lantern from the ending page, so that I can take the lesson to the real web.

#### Acceptance Criteria

1. THE ending page SHALL show a draggable "Ghost Lantern" link with one line on how to install it: "Drag this to your bookmarks bar, then click it on any page."
2. THE ending page SHALL show a link to the practice page.
3. THE "Ghost Lantern" link SHALL get its `href` by fetching `./lantern.js` from the game's own site when the page mounts and setting it through a ref with `setAttribute`, since a framework may refuse a `javascript:` href; until then the link SHALL read "Preparing the lantern…" and SHALL NOT be draggable.
4. THE ending-page change SHALL not add the lantern's code to the app's own bundle.

### Requirement 10: Checks

**User Story:** As a maintainer, I want the four promises and the detectors proven by tests and the walk, so that nothing regresses.

#### Acceptance Criteria

1. THE feature SHALL ship jsdom tests where each detector marks its planted pattern and gives no mark on that pattern's honest twin, including the Visual interference look rule (a transparent borderless refuse beside a filled accept is marked; both filled, or both transparent, is not).
2. THE feature SHALL ship a jsdom test where every room's haunted page that v1 covers (the seven patterns) is marked for its pattern, and every one of the twelve rooms' honest twins gives no mark; the Foyer's test SHALL inject the sizes AND the styles that match its CSS (reject: transparent, no border; accept: filled).
3. THE feature SHALL ship fast-check property tests over generated markup asserting the detectors never throw and never mark nodes inside the lantern's host.
4. THE feature SHALL ship tests that lighting and putting out the lantern leaves zero added nodes, listeners, timers, and observers, and tests of the panel's strings (both the `N` and the zero-count text).
5. THE feature SHALL add an `npm run check:lantern` script asserting `dist/lantern.js` exists, is at most 30 KB minified, contains none of the forbidden tokens (Requirement 1.5), and that the bookmarklet string stays under 64,000 characters.
6. THE walk (`npm run qa:full`) SHALL run one step on `#/lantern-practice` at both sizes: run the bundle as the practice button does, open the panel with `N` equal to the planted count, confirm every mark is visible and points at its element, press Escape, confirm focus returns and no lantern node remains.
7. THE walk SHALL also serve the same practice page with the strict policy header (Requirement 6.3) on a test-only path, run the bundle through the devtools protocol, and report whether the marks and the panel got their styles and whether any console error appeared.
8. THE walk SHALL ALSO run the built bundle on each v1 room's haunted page in a real headless Chrome at 1280x720 — the rooms whose pattern the lantern covers, taken from the registry (the rooms whose `pattern` is one of the seven v1 patterns), not from hard-coded room numbers — and SHALL expect at least one mark of that room's own pattern; AND SHALL run the bundle on the title page and expect no mark. A miss (a covered room with no mark of its pattern, or a mark on the title page) SHALL be a failure in `qa:full`, counted like a room failure.

### Requirement 11: No real company shown marked

**User Story:** As a maintainer, I want every demo, test, screenshot, and text to use fictional pages, so that the lantern never shows a real company marked as tricking people.

#### Acceptance Criteria

1. EVERY demo, test, screenshot, and player-facing text for the lantern SHALL use the fictional practice page or the manor's own pages, and SHALL name no real site.

## Correctness Properties

These are the executable properties, for unit, property-based, and walk testing.

### Detector properties

- For each v1 pattern, the detector marks its planted instance on the practice page and marks nothing on that pattern's honest twin.
- For the Visual interference look rule, a transparent borderless refuse beside a filled accept is marked, and neither two filled controls nor two transparent controls is marked.
- For each of the seven v1 rooms, the detector for that room's pattern marks the room's haunted page; for all twelve rooms, no detector marks the honest twin.
- Over generated markup, no detector throws, and no detector returns a suspect whose element is inside the lantern's host.
- Every suspect carries a valid manor room number (1–12) for its pattern.

### Promise properties

- The bundle source contains none of the forbidden tokens; the overlay and detectors create no `fetch`/`XHR`/`sendBeacon`/`WebSocket`/`EventSource`/`window.open` call and no URL-bearing element except the manor links.
- Lighting then putting out the lantern returns the DOM to zero lantern nodes and leaves no listener, timer, or observer; the pre-light focus is restored.
- A second light call while lit puts the lantern out (the single global flag toggles).

### Panel-string properties

- With `N` ≥ 1 the panel's opening text is exactly the warning text with the right count and singular/plural noun; with `N` = 0 it is exactly the zero-count text.
- Each chip reads `Possible: <pattern>`; no string contains "illegal", "scam", a score, or a grade.

### Bundle properties

- `dist/lantern.js` is at most 30 KB minified and leaves no `import`; the bookmarklet string is under 64,000 characters.
- The app's initial bundle (by `check:size`) does not include the lantern.

### Real-browser room property (measured by the walk)

- Run on each v1 room's haunted page (the covered rooms, from the registry) at 1280x720, the built bundle marks at least one suspect of that room's pattern; run on the title page it marks nothing.

### Strict-page property (measured by the walk)

- Served under the strict CSP, the marks and the panel still receive their styles (a non-`none` computed outline on a mark, a non-transparent panel background) and no console error appears, or the README records exactly what did not.
