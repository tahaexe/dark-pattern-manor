# Tasks — manor-qa

- [x] 1. Pure JSON-RPC framing and router (`scripts/mcp/protocol.mjs`)
  - `parseMessage`, `makeResult`, `makeError`, the error codes, and
    `createRouter({ serverInfo, tools })` returning an async `handle`.
  - Handle `initialize` (echo client `protocolVersion` or default),
    notifications (no reply), `tools/list`, `tools/call` (unknown tool/method
    → `-32601` error).
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.10_

- [x] 2. Room-range parser (`scripts/mcp/rooms.mjs`)
  - `parseRooms(spec, { min, max })` for `"1-12"`, `"3"`, `"1,4,7"` and
    combinations; sorted, unique, clamped; throws on bad tokens.
  - _Requirements: 3.1, 4.1_

- [x] 3. Pure WCAG contrast maths (`scripts/mcp/contrast.mjs`)
  - `parseColor` (incl. transparent → null), `relativeLuminance`,
    `contrastRatio`, `percentile`, `isLargeText`, `threshold`, and
    `contrastOfBox`.
  - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.8_

- [x] 4. Static server + pure path mapper (`scripts/mcp/static-server.mjs`)
  - `CONTENT_TYPES`, `mapUrlToFile` (base→dist, SPA fallback, outside guard),
    and `start()` on `127.0.0.1:0` returning `{ port, origin, baseUrl, close }`.
  - _Requirements: 3.3_

- [x] 5. check_rooms tool (`scripts/mcp/checks.mjs`)
  - `runCheckRooms()` shells `node scripts/check-rooms.mjs` from the repo root
    and returns the combined per-room + overall text. No machine path in
    output.
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 6. Browser glue (`scripts/mcp/browser.mjs`)
  - `findChrome()` (CHROME_PATH or per-OS default, clear error otherwise),
    `launchChrome`, `connectCdp` (send/ev/key/on/close) over the built-in
    WebSocket; ephemeral debug port.
  - _Requirements: 3.4_

- [x] 7. walk_rooms tool (`scripts/mcp/walk.mjs`, `scripts/mcp/session.mjs`)
  - Guard on missing `dist/index.html`; start server, launch Chrome, walk each
    room by keyboard against the real selectors, check the ending's twelve
    lines, return JSON text; tear everything down.
  - _Requirements: 3.2, 3.5, 3.6, 3.7, 3.8_

- [x] 8. contrast_scan tool (`scripts/mcp/contrast-scan.mjs`)
  - For each room at slider 0 and 100: screenshot the comparison, canvas +
    getImageData per text box, call `contrastOfBox`, flag below threshold,
    skip transparent; return JSON text.
  - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 9. The stdio server (`scripts/mcp/manor-qa.mjs`)
  - Readline loop over stdin, malformed-line resilience, three tool
    descriptors with JSON Schemas bound to their `run` functions, replies one
    line per message to stdout, logs to stderr, version from package.json.
  - _Requirements: 1.5, 1.8, 1.9_

- [x] 10. Tests (`scripts/mcp/*.test.mjs`) and the `test:qa` script
  - `protocol.test.mjs` (spawn child, stdio), `contrast.test.mjs`,
    `rooms.test.mjs`, `static-server.test.mjs`; fast-check where it fits; add
    `test:qa` and chain it into `npm test`.
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 11. Register, clean up, document
  - Write `.kiro/settings/mcp.json` with `manor-qa` (repo-relative args) —
    blocked for the agent by a workspace permission rule on `.kiro/settings/`;
    the agent reported the exact JSON and the maintainer added it. Deleted
    `scripts/qa/walk-prototype.mjs`; added the README "Real-browser QA
    (manor-qa)" section.
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 12. Smoke script and final gates
  - Wrote `scripts/mcp/manor-qa-smoke.mjs`; ran `npm test`, `npm run build`,
    `npm run check:rooms`, `npm run check:size`, then the smoke script on
    rooms 1-2; reported each result.
  - _Requirements: 6.1_
