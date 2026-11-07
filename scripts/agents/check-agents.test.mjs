// Tests for check-agents. Pure logic only — no server spawn, no filesystem —
// mirroring how the manor-qa suite keeps Chrome out of CI. The live
// server round-trip is exercised by `npm run check:agents`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseAgentFile,
  parseFrontmatter,
  collectManorQaTools,
  hasWriteOrShell,
  checkAgent,
} from './check-agents.mjs';

const REAL_TOOLS = ['check_rooms', 'walk_rooms', 'contrast_scan'];

/** A well-formed room-builder-shaped file. */
function builderFile(overrides = {}) {
  const name = overrides.name ?? 'room-builder';
  const description = overrides.description ?? 'Builds one room end to end.';
  const extraTool = overrides.extraTool ?? '';
  return `---
name: ${name}
description: ${description}
tools:
  - read
  - write
  - shell
  - "@manor-qa/check_rooms"
  - "@manor-qa/walk_rooms"
  - "@manor-qa/contrast_scan"
  - subagent/manor-reviewer${extraTool ? `\n  - "${extraTool}"` : ''}
includeMcpJson: true
permissions:
  rules:
    - capability: fs_read
      match: ["**"]
      effect: allow
    - capability: fs_write
      match: ["src/**"]
      effect: allow
    - capability: shell
      match: ["*"]
      effect: allow
    - capability: mcp
      match: ["manor-qa/check_rooms", "manor-qa/walk_rooms", "manor-qa/contrast_scan"]
      effect: allow
---
You build one room. Do the steps in order and report.
`;
}

/** A reviewer-shaped file; overrides let a test inject a write/shell. */
function reviewerFile(overrides = {}) {
  const tools = overrides.tools ?? ['read', '"@manor-qa/check_rooms"', '"@manor-qa/walk_rooms"', '"@manor-qa/contrast_scan"'];
  const extraRule = overrides.extraRule ?? '';
  return `---
name: manor-reviewer
description: Reviews one room, read-only.
tools:
${tools.map((t) => `  - ${t}`).join('\n')}
includeMcpJson: true
permissions:
  rules:
    - capability: fs_read
      match: ["**"]
      effect: allow
    - capability: mcp
      match: ["manor-qa/check_rooms", "manor-qa/walk_rooms", "manor-qa/contrast_scan"]
      effect: allow${extraRule}
---
You review one room and change nothing.
`;
}

test('a well-formed room-builder file passes', () => {
  const parsed = parseAgentFile(builderFile());
  assert.equal(parsed.ok, true);
  assert.deepEqual(checkAgent('room-builder', parsed, REAL_TOOLS), []);
});

test('a well-formed reviewer file passes', () => {
  const parsed = parseAgentFile(reviewerFile());
  assert.equal(parsed.ok, true);
  assert.deepEqual(checkAgent('manor-reviewer', parsed, REAL_TOOLS), []);
});

test('a file with no frontmatter fails to parse', () => {
  const parsed = parseAgentFile('# just a heading\n\nno frontmatter here\n');
  assert.equal(parsed.ok, false);
  assert.match(parsed.reason, /frontmatter/i);
});

test('an unclosed frontmatter fails to parse', () => {
  const parsed = parseAgentFile('---\nname: x\ndescription: y\n\nbody but no close\n');
  assert.equal(parsed.ok, false);
});

test('an empty body fails to parse', () => {
  const parsed = parseAgentFile('---\nname: x\ndescription: y\n---\n   \n');
  assert.equal(parsed.ok, false);
  assert.match(parsed.reason, /body/i);
});

test('a name that does not match the file name is a problem', () => {
  const parsed = parseAgentFile(builderFile({ name: 'not-the-file' }));
  const problems = checkAgent('room-builder', parsed, REAL_TOOLS);
  assert.ok(problems.some((p) => /does not match file name/.test(p)));
});

test('a missing description is a problem', () => {
  const parsed = parseAgentFile(builderFile({ description: '' }));
  const problems = checkAgent('room-builder', parsed, REAL_TOOLS);
  assert.ok(problems.some((p) => /description/.test(p)));
});

test('an unknown manor-qa tool is a problem', () => {
  const parsed = parseAgentFile(builderFile({ extraTool: '@manor-qa/no_such_tool' }));
  const problems = checkAgent('room-builder', parsed, REAL_TOOLS);
  assert.ok(problems.some((p) => /no_such_tool/.test(p)));
});

test('the reviewer with a write tool is a problem', () => {
  const parsed = parseAgentFile(
    reviewerFile({ tools: ['read', 'write', '"@manor-qa/check_rooms"'] }),
  );
  const problems = checkAgent('manor-reviewer', parsed, REAL_TOOLS);
  assert.ok(problems.some((p) => /write/.test(p)));
});

test('the reviewer with a shell tool is a problem', () => {
  const parsed = parseAgentFile(
    reviewerFile({ tools: ['read', 'shell', '"@manor-qa/check_rooms"'] }),
  );
  const problems = checkAgent('manor-reviewer', parsed, REAL_TOOLS);
  assert.ok(problems.some((p) => /shell/.test(p)));
});

test('the reviewer with an fs_write permission is a problem', () => {
  const extraRule = `
    - capability: fs_write
      match: ["src/**"]
      effect: allow`;
  const parsed = parseAgentFile(reviewerFile({ extraRule }));
  const problems = checkAgent('manor-reviewer', parsed, REAL_TOOLS);
  assert.ok(problems.some((p) => /write/.test(p)));
});

test('the reviewer with a shell permission is a problem', () => {
  const extraRule = `
    - capability: shell
      match: ["*"]
      effect: allow`;
  const parsed = parseAgentFile(reviewerFile({ extraRule }));
  const problems = checkAgent('manor-reviewer', parsed, REAL_TOOLS);
  assert.ok(problems.some((p) => /shell/.test(p)));
});

test('collectManorQaTools reads tools from both tools and permissions', () => {
  const parsed = parseAgentFile(builderFile());
  const { named, wholeServer } = collectManorQaTools(parsed.frontmatter);
  assert.equal(wholeServer, false);
  assert.deepEqual(named.sort(), ['check_rooms', 'contrast_scan', 'walk_rooms']);
});

test('collectManorQaTools picks a tool named only in permissions', () => {
  const fm = parseFrontmatter(
    `name: x
description: y
tools:
  - read
permissions:
  rules:
    - capability: mcp
      match: ["manor-qa/walk_rooms"]
      effect: allow`,
  );
  const { named } = collectManorQaTools(fm);
  assert.deepEqual(named, ['walk_rooms']);
});

test('hasWriteOrShell flags a wildcard tool', () => {
  const fm = parseFrontmatter(`name: x
description: y
tools:
  - "*"`);
  const r = hasWriteOrShell(fm);
  assert.equal(r.write, true);
  assert.equal(r.shell, true);
});

test('a deny rule does not count as granting write or shell', () => {
  const fm = parseFrontmatter(`name: x
description: y
tools:
  - read
permissions:
  rules:
    - capability: shell
      match: ["*"]
      effect: deny`);
  const r = hasWriteOrShell(fm);
  assert.equal(r.shell, false);
});
