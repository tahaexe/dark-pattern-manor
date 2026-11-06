# Design Document

## Overview

The Ending is the closing page of Dark Pattern Manor, rendered at a new hash route `#/end`. It recaps the twelve named ghosts as a practical checklist (each line linking back to its room), names the six wandering ghosts that only appeared in the Guide, and offers a privacy-respecting share card. It also adds link-preview metadata to `index.html` so a shared link previews well.

The Ending mirrors the existing room architecture rather than inventing a new one:

- **Routing** lives in `src/app/App.tsx`, which already parses the hash into a route. A new `end` route is added to `parseHash` and to the render switch.
- **On-demand loading**: the Ending component lives in `src/app/EndingPage.tsx` and is pulled in through a dynamic `import()` the same way rooms are, so the initial bundle (engine + shared UI) does not grow. The bundle-size gate (`scripts/check-bundle-size.mjs`) walks only static imports from the entry, so a lazily-imported Ending is never counted.
- **Progress** is read through the existing `doneCount()` from `src/engine/progress.ts`. The completion gate is simply `doneCount() >= 12`.
- **Look** reuses the manor frame, task-bar-free closing layout, tokens, and fonts already in `src/styles`. The Ending's own styles live in `src/app/ending.css`, imported by `EndingPage.tsx` so they travel in the Ending chunk, not the initial bundle.

Nothing in the Ending talks to the network or sets cookies. The only outward action is the player-invoked Web Share or clipboard copy, and the site URL it shares is read from the page's own `location`.

## How a room reaches the next, and how room 12 reaches the end

Today a room's only navigation is the global "Back" button in `App.tsx`; the completed room unlocks the next through `completeRoom(slug, nextSlug)` but offers no in-room "continue". The brief requires the twelfth room's honest step to reach `#/end` "the way each room reaches the next", which means adding the missing, consistent continue affordance to every room's honest/done step:

- `App.tsx` computes, for the current room number `N` (1–12), a **next hash**: `#/room/${N+1}` for rooms 1–11, and `#/end` for room 12. It passes this to `Room` as a new optional prop `nextHash`.
- `Room.tsx`, once it is in the `honest` or `done` state, renders a continue link (an `<a href={nextHash}>`) labelled "Leave this room" for rooms 1–11 and "Leave the manor" for room 12. Hash links trigger the existing `hashchange` listener, so no new navigation machinery is needed.

This is the one behavioural change to the shared engine: every room gains a continue link in its honest step, and room 12's continue link points at `#/end`. The link is a plain anchor, keyboard-reachable, and styled with existing tokens. Because it is an anchor to a hash, it needs no JavaScript and adds no state to the reducer.

From the title page, `App.tsx` additionally renders a "The manor is quiet" link to `#/end` when `doneCount() >= 12`, satisfying the second entry path.

## Routing changes (`src/app/App.tsx`)

`parseHash` gains one branch:

```ts
if (hash === '/end') return { route: 'end', room: 1 };
```

`Route` becomes `'title' | 'room' | 'look' | 'end'`. The render switch gains an `end` branch that lazily loads and renders `EndingPage`. The Ending is loaded exactly like a room chunk: a small effect imports `./EndingPage` when `route === 'end'` and stores the component in state; while it loads, the same in-manor "Lighting the candles…" status box is shown (whole, never broken). An alternative — `preact/compat` `lazy`/`Suspense` — is avoided to keep the initial bundle free of the compat shim; a hand-rolled dynamic import matches the existing room-loading pattern and keeps the entry chunk unchanged.

The next-hash computation:

```ts
const nextHash = roomNum >= 12 ? '#/end' : `#/room/${roomNum + 1}`;
```

passed to `<Room room={room} nextSlug={nextSlug} nextHash={nextHash} />`.

## The Ending component (`src/app/EndingPage.tsx`)

A single function component. Its shape:

1. Reads `doneCount()` once on mount (progress does not change while the Ending is open).
2. **Gate**: if the count is below 12, it renders only a short gate: an `h1` "The manor is quiet" is *not* used here to avoid implying completion; instead a focusable `h1` "The manor waits" is shown with the line "Name all twelve ghosts first" and a back link to `#/`. (The gate deliberately does not render the checklist, wandering list, or share card.) The exact gate line text required by the spec, "Name all twelve ghosts first", is present verbatim.
3. **Complete**: otherwise it renders, in order:
   - `h1` "The manor is quiet" (focusable, `tabindex={-1}`, focused on mount for the screen-reader/keyboard entry, matching the room pattern).
   - the line "You named all twelve ghosts."
   - an `h2` "Ghost hunt in your own browser" followed by an `<ol>` of twelve `<li>`, each line's text with a trailing room link.
   - an `h2` "Six ghosts still wander" followed by the six wandering lines.
   - the share card (`h2` or a labelled region) with the sentence, the site URL, and the Share button.

### The checklist data

The twelve checklist lines and the twelve room titles are held together so the link's accessible name is the room's title. Room titles are the product's room names (The Foyer … The Cellar), in order 1–12. To avoid loading all twelve room chunks just for their titles, the titles are a small constant list in `EndingPage.tsx` (the Ending is already app-shell code, and the titles are fixed product copy):

```ts
const CHECKLIST: ReadonlyArray<{ line: string; room: number; title: string }> = [
  { line: 'On a cookie banner, find "Reject all" before you click anything.', room: 1, title: 'The Foyer' },
  // … through room 12 'The Cellar'
];
```

Each list item renders the line text and a room link:

```tsx
<li>
  {line} <a href={`#/room/${room}`} aria-label={`Go to room ${room}: ${title}`}>Revisit {title}</a>
</li>
```

The link's accessible description is the room's title (Requirement 2.4): the `aria-label` names the room title, and the visible link text also contains the title, so both pointer and screen-reader users see which room the link leads to.

### The wandering ghosts

A constant list of the six `{ name, desc }` pairs, rendered as a list where each item shows the name (strong) and the description, producing the exact required line text "Name: description." when read as text content.

## The share card (`src/app/ShareCard.tsx` or inline in `EndingPage`)

Kept as a small component for its own test. Behaviour:

```ts
function siteUrl(): string {
  // origin + base path; no hard-coded host.
  const base = import.meta.env.BASE_URL || '/';
  return new URL(base, window.location.origin).href;
}
```

`import.meta.env.BASE_URL` is Vite's build-time base (`/dark-pattern-manor/`), so the shared URL is the deployed site root derived from the page's own origin — never a hard-coded host. In tests (jsdom) `BASE_URL` resolves to `/`, and `window.location.origin` is the test origin, which is fine for asserting behaviour.

Share text constants:

```ts
const SHARE_TITLE = 'Dark Pattern Manor';
const SHARE_TEXT = 'I named all twelve ghosts of Dark Pattern Manor.';
```

The Share button handler:

```ts
async function onShare() {
  const url = siteUrl();
  const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
  if (typeof nav.share === 'function') {
    try { await nav.share({ title: SHARE_TITLE, text: SHARE_TEXT, url }); } catch { /* user cancelled; no fallback, no tracking */ }
    return;
  }
  try {
    await navigator.clipboard.writeText(`${SHARE_TEXT} ${url}`);
    setCopied(true); // reveals "Copied" in the polite live region
  } catch {
    setCopied(true); // still announce; nothing is sent anywhere
  }
}
```

- When `navigator.share` exists it is called with `{ title, text, url }` and the clipboard path is not taken (Requirement 4.3). A user-cancelled share rejects; it is swallowed and nothing else happens (no tracking, no fallback).
- When `navigator.share` is absent, the text and URL are written to the clipboard and "Copied" appears in a `role="status" aria-live="polite"` region (Requirement 4.4). The live region is always in the DOM and empty until a copy, so the announcement is polite and announced once.
- No third-party request, no script, no analytics (Requirement 4.5, steering "Runtime privacy").

The card's markup is the manor card look (`.guide-card`-style surface, Cormorant Garamond heading via tokens), the sentence, the site URL shown as text, and a real `<button>`.

### Testing the share behaviour

Both branches are testable in jsdom:

- Define `navigator.share` as a mock function, click Share, assert it was called once with an object whose `title`, `text`, and `url` match (url ends with the base path), and assert the clipboard was not written.
- Delete `navigator.share`, mock `navigator.clipboard.writeText`, click Share, assert `writeText` was called with the text and URL and that the live region now contains "Copied".

## Link-preview metadata (`index.html`)

Static `<meta>` tags added to `<head>`, using the base path in the image URL so it resolves on GitHub Pages:

```html
<meta property="og:title" content="Dark Pattern Manor" />
<meta property="og:description" content="Twelve haunted web pages, one dark pattern each: name the ghost, free the honest twin." />
<meta property="og:type" content="website" />
<meta property="og:image" content="/dark-pattern-manor/og-card.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Dark Pattern Manor — a candlelit manor where every dark pattern is a ghost." />
<meta name="twitter:card" content="summary_large_image" />
```

The `og:image` path uses the same `/dark-pattern-manor/` base the favicon already uses, so the image resolves at the deployed base path. The PNG itself is **not** created here (Requirement 5.4); it will be added as `public/og-card.png` separately, at which point Vite copies it to the base path as `/dark-pattern-manor/og-card.png`.

### Testing the metadata

A test reads `index.html` from disk (a Node/vitest test that reads the file as text, so it checks the shipped shell, not a rendered DOM) and asserts each required tag's presence and content, and that the `og:image` content ends with `og-card.png`.

## Look and layout (`src/app/ending.css`)

- The Ending sits inside the existing `.room-scene` backdrop so it looks like a manor room, with a closing card on the manor frame.
- The checklist `<ol>` is a single column by default; above 1000 px it becomes two columns via `columns: 2` (or a two-column grid), so a 1920 × 1080 viewport shows the whole checklist without cramming (Requirement 6.2). CSS multi-column keeps the ordered-list numbering intact.
- At 412 px everything is a single column with wrapping text and no fixed widths that exceed the viewport, so there is no horizontal overflow (Requirement 6.3); the frame uses the existing under-600px thinner-border rule.
- All colours come from `tokens.css`; text on parchment and on wood both meet AA (the same pairings the rooms already use). No new raster image is added (Requirement 6.1); any ornament is CSS/inline SVG.
- A `@media (prefers-reduced-motion: reduce)` block (plus the global base.css rule) ensures no animation or transition runs (Requirement 6.4).
- Headings form a clean outline: one `h1` ("The manor is quiet"), then `h2`s for the checklist, the wandering ghosts, and the share card, with no skipped level (Requirement 2.5, 6.5).

## Components and Interfaces

- `src/app/App.tsx` — add `end` to `Route` and `parseHash`; lazily load `EndingPage`; compute and pass `nextHash`; render a `#/end` link on the title when `doneCount() >= 12`.
- `src/engine/Room.tsx` — accept optional `nextHash`; render a continue link in the `honest`/`done` states ("Leave the manor" when it points to `#/end`, else "Leave this room").
- `src/app/EndingPage.tsx` — the gated Ending: gate line, heading, checklist, wandering ghosts, share card; imports `./ending.css`; reads `doneCount()`.
- `src/app/ShareCard.tsx` — the share card with the Web Share / clipboard logic and the polite live region.
- `index.html` — the Open Graph and Twitter meta tags.

## Testing Strategy

- `src/app/EndingPage.test.tsx`: with progress reset to 12 completed rooms, assert the `h1` "The manor is quiet", the line "You named all twelve ghosts.", the twelve checklist `<li>` texts word for word and their `#/room/N` links with the room-title accessible name, and the six wandering-ghost lines word for word; assert exactly one `h1`; assert zero axe-core violations. With progress below 12, assert "Name all twelve ghosts first" is shown and the checklist is not.
- `src/app/ShareCard.test.tsx`: the `navigator.share` branch (called once with title/text/url; clipboard not used) and the clipboard branch (writeText called with text + url; "Copied" announced in the polite region).
- `src/app/indexHtmlMeta.test.ts`: reads `index.html` and asserts the OG/Twitter tags exist and `og:image` ends with `og-card.png`.
- Existing `src/app/App.test.tsx` continues to pass; a case is added for the `#/end` route rendering and for the gate.

## Build and gates

- `npm test` runs all of the above.
- `npm run build` (tsc + vite) type-checks the new `nextHash` prop and the Ending.
- `npm run check:rooms` is unaffected (no room data changes).
- `npm run check:size` must still pass: because `EndingPage` and `ending.css` are reached only through dynamic `import()`, they form their own chunk and are not summed into the entry total.
