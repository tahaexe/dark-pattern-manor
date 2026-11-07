// The full manor-qa run: spawn the manor-qa MCP server over stdio and call
// walk_rooms and contrast_scan for the given rooms (default 1-12), both without
// and with reducedMotion. Prints a compact per-room summary (pass/fail, CLS,
// reduced-motion checks, divider offsets, contrast flags) and exits non-zero on
// any failure.
// Not part of npm test (it needs Chrome and a build): run it before a release
// and in non-interactive agent runs, where MCP tool calls cannot be approved.
//
//   npm run build
//   npm run qa:full            (or: node scripts/mcp/manor-qa-full.mjs [rooms])

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER = resolve(HERE, 'manor-qa.mjs');
const ROOMS = process.argv[2] || '1-12';

const child = spawn(process.execPath, [SERVER], { stdio: ['pipe', 'pipe', 'inherit'] });
const pending = new Map();
const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
rl.on('line', (line) => {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  if (msg && msg.id !== undefined && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});

let id = 0;
function request(method, params, timeoutMs = 600000) {
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

function summariseWalk(label, text) {
  console.log(`\n--- walk_rooms ${label} ---`);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.log(text.slice(0, 500));
    return 0;
  }
  let fails = 0;
  for (const r of parsed.report || []) {
    if (!r.room) {
      if (r.ending !== undefined) console.log(`ending: ${r.checklistItems} items (twelve=${r.twelve})`);
      continue;
    }
    const bad = r.fail && r.fail.length ? ` FAIL: ${r.fail.join(' | ')}` : '';
    if (r.fail && r.fail.length) fails += r.fail.length;
    const rm = r.checks && r.checks['animations at rest'] !== undefined
      ? ` animRest=${r.checks['animations at rest']} stirs=${r.checks['stirs label visible']}`
      : '';
    // Divider offsets per split, as edge/grip pixels from the ideal position.
    const div = Array.isArray(r.dividerOffsets) && r.dividerOffsets.length
      ? ` divider(edge/grip px)=[${r.dividerOffsets
          .map((d) => `${d.split}:${d.edgeOff}/${d.gripOff}`)
          .join(' ')}]`
      : '';
    console.log(`room ${r.room}: cls=${r.checks?.cls}${rm}${div}${bad || ' ok'}`);
  }
  console.log(`console errors: ${parsed.errors?.length ?? 0}; reducedMotion=${parsed.reducedMotion}`);
  return fails + (parsed.errors?.length ?? 0);
}

function summariseScan(label, text) {
  console.log(`\n--- contrast_scan ${label} ---`);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.log(text.slice(0, 500));
    return 0;
  }
  const flags = parsed.flags || [];
  console.log(`${flags.length} contrast flag(s); reducedMotion=${parsed.reducedMotion}`);
  for (const f of flags.slice(0, 20)) {
    console.log(`  room ${f.room}/${f.state} "${f.text}" ${f.ratio}:1 (<${f.threshold})`);
  }
  return flags.length;
}

async function main() {
  let problems = 0;
  await request('initialize', { protocolVersion: '2024-11-05' });

  problems += summariseWalk(
    `${ROOMS}`,
    textOf(await request('tools/call', { name: 'walk_rooms', arguments: { rooms: ROOMS } })),
  );
  problems += summariseWalk(
    `${ROOMS} reducedMotion`,
    textOf(
      await request('tools/call', {
        name: 'walk_rooms',
        arguments: { rooms: ROOMS, reducedMotion: true },
      }),
    ),
  );
  problems += summariseScan(
    `${ROOMS}`,
    textOf(await request('tools/call', { name: 'contrast_scan', arguments: { rooms: ROOMS } })),
  );
  problems += summariseScan(
    `${ROOMS} reducedMotion`,
    textOf(
      await request('tools/call', {
        name: 'contrast_scan',
        arguments: { rooms: ROOMS, reducedMotion: true },
      }),
    ),
  );

  console.log(`\n=== manor-qa-full: ${problems === 0 ? 'ALL CLEAR' : problems + ' problem(s)'} ===`);
  return problems;
}

main()
  .then((problems) => {
    child.stdin.end();
    child.kill();
    process.exit(problems === 0 ? 0 : 1);
  })
  .catch((err) => {
    console.error('verify FAILED:', err.message);
    child.kill();
    process.exit(1);
  });
