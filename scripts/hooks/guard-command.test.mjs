import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { decide } from './guard-command.mjs';

describe('allowed commands', () => {
  // --- npm ---
  it('npm install', () => {
    assert.deepEqual(decide('npm install'), { allow: true, reason: '' });
  });
  it('npm ci', () => {
    assert.deepEqual(decide('npm ci'), { allow: true, reason: '' });
  });
  it('npm run build', () => {
    assert.deepEqual(decide('npm run build'), { allow: true, reason: '' });
  });
  it('npm test', () => {
    assert.deepEqual(decide('npm test'), { allow: true, reason: '' });
  });
  it('npm ls', () => {
    assert.deepEqual(decide('npm ls'), { allow: true, reason: '' });
  });
  it('npm audit', () => {
    assert.deepEqual(decide('npm audit'), { allow: true, reason: '' });
  });
  it('npm outdated', () => {
    assert.deepEqual(decide('npm outdated'), { allow: true, reason: '' });
  });
  it('npm create vite', () => {
    assert.deepEqual(decide('npm create vite'), { allow: true, reason: '' });
  });
  it('npm create vite@latest', () => {
    assert.deepEqual(decide('npm create vite@latest'), { allow: true, reason: '' });
  });
  it('npm install with flags', () => {
    assert.deepEqual(decide('npm install --save-dev vitest'), { allow: true, reason: '' });
  });

  // --- npx ---
  it('npx vite', () => {
    assert.deepEqual(decide('npx vite'), { allow: true, reason: '' });
  });
  it('npx vitest', () => {
    assert.deepEqual(decide('npx vitest'), { allow: true, reason: '' });
  });
  it('npx tsc', () => {
    assert.deepEqual(decide('npx tsc'), { allow: true, reason: '' });
  });
  it('npx prettier', () => {
    assert.deepEqual(decide('npx prettier'), { allow: true, reason: '' });
  });
  it('npx create-vite', () => {
    assert.deepEqual(decide('npx create-vite'), { allow: true, reason: '' });
  });
  it('npx vitest --run', () => {
    assert.deepEqual(decide('npx vitest --run'), { allow: true, reason: '' });
  });

  // --- node ---
  it('node --version', () => {
    assert.deepEqual(decide('node --version'), { allow: true, reason: '' });
  });
  it('node scripts/check-rooms.mjs', () => {
    assert.deepEqual(decide('node scripts/check-rooms.mjs'), { allow: true, reason: '' });
  });

  // --- git ---
  it('git status', () => {
    assert.deepEqual(decide('git status'), { allow: true, reason: '' });
  });
  it('git diff', () => {
    assert.deepEqual(decide('git diff'), { allow: true, reason: '' });
  });
  it('git log', () => {
    assert.deepEqual(decide('git log'), { allow: true, reason: '' });
  });
  it('git show', () => {
    assert.deepEqual(decide('git show'), { allow: true, reason: '' });
  });
  it('git add src/main.tsx', () => {
    assert.deepEqual(decide('git add src/main.tsx'), { allow: true, reason: '' });
  });
  it('git init', () => {
    assert.deepEqual(decide('git init'), { allow: true, reason: '' });
  });
  it('git rev-parse --show-toplevel', () => {
    assert.deepEqual(decide('git rev-parse --show-toplevel'), { allow: true, reason: '' });
  });
  it('git ls-files', () => {
    assert.deepEqual(decide('git ls-files'), { allow: true, reason: '' });
  });

  // --- whitespace normalization ---
  it('normalizes extra whitespace (npm   run   build)', () => {
    assert.deepEqual(decide('npm   run   build'), { allow: true, reason: '' });
  });
});

describe('blocked commands', () => {
  // --- dangerous characters ---
  it('blocks ; chaining (npm install; rm -rf .)', () => {
    assert.equal(decide('npm install; rm -rf .').allow, false);
  });
  it('blocks && chaining (npm test && rm -rf .)', () => {
    assert.equal(decide('npm test && rm -rf .').allow, false);
  });
  it('blocks | piping (npx vite | cat)', () => {
    assert.equal(decide('npx vite | cat').allow, false);
  });
  it('blocks backtick substitution', () => {
    assert.equal(decide('npm run `whoami`').allow, false);
  });
  it('blocks $() substitution (npm run $(whoami))', () => {
    assert.equal(decide('npm run $(whoami)').allow, false);
  });
  it('blocks > redirection (npx vite build > out.txt)', () => {
    assert.equal(decide('npx vite build > out.txt').allow, false);
  });
  it('blocks < redirection (npx tsc < input.txt)', () => {
    assert.equal(decide('npx tsc < input.txt').allow, false);
  });
  it('blocks newline', () => {
    assert.equal(decide('npm install\nrm -rf .').allow, false);
  });

  // --- paths outside repository ---
  it('blocks drive-letter path (C:\\Windows\\System32)', () => {
    assert.equal(decide('node C:\\Windows\\System32\\cmd.exe').allow, false);
  });
  it('blocks / absolute path (/etc/passwd)', () => {
    assert.equal(decide('cat /etc/passwd').allow, false);
  });
  it('blocks ~ home path (~/.ssh/id_rsa)', () => {
    assert.equal(decide('cat ~/.ssh/id_rsa').allow, false);
  });
  it('blocks .. parent directory (node ../outside.js)', () => {
    assert.equal(decide('node ../outside.js').allow, false);
  });

  // --- disallowed git subcommands ---
  it('blocks git push (git push origin main)', () => {
    assert.equal(decide('git push origin main').allow, false);
  });
  it('blocks git commit', () => {
    assert.equal(decide('git commit -m "msg"').allow, false);
  });
  it('blocks git reset', () => {
    assert.equal(decide('git reset --hard').allow, false);
  });
  it('blocks git checkout', () => {
    assert.equal(decide('git checkout main').allow, false);
  });
  it('blocks git clean', () => {
    assert.equal(decide('git clean -fd').allow, false);
  });

  // --- disallowed commands ---
  it('blocks rm', () => {
    assert.equal(decide('rm -rf .').allow, false);
  });
  it('blocks del', () => {
    assert.equal(decide('del file.txt').allow, false);
  });
  it('blocks Remove-Item', () => {
    assert.equal(decide('Remove-Item file.txt').allow, false);
  });
  it('blocks curl', () => {
    assert.equal(decide('curl http://example.com').allow, false);
  });
  it('blocks wget', () => {
    assert.equal(decide('wget http://example.com').allow, false);
  });
  it('blocks Invoke-WebRequest', () => {
    assert.equal(decide('Invoke-WebRequest http://example.com').allow, false);
  });
  it('blocks powershell', () => {
    assert.equal(decide('powershell -c "rm"').allow, false);
  });
  it('blocks pwsh', () => {
    assert.equal(decide('pwsh -c "rm"').allow, false);
  });
  it('blocks cmd', () => {
    assert.equal(decide('cmd /c "rm"').allow, false);
  });
  it('blocks bash', () => {
    assert.equal(decide('bash -c "rm"').allow, false);
  });

  // --- edge cases ---
  it('blocks empty command', () => {
    assert.equal(decide('').allow, false);
  });
  it('blocks npm with disallowed subcommand (npm publish)', () => {
    assert.equal(decide('npm publish').allow, false);
  });
  it('blocks npx with disallowed subcommand (npx rimraf)', () => {
    assert.equal(decide('npx rimraf .').allow, false);
  });
  it('blocks non-string input', () => {
    assert.equal(decide(null).allow, false);
  });
});

describe('blocked — tightened bypasses', () => {
  // A single '&' chains commands in cmd.exe and PowerShell.
  it('blocks single & chaining (npm test & del x)', () => {
    assert.equal(decide('npm test & del x').allow, false);
  });
  // A drive-letter path right after = is not a normal token start.
  it('blocks drive-letter path after = (npm install --prefix=C:\\x left-pad)', () => {
    assert.equal(decide('npm install --prefix=C:\\x left-pad').allow, false);
  });
  // PowerShell variables are expanded by the shell.
  it('blocks PowerShell variable (npm run $env:X)', () => {
    assert.equal(decide('npm run $env:X').allow, false);
  });
  // Absolute path smuggled in a flag value.
  it('blocks absolute path in flag value (npm install --prefix=/tmp x)', () => {
    assert.equal(decide('npm install --prefix=/tmp x').allow, false);
  });
  // Home path smuggled in a flag value.
  it('blocks home path in flag value (npm run build --prefix=~/x)', () => {
    assert.equal(decide('npm run build --prefix=~/x').allow, false);
  });
  // Parent traversal via Windows backslashes.
  it('blocks .. via backslashes (node scripts\\..\\x.mjs)', () => {
    assert.equal(decide('node scripts\\..\\x.mjs').allow, false);
  });
  // Drive-letter path smuggled in a flag value.
  it('blocks drive-letter path in flag value (npx vite build --outDir=D:/out)', () => {
    assert.equal(decide('npx vite build --outDir=D:/out').allow, false);
  });
  // UNC path at the start of a token.
  it('blocks UNC path (\\\\server\\share\\x)', () => {
    assert.equal(decide('\\\\server\\share\\x').allow, false);
  });
});
