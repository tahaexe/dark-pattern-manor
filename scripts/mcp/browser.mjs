// Chrome launch and a tiny CDP (Chrome DevTools Protocol) client — the only
// browser glue, factored out of the review prototype. No new dependency: it
// uses Node's built-in fetch, WebSocket, child_process and net.
//
// findChrome() reads CHROME_PATH first, then the usual install path for the
// host OS, and throws a clear error naming CHROME_PATH when none exists. No
// user-specific path is written into any committed file.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

/** Candidate Chrome executables per platform (checked in order). */
function candidatePaths() {
  if (process.platform === 'win32') {
    const programFiles = process.env['ProgramFiles'] || 'C:/Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)';
    const localAppData = process.env['LOCALAPPDATA'];
    const paths = [
      join(programFiles, 'Google/Chrome/Application/chrome.exe'),
      join(programFilesX86, 'Google/Chrome/Application/chrome.exe'),
    ];
    if (localAppData) {
      paths.push(join(localAppData, 'Google/Chrome/Application/chrome.exe'));
    }
    return paths;
  }
  if (process.platform === 'darwin') {
    return [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ];
  }
  // Linux and the rest: resolve common names on PATH.
  return [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ];
}

/**
 * Find a Chrome/Chromium executable.
 * @returns {string} the path (or a PATH name) to launch
 */
export function findChrome() {
  const fromEnv = process.env.CHROME_PATH;
  if (fromEnv && fromEnv.trim() !== '') {
    if (existsSync(fromEnv)) return fromEnv;
    throw new Error(
      `CHROME_PATH is set to "${fromEnv}" but no file exists there.`,
    );
  }
  for (const p of candidatePaths()) {
    if (existsSync(p)) return p;
  }
  throw new Error(
    'No Chrome found. Install Google Chrome or set CHROME_PATH to its executable.',
  );
}

/** Reserve a free ephemeral TCP port on 127.0.0.1, then release it. */
export function freePort() {
  return new Promise((resolvePromise, reject) => {
    const srv = createServer();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      srv.close(() => resolvePromise(port));
    });
  });
}

/**
 * Launch headless Chrome with a remote debugging port.
 * @param {{ width: number, height: number, port?: number }} opts
 * @returns {Promise<{ proc, debugPort: number, close: () => void }>}
 */
export async function launchChrome({ width, height, port }) {
  const exe = findChrome();
  const debugPort = port ?? (await freePort());
  sweepStaleProfiles();
  const profile = mkdtempSync(join(tmpdir(), 'manor-qa-'));

  const proc = spawn(
    exe,
    [
      '--headless=new',
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profile}`,
      `--window-size=${width},${height}`,
      '--hide-scrollbars',
      '--mute-audio',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  // The throwaway profile goes with the browser. On Windows Chrome still holds its files for a moment after
  // kill(), so removing it at once failed silently and every run left a 30-80 MB folder in the temp dir:
  // remove it once the process has exited, retrying while its helpers let go of the files.
  const removeProfile = () => {
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
    } catch {
      /* ignore: sweepStaleProfiles() takes it on a later run */
    }
  };
  const close = () => {
    if (proc.exitCode !== null || proc.signalCode !== null) {
      removeProfile();
      return;
    }
    proc.once('exit', removeProfile);
    try {
      proc.kill();
    } catch {
      removeProfile();
    }
  };

  return { proc, debugPort, close };
}

/**
 * Removes manor-qa profiles older than an hour from the temp dir (left by a crashed or killed run); a profile in
 * use by a running browser is locked on Windows and stays. Best effort: never throws.
 */
export function sweepStaleProfiles(maxAgeMs = 60 * 60 * 1000) {
  const root = tmpdir();
  let names = [];
  try {
    names = readdirSync(root).filter((name) => name.startsWith('manor-qa-'));
  } catch {
    return;
  }
  const cutoff = Date.now() - maxAgeMs;
  for (const name of names) {
    const dir = join(root, name);
    try {
      if (statSync(dir).mtimeMs < cutoff) rmSync(dir, { recursive: true, force: true });
    } catch {
      /* locked or gone */
    }
  }
}

/** Poll the CDP /json/list endpoint until the page target appears. */
async function getPageTarget(debugPort, { tries = 100, waitMs = 150 } = {}) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      if (res.ok) {
        const list = await res.json();
        const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
        if (page) return page;
      }
    } catch {
      /* not up yet */
    }
    await sleep(waitMs);
  }
  throw new Error(`Chrome DevTools endpoint never came up on port ${debugPort}`);
}

/**
 * Connect a minimal CDP client to the page target.
 * @param {number} debugPort
 * @returns {Promise<{
 *   send: (method: string, params?: object) => Promise<any>,
 *   ev: (expr: string) => Promise<any>,
 *   key: (name: string) => Promise<void>,
 *   rawKey: (name: string, code: string, vk: number) => Promise<void>,
 *   mouseClick: (x: number, y: number) => Promise<void>,
 *   tap: (x: number, y: number) => Promise<void>,
 *   on: (method: string, cb: (params: any) => void) => void,
 *   close: () => void,
 * }>}
 */
export async function connectCdp(debugPort) {
  const page = await getPageTarget(debugPort);
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolvePromise, reject) => {
    ws.onopen = resolvePromise;
    ws.onerror = reject;
  });

  let id = 0;
  const pending = new Map();
  const listeners = new Map();

  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) {
      pending.get(d.id)(d);
      pending.delete(d.id);
      return;
    }
    if (d.method && listeners.has(d.method)) {
      for (const cb of listeners.get(d.method)) cb(d.params);
    }
  };

  const send = (method, params = {}) =>
    new Promise((resolvePromise) => {
      const i = ++id;
      pending.set(i, (d) => resolvePromise(d.result));
      ws.send(JSON.stringify({ id: i, method, params }));
    });

  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', {
      expression: expr,
      awaitPromise: true,
      returnByValue: true,
    });
    return r && r.result ? r.result.value : undefined;
  };

  // Common keys used by the walk.
  const KEYS = {
    Tab: ['Tab', 9],
    Enter: ['Enter', 13],
    l: ['KeyL', 76],
    Home: ['Home', 36],
    End: ['End', 35],
  };

  const rawKey = async (name, code, vk) => {
    const text = name === 'Enter' ? '\r' : name === 'l' ? 'l' : undefined;
    await send('Input.dispatchKeyEvent', {
      type: text ? 'keyDown' : 'rawKeyDown',
      key: name,
      code,
      windowsVirtualKeyCode: vk,
      ...(text ? { text } : {}),
    });
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: name,
      code,
      windowsVirtualKeyCode: vk,
    });
  };

  const key = async (name) => {
    const spec = KEYS[name];
    if (!spec) throw new Error(`unknown key ${name}`);
    await rawKey(name, spec[0], spec[1]);
  };

  // A real left-button mouse click at a viewport point: press then release,
  // with clickCount 1 so the page sees a genuine click (used by the walk to
  // finish the honest task by pointer at the desktop size).
  const mouseClick = async (x, y) => {
    await send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x,
      y,
      button: 'left',
      buttons: 1,
      clickCount: 1,
    });
    await send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x,
      y,
      button: 'left',
      buttons: 0,
      clickCount: 1,
    });
  };

  // A real touch tap at a viewport point: touchStart then touchEnd at the same
  // point (used by the walk to finish the honest task by touch at the phone
  // size). touchEnd carries no touch points, as the protocol expects.
  const tap = async (x, y) => {
    await send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y }],
    });
    await send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
  };

  const on = (method, cb) => {
    if (!listeners.has(method)) listeners.set(method, []);
    listeners.get(method).push(cb);
  };

  const close = () => {
    try {
      ws.close();
    } catch {
      /* ignore */
    }
  };

  return { send, ev, key, rawKey, mouseClick, tap, on, close };
}
