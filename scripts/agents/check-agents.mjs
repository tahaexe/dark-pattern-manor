// check-agents — keeps the Kiro custom agent files in .kiro/agents/ valid.
//
// For every `.kiro/agents/*.md` file it checks that:
//   - the file parses into YAML frontmatter plus a non-empty prompt body;
//   - `name` equals the file's base name and `description` is non-empty;
//   - every manor-qa tool the file names is a tool the manor-qa MCP server
//     really lists (obtained by starting the server and asking tools/list);
//   - the manor-reviewer file names no write tool and no shell tool, in either
//     its `tools` or its `permissions`.
//
// Pure logic (parseAgentFile, collectManorQaTools, hasWriteOrShell,
// checkAgent) is exported for the test suite. Only listServerTools() and
// main() touch the filesystem or spawn a process. All paths derive from
// import.meta.url, so no machine path is ever written anywhere.

import { readFileSync, readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, basename } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const AGENTS_DIR = resolve(REPO_ROOT, '.kiro', 'agents');
const SERVER = resolve(REPO_ROOT, 'scripts', 'mcp', 'manor-qa.mjs');

const MANOR_QA = 'manor-qa';

// --- a small, dependency-free reader for the frontmatter shapes used here ---
//
// The agent frontmatter is regular: scalar keys (name, description,
// includeMcpJson), a `tools` list of strings, a `resources` list of strings,
// and a `permissions` map holding a `rules` list of
// { capability, match, effect } maps where `match` is a string list. The
// reader parses exactly those shapes and returns a plain object; it is not a
// general YAML parser.

/** Strip surrounding quotes from a scalar token. */
function unquote(s) {
  const t = s.trim();
  if (
    (t.startsWith('"') && t.endsWith('"') && t.length >= 2) ||
    (t.startsWith("'") && t.endsWith("'") && t.length >= 2)
  ) {
    return t.slice(1, -1);
  }
  return t;
}

/** Parse a YAML flow list like `["a", "b"]` into a string array. */
function parseFlowList(s) {
  const inner = s.trim().replace(/^\[/, '').replace(/\]$/, '').trim();
  if (inner === '') return [];
  return inner.split(',').map((x) => unquote(x)).filter((x) => x.length > 0);
}

/** Coerce a scalar token into boolean/string. */
function parseScalar(s) {
  const t = unquote(s);
  if (t === 'true') return true;
  if (t === 'false') return false;
  return t;
}

/**
 * Parse the small YAML frontmatter shapes used by the agent files.
 * @param {string} yaml
 * @returns {object}
 */
export function parseFrontmatter(yaml) {
  const lines = yaml.split(/\r?\n/);
  const out = {};
  let i = 0;

  const indentOf = (line) => line.length - line.replace(/^\s+/, '').length;

  while (i < lines.length) {
    const raw = lines[i];
    if (raw.trim() === '' || raw.trim().startsWith('#')) {
      i += 1;
      continue;
    }
    if (indentOf(raw) !== 0) {
      // Stray indented line at top level — skip defensively.
      i += 1;
      continue;
    }
    const m = raw.match(/^([A-Za-z0-9_]+):(.*)$/);
    if (!m) {
      i += 1;
      continue;
    }
    const key = m[1];
    const rest = m[2].trim();

    if (rest === '') {
      // A block value: either a block list of `- item` or a nested map.
      const items = [];
      let j = i + 1;
      // Detect a block list of scalar `- ...` lines at indent > 0.
      while (j < lines.length) {
        const l = lines[j];
        if (l.trim() === '') {
          j += 1;
          continue;
        }
        const ind = indentOf(l);
        if (ind === 0) break;
        const t = l.trim();
        if (t.startsWith('- ') || t === '-') {
          items.push(t.replace(/^-\s*/, ''));
          j += 1;
        } else {
          break;
        }
      }
      if (items.length > 0 && items.every((it) => !it.includes(':') || /^["'[]/.test(it))) {
        // A simple list of scalars (e.g. tools, resources).
        out[key] = items.map((it) => unquote(it));
        i = j;
        continue;
      }
      // Otherwise treat the indented block as raw text to be parsed by the
      // caller for known keys (permissions). Collect the block lines.
      const block = [];
      let k = i + 1;
      while (k < lines.length) {
        const l = lines[k];
        if (l.trim() !== '' && indentOf(l) === 0) break;
        block.push(l);
        k += 1;
      }
      out[key] = { __block: block };
      i = k;
      continue;
    }

    if (rest.startsWith('[')) {
      out[key] = parseFlowList(rest);
    } else {
      out[key] = parseScalar(rest);
    }
    i += 1;
  }

  // Post-process a `permissions` block into { rules: [...] }.
  if (out.permissions && out.permissions.__block) {
    out.permissions = parsePermissions(out.permissions.__block);
  }
  return out;
}

/**
 * Parse the permissions block lines into { rules: [{capability, match, effect}] }.
 * @param {string[]} block
 */
function parsePermissions(block) {
  const rules = [];
  let current = null;
  const indentOf = (line) => line.length - line.replace(/^\s+/, '').length;

  for (const raw of block) {
    if (raw.trim() === '') continue;
    const t = raw.trim();
    // A new rule starts at a `- capability:` (or `-` then capability line).
    if (t.startsWith('- ')) {
      if (current) rules.push(current);
      current = {};
      const after = t.replace(/^-\s*/, '');
      applyKv(current, after);
    } else if (current && t.includes(':')) {
      applyKv(current, t);
    }
    void indentOf;
  }
  if (current) rules.push(current);
  return { rules };
}

/** Apply a `key: value` pair to a rule object, parsing match as a list. */
function applyKv(obj, kv) {
  const m = kv.match(/^([A-Za-z0-9_]+):(.*)$/);
  if (!m) return;
  const key = m[1];
  const rest = m[2].trim();
  if (key === 'match') {
    obj.match = rest.startsWith('[') ? parseFlowList(rest) : [unquote(rest)];
  } else {
    obj[key] = unquote(rest);
  }
}

/**
 * Split an agent Markdown file into frontmatter and body, parsing the
 * frontmatter. Returns { ok, frontmatter, body } or { ok: false, reason }.
 * @param {string} text
 */
export function parseAgentFile(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    return { ok: false, reason: 'empty file' };
  }
  const normalized = text.replace(/^\uFEFF/, '');
  if (!normalized.startsWith('---')) {
    return { ok: false, reason: 'no YAML frontmatter (file must start with ---)' };
  }
  // Find the closing fence.
  const rest = normalized.slice(3);
  const closeMatch = rest.match(/\r?\n---[ \t]*(\r?\n|$)/);
  if (!closeMatch) {
    return { ok: false, reason: 'frontmatter is not closed with ---' };
  }
  const yaml = rest.slice(0, closeMatch.index);
  const body = rest.slice(closeMatch.index + closeMatch[0].length);
  if (body.trim() === '') {
    return { ok: false, reason: 'empty prompt body' };
  }
  let frontmatter;
  try {
    frontmatter = parseFrontmatter(yaml);
  } catch (err) {
    return { ok: false, reason: `frontmatter did not parse: ${err && err.message}` };
  }
  return { ok: true, frontmatter, body };
}

/**
 * Collect every manor-qa tool a frontmatter names, from `tools`
 * (`@manor-qa/<t>`) and from `permissions` (`mcp` match `manor-qa/<t>`).
 * The whole-server selector `@manor-qa` names no individual tool and is
 * reported via `wholeServer`.
 * @param {object} frontmatter
 * @returns {{ named: string[], wholeServer: boolean }}
 */
export function collectManorQaTools(frontmatter) {
  const named = new Set();
  let wholeServer = false;

  const tools = Array.isArray(frontmatter.tools) ? frontmatter.tools : [];
  for (const sel of tools) {
    if (sel === `@${MANOR_QA}`) {
      wholeServer = true;
    } else if (sel.startsWith(`@${MANOR_QA}/`)) {
      named.add(sel.slice(`@${MANOR_QA}/`.length));
    }
  }

  const rules = frontmatter.permissions && Array.isArray(frontmatter.permissions.rules)
    ? frontmatter.permissions.rules
    : [];
  for (const rule of rules) {
    if (rule.capability !== 'mcp') continue;
    const matches = Array.isArray(rule.match) ? rule.match : [];
    for (const pat of matches) {
      if (pat === `${MANOR_QA}/*`) {
        wholeServer = true;
      } else if (pat.startsWith(`${MANOR_QA}/`)) {
        named.add(pat.slice(`${MANOR_QA}/`.length));
      }
    }
  }

  return { named: [...named], wholeServer };
}

/**
 * Report whether a frontmatter names any write or shell tool, across both
 * `tools` and `permissions`.
 * @param {object} frontmatter
 * @returns {{ write: boolean, shell: boolean }}
 */
export function hasWriteOrShell(frontmatter) {
  let write = false;
  let shell = false;

  const tools = Array.isArray(frontmatter.tools) ? frontmatter.tools : [];
  for (const sel of tools) {
    const s = String(sel).toLowerCase();
    if (s === 'write' || s === '@builtin' || s === '*') write = true;
    if (s === 'shell' || s === '@builtin' || s === '*') shell = true;
  }

  const rules = frontmatter.permissions && Array.isArray(frontmatter.permissions.rules)
    ? frontmatter.permissions.rules
    : [];
  for (const rule of rules) {
    const cap = String(rule.capability || '').toLowerCase();
    const effect = String(rule.effect || 'allow').toLowerCase();
    if (effect === 'deny') continue;
    if (cap === 'fs_write' || cap === 'filesystem' || cap === 'all' || cap === 'builtin') write = true;
    if (cap === 'shell' || cap === 'all' || cap === 'builtin') shell = true;
  }

  return { write, shell };
}

/**
 * Check one parsed agent file. Returns an array of problem strings (empty = ok).
 * @param {string} fileBase  file name without extension
 * @param {{ ok: boolean, frontmatter?: object, reason?: string }} parsed
 * @param {string[]} realTools  tool names the manor-qa server really lists
 */
export function checkAgent(fileBase, parsed, realTools) {
  const problems = [];
  if (!parsed.ok) {
    problems.push(parsed.reason || 'did not parse');
    return problems;
  }
  const fm = parsed.frontmatter;

  if (fm.name !== fileBase) {
    problems.push(`name "${fm.name}" does not match file name "${fileBase}"`);
  }
  if (typeof fm.description !== 'string' || fm.description.trim() === '') {
    problems.push('missing or empty description');
  }

  const { named } = collectManorQaTools(fm);
  for (const tool of named) {
    if (!realTools.includes(tool)) {
      problems.push(`names manor-qa tool "${tool}" which the server does not list`);
    }
  }

  if (fileBase === 'manor-reviewer') {
    const { write, shell } = hasWriteOrShell(fm);
    if (write) problems.push('reviewer must not have a write tool');
    if (shell) problems.push('reviewer must not have a shell tool');
  }

  return problems;
}

/**
 * Start the manor-qa server and return the tool names it lists via tools/list.
 * @returns {Promise<string[]>}
 */
export function listServerTools() {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [SERVER], { stdio: ['pipe', 'pipe', 'pipe'] });
    const pending = new Map();
    const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('timed out waiting for manor-qa tools/list'));
    }, 10000);

    function cleanup() {
      clearTimeout(timer);
      try { rl.close(); } catch { /* ignore */ }
      try { child.stdin.end(); } catch { /* ignore */ }
      try { child.kill(); } catch { /* ignore */ }
    }

    rl.on('line', (line) => {
      let msg;
      try { msg = JSON.parse(line); } catch { return; }
      if (msg && msg.id !== undefined && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    });
    child.on('error', (err) => { cleanup(); reject(err); });

    const send = (id, method, params) =>
      new Promise((res) => {
        pending.set(id, res);
        child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
      });

    (async () => {
      try {
        await send(1, 'initialize', { protocolVersion: '2024-11-05' });
        const reply = await send(2, 'tools/list', {});
        const names = (reply.result && reply.result.tools ? reply.result.tools : []).map((t) => t.name);
        cleanup();
        resolvePromise(names);
      } catch (err) {
        cleanup();
        reject(err);
      }
    })();
  });
}

async function main() {
  let files;
  try {
    files = readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.md'));
  } catch {
    console.log('check:agents: no .kiro/agents directory — nothing to check');
    return 0;
  }
  if (files.length === 0) {
    console.log('check:agents: no agent files found in .kiro/agents');
    return 0;
  }

  let realTools;
  try {
    realTools = await listServerTools();
  } catch (err) {
    console.error(`check:agents: could not list manor-qa tools: ${err && err.message}`);
    return 1;
  }

  let failed = false;
  for (const file of files) {
    const fileBase = basename(file, '.md');
    const text = readFileSync(resolve(AGENTS_DIR, file), 'utf8');
    const parsed = parseAgentFile(text);
    const problems = checkAgent(fileBase, parsed, realTools);
    if (problems.length === 0) {
      console.log(`check:agents: ${file} OK`);
    } else {
      failed = true;
      for (const p of problems) {
        console.error(`check:agents: ${file}: ${p}`);
      }
    }
  }

  if (failed) {
    console.error('check:agents: FAIL');
    return 1;
  }
  console.log(`check:agents: all ${files.length} agent file(s) OK (manor-qa tools: ${realTools.join(', ')})`);
  return 0;
}

const isMain = resolve(process.argv[1] || '') === fileURLToPath(import.meta.url);
if (isMain) {
  main().then((code) => process.exit(code)).catch((err) => {
    console.error(`check:agents: ${err && err.message ? err.message : err}`);
    process.exit(1);
  });
}
