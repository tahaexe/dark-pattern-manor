// manor-qa — a Model Context Protocol server over stdio.
//
// It gives Kiro a real headless-browser check of Dark Pattern Manor while it
// builds rooms. Three tools:
//   check_rooms    — the room-data checks (same as `npm run check:rooms`)
//   walk_rooms     — a keyboard walk of each room in headless Chrome
//   contrast_scan  — real-pixel WCAG contrast of the comparison's text
//
// Protocol: JSON-RPC 2.0, one JSON message per line on stdin/stdout. Nothing
// but protocol messages goes to stdout; all logs go to stderr. Plain Node 22+
// ES module, no new dependency.

import { createInterface } from 'node:readline';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRouter, parseMessage } from './protocol.mjs';
import { runCheckRooms } from './checks.mjs';
import { runWalk } from './walk.mjs';
import { runContrastScan } from './contrast-scan.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');

function readVersion() {
  try {
    const pkg = JSON.parse(readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8'));
    return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function log(...args) {
  // Logs to stderr only — stdout carries protocol messages exclusively.
  process.stderr.write('[manor-qa] ' + args.join(' ') + '\n');
}

const roomsSchema = {
  type: 'object',
  properties: {
    rooms: {
      type: 'string',
      description: 'Rooms to cover: a range ("1-12"), a single ("3") or a list ("1,4,7").',
      default: '1-12',
    },
    width: { type: 'integer', description: 'Viewport width in px.', default: 1280 },
    height: { type: 'integer', description: 'Viewport height in px.', default: 720 },
  },
  additionalProperties: false,
};

const tools = [
  {
    name: 'check_rooms',
    description:
      'Run the room-data checks (the same validation as `npm run check:rooms`). Returns one line per room plus the overall result. No browser needed.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: () => runCheckRooms(),
  },
  {
    name: 'walk_rooms',
    description:
      'Walk each room by keyboard in headless Chrome against the built site in dist/: the instruction, the lantern, the possessed element reachable by Tab, the three cards and each wrong card\'s whisper, the right card, the comparison box, the slider really changing what is on top, every point haunted at 0 and honest at 100, the focused honest control, the one-press task, the Ghost Guide and the continue link; then the ending\'s twelve checklist lines. Returns JSON. Run `npm run build` first.',
    inputSchema: roomsSchema,
    run: (args) => runWalk(args),
  },
  {
    name: 'contrast_scan',
    description:
      'Measure real-pixel WCAG contrast of the comparison\'s text in headless Chrome, at 0 (haunted) and 100 (honest). Screenshots the comparison box, reads pixels from a canvas, and flags any text below 4.5:1 (3:1 for large text). Returns JSON flags. Run `npm run build` first.',
    inputSchema: roomsSchema,
    run: (args) => runContrastScan(args),
  },
];

const { handle } = createRouter({
  serverInfo: { name: 'manor-qa', version: readVersion() },
  tools,
});

function main() {
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

  rl.on('line', (line) => {
    const message = parseMessage(line);
    if (message === null) {
      // A malformed line must not crash the server; log and move on.
      log('ignored a malformed line');
      return;
    }
    // Handle asynchronously but keep replies ordered per message.
    void handle(message)
      .then((reply) => {
        if (reply !== null && reply !== undefined) {
          process.stdout.write(JSON.stringify(reply) + '\n');
        }
      })
      .catch((err) => {
        log('handler error:', err && err.message ? err.message : String(err));
      });
  });

  rl.on('close', () => process.exit(0));
  log('ready');
}

main();
