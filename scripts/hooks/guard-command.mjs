// Command guard for Dark Pattern Manor.
// Blocks shell commands outside the repository's allow-list.

import { fileURLToPath } from 'node:url';
import { resolve as resolvePath } from 'node:path';

/**
 * Decide whether a shell command is allowed.
 * @param {string} command
 * @returns {{ allow: boolean, reason: string }}
 */
export function decide(command) {
  if (typeof command !== 'string') {
    return { allow: false, reason: 'no command string found' };
  }

  // Block dangerous shell metacharacters (checked on raw input so newlines
  // and carriage returns are caught before whitespace normalization). The
  // single '&' covers '&&' chaining; the single '$' covers '$(...)'
  // substitution and PowerShell '$env:' variables.
  for (const ch of [';', '|', '`', '>', '<', '\n', '&', '$', '\r']) {
    if (command.includes(ch)) {
      return { allow: false, reason: 'chaining, piping, substitution or redirection' };
    }
  }

  // Normalize whitespace.
  const normalized = command.trim().replace(/\s+/g, ' ');
  if (normalized === '') {
    return { allow: false, reason: 'empty command' };
  }

  // Block drive-letter paths anywhere in the command (C:\, d:/, including
  // right after = or a quote, e.g. --prefix=C:\x or "C:\x").
  if (/[A-Za-z]:[\\/]/.test(normalized)) {
    return { allow: false, reason: 'drive-letter path outside repository' };
  }

  // Block UNC paths: two slashes or two backslashes at the start of a token
  // or after = (e.g. \\server\share or --prefix=\\server).
  if (/(?:^|\s|=)[\\/][\\/]/.test(normalized)) {
    return { allow: false, reason: 'UNC path outside repository' };
  }

  const tokens = normalized.split(' ');

  // Block tokens starting with / or ~ (absolute or home paths), and flag
  // values that point at an absolute or home path (=... or ~...).
  for (const token of tokens) {
    if (token.startsWith('/') || token.startsWith('~')) {
      return { allow: false, reason: 'absolute or home path outside repository' };
    }
    if (token.includes('=/') || token.includes('=~')) {
      return { allow: false, reason: 'absolute or home path in flag value' };
    }
  }

  // Block any .. segment (parent directory traversal).
  if (normalized.includes('..')) {
    return { allow: false, reason: 'parent directory traversal' };
  }

  // Parse and check against the allow-list.
  const [first, ...rest] = tokens;

  switch (first) {
    case 'npm': {
      const sub = rest[0];
      if (!sub) return { allow: false, reason: 'npm requires a subcommand' };
      if (['install', 'ci', 'test', 'ls', 'audit', 'outdated'].includes(sub)) {
        return { allow: true, reason: '' };
      }
      if (sub === 'run') {
        if (!rest[1]) return { allow: false, reason: 'npm run requires a script name' };
        return { allow: true, reason: '' };
      }
      if (sub === 'create') {
        if (!rest[1] || !rest[1].startsWith('vite')) {
          return { allow: false, reason: 'npm create only allows vite' };
        }
        return { allow: true, reason: '' };
      }
      return { allow: false, reason: `npm ${sub} is not allowed` };
    }

    case 'npx': {
      const sub = rest[0];
      if (!sub) return { allow: false, reason: 'npx requires a subcommand' };
      if (['vite', 'vitest', 'tsc', 'prettier', 'create-vite'].includes(sub)) {
        return { allow: true, reason: '' };
      }
      return { allow: false, reason: `npx ${sub} is not allowed` };
    }

    case 'node': {
      const sub = rest[0];
      if (!sub) return { allow: false, reason: 'node requires an argument' };
      if (sub === '--version') return { allow: true, reason: '' };
      if (sub.startsWith('scripts/')) return { allow: true, reason: '' };
      return { allow: false, reason: 'node only allows --version or scripts/ paths' };
    }

    case 'git': {
      const sub = rest[0];
      if (!sub) return { allow: false, reason: 'git requires a subcommand' };
      if (['status', 'diff', 'log', 'show', 'add', 'init', 'rev-parse', 'ls-files'].includes(sub)) {
        return { allow: true, reason: '' };
      }
      return { allow: false, reason: `git ${sub} is not allowed` };
    }

    default:
      return { allow: false, reason: `${first} is not an allowed command` };
  }
}

/**
 * Recursively search an object for a "command" field whose value is a string.
 * @param {*} obj
 * @returns {string | null}
 */
function findCommandField(obj) {
  if (obj === null || obj === undefined || typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findCommandField(item);
      if (found !== null) return found;
    }
    return null;
  }
  if (typeof obj.command === 'string') return obj.command;
  for (const key of Object.keys(obj)) {
    const found = findCommandField(obj[key]);
    if (found !== null) return found;
  }
  return null;
}

/**
 * Read stdin with a timeout.
 * @param {number} timeoutMs
 * @returns {Promise<string>}
 */
function readStdin(timeoutMs) {
  return new Promise((resolve) => {
    let data = '';
    const timer = setTimeout(() => {
      process.stdin.removeAllListeners();
      resolve(data);
    }, timeoutMs);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

// Run the stdin logic only when executed directly.
const isMain =
  resolvePath(process.argv[1] || '') === resolvePath(fileURLToPath(import.meta.url));

if (isMain) {
  void (async () => {
    const input = await readStdin(2000);
    let command = null;
    try {
      command = findCommandField(JSON.parse(input));
    } catch {
      // Invalid or empty JSON — no command found.
    }

    if (command === null) {
      console.error('command-guard: blocked: no command string found');
      process.exit(2);
    }

    const result = decide(command);
    if (!result.allow) {
      console.error(`command-guard: blocked: ${result.reason}`);
      process.exit(2);
    }
    // Allowed: print nothing, exit 0.
    process.exit(0);
  })();
}
