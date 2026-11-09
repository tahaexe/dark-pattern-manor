// The Ghost Lantern walk step: on the in-app practice page (#/lantern-practice)
// at both sizes, run the built bundle exactly as the "Try the lantern here"
// button does, then prove the four promises hold in a real browser:
//   - the panel opens with N equal to the planted count (seven),
//   - every mark is visible and sits over its suspect element,
//   - Escape closes, focus returns to where it was, and no lantern node remains.
//
// It also runs the bundle on each v1 ROOM's haunted page in the same real
// browser (the rooms whose pattern the lantern covers, taken from the manor
// registry crossed with the lantern's PATTERN_ROOM map — NOT hard-coded room
// numbers) and expects at least one mark of that room's own pattern, and on
// the title page expects none. This catches a detector that passes the jsdom
// room test (which injects sizes and styles) yet misses the real rendered page
// — the Foyer bug that opened this follow-up, where the possessed "Reject all"
// button's real touch-target area sat just above the size threshold, so only
// the look rule (measured here in a real browser) proves the opening room is
// caught. A miss is a hard failure in qa:full, counted like a room failure.
//
// It also serves the same practice page under a STRICT CSP (inline script
// forbidden, Trusted Types required) on a test-only path and REPORTS (does not
// gate) whether the marks and the panel still got their styles and whether any
// console error appeared — the measurement the README's limits are written
// from. Under that CSP a page CANNOT run the bundle through an inline <script>
// (script-src 'self' blocks it), exactly as a strict real page would; the
// bookmarklet instead runs as a privileged `javascript:` navigation, which the
// page's CSP does not govern. The strict run models that by evaluating the
// bundle source directly through the devtools protocol (a privileged binding,
// not page script), so the measurement is of the lantern's RENDERING under the
// CSP, not of the page's inline-script path.
//
// Results flow through the same { checks, fail } shape the room walk uses, so
// the full run (manor-qa-full) counts a lantern failure like a room failure.

import { setTimeout as sleep } from 'node:timers/promises';
import { openSession, distReady, NO_DIST_MESSAGE, STRICT_CSP } from './session.mjs';

const PLANTED = 7; // the practice page plants seven v1 patterns once each
const READY_TIMEOUT_MS = 10000;
const POLL_MS = 100;

/** Wait for the practice page's title, then return true when it is there. */
const PRACTICE_READY = `!!document.querySelector('.practice-title')`;

/** Run the built bundle the way the practice button does (fetch + inline run). */
const RUN_BUNDLE_INLINE = `(async () => {
  const res = await fetch('./lantern.js');
  const src = await res.text();
  const s = document.createElement('script');
  s.textContent = src;
  document.body.appendChild(s);
  s.remove();
  return true;
})()`;

/** Fetch the bundle source (so the strict run can evaluate it privileged). */
const FETCH_SOURCE = `(async () => (await (await fetch('./lantern.js')).text()))()`;

/** The lantern's read-only probe (count, per-mark boxes, panel background). */
const PROBE = `(() => {
  const g = window.__ghostLantern__;
  if (!g || typeof g.probe !== 'function') return null;
  try { return g.probe(); } catch (e) { return { error: String(e) }; }
})()`;

/** Is the lantern host present on the page? */
const HOST_PRESENT = `!!document.querySelector('[data-ghost-lantern]')`;

/** Put the lantern out from the page (second-click toggle), if it is lit. */
const PUT_OUT = `(() => {
  const g = window.__ghostLantern__;
  if (g && typeof g.putOut === 'function') { g.putOut(); return true; }
  return false;
})()`;

/** Remember the focused element before lighting (by a stable marker). */
const MARK_FOCUS = `(() => {
  const a = document.activeElement;
  if (a) a.setAttribute('data-gl-prev-focus', '1');
  return a ? (a.className || a.tagName) : 'none';
})()`;

const FOCUS_RETURNED = `(() => {
  const a = document.activeElement;
  return !!(a && a.getAttribute && a.getAttribute('data-gl-prev-focus') === '1');
})()`;

/** Press Escape via the raw key path (the driver's named keys omit Escape). */
async function pressEscape(cdp) {
  await cdp.rawKey('Escape', 'Escape', 27);
}

/** True when every mark box overlaps its suspect box (same place). Pure. */
export function marksOverElements(marks) {
  if (!Array.isArray(marks) || marks.length === 0) return false;
  return marks.every((m) => {
    const s = m.suspect;
    const k = m.mark;
    if (!s || !k) return false;
    if (k.width <= 0 || k.height <= 0) return false;
    // The mark is placed at the suspect's box; allow a couple of px of slack.
    return Math.abs(k.left - s.left) <= 3 && Math.abs(k.top - s.top) <= 3;
  });
}

/**
 * The v1 rooms the lantern covers, taken from the registry (not hard-coded):
 * every room whose `pattern` is one of the seven v1 patterns in PATTERN_ROOM.
 * SSR-loads the app modules through Vite exactly as scripts/check-rooms.mjs
 * does, so the list follows the data if the manor's rooms change. Returns an
 * array of `{ id, name, pattern }` sorted by id, or an empty array (with the
 * reason) if the modules cannot be loaded.
 *
 * @returns {Promise<{ rooms: Array<{ id: number, name: string, pattern: string }>, error: string | null }>}
 */
export async function coveredV1Rooms() {
  let server;
  try {
    const { createServer } = await import('vite');
    server = await createServer({
      server: { middlewareMode: true },
      appType: 'custom',
      logLevel: 'error',
    });
    const { loadAllRooms } = await server.ssrLoadModule('/src/engine/registry.ts');
    const { PATTERN_ROOM } = await server.ssrLoadModule('/src/lantern/patterns.ts');
    const v1 = new Set(Object.keys(PATTERN_ROOM));
    const all = await loadAllRooms();
    const rooms = all
      .filter((r) => v1.has(r.pattern))
      .map((r) => ({ id: r.id, name: r.name, pattern: r.pattern }))
      .sort((a, b) => a.id - b.id);
    return { rooms, error: null };
  } catch (err) {
    return { rooms: [], error: err && err.message ? err.message : String(err) };
  } finally {
    if (server) {
      try {
        await server.close();
      } catch {
        /* ignore */
      }
    }
  }
}

/** Navigate to a hash route and wait until the manor frame for it is up. */
async function gotoRoom(cdp, baseUrl, id) {
  await cdp.send('Page.navigate', { url: `${baseUrl}#/room/${id}` });
  const hashReady = `(location.hash === '#/room/${id}' && !!document.querySelector('.manor-frame'))`;
  const t0 = Date.now();
  while (Date.now() - t0 < READY_TIMEOUT_MS) {
    if (await cdp.ev(hashReady)) return true;
    await sleep(POLL_MS);
  }
  return false;
}

/** Light the bundle and wait for its probe to report a count. */
async function lightAndProbe(cdp) {
  await cdp.ev(RUN_BUNDLE_INLINE);
  let probe = null;
  const t0 = Date.now();
  while (Date.now() - t0 < READY_TIMEOUT_MS) {
    probe = await cdp.ev(PROBE);
    if (probe && typeof probe.count === 'number') break;
    await sleep(POLL_MS);
  }
  return probe;
}

/**
 * The real-browser room step at one size: run the built bundle on each v1
 * room's haunted page and expect at least one mark of that room's pattern, and
 * on the title page expect no mark. Returns a { title, checks, fail }.
 */
async function runRoomStepAt(cdp, baseUrl, width, height, rooms, roomsError) {
  const r = { title: `lantern rooms @ ${width}x${height}`, checks: {}, fail: [] };

  if (roomsError) {
    r.fail.push(`could not load the registry for the room step: ${roomsError}`);
    return r;
  }
  if (!rooms.length) {
    r.fail.push('no v1-covered rooms found in the registry');
    return r;
  }

  for (const room of rooms) {
    const key = `room ${room.id} (${room.pattern})`;
    const ready = await gotoRoom(cdp, baseUrl, room.id);
    if (!ready) {
      r.checks[key] = 'not ready';
      r.fail.push(`${key}: room page never became ready`);
      continue;
    }
    // Let a possessed countdown (Fake urgency) tick so the urgency detector,
    // which watches ~1.1 s, sees the text change.
    await sleep(1300);
    const probe = await lightAndProbe(cdp);
    if (!probe || typeof probe.count !== 'number') {
      r.checks[key] = 'lantern did not light';
      r.fail.push(`${key}: lantern did not light on the room page`);
    } else {
      const patterns = (probe.marks || []).map((m) => m.pattern);
      const hit = patterns.includes(room.pattern);
      r.checks[key] = hit
        ? `marked (${patterns.join(', ') || 'none'})`
        : `MISS (${patterns.join(', ') || 'none'})`;
      if (!hit) {
        r.fail.push(`${key}: no mark of its pattern (saw: ${patterns.join(', ') || 'none'})`);
      }
    }
    // Put the lantern out before the next navigation so nothing lingers.
    await cdp.ev(PUT_OUT);
    await sleep(150);
  }

  // The title page: run the bundle and expect NO mark.
  await cdp.send('Page.navigate', { url: `${baseUrl}#/` });
  let titleReady = false;
  const t0 = Date.now();
  while (Date.now() - t0 < READY_TIMEOUT_MS) {
    titleReady = await cdp.ev(
      `location.hash === '' || location.hash === '#/' || location.hash === '#'`,
    );
    if (titleReady) break;
    await sleep(POLL_MS);
  }
  await sleep(300);
  const titleProbe = await lightAndProbe(cdp);
  if (!titleProbe || typeof titleProbe.count !== 'number') {
    r.checks['title page'] = 'lantern did not light';
    r.fail.push('title page: lantern did not light');
  } else {
    r.checks['title page'] = `count ${titleProbe.count}`;
    if (titleProbe.count !== 0) {
      const patterns = (titleProbe.marks || []).map((m) => m.pattern);
      r.fail.push(`title page: expected no mark, saw ${titleProbe.count} (${patterns.join(', ')})`);
    }
  }
  await cdp.ev(PUT_OUT);

  return r;
}

/** Drive the practice page once at one size. Returns a { title, checks, fail }. */
async function runLanternAt(cdp, baseUrl, width, height, strict) {
  const label = strict ? `lantern strict @ ${width}x${height}` : `lantern @ ${width}x${height}`;
  const r = { title: label, checks: {}, fail: [] };
  const check = (name, val, want = true) => {
    r.checks[name] = val;
    const ok = val === want || (want === true && !!val);
    if (!ok && !strict) r.fail.push(`${name}: ${val}`);
  };

  await cdp.send('Page.navigate', { url: `${baseUrl}#/lantern-practice` });
  let ready = false;
  const t0 = Date.now();
  while (Date.now() - t0 < READY_TIMEOUT_MS) {
    ready = await cdp.ev(PRACTICE_READY);
    if (ready) break;
    await sleep(POLL_MS);
  }
  check('practice page ready', ready, true);
  if (!ready) return r;

  // Give the planted countdown a second to tick so urgency is seen to change.
  await sleep(1200);

  // Remember focus, then light the lantern.
  r.checks['focus before'] = await cdp.ev(MARK_FOCUS);
  if (strict) {
    // Under a strict CSP the page's inline-script path is blocked (as on a real
    // strict page). The bookmarklet runs as a privileged javascript: nav; model
    // that by evaluating the bundle source through the devtools binding.
    const src = await cdp.ev(FETCH_SOURCE);
    if (typeof src === 'string' && src.length) await cdp.ev(src);
  } else {
    await cdp.ev(RUN_BUNDLE_INLINE);
  }

  // Wait for the lantern to draw (it watches the countdown ~1.1 s first).
  let probe = null;
  const t1 = Date.now();
  while (Date.now() - t1 < READY_TIMEOUT_MS) {
    probe = await cdp.ev(PROBE);
    if (probe && typeof probe.count === 'number') break;
    await sleep(POLL_MS);
  }

  if (!probe || typeof probe.count !== 'number') {
    if (!strict) r.fail.push('lantern did not light (no probe)');
    r.checks['probe'] = probe ? JSON.stringify(probe).slice(0, 120) : 'null';
    return r;
  }

  r.checks['panel count'] = probe.count;
  r.checks['panel background'] = probe.panelBackground;
  r.checks['mark outline'] = probe.marks[0] ? probe.marks[0].outline : '(no marks)';

  if (strict) {
    // Report only: did the marks and the panel get their styles under CSP?
    r.checks['styles under strict CSP'] =
      !!probe.panelBackground &&
      probe.panelBackground !== 'rgba(0, 0, 0, 0)' &&
      probe.panelBackground !== 'transparent' &&
      (probe.marks.length === 0 || probe.marks[0].outline === 'dashed');
    // Put it out again so nothing lingers.
    await pressEscape(cdp);
    return r;
  }

  check('panel opens with the planted count', probe.count === PLANTED, true);
  if (probe.count !== PLANTED) {
    r.fail.push(`panel count ${probe.count} != planted ${PLANTED}`);
  }
  check('every mark sits over its element', marksOverElements(probe.marks), true);

  // Escape closes; focus returns; no lantern node remains.
  await pressEscape(cdp);
  await sleep(300);
  check('host removed after Escape', (await cdp.ev(HOST_PRESENT)) === false, true);
  check('focus returned after Escape', await cdp.ev(FOCUS_RETURNED), true);

  return r;
}

/**
 * The lantern walk entry: run the normal practice step, the real-browser room
 * step, and the strict-CSP measurement at the given size. The strict run uses
 * its own session (a strict CSP header set before navigation) so it does not
 * disturb the normal one.
 * @returns {Promise<{ reports: object[], errors: string[], strictErrors: string[] }>}
 */
export async function runLanternWalk({ width = 1280, height = 720 } = {}) {
  if (!distReady())
    return {
      reports: [{ title: 'lantern', checks: {}, fail: [NO_DIST_MESSAGE] }],
      errors: [],
      strictErrors: [],
    };

  // The v1-covered rooms come from the registry, resolved once up front.
  const { rooms, error: roomsError } = await coveredV1Rooms();

  const reports = [];
  let errors = [];
  let strictErrors = [];

  // Normal practice run + the real-browser room step.
  {
    const session = await openSession({ width, height });
    try {
      reports.push(await runLanternAt(session.cdp, session.baseUrl, width, height, false));
      reports.push(
        await runRoomStepAt(session.cdp, session.baseUrl, width, height, rooms, roomsError),
      );
      errors = session.errors.slice();
    } finally {
      await session.teardown();
    }
  }

  // Strict-CSP measurement (report only).
  {
    const session = await openSession({ width, height, strictCsp: true });
    try {
      const strict = await runLanternAt(session.cdp, session.baseUrl, width, height, true);
      strict.checks['strict CSP'] = STRICT_CSP;
      strict.checks['console errors'] = session.errors.length;
      strict.checks['console error sample'] = session.errors.slice(0, 2);
      reports.push(strict);
      strictErrors = session.errors.slice();
    } finally {
      await session.teardown();
    }
  }

  return { reports, errors, strictErrors };
}
