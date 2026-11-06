import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tailLines, formatSummary, runGates, GATES } from './gates-on-stop.mjs';

describe('tailLines', () => {
  it('returns the last n non-empty lines', () => {
    const text = 'a\nb\nc\nd\ne';
    assert.deepEqual(tailLines(text, 2), ['d', 'e']);
  });
  it('drops blank lines', () => {
    const text = 'a\n\n\nb\n\n';
    assert.deepEqual(tailLines(text, 5), ['a', 'b']);
  });
  it('handles CRLF', () => {
    const text = 'one\r\ntwo\r\nthree';
    assert.deepEqual(tailLines(text, 2), ['two', 'three']);
  });
  it('returns everything when n exceeds the line count', () => {
    assert.deepEqual(tailLines('x\ny', 10), ['x', 'y']);
  });
  it('returns [] for non-strings', () => {
    assert.deepEqual(tailLines(null, 3), []);
    assert.deepEqual(tailLines(undefined, 3), []);
  });
});

describe('formatSummary', () => {
  it('passed gate is one line', () => {
    assert.equal(formatSummary('npm test', true, 'lots of output'), 'npm test: passed');
  });
  it('failed gate names the gate and includes the tail, indented', () => {
    const out = 'line1\nline2\nFAIL: boom';
    const summary = formatSummary('npm run build', false, out, 2);
    assert.equal(summary, 'npm run build: FAILED\n    line2\n    FAIL: boom');
  });
  it('failed gate with no output has no body', () => {
    assert.equal(formatSummary('npm run check:size', false, ''), 'npm run check:size: FAILED');
  });
});

describe('runGates', () => {
  it('runs every gate when all pass', () => {
    const calls = [];
    const runGate = (cmd, args) => {
      calls.push([cmd, ...args]);
      return { passed: true, output: '' };
    };
    const { allPassed, lines } = runGates(GATES, runGate);
    assert.equal(allPassed, true);
    assert.equal(calls.length, GATES.length);
    assert.deepEqual(lines, [
      'npm test: passed',
      'npm run build: passed',
      'npm run check:size: passed',
    ]);
  });

  it('stops at the first failing gate', () => {
    const calls = [];
    const runGate = (cmd, args) => {
      calls.push([cmd, ...args]);
      // Fail the second gate (build).
      const passed = calls.length !== 2;
      return { passed, output: passed ? '' : 'build error here' };
    };
    const { allPassed, lines } = runGates(GATES, runGate);
    assert.equal(allPassed, false);
    assert.equal(calls.length, 2); // never reached check:size
    assert.equal(lines[0], 'npm test: passed');
    assert.ok(lines[1].startsWith('npm run build: FAILED'));
    assert.ok(lines[1].includes('build error here'));
  });

  it('fails on the first gate without running later ones', () => {
    let count = 0;
    const runGate = () => {
      count += 1;
      return { passed: false, output: 'test failure' };
    };
    const { allPassed, lines } = runGates(GATES, runGate);
    assert.equal(allPassed, false);
    assert.equal(count, 1);
    assert.equal(lines.length, 1);
    assert.ok(lines[0].startsWith('npm test: FAILED'));
  });
});
