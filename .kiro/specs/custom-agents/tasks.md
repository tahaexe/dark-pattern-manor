# Tasks — custom-agents

> Gate: `npm test`, `npm run build`, `npm run check:rooms`, `npm run check:size`
> and `npm run check:agents` all pass. Work inside the repo only; never commit
> or push; never write a machine path into any file.

- [x] 1. Write the room-builder agent
  - File: `.kiro/agents/room-builder.md`
  - YAML frontmatter: `name: room-builder`, a one-line `description`; `tools`
    with `read`, `write`, `shell`, `@manor-qa/check_rooms`,
    `@manor-qa/walk_rooms`, `@manor-qa/contrast_scan`,
    `subagent/manor-reviewer`; `includeMcpJson: true`; `resources` adding
    `file://.kiro/specs/room-template/` and
    `file://.kiro/specs/room-engine/design.md`; `permissions.rules`
    pre-approving `fs_read` (`**`), `fs_write` (repo trees), `shell`, the three
    `mcp` tools and the `subagent` manor-reviewer, with nothing outside the
    repo.
  - Body: the ordered prompt (read/write the room spec from the template → build
    only that room's files → `npm run build`, `walk_rooms`, `contrast_scan`, fix
    every failure → call `manor-reviewer`, fix every `must` → `npm test`,
    `npm run check:rooms`, `npm run check:size` → report changes, QA
    before/after, reviewer findings with action taken).
  - _Requirements: 1.1–1.6_

- [x] 2. Write the manor-reviewer agent
  - File: `.kiro/agents/manor-reviewer.md`
  - Frontmatter: `name: manor-reviewer`, a one-line `description`; `tools` with
    `read` and the three `@manor-qa/...` tools only (no write, no shell, no
    subagent); `includeMcpJson: true`; `permissions.rules` with `fs_read`
    (`**`) and the three `mcp` tools only (no `fs_write`, no `shell`).
  - Body: review the room against the six haunted-UI rules and the room's spec,
    run `walk_rooms` and `contrast_scan`, return findings each with rule,
    evidence, severity (`must`/`should`/`nice`) and the smallest fix; change
    nothing.
  - _Requirements: 2.1–2.5_

- [x] 3. Write the check and its tests
  - Files: `scripts/agents/check-agents.mjs`, `scripts/agents/check-agents.test.mjs`
  - `check-agents.mjs`: pure `parseAgentFile`, `collectManorQaTools`,
    `hasWriteOrShell`, `checkAgent`; `listServerTools()` spawning
    `scripts/mcp/manor-qa.mjs` for the real `tools/list`; a `main()` that checks
    every `.kiro/agents/*.md`, prints one line per problem and exits non-zero on
    any. Paths derived from `import.meta.url`; no machine path in output.
  - `check-agents.test.mjs` (`node:test`): well-formed passes; no frontmatter
    fails; name≠file fails; missing description fails; unknown manor-qa tool
    fails; reviewer-with-write-or-shell fails; `collectManorQaTools` reads both
    `tools` and `permissions`.
  - _Requirements: 3.1–3.5, 3.7_

- [x] 4. Wire the scripts
  - File: `package.json`
  - Add `"check:agents": "node scripts/agents/check-agents.mjs"` and
    `"test:agents": "node --test scripts/agents/*.test.mjs"`; chain
    `&& npm run test:agents` into the `test` script.
  - _Requirements: 3.6_

- [x] 5. Document the agents
  - File: `README.md`
  - Add a short "Custom agents" section: what room-builder and manor-reviewer
    do and how to run one (`kiro-cli chat --v3 --agent room-builder "<task>"`).
  - _Requirements: 4.1_

- [x] 6. Run every gate and report
  - Run `npm test`, `npm run build`, `npm run check:rooms`, `npm run check:size`
    and `npm run check:agents`; report each result, every file created or
    changed, and anything that could not be done or is uncertain.
  - _Requirements: 3.6, 4.2, 4.3_
