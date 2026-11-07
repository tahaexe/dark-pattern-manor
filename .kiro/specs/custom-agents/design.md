# Design — custom-agents

## Overview

This feature adds two Kiro CLI V3 custom agents and a check that keeps them
valid. Nothing in the game's runtime changes; the work is entirely in
`.kiro/agents/`, `scripts/agents/`, `package.json` and `README.md`.

```
.kiro/agents/
  room-builder.md     builds or fixes one room end to end
  manor-reviewer.md   reviews one room, read-only, changes nothing
scripts/agents/
  check-agents.mjs         parses and validates every .kiro/agents file
  check-agents.test.mjs    node:test suite for the check's pure logic
```

The two agents reuse the existing guard rails rather than replacing them:

- The **command-guard** `PreToolUse` hook (`scripts/hooks/guard-command.mjs`)
  still decides which shell commands run. An agent's `shell` permission only
  says "the agent may use the shell"; the hook is the real gate on each
  command, and it already blocks anything outside the repo allow-list, any
  drive-letter or absolute path and any `git commit`/`push`. So the
  room-builder's broad `shell` allow is safe.
- The **manor-qa** MCP server is pulled in with `includeMcpJson: true`, so both
  agents see exactly the server declared in `.kiro/settings/mcp.json` with no
  path duplicated into the agent files.

## The V3 custom agent format

A V3 agent is a Markdown file in `.kiro/agents/<name>.md` with YAML frontmatter
and a body that is the agent's system prompt. The fields used here:

| Field | Use |
| --- | --- |
| `name` | agent id; equals the file base name |
| `description` | one line; also how an orchestrator picks a sub-agent |
| `tools` | selectors for the tools the agent may see and call |
| `includeMcpJson` | `true` → pull MCP servers from `.kiro/settings/mcp.json` |
| `resources` | extra `file://` resources, added to the inherited steering |
| `permissions` | `rules: [{ capability, match, effect }]` access control |

`tools` selector vocabulary: built-in categories `read`, `write`, `shell`; a
whole MCP server `@manor-qa` or a single tool `@manor-qa/<tool>`; a sub-agent
`subagent/<name>`. `permissions` capability vocabulary is different from the
`tools` vocabulary: `fs_read`, `fs_write`, `shell`, `mcp`, `subagent`, scoped by
`match` globs with an `effect` of `allow`/`ask`/`deny`.

### Resources and inherited steering

The task requires that default resources — the steering in `.kiro/steering/` —
stay inherited, and that each agent list only the extra resources it needs. So
neither agent re-lists the steering; each lists only its extra `file://`
resources. One caveat is recorded in tasks: the configuration reference does not
state in so many words that steering is auto-loaded when `resources` is present
but omits it. The task's own instruction ("Default resources (the steering) stay
inherited") is the authority followed here; if a future Kiro version required
steering to be listed explicitly, the fix is to add
`file://.kiro/steering/**/*.md` to each agent's `resources`.

## room-builder.md

Frontmatter:

- `name: room-builder`, a one-line `description`.
- `tools`: `read`, `write`, `shell`, `@manor-qa/check_rooms`,
  `@manor-qa/walk_rooms`, `@manor-qa/contrast_scan`,
  `subagent/manor-reviewer`. Listing the three manor-qa tools by exact name
  (rather than `@manor-qa`) keeps the tool list honest and lets the check match
  names against the server. Listing the sub-agent explicitly (and not `*` or a
  blanket built-in that would pull in a spawn-anything tool) keeps the
  orchestration scoped to the reviewer.
- `includeMcpJson: true`.
- `resources`: `file://.kiro/specs/room-template/` (the whole template folder)
  and `file://.kiro/specs/room-engine/design.md`.
- `permissions.rules`:
  - `fs_read` allow `**` (read anywhere in the workspace),
  - `fs_write` allow the repo's writable trees (`src/**`, `scripts/**`,
    `.kiro/specs/**`, `README.md`),
  - `shell` allow (the command-guard hook narrows it),
  - `mcp` allow `manor-qa/check_rooms`, `manor-qa/walk_rooms`,
    `manor-qa/contrast_scan`,
  - `subagent` allow `manor-reviewer`.
  No rule grants access outside the repository; writes are enumerated repo
  trees, and the shell is gated by the hook.

Prompt body (ordered, matching Req 1.6): read the room's spec, writing it from
the room template spec if the room is new; build or change only that room's
files; run `npm run build`, then `walk_rooms` and `contrast_scan` for that room
and fix every failure; call `manor-reviewer` on that room and fix every `must`
finding; run `npm test`, `npm run check:rooms` and `npm run check:size`; report
what changed, the QA before/after, and the reviewer's findings with the action
taken on each. The prompt also restates the house rules it must not break
(stay inside the repo, never commit or push, never write a machine path).

## manor-reviewer.md

Frontmatter:

- `name: manor-reviewer`, a one-line `description`.
- `tools`: `read`, `@manor-qa/check_rooms`, `@manor-qa/walk_rooms`,
  `@manor-qa/contrast_scan`. No `write`, no `shell`, no `subagent`.
- `includeMcpJson: true`.
- `resources`: none beyond the inherited steering (the reviewer judges against
  the steering and the room's spec, both reachable through the inherited
  steering and its read access).
- `permissions.rules`: `fs_read` allow `**`; `mcp` allow the three manor-qa
  tools. No `fs_write`, no `shell`, no `subagent` rule.

Prompt body (Req 2.5): review the given room against the haunted-UI steering
doc rule by rule (the six named rules) and against the room's spec; run
`walk_rooms` and `contrast_scan` for that room; return findings, each with the
rule, the evidence (a file and line, or the QA result), a severity (`must`,
`should`, `nice`) and the smallest fix. The prompt states plainly that the
reviewer changes nothing.

## check-agents.mjs

A Node ES module, split so the logic is pure and testable and only the
server-start part does I/O.

Pure, exported for tests:

```js
export function parseAgentFile(text)
// -> { ok: true, frontmatter, body } | { ok: false, reason }
// Splits on the leading `---` fences, parses the YAML frontmatter with a
// small dependency-free reader (the fields here are simple: scalars, string
// arrays, and the permissions.rules list), and requires a non-empty body.

export function collectManorQaTools(frontmatter)
// -> string[]  every manor-qa tool the file names, from `tools`
// (`@manor-qa/<t>` and, if present, `@manor-qa` meaning "all") and from
// `permissions` (`mcp` match `manor-qa/<t>`).

export function checkAgent(fileBase, parsed, realTools)
// -> string[] of problems (empty = ok). Applies:
//   - name === fileBase
//   - description non-empty
//   - every named manor-qa tool is in realTools (unless the file uses the
//     whole-server `@manor-qa`, which names no individual tool)
//   - for the reviewer (fileBase === 'manor-reviewer'): no write tool and no
//     shell tool in `tools`, and no `fs_write`/`shell` allow in `permissions`.

export function hasWriteOrShell(frontmatter)
// -> { write: boolean, shell: boolean } across tools and permissions.
```

The real tool list comes from the server itself: `listServerTools()` spawns
`node scripts/mcp/manor-qa.mjs`, sends `initialize` then `tools/list` over
stdio, reads the reply, and returns the tool names. The repo root is derived
from `import.meta.url`, never a hard-coded path, so nothing writes a machine
path. If the server cannot be started the check fails loudly (it cannot verify
tool names), rather than passing silently.

The `main()` path: list `.kiro/agents/*.md`, read each, `parseAgentFile`,
gather problems with `checkAgent` against the real tool list, print one line
per problem (naming the file and the rule), and `process.exit(1)` if any file
has a problem, else print an OK line and exit 0. It prints no absolute path.

### Why a hand-rolled YAML reader

The repo adds no new dependency (the manor-qa work set that precedent). The
frontmatter here is small and regular — scalar keys, `tools` as a YAML flow or
block list of strings, `permissions.rules` as a block list of
`{ capability, match, effect }` maps. The reader parses exactly those shapes and
rejects anything it cannot read, which is enough for the check and keeps the
suite dependency-free. The agent files are authored to stay within the shapes
the reader accepts.

## check-agents.test.mjs

`node:test` + `node:assert/strict`, pure-logic only (no server spawn, matching
how the manor-qa suite keeps Chrome out of CI). It feeds `parseAgentFile`,
`collectManorQaTools`, `hasWriteOrShell` and `checkAgent` crafted inputs:

- a well-formed room-builder-shaped file passes with a stub real-tool list;
- a file with no frontmatter → parse failure;
- `name` ≠ file base → a problem;
- empty/absent description → a problem;
- a `tools` entry `@manor-qa/no_such_tool` not in the real list → a problem;
- a reviewer-shaped file carrying `write` (or a `shell` permission) → a problem;
- `collectManorQaTools` picks tools from both `tools` and `permissions`.

The live server round-trip is exercised by the real `npm run check:agents` run
at the end of the feature (as the manor-qa smoke script does for its server),
not inside the unit suite.

## package.json and README

- Add `"check:agents": "node scripts/agents/check-agents.mjs"`.
- Chain the check's unit tests into `npm test`. The existing `test` script is
  `vitest run && npm run test:hooks && npm run test:qa`; add
  `&& npm run test:agents` with `"test:agents": "node --test
  scripts/agents/*.test.mjs"`. (`check:agents` itself spawns the MCP server, so
  it stays a separate gate run at the end, not inside the fast unit `test`.)
- README gains a short "Custom agents" section describing both agents and the
  run command `kiro-cli chat --v3 --agent room-builder "<task>"`.

## Safety

Everything stays in the repo. The agent files name the MCP server only through
`includeMcpJson`, so no server path is copied. `check-agents.mjs` derives its
paths from `import.meta.url`. No file written here contains a user or machine
path. Nothing is committed or pushed.
