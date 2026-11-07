# Requirements — custom-agents

## Introduction

Dark Pattern Manor is built room by room, each room gated by its own tests, the
room-data checks, the bundle-size budget and — through the `manor-qa` MCP
server — a real-browser keyboard walk and a pixel-contrast scan. This feature
packages that workflow into two reusable Kiro CLI V3 custom agents and a check
that keeps the agent files valid.

- **room-builder** builds or fixes exactly one room end to end: it reads (or
  writes, from the room template) the room's spec, changes only that room's
  files, runs the build and the manor-qa QA tools, has the room reviewed by the
  reviewer sub-agent, runs the project gates, and reports.
- **manor-reviewer** reviews exactly one room against the haunted-UI steering
  rules and the room's spec and changes nothing; it is read-only with no shell.
- **check-agents** is a Node check (with tests, part of `npm test` and exposed
  as `npm run check:agents`) that parses every file in `.kiro/agents/`,
  confirms each agent's name matches its file name and has a description, that
  every manor-qa tool an agent names is a tool the server really lists, and
  that the reviewer has no write or shell tool.

The agents use the Kiro CLI V3 custom agent format: a Markdown file in
`.kiro/agents/` with YAML frontmatter (`name`, `description`, `tools`,
`includeMcpJson` or `mcpServers`, `resources`, `permissions`) whose body is the
agent's own prompt. Default resources (the steering) stay inherited; each agent
lists only the extra resources it needs. All work stays inside the repository;
no file contains a local user or machine path; nothing is committed or pushed.

## Requirement 1 — The room-builder agent

**User story:** As a developer, I want one agent that builds or fixes a single
room all the way to passing all gates, so that room work is one command.

#### Acceptance criteria

1. THE repository SHALL contain `.kiro/agents/room-builder.md`, a Markdown file
   with YAML frontmatter and a prompt body, whose `name` is `room-builder` and
   that has a non-empty `description`.
2. THE room-builder `tools` SHALL include the built-in read, write and shell
   tools; the three manor-qa tools `check_rooms`, `walk_rooms` and
   `contrast_scan` (named by their exact server tool names); and the
   `manor-reviewer` agent as a sub-agent (`subagent/manor-reviewer`).
3. THE room-builder SHALL obtain the manor-qa server from
   `.kiro/settings/mcp.json` by setting `includeMcpJson: true`.
4. THE room-builder `permissions` SHALL pre-approve reading inside the
   repository, writing inside the repository, the shell, and the three manor-qa
   tools, and SHALL NOT pre-approve reading or writing outside the repository.
5. THE room-builder `resources` SHALL add `.kiro/specs/room-template/` and
   `.kiro/specs/room-engine/design.md` to the inherited steering.
6. THE room-builder prompt SHALL instruct the agent, in order, to: read the
   room's spec (writing it from the room template spec if the room is new);
   build or change only that room's files; run `npm run build`, then
   `walk_rooms` and `contrast_scan` for that room and fix every failure; call
   `manor-reviewer` as a sub-agent on that room and fix every finding marked
   `must`; run `npm test`, `npm run check:rooms` and `npm run check:size`; and
   report what changed, the QA results before and after, and the reviewer's
   findings with what was done about each.

## Requirement 2 — The manor-reviewer agent

**User story:** As a developer, I want a read-only agent that reviews one room
against the house rules and reports findings, so that review is separate from
building and can never change the room.

#### Acceptance criteria

1. THE repository SHALL contain `.kiro/agents/manor-reviewer.md`, a Markdown
   file with YAML frontmatter and a prompt body, whose `name` is
   `manor-reviewer` and that has a non-empty `description`.
2. THE manor-reviewer `tools` SHALL include the built-in read tool and the
   three manor-qa tools, and SHALL NOT include any write tool or any shell
   tool.
3. THE manor-reviewer SHALL obtain the manor-qa server by setting
   `includeMcpJson: true`.
4. THE manor-reviewer `permissions` SHALL pre-approve reading inside the
   repository and the three manor-qa tools, and SHALL NOT pre-approve any
   write or shell capability.
5. THE manor-reviewer prompt SHALL instruct the agent to review the given room
   against the haunted-UI steering doc rule by rule — the trick never lowers
   contrast; cracks and distortion live only on the possessed element; the
   honest twin is a real best practice; keyboard and screen-reader play;
   reduced motion calms the haunting; fictional names only — and against the
   room's spec; to run `walk_rooms` and `contrast_scan` for that room; and to
   return findings, each carrying the rule, the evidence (a file and line, or
   the QA result), a severity (`must`, `should`, `nice`) and the smallest fix.

## Requirement 3 — The check-agents check

**User story:** As a developer, I want a check that keeps the agent files
valid, so that a broken or over-privileged agent file fails the build.

#### Acceptance criteria

1. THE repository SHALL contain `scripts/agents/check-agents.mjs` that, run as a
   Node script, checks every file in `.kiro/agents/` and exits non-zero if any
   check fails, printing which file broke which rule.
2. FOR every file in `.kiro/agents/`, THE check SHALL parse its YAML
   frontmatter and its prompt body, and SHALL fail the file if either is
   missing or unparseable.
3. FOR every agent file, THE check SHALL require a `name` equal to the file's
   base name (without extension) and a non-empty `description`.
4. FOR every agent file, THE check SHALL collect every manor-qa tool the file
   names and SHALL fail if any named tool is not a tool the manor-qa server
   really lists; the real tool list SHALL be obtained by starting the server
   and sending a `tools/list` request.
5. THE check SHALL fail the `manor-reviewer` file if it names any write tool or
   any shell tool, in either its `tools` or its `permissions`.
6. THE check SHALL be exposed as `npm run check:agents` and SHALL be included in
   `npm test`.
7. THE check SHALL have tests using `node:test` that cover: a well-formed agent
   file passing; a file with no frontmatter failing; a name/file-name mismatch
   failing; a missing description failing; an unknown manor-qa tool failing;
   and a reviewer-shaped file with a write or shell tool failing.

## Requirement 4 — Documentation and safety

**User story:** As a developer, I want the agents documented and the whole
feature safe, so that anyone can run one and nothing leaks a machine path.

#### Acceptance criteria

1. THE README SHALL carry a short "Custom agents" section naming what each
   agent does and how to run one
   (`kiro-cli chat --v3 --agent room-builder "<task>"`).
2. NO file created or changed by this feature SHALL contain a local user or
   machine path (such as a home folder path).
3. THE feature SHALL NOT commit and SHALL NOT push.

## Correctness properties

- Every file in `.kiro/agents/` parses, has a name matching its file name and a
  non-empty description (Req 3.2, 3.3).
- Every manor-qa tool named by any agent file is in the server's real
  `tools/list` (Req 3.4).
- The manor-reviewer names no write and no shell tool (Req 2.2, 3.5).
- `npm run check:agents` passes and is part of `npm test` (Req 3.6).
- No file written by this feature contains a machine path (Req 4.2).
