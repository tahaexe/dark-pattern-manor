// Shared headless-browser session setup for the walk_rooms and contrast_scan
// tools: the dist/ guard, the static server, the Chrome launch, the CDP
// connection, the in-page visibility helpers, and the console/exception
// collectors. Returns everything the two tools need plus a single teardown.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './checks.mjs';
import { start as startStatic } from './static-server.mjs';
import { launchChrome, connectCdp } from './browser.mjs';

export const DIST_DIR = join(REPO_ROOT, 'dist');

/** The message returned when the build is missing. */
export const NO_DIST_MESSAGE =
  'dist/ is missing or has no index.html. Run `npm run build` first, then try again.';

/** True when a usable build exists. */
export function distReady() {
  return existsSync(join(DIST_DIR, 'index.html'));
}

// In-page helpers installed on every document, mirroring the review prototype.
// __vis(el|selector) reports whether an element is a visible, top-most box.
export const HELPERS = `
window.__el = (x) => (typeof x === 'string' ? document.querySelector(x) : x);
window.__vis = (x) => {
  const el = window.__el(x);
  if (!el) return 'missing';
  el.scrollIntoView({ block: 'center' });
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return 'zero-size';
  if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return 'off-screen';
  const pts = [[0.5, 0.5], [0.25, 0.5], [0.75, 0.5]];
  for (const [fx, fy] of pts) {
    const t = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy);
    if (t && (t === el || el.contains(t) || el.contains(t) || (t.contains && t.contains(el)))) return 'ok';
  }
  const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return 'covered by ' + (t ? (t.className || t.tagName) : 'nothing');
};
window.__heads = () => [...document.querySelectorAll('h1, h2')].map((h) => h.textContent.trim()).join(' | ');
window.__ann = () => (document.querySelector('.live-announcement') || {}).textContent || '';
`;

/**
 * Open a browser session serving dist/.
 * @param {{ width: number, height: number }} opts
 * @returns {Promise<{ server, chrome, cdp, baseUrl, errors: string[], teardown: () => Promise<void> }>}
 */
export async function openSession({ width, height }) {
  const server = await startStatic({ distDir: DIST_DIR });
  const chrome = await launchChrome({ width, height });
  const cdp = await connectCdp(chrome.debugPort);

  const errors = [];
  cdp.on('Runtime.exceptionThrown', (p) => {
    const d = p && p.exceptionDetails;
    if (d) errors.push((d.text || '') + ' ' + (d.exception?.description ?? ''));
  });
  cdp.on('Runtime.consoleAPICalled', (p) => {
    if (p && p.type === 'error') {
      errors.push((p.args || []).map((a) => a.value ?? a.description ?? '').join(' '));
    }
  });

  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 600,
  });
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
  });
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: HELPERS });

  const teardown = async () => {
    cdp.close();
    chrome.close();
    await server.close();
  };

  return { server, chrome, cdp, baseUrl: server.baseUrl, errors, teardown };
}
