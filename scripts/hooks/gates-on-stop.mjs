// Gates-on-stop hook for Dark Pattern Manor.
//
// Runs as a Stop hook when the agent finishes its turn. It runs the project's
// gates in order — `npm test` (quiet), `npm run build`, `npm run check:size`
// — and prints one summary line per gate (passed or failed). For a failing
// gate it also prints the last few lines of that gate's output so the agent
// sees what broke, then stops at the first failure and exits non-zero. Uses
// Node built-ins only; every command it runs is on the command-guard
// allow-list.

import { fileURLToPath } from 'node:url';
import { resolve as resolvePath } from 'node:path';
import { spawnSync } from 'node:child_process';

/** The gates, in order. Each is [label, command, args]. */
export const GATES = [
  // vitest's `run` mode is already non-watch; --silent keeps it quiet.
  ['npm test', 'npm', ['test', '--', '--silent']],
  ['npm run build', 'npm', ['run', 'build']],
  ['npm run check:size', 'npm', ['run', 'check:size']],
];

/**
 * Return the last `n` non-empty lines of a block of output, trimmed.
 * @param {string} text
 * @param {number} n
 * @returns {string[]}
 */
export function tailLines(text, n) {
  if (typeof text !== 'string') return [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim() !== '');
  return lines.slice(-n);
}

/**
 * Format one gate's summary. On pass, a single "ok" line. On failure, a
 * "FAILED" line followed by the last `tailCount` lines of its output, each
 * indented.
 * @param {string} label
 * @param {boolean} passed
 * @param {string} output   combined stdout+stderr of the gate
 * @param {number} [tailCount]
 * @returns {string}
 */
export function formatSummary(label, passed, output, tailCount = 8) {
  if (passed) return `${label}: passed`;
  const tail = tailLines(output, tailCount);
  const body = tail.length > 0 ? '\n' + tail.map((l) => `    ${l}`).join('\n') : '';
  return `${label}: FAILED${body}`;
}

/**
 * Run the gates in order, stopping at the first failure. Each gate is run
 * through `runGate`, which returns { passed, output }.
 * @param {typeof GATES} gates
 * @param {(cmd: string, args: string[]) => { passed: boolean, output: string }} runGate
 * @returns {{ allPassed: boolean, lines: string[] }}
 */
export function runGates(gates, runGate) {
  const lines = [];
  let allPassed = true;
  for (const [label, cmd, args] of gates) {
    const { passed, output } = runGate(cmd, args);
    lines.push(formatSummary(label, passed, output));
    if (!passed) {
      allPassed = false;
      break; // stop at the first failing gate
    }
  }
  return { allPassed, lines };
}

/**
 * Run one gate as a child process, capturing combined output.
 * @param {string} cmd
 * @param {string[]} args
 * @returns {{ passed: boolean, output: string }}
 */
function spawnGate(cmd, args) {
  // npm resolves to npm.cmd on Windows; shell:true lets the OS find it.
  const result = spawnSync(cmd, args, {
    encoding: 'utf8',
    shell: true,
    timeout: 170000,
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  if (result.error) {
    return { passed: false, output: `${output}\n${result.error.message}` };
  }
  return { passed: result.status === 0, output };
}

// Run only when executed directly, so the pure helpers can be unit-tested.
const isMain =
  resolvePath(process.argv[1] || '') === resolvePath(fileURLToPath(import.meta.url));

if (isMain) {
  const { allPassed, lines } = runGates(GATES, spawnGate);
  for (const line of lines) {
    if (line.includes('FAILED')) console.error(line);
    else console.log(line);
  }
  process.exit(allPassed ? 0 : 1);
}
