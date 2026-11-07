// End-to-end smoke test of the manor-qa MCP server: spawn it, run initialize,
// tools/list, check_rooms, walk_rooms + contrast_scan on rooms 1-2, and one
// reduced-motion walk of room 1, and print a short summary. Run after a build:
//
//   npm run build
//   node scripts/mcp/manor-qa-smoke.mjs
//
// The server's own logs go to its stderr (inherited); this script prints its
// summary to stdout.

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER = resolve(HERE, 'manor-qa.mjs');

const child = spawn(process.execPath, [SERVER], { stdio: ['pipe', 'pipe', 'inherit'] });
const pending = new Map();
const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
rl.on('line', (line) => {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    console.error('non-JSON on stdout:', line);
    return;
  }
  if (msg && msg.id !== undefined && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});

let id = 0;
function request(method, params, timeoutMs = 180000) {
  const myId = ++id;
  return new Promise((resolvePromise, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout: ${method}`)), timeoutMs);
    pending.set(myId, (msg) => {
      clearTimeout(timer);
      resolvePromise(msg);
    });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: myId, method, params }) + '\n');
  });
}

function textOf(reply) {
  if (reply.error) return `ERROR ${reply.error.code}: ${reply.error.message}`;
  const item = reply.result && reply.result.content && reply.result.content[0];
  return item ? item.text : JSON.stringify(reply.result);
}

function firstLines(text, n) {
  return String(text).split('\n').slice(0, n).join('\n');
}

/** Summarise a walk reply's JSON into one line. */
function walkSummaryOf(text) {
  try {
    const parsed = JSON.parse(text);
    const perRoom = (parsed.report || [])
      .filter((r) => r.room)
      .map((r) => `room ${r.room} ${r.fail && r.fail.length ? 'FAIL(' + r.fail.length + ')' : 'ok'}${r.checks && r.checks.cls !== undefined ? ' cls=' + r.checks.cls : ''}`);
    const ending = (parsed.report || []).find((r) => r.ending);
    return `${perRoom.join(', ')}${ending ? `; ending items ${ending.checklistItems}` : ''}; console errors ${parsed.errors?.length ?? 0}`;
  } catch {
    return firstLines(text, 2);
  }
}

async function main() {
  const summary = [];

  const init = await request('initialize', { protocolVersion: '2024-11-05' });
  summary.push(
    `initialize: ${init.result?.serverInfo?.name} v${init.result?.serverInfo?.version} (protocol ${init.result?.protocolVersion})`,
  );

  const list = await request('tools/list', {});
  summary.push(`tools/list: ${list.result.tools.map((t) => t.name).join(', ')}`);

  const checks = await request('tools/call', { name: 'check_rooms', arguments: {} });
  const checkText = textOf(checks);
  summary.push(`check_rooms: ${checkText.trim().split('\n').pop()}`);

  const walk = await request('tools/call', { name: 'walk_rooms', arguments: { rooms: '1-2' } });
  summary.push(`walk_rooms 1-2: ${walkSummaryOf(textOf(walk))}`);

  // One reduced-motion walk: proves the emulation, the static-label check and
  // the animations-at-rest check run end to end.
  const walkRm = await request('tools/call', {
    name: 'walk_rooms',
    arguments: { rooms: '1', reducedMotion: true },
  });
  summary.push(`walk_rooms 1 (reducedMotion): ${walkSummaryOf(textOf(walkRm))}`);

  const scan = await request('tools/call', { name: 'contrast_scan', arguments: { rooms: '1-2' } });
  const scanText = textOf(scan);
  let scanSummary = scanText;
  try {
    const parsed = JSON.parse(scanText);
    scanSummary = `${parsed.flags?.length ?? 0} contrast flag(s)`;
    if (parsed.flags && parsed.flags.length) {
      scanSummary += ': ' + parsed.flags.slice(0, 3).map((f) => `r${f.room}/${f.state} ${f.ratio}:1`).join(', ');
    }
  } catch {
    scanSummary = firstLines(scanText, 2);
  }
  summary.push(`contrast_scan 1-2: ${scanSummary}`);

  console.log('\n=== manor-qa smoke summary ===');
  for (const line of summary) console.log('- ' + line);
  console.log('=== end ===\n');
}

main()
  .then(() => {
    child.stdin.end();
    child.kill();
    process.exit(0);
  })
  .catch((err) => {
    console.error('smoke FAILED:', err.message);
    child.kill();
    process.exit(1);
  });
