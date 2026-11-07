# Design — manor-qa

## Overview

`manor-qa` is a stdio MCP server that exposes three real-browser QA tools to
Kiro. It is a plain Node 22+ ES module with **no new dependency**: it reuses
Node's built-in `fetch`, `WebSocket`, `http`, `child_process`, `zlib` and
`node:test`, and the already-present `axe-core` only where the walk wants a
colour-contrast cross-check (loaded from `node_modules` at runtime, not added
as a new package). All browser work is done over the Chrome DevTools Protocol
(CDP) the prototype already used, so nothing like Puppeteer is introduced.

The code is split so that everything that can be tested without a browser is a
pure function in its own module, and the only parts that need a real browser
live behind the two browser tools:

```
scripts/mcp/
  manor-qa.mjs            the server: JSON-RPC over stdio, tool dispatch
  protocol.mjs            pure JSON-RPC framing + request router (no I/O)
  rooms.mjs               pure room-range parser ("1-12" | "3" | "1,4,7")
  static-server.mjs       the dist/ static server + pure path mapper
  browser.mjs             Chrome launch + CDP client (the only browser glue)
  walk.mjs                the keyboard walk of each room (uses browser.mjs)
  contrast.mjs            pure WCAG contrast maths (no browser)
  contrast-scan.mjs       the in-browser pixel scan (uses browser.mjs)
  checks.mjs              check_rooms: shells `node scripts/check-rooms.mjs`
  manor-qa-smoke.mjs      the end-to-end smoke script
  *.test.mjs              node:test suites (protocol, contrast, rooms, paths)
```

Keeping `protocol.mjs`, `rooms.mjs`, `contrast.mjs` and the path mapper in
`static-server.mjs` pure means the test suite exercises the real logic by
direct import, while the protocol test still spawns the whole server as a child
process and talks to it over stdio (Requirement 6.2).

### Why a real browser

A jsdom DOM has no layout, stacking context or pixels. The three faults the
prototype found — a whisper painted under the backdrop, a slider that clipped
nothing, ink text on a dark gradient — are all layout, stacking or pixel
faults, invisible to jsdom and to axe-on-jsdom. The server therefore drives a
real headless Chrome, checks visibility with `document.elementFromPoint`,
drives the keyboard through CDP `Input.dispatchKeyEvent`, and reads pixels from
a screenshot drawn into a `<canvas>`.

## Components and interfaces

### protocol.mjs — pure JSON-RPC 2.0 framing and router

No I/O. Exports:

```js
export const JSONRPC = '2.0';
export function parseMessage(line)        // -> object | null (null on bad JSON)
export function makeResult(id, result)    // -> { jsonrpc, id, result }
export function makeError(id, code, message) // -> { jsonrpc, id, error }
export const METHOD_NOT_FOUND = -32601;
export const INVALID_REQUEST  = -32600;
export function createRouter({ serverInfo, tools })
```

`createRouter` returns an async `handle(message)` that:

- `initialize` → result `{ protocolVersion: msg.params?.protocolVersion ??
  DEFAULT_PROTOCOL, serverInfo, capabilities: { tools: {} } }`.
- a notification (no `id`) → returns `null` (the server writes nothing).
- `tools/list` → result `{ tools: tools.map(descriptor) }`, each descriptor
  `{ name, description, inputSchema }`.
- `tools/call` → look up `params.name`; unknown name → `makeError(id,
  METHOD_NOT_FOUND, …)`; known → `await tool.run(params.arguments ?? {})`,
  wrapped as `{ content: [{ type: 'text', text }] }`.
- any other method → `makeError(id, METHOD_NOT_FOUND, …)`.

The router is pure of stdio: `manor-qa.mjs` owns the readline loop, calls
`handle`, and writes any non-null reply as one line to stdout. Logs go to
stderr via a `log()` helper, keeping stdout clean (Requirement 1.9).

### manor-qa.mjs — the stdio server

- Reads stdin line by line (`readline` over `process.stdin`).
- For each line: `parseMessage`; on `null` logs to stderr and continues (the
  malformed-line case, Requirement 1.8); otherwise `await handle(message)` and,
  if the reply is non-null, writes `JSON.stringify(reply) + "\n"` to stdout.
- Declares the three tool descriptors with their JSON Schemas and binds each
  `run` to its implementation (`checks.runCheckRooms`, `walk.runWalk`,
  `contrastScan.runContrastScan`).
- `version` comes from `package.json` (read once at start).

Tool input schemas:

- `check_rooms`: `{ type: 'object', properties: {}, additionalProperties:
  false }`.
- `walk_rooms` and `contrast_scan`: `{ type: 'object', properties: { rooms:
  { type: 'string', default: '1-12' }, width: { type: 'integer', default:
  1280 }, height: { type: 'integer', default: 720 } }, additionalProperties:
  false }`.

### rooms.mjs — the room-range parser

```js
export function parseRooms(spec, { min = 1, max = 12 } = {})  // -> number[]
```

Accepts `"1-12"` (inclusive range), `"3"` (single), `"1,4,7"` (list), and
combinations of commas and ranges. Trims, rejects empty, clamps to `[min,
max]`, de-duplicates and sorts ascending. Throws a clear `Error` on a
non-numeric or reversed token. This satisfies property P7.

### static-server.mjs — serve dist/ under the base path

A small `http.createServer` bound to `127.0.0.1:0` (ephemeral port). The pure
part is the path mapper, exported for test:

```js
export function mapUrlToFile(urlPath, { base, distDir })
// -> { filePath } for a real file under distDir
// -> { spaFallback: true } for an unknown route under base (serve index.html)
// -> { outside: true } for anything resolving outside distDir
export const CONTENT_TYPES  // extension -> mime, incl. js, css, html, webp,
                            // svg, woff, woff2, png, json
```

Rules (property P8):

- A request path must start with `base` (`/dark-pattern-manor/`); otherwise it
  is treated as the base root and mapped to `index.html` only when it is `/`
  or empty, else `outside`.
- Strip the base, resolve the remainder against `distDir` with
  `path.resolve`, and confirm the resolved path stays within `distDir` (guards
  against `..` traversal) — else `{ outside: true }`.
- If the resolved path is an existing file, serve it with the content type for
  its extension.
- If it does not exist and has no file extension (an SPA route such as
  `/dark-pattern-manor/room/3`), return `{ spaFallback: true }` so the server
  sends `index.html`. The game uses hash routing, so in practice the browser
  always requests the base root and then navigates by hash; the fallback is
  the safety net.
- A path that exists-not and *has* an extension is a 404.

The server sets `Content-Type` from `CONTENT_TYPES`, reads the file with
`fs.readFile`, and returns 404/500 as plain text. `start()` resolves with
`{ port, origin, baseUrl, close }` where `baseUrl` is
`http://127.0.0.1:<port>/dark-pattern-manor/`.

### browser.mjs — Chrome launch and a tiny CDP client

The only browser glue, factored out of the prototype:

```js
export function findChrome()   // CHROME_PATH or per-OS default; throws if none
export async function launchChrome({ width, height, port }) // -> { proc, close }
export async function connectCdp(debugPort) // -> { send, ev, key, on, close }
```

- `findChrome()` reads `process.env.CHROME_PATH` first. Otherwise it tries the
  usual install paths for the host OS:
  - Windows: `C:/Program Files/Google/Chrome/Application/chrome.exe` and the
    `(x86)` and `%LOCALAPPDATA%` variants.
  - macOS: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
  - Linux: `google-chrome`, `google-chrome-stable`, `chromium`,
    `chromium-browser` (resolved on `PATH`).
  It throws a clear error naming `CHROME_PATH` when none exists (Req 3.4).
  These default paths are not written to any committed file beyond this
  source module, and the module contains no user-specific path.
- `launchChrome` spawns headless Chrome (`--headless=new`, a remote debugging
  port, a throwaway `--user-data-dir` under `os.tmpdir()`, `--hide-scrollbars`,
  `--mute-audio`, `--no-first-run`, `--no-default-browser-check`), with
  `stdio: 'ignore'` so nothing leaks to stdout.
- `connectCdp` polls `http://127.0.0.1:<port>/json/list` for the page target,
  opens its `webSocketDebuggerUrl` with the built-in `WebSocket`, and returns
  `send(method, params)`, `ev(expr)` (an `awaitPromise`, `returnByValue`
  `Runtime.evaluate`), `key(name)` (a key down+up through
  `Input.dispatchKeyEvent`), an `on(event, cb)` subscription (used to collect
  `Runtime.exceptionThrown` and console errors), and `close()`.

The debugging port is chosen from an ephemeral free port (bind a throwaway
`net` server to `127.0.0.1:0`, read the port, close it) so parallel runs do
not collide.

### walk.mjs — the keyboard walk

`runWalk({ rooms, width, height })`:

1. Guard: if `dist/index.html` is missing, return the "run `npm run build`
   first" message and launch nothing (Req 3.2).
2. Start the static server, launch Chrome, connect CDP, install the in-page
   helpers (`__vis`, `__heads`, `__ann`) and the page's console/exception
   listeners.
3. For each requested room navigate to `${baseUrl}#/room/N` and run the same
   checks the prototype ran, against the **real** selectors:
   - instruction visible: `__vis('.live-announcement')`.
   - lantern present and the possessed reachable: press `L`, then Tab up to 20
     times until `document.activeElement.classList.contains('possessed')`.
   - three cards visible: `.spell-card` × 3 all `__vis === 'ok'`.
   - each wrong card's whisper visible: focus each card, Enter, and if still
     picking read `__vis('.spell-card-whisper')`.
   - the right card frees the room: the card whose activation leaves `picking`.
   - comparison visible: `__vis('.comparison input[type=range]')` /
     `__vis('.comparison')`.
   - the slider really changes what is on top: capture a signature of which
     element is top-most at sample points, press `Home`, capture again, assert
     they differ.
   - all haunted at 0 / all honest at 100: at slider 0 every sample point
     inside `.comparison` resolves (via `elementFromPoint`) to a
     `.comparison-haunted` descendant; at 100 to `.comparison-honest`
     (ignoring the decorative `.comparison-divider`/`.comparison-grip`/
     `.comparison-tag`).
   - focused honest control visible: focus each honest-layer button/anchor and
     assert `__vis(activeElement) === 'ok'`.
   - task completes in one press: activating the honest task control leaves the
     heading set showing `The room is free` (the `.visually-hidden` h2 text) /
     announcement containing `free`.
   - Ghost Guide visible: `__vis('.guide-card')`.
   - continue link visible: `__vis('.room-continue')`.
4. After the rooms, navigate to `${baseUrl}#/end` and assert the ending's
   ordered list has twelve `li` items (Req 3.6). (The ending is gated until all
   twelve rooms are complete in the same browser session; the walk completes
   each room it visits, so a `1-12` walk reaches the full checklist. A partial
   walk reports the count it sees.)
5. Return `JSON.stringify({ base, width, height, rooms, report, errors })`.
   No screenshots are written to disk (the prototype wrote JPEGs; the server
   keeps everything in memory and returns text only), so the tool writes no
   machine path anywhere.

The in-page helpers mirror the prototype's `__vis` (2×2 px minimum, in
viewport, top-most at a sample point via `elementFromPoint`), `__heads` (the
`.visually-hidden` h2 text) and `__ann` (the `.live-announcement` text).

### contrast.mjs — pure WCAG contrast maths

No browser, no DOM. Exports:

```js
export function parseColor(css)        // -> {r,g,b,a} | null (null if transparent)
export function relativeLuminance({r,g,b})  // WCAG sRGB luminance
export function contrastRatio(a, b)    // -> number in [1, 21]
export function percentile(sortedOrUnsorted, p)  // p in [0,1]
export function isLargeText(sizePx, weight)      // -> boolean
export function threshold(sizePx, weight)        // -> 3 or 4.5
```

- `parseColor` accepts `rgb()`, `rgba()`, `#rgb`/`#rrggbb`, and the keyword
  `transparent`; a fully transparent colour (`a === 0`) returns `null` so the
  scan skips it (Req 4.6).
- `relativeLuminance` applies the WCAG sRGB transfer function.
- `contrastRatio` returns `(L1 + 0.05) / (L2 + 0.05)` with `L1 ≥ L2`, so it is
  symmetric and bounded in `[1, 21]` (property P4). Black vs white is exactly
  21; a colour vs itself is exactly 1.
- `percentile(values, p)` sorts a copy and returns the value at the `p`
  position (nearest-rank), so the scan can take the 70th percentile of the
  per-pixel ratios (property P5).
- `isLargeText` / `threshold` encode WCAG large text: ≥ 24 px, or ≥ 18.66 px
  when bold (weight ≥ 700) → 3:1; else 4.5:1 (property P6).

A shared `contrastOfBox(textColor, pixels, { size, weight })` helper (also
pure) computes, for a flat array of `{r,g,b}` pixels, each pixel's ratio to the
text colour, takes the 70th percentile, and returns `{ ratio, threshold,
flagged }`. The browser side feeds it pixels read from the canvas; the test
feeds it synthetic pixel arrays (e.g. 70 % white, 30 % black).

### contrast-scan.mjs — the in-browser pixel scan

`runContrastScan({ rooms, width, height })`:

1. Same guard, static server, Chrome and CDP setup as the walk.
2. For each room, complete it (reuse the walk's "free the room" steps so the
   comparison exists), then for slider 0 and slider 100:
   - run an in-page script that finds every visible text node inside
     `.comparison`, records each one's computed `color`, `fontSize`,
     `fontWeight`, and client box relative to the comparison box;
   - capture a screenshot of the comparison box (`Page.captureScreenshot` with
     a `clip`), send the PNG data-URL into the page, draw it into a `<canvas>`,
     and `getImageData` for each text box to read its pixels;
   - for each text box call the pure `contrastOfBox` with the text colour and
     the box pixels and the size/weight, and collect every `flagged` result.
3. Return `JSON.stringify({ rooms, flags })` where each flag names the room,
   the state (haunted/honest), a short text excerpt, the colour, the size, the
   reported ratio and the threshold it fell under (Req 4.7).

Skipped: any text whose `parseColor` is `null` (transparent) (Req 4.6).

### checks.mjs — check_rooms

`runCheckRooms()` shells `node scripts/check-rooms.mjs` with
`child_process.spawn`, captures stdout+stderr, and returns the combined text
(the per-room lines and the overall result). It uses `cwd` = the repo root
(derived from `import.meta.url`, never a hard-coded user path) so the relative
script path resolves, satisfying Req 2.1–2.4. The repo root derivation yields a
path at runtime; no user path is written into any file.

### manor-qa-smoke.mjs — the smoke script

Spawns `manor-qa.mjs`, performs `initialize`, `tools/list`, `check_rooms`, and
`walk_rooms`/`contrast_scan` on rooms `1-2`, and prints a short human summary
to stderr/stdout of the script itself (not the server). Used at the end of the
task to prove the server runs end to end.

## MCP registration

`.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "manor-qa": {
      "command": "node",
      "args": ["scripts/mcp/manor-qa.mjs"],
      "disabled": false,
      "autoApprove": ["check_rooms", "walk_rooms", "contrast_scan"]
    }
  }
}
```

The args carry only the repo-relative script path — no drive letter, no user
or machine path (Req 5.2). Kiro launches the server with the workspace as the
working directory, so the relative path resolves.

## Testing strategy

All suites use `node:test` and live in `scripts/mcp/*.test.mjs`, wired into
`npm test` through a new `test:qa` script (`node --test scripts/mcp/*.test.mjs`)
added to the `test` script after the existing vitest and hook runs.

- **protocol.test.mjs** — spawns `manor-qa.mjs` as a child, writes one JSON
  line per message, reads replies line by line, and asserts: `initialize`
  returns `serverInfo.name === 'manor-qa'` and `capabilities.tools`;
  `tools/list` returns exactly the three names each with an object
  `inputSchema`; an unknown method returns error `-32601` with the right `id`;
  an unknown tool returns an error; a malformed line is followed by a working
  `initialize` (property P1, P2, P3). Also unit-tests the pure `createRouter`
  directly for the notification (no reply) case.
- **contrast.test.mjs** — black/white 21:1; a colour on itself 1:1; symmetry
  and bounds over fast-check-generated colours; `percentile` picks the
  background when 30 % of a synthetic box is text; the large-text thresholds
  (24 px → 3, 18.66 px bold → 3, 18 px → 4.5) (properties P4, P5, P6).
- **rooms.test.mjs** — `"1-12"` → 1..12; `"3"` → [3]; `"1,4,7"` → [1,4,7];
  reversed/ empty / out-of-range handling; fast-check property that every
  produced number is in range and the list is sorted and unique (property P7).
- **static-server.test.mjs** — `mapUrlToFile` maps the base root to
  index.html, maps a real asset path to its file, returns `spaFallback` for an
  unknown extension-less route under the base, and `outside` for `..`
  traversal or a path off the base (property P8); plus a live test that boots
  the server against a temp dir and fetches a file and the fallback.

No test launches Chrome (CI has none); the browser tools are proven by the
smoke script run at the end of the task, and their pure helpers
(`contrastOfBox`, the walk's selector helpers kept as pure strings) are unit
tested.

## Privacy and safety

The server makes only loopback (`127.0.0.1`) requests and launches a local
Chrome; it sends no project code or data to any third party, matching the
game's own runtime-privacy stance. It writes no file to disk during a walk or
scan (text results are returned over the protocol), so no machine path is ever
written anywhere. `check_rooms` shells the existing validation script
unchanged.
