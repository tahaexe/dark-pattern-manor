// The full manor-qa run: spawn the manor-qa MCP server over stdio and call
// walk_rooms, contrast_scan and walk_lantern for the given rooms (default
// 1-12), at the desktop (1280x720) and phone (412x915) sizes, each without and
// with reducedMotion for the room tools. Prints a compact per-room summary
// (pass/fail, CLS, reduced-motion checks, static-label clipping, named-hold
// motion, divider offsets, contrast flags), the Ghost Lantern step, the
// real-browser room step and the strict-CSP measurement, and exits non-zero on
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

// The two sizes every room must hold at: desktop and a phone.
const SIZES = [
  { width: 1280, height: 720, label: '1280x720' },
  { width: 412, height: 915, label: '412x915' },
];

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
function request(method, params, timeoutMs = 900000) {
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
      // The title entry (checked once per size): report its button box and any
      // first-screen failure. The ending entry reports its checklist count.
      if (r.title !== undefined) {
        const bad = r.fail && r.fail.length ? ` FAIL: ${r.fail.join(' | ')}` : '';
        if (r.fail && r.fail.length) fails += r.fail.length;
        console.log(
          `title: button=${r.checks?.['button box']} bottom=${r.checks?.['button bottom']}` +
            ` vp=${r.checks?.['viewport']} below=${r.checks?.['space below button']}` +
            ` onFirstScreen=${r.checks?.['button on first screen']}${bad || ' ok'}`,
        );
        continue;
      }
      if (r.ending !== undefined)
        console.log(`ending: ${r.checklistItems} items (twelve=${r.twelve})`);
      continue;
    }
    const bad = r.fail && r.fail.length ? ` FAIL: ${r.fail.join(' | ')}` : '';
    if (r.fail && r.fail.length) fails += r.fail.length;
    const rm =
      r.checks && r.checks['animations at rest'] !== undefined
        ? ` animRest=${r.checks['animations at rest']} stirs=${r.checks['stirs label visible']}`
        : '';
    const lbl =
      r.checks && r.checks['static labels not clipped'] !== undefined
        ? ` labels=${r.checks['static labels']}/clipOk=${r.checks['static labels not clipped']}`
        : '';
    // The named-hold motion: how many animations were still running in the
    // frame during the hold (with motion on), and whether the hold was clean.
    const hold =
      r.checks && r.checks['named hold: only the shared flee moves'] !== undefined
        ? ` hold=${r.checks['held-hold animations']}/clean=${r.checks['named hold: only the shared flee moves']}`
        : '';
    // Divider offsets per split, as edge/grip pixels from the ideal position.
    const div =
      Array.isArray(r.dividerOffsets) && r.dividerOffsets.length
        ? ` divider(edge/grip px)=[${r.dividerOffsets
            .map((d) => `${d.split}:${d.edgeOff}/${d.gripOff}`)
            .join(' ')}]`
        : '';
    console.log(
      `room ${r.room}: ready=${r.readyMs}ms cls=${r.checks?.cls}${rm}${lbl}${hold}${div}${bad || ' ok'}`,
    );
  }
  console.log(
    `console errors: ${parsed.errors?.length ?? 0}; reducedMotion=${parsed.reducedMotion}`,
  );
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

function summariseLantern(label, text) {
  console.log(`\n--- walk_lantern ${label} ---`);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.log(text.slice(0, 500));
    return 0;
  }
  let fails = 0;
  for (const r of parsed.reports || []) {
    const bad = r.fail && r.fail.length ? ` FAIL: ${r.fail.join(' | ')}` : '';
    if (r.fail && r.fail.length) fails += r.fail.length;
    const isRoomStep = typeof r.title === 'string' && r.title.startsWith('lantern rooms');
    const strict = r.checks && r.checks['styles under strict CSP'] !== undefined;
    if (isRoomStep) {
      // The real-browser room step: one line per covered room, plus the title.
      console.log(`${r.title}:`);
      for (const [name, val] of Object.entries(r.checks || {})) {
        console.log(`  ${name}: ${val}`);
      }
      if (bad) console.log(` ${bad.trim()}`);
      else console.log('  ok');
    } else if (strict) {
      console.log(
        `${r.title}: stylesUnderCSP=${r.checks['styles under strict CSP']}` +
          ` panelBg=${r.checks['panel background']} markOutline=${r.checks['mark outline']}` +
          ` consoleErrors=${r.checks['console errors']}${bad || ' (report only)'}`,
      );
    } else {
      console.log(
        `${r.title}: count=${r.checks?.['panel count']} panelBg=${r.checks?.['panel background']}` +
          ` markOutline=${r.checks?.['mark outline']}${bad || ' ok'}`,
      );
    }
  }
  console.log(`lantern console errors: ${parsed.errors?.length ?? 0}`);
  return fails + (parsed.errors?.length ?? 0);
}

async function main() {
  let problems = 0;
  await request('initialize', { protocolVersion: '2024-11-05' });

  for (const size of SIZES) {
    const { width, height, label } = size;
    problems += summariseWalk(
      `${ROOMS} @ ${label}`,
      textOf(
        await request('tools/call', {
          name: 'walk_rooms',
          arguments: { rooms: ROOMS, width, height },
        }),
      ),
    );
    problems += summariseWalk(
      `${ROOMS} @ ${label} reducedMotion`,
      textOf(
        await request('tools/call', {
          name: 'walk_rooms',
          arguments: { rooms: ROOMS, width, height, reducedMotion: true },
        }),
      ),
    );
    problems += summariseScan(
      `${ROOMS} @ ${label}`,
      textOf(
        await request('tools/call', {
          name: 'contrast_scan',
          arguments: { rooms: ROOMS, width, height },
        }),
      ),
    );
    problems += summariseScan(
      `${ROOMS} @ ${label} reducedMotion`,
      textOf(
        await request('tools/call', {
          name: 'contrast_scan',
          arguments: { rooms: ROOMS, width, height, reducedMotion: true },
        }),
      ),
    );
    problems += summariseLantern(
      `@ ${label}`,
      textOf(
        await request('tools/call', {
          name: 'walk_lantern',
          arguments: { width, height },
        }),
      ),
    );
  }

  console.log(
    `\n=== manor-qa-full: ${problems === 0 ? 'ALL CLEAR' : problems + ' problem(s)'} ===`,
  );
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
