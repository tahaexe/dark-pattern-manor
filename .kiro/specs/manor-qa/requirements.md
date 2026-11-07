# Requirements — manor-qa

## Introduction

`manor-qa` is a Model Context Protocol (MCP) server that gives Kiro a real
headless-browser check of Dark Pattern Manor while it builds rooms. Every room
already passes its unit tests, its jsdom axe checks and Lighthouse, yet a
prototype walk in a real browser found three faults a sighted player would
have met: a whispered hint painted under the backdrop, a Before/After slider
that moved nothing, and honest cards whose dark gradient sat under ink text. A
test DOM has no layout, stacking or pixels, so those faults were invisible to
jsdom. This server turns the prototype walk (`scripts/qa/walk-prototype.mjs`)
into three tools Kiro can call: `check_rooms`, `walk_rooms` and
`contrast_scan`.

The server speaks MCP over stdio (JSON-RPC 2.0, one JSON message per line),
adds no new dependency (plain Node 22+ ES module), and serves the built site
from `dist/` to a locally-launched headless Chrome. It never writes a local
user or machine path into any file, never commits and never pushes.

Terms used below:

- **Protocol message** — a single JSON-RPC 2.0 object written as one line on
  stdout.
- **Comparison box** — the room's before/after wipe, the element with
  `role="group"` and class `comparison`, whose `comparison-haunted` layer is
  the haunted preview and whose `comparison-honest` layer is the honest twin,
  revealed left-to-right by a slider from 0 (all haunted) to 100 (all honest).
- **Visible** — an element whose box is at least 2×2 px, lies within the
  viewport, and is the top-most element (`document.elementFromPoint`) at one of
  its sample points.

## Requirement 1 — MCP protocol over stdio

**User story:** As Kiro, I want to talk to the server over stdio with JSON-RPC
2.0 so that I can discover and call its tools from within a session.

#### Acceptance criteria

1. WHEN the server receives an `initialize` request THEN it SHALL reply with a
   result containing `serverInfo` `{ name: "manor-qa", version }`, a
   `capabilities` object that includes `tools: {}`, and a `protocolVersion`.
2. IF the `initialize` request carries a `protocolVersion` THEN the server
   SHALL answer with that same `protocolVersion`; ELSE it SHALL answer with a
   default protocol version string.
3. WHEN the server receives a `notifications/initialized` notification (a
   message with no `id`) THEN it SHALL NOT write any reply.
4. WHEN the server receives a `tools/list` request THEN it SHALL reply with a
   `tools` array listing exactly `check_rooms`, `walk_rooms` and
   `contrast_scan`, each with a `name`, a `description` and an `inputSchema`
   that is a valid JSON Schema object.
5. WHEN the server receives a `tools/call` request for a known tool THEN it
   SHALL run that tool and reply with a result whose `content` is an array
   with one text item.
6. WHEN the server receives a request for an unknown method THEN it SHALL reply
   with a JSON-RPC error object (code `-32601`, method not found) carrying the
   request's `id`.
7. WHEN the server receives a `tools/call` for an unknown tool name THEN it
   SHALL reply with a JSON-RPC error object carrying the request's `id`.
8. WHEN the server receives a line that is not valid JSON THEN it SHALL NOT
   crash and SHALL continue to serve later valid messages.
9. The server SHALL write nothing but protocol messages to stdout; all logs
   SHALL go to stderr.
10. WHILE answering any request the server SHALL echo the request's `id` in its
    reply, and SHALL use JSON-RPC version string `"2.0"`.

## Requirement 2 — check_rooms tool

**User story:** As Kiro, I want a tool that runs the room-data checks so that I
can validate room content without a browser.

#### Acceptance criteria

1. WHEN `check_rooms` is called THEN it SHALL run the same validation as
   `npm run check:rooms` (the logic in `scripts/check-rooms.mjs`).
2. WHEN the validation finishes THEN the tool SHALL return text with one line
   per room plus one overall result line.
3. IF any room fails validation THEN the returned text SHALL name the failing
   room and the rule it broke, and the overall result line SHALL report
   failure.
4. The tool SHALL NOT write a local user or machine path into its output.

## Requirement 3 — walk_rooms tool

**User story:** As Kiro, I want a tool that walks each room by keyboard in a
real headless browser so that I meet the faults a sighted, keyboard player
would meet.

#### Acceptance criteria

1. WHEN `walk_rooms` is called with `{ rooms, width, height }` THEN `rooms`
   SHALL accept either a range (`"1-12"`) or a list (`"1,4,7"`) or a single
   number (`"3"`); `width` SHALL default to 1280 and `height` to 720.
2. IF `dist/` is missing or has no `index.html` THEN the tool SHALL return a
   message telling the caller to run `npm run build` first, and SHALL NOT
   launch a browser.
3. WHEN the tool runs THEN it SHALL serve the built site from `dist/` on an
   ephemeral `127.0.0.1` port under the Vite base path
   (`/dark-pattern-manor/`), with correct content types and an index.html
   fallback for SPA routes.
4. WHEN the tool launches the browser THEN it SHALL use `CHROME_PATH` if set,
   else the usual Chrome install path for the host OS (Windows, macOS or
   Linux); IF no Chrome is found THEN it SHALL return a clear error naming
   `CHROME_PATH`.
5. For each requested room the tool SHALL, by keyboard, verify: the
   instruction is visible; the lantern is present; the possessed element is
   reachable by Tab; three cards are visible; each wrong card's whisper is
   visible (by `elementFromPoint`); the right card frees the room; the
   comparison box is visible; the slider really changes what is on top; every
   sample point of the comparison is in the haunted layer at 0 and in the
   honest layer at 100; the focused honest control is visible; the task
   completes in one press; the Ghost Guide and the continue link are visible.
6. WHEN all requested rooms are walked THEN the tool SHALL also open the ending
   and verify its twelve checklist lines.
7. WHEN the walk finishes THEN the tool SHALL return JSON text giving, per
   room, the checks run and any failures, plus any console errors seen.
8. The tool SHALL leave stdout free of all browser and server logs (Req 1.9),
   and SHALL shut down the browser and the static server before returning.

## Requirement 4 — contrast_scan tool

**User story:** As Kiro, I want a tool that measures real pixel contrast of the
comparison's text so that I catch ink text on a dark gradient that jsdom and
axe-on-jsdom cannot see.

#### Acceptance criteria

1. WHEN `contrast_scan` is called with `{ rooms, width, height }` THEN `rooms`
   SHALL parse as in Requirement 3.1 and the dimensions SHALL default to
   1280×720.
2. For each requested room the tool SHALL measure the comparison box at 0
   (haunted) and at 100 (honest).
3. For each state the tool SHALL screenshot the comparison box, draw it into a
   canvas inside the browser, and for every visible text node's box compute,
   per pixel in that box, the WCAG contrast ratio between the text's computed
   colour and that pixel.
4. The tool SHALL treat the box background as the majority of the box and
   therefore report the 70th percentile of the per-pixel ratios as the text's
   contrast.
5. The tool SHALL flag any text whose reported contrast is below 4.5:1, EXCEPT
   that the threshold SHALL be 3:1 for large text (font size 24 px and up, or
   18.66 px and up when bold).
6. The tool SHALL skip any text whose computed colour is transparent.
7. WHEN the scan finishes THEN the tool SHALL return the flags as JSON text.
8. The contrast mathematics SHALL live in a pure function in its own module
   (`scripts/mcp/contrast.mjs`) so it can be tested without a browser.

## Requirement 5 — Kiro registration, cleanup and docs

**User story:** As a developer, I want the server registered and documented so
that Kiro and I can use it and the old prototype is gone.

#### Acceptance criteria

1. The server SHALL be registered in `.kiro/settings/mcp.json` under the name
   `manor-qa`, with command `node` and args giving the script's path relative
   to the repository root, following Kiro's MCP configuration format.
2. The configured args SHALL NOT contain any local user or machine path.
3. WHEN the server's logic is in place THEN `scripts/qa/walk-prototype.mjs`
   SHALL be deleted.
4. The README SHALL carry a short "Real-browser QA (manor-qa)" section naming
   what the three tools check and how to call them.

## Requirement 6 — Tests

**User story:** As a developer, I want the server and the contrast maths under
test so that the QA tooling is itself trustworthy.

#### Acceptance criteria

1. Tests SHALL live in `scripts/mcp/*.test.mjs`, run with `node:test`, and be
   included in `npm test` through a `test:qa` script.
2. The protocol tests SHALL spawn the server as a child process and talk to it
   over stdio, asserting: `initialize` returns the server info and the tools
   capability; `tools/list` lists exactly `check_rooms`, `walk_rooms` and
   `contrast_scan`, each with a JSON Schema input; an unknown method and an
   unknown tool return errors; a malformed line does not crash the server.
3. The contrast tests SHALL assert: black on white is 21:1; a colour on itself
   is 1:1; the 70th percentile picks the background when 30 % of the box is
   text; the large-text thresholds (24 px, and 18.66 px bold) select 3:1.
4. The tests SHALL cover the room-range parser (`"1-12"`, `"3"`, `"1,4,7"`)
   and the static server's path mapping (the base path, index.html for the
   SPA, and refusal of any path outside `dist/`).
5. Fast-check properties SHALL be used where they fit: the range parser
   (every produced number is in range and the set is sorted and unique) and
   the contrast function (symmetry `ratio(a,b) === ratio(b,a)` and bounds
   `1 ≤ ratio ≤ 21`).

## Correctness properties

These are the invariants the tests pin down; each maps to a requirement above.

- **P1 Protocol liveness.** For any sequence of messages that includes one
  malformed line, the server still answers a following valid `initialize`
  (Req 1.8, 6.2).
- **P2 Tool set is exact.** `tools/list` lists exactly the three tool names,
  no more and no fewer, each with an object-typed JSON Schema (Req 1.4, 6.2).
- **P3 Errors carry the id.** Every error reply echoes the triggering
  request's `id` and uses code `-32601` for an unknown method (Req 1.6, 1.7,
  1.10).
- **P4 Contrast symmetry and bounds.** For all colour pairs,
  `ratio(a,b) === ratio(b,a)` and `1 ≤ ratio ≤ 21`; black/white is exactly
  21:1 and any colour against itself is exactly 1:1 (Req 4.3, 6.3, 6.5).
- **P5 Background is the majority.** When text covers at most 30 % of a box,
  the 70th-percentile ratio is the text-against-background ratio, not the
  text-against-text ratio (Req 4.4, 6.3).
- **P6 Large-text threshold.** Text at 24 px, or at 18.66 px when bold, is
  judged against 3:1; all other text against 4.5:1 (Req 4.5, 6.3).
- **P7 Range parser soundness.** For any valid `rooms` string, every produced
  number lies in 1–12, the result is sorted ascending with no duplicate, and
  a range `"a-b"` yields exactly the integers from a to b (Req 3.1, 6.4, 6.5).
- **P8 Path mapping safety.** The static server maps the base path to
  `dist/`, serves `index.html` for an unknown SPA route under the base, and
  refuses (never serves) any path that resolves outside `dist/` (Req 3.3,
  6.4).
