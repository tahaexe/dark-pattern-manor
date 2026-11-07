// The walk_rooms tool: walk each requested room by keyboard in headless Chrome
// against the real engine selectors, then open the ending and count its twelve
// checklist lines. Returns JSON text: per room the checks and any failures,
// plus any console errors. Writes nothing to disk.

import { setTimeout as sleep } from 'node:timers/promises';
import { parseRooms } from './rooms.mjs';
import { openSession, distReady, NO_DIST_MESSAGE } from './session.mjs';

/** A sample-point layer check: at the given slider end every point inside the
 *  comparison must belong to the wanted layer (ignoring the decorative bits). */
const LAYER = (want) => `(() => {
  const g = document.querySelector('.comparison');
  if (!g) return 'no comparison';
  g.scrollIntoView({ block: 'center' });
  const r = g.getBoundingClientRect();
  const bad = [];
  for (const fx of [0.15, 0.35, 0.65, 0.85]) for (const fy of [0.2, 0.4, 0.6, 0.8]) {
    const x = r.left + r.width * fx;
    const y = Math.max(0, Math.min(innerHeight - 1, r.top + r.height * fy));
    const t = document.elementFromPoint(x, y);
    if (!t || !g.contains(t)) continue;
    if (t.closest('.comparison-divider, .comparison-grip, .comparison-tag')) continue;
    if (!t.closest('.comparison-${want}')) bad.push(Math.round(fx*100)+','+Math.round(fy*100)+':'+(t.className||t.tagName));
  }
  return bad.length ? bad.slice(0, 3).join(' ') : 'ok';
})()`;

// A signature of which layer is top-most across a grid of the comparison's
// sample points, so moving the slider is proven to change what is on top.
const TOP_SIG = `(() => {
  const g = document.querySelector('.comparison');
  if (!g) return 'no comparison';
  const r = g.getBoundingClientRect();
  const out = [];
  for (const fy of [0.3, 0.5, 0.7]) for (const fx of [0.15, 0.35, 0.5, 0.65, 0.85]) {
    const x = r.left + r.width * fx;
    const y = Math.max(0, Math.min(innerHeight - 1, r.top + r.height * fy));
    const t = document.elementFromPoint(x, y);
    out.push(t && g.contains(t) ? (t.closest('.comparison-honest') ? 'H' : t.closest('.comparison-haunted') ? 'h' : '.') : '-');
  }
  return out.join('');
})()`;

/** Focus the slider so Home/End drive it. */
const FOCUS_SLIDER =
  "(() => { const i = document.querySelector('.comparison input[type=range], .split-range'); if (i) i.focus(); return !!i; })()";

/**
 * Drive one room from haunted to the honest comparison, by keyboard. Returns a
 * partial report with the picks and the checks gathered up to the comparison.
 * Shared with contrast_scan, which only needs the room freed.
 */
export async function freeRoom(cdp, baseUrl, n) {
  const r = { room: n, checks: {}, picks: [], fail: [] };
  const check = (name, val, want = 'ok') => {
    r.checks[name] = val;
    const ok = val === want || (want === true && !!val);
    if (!ok) r.fail.push(`${name}: ${val}`);
  };

  await cdp.send('Page.navigate', { url: `${baseUrl}#/room/${n}` });
  await sleep(1800);

  r.name = await cdp.ev("(document.querySelector('.task-bar-title') || document.querySelector('h1') || {}).textContent");

  check('instruction visible', await cdp.ev("__vis('.live-announcement')"));
  check('lantern present', await cdp.ev("!!document.querySelector('.task-bar-lantern')"), true);

  // Raise the lantern with the L key, then Tab to the possessed element.
  await cdp.ev("(document.querySelector('.task-bar-title') || document.querySelector('h1'))?.focus()");
  await cdp.key('l');
  await sleep(400);
  check('inspecting', /inspect/i.test(await cdp.ev('__ann()')), true);

  let found = false;
  for (let i = 0; i < 20 && !found; i++) {
    await cdp.key('Tab');
    await sleep(60);
    found = await cdp.ev("document.activeElement.classList.contains('possessed')");
  }
  check('possessed reachable by Tab', found, true);

  await cdp.key('Enter');
  await sleep(500);

  const cards = await cdp.ev("[...document.querySelectorAll('.spell-card')].map((c) => c.textContent.trim())");
  check('three cards', (cards || []).length === 3, true);
  check('cards visible', await cdp.ev("[...document.querySelectorAll('.spell-card')].map((c)=>__vis(c)).every((v)=>v==='ok')"), true);

  // Try each card; wrong cards whisper, the right one frees the room.
  for (let c = 0; c < 3; c++) {
    const stillPicking = await cdp.ev("/Name the trick/i.test(__heads())");
    if (!stillPicking) break;
    await cdp.ev(`document.querySelectorAll('.spell-card')[${c}] && document.querySelectorAll('.spell-card')[${c}].focus()`);
    await cdp.key('Enter');
    await sleep(700);
    const still = await cdp.ev("!!document.querySelector('.spell-card')");
    if (still) {
      const w = await cdp.ev("__vis('.spell-card-whisper')");
      const hint = await cdp.ev("(document.querySelector('.spell-card-whisper')||{}).textContent||''");
      r.picks.push({ card: cards ? cards[c] : c, right: false, whisper: w, hint: (hint || '').slice(0, 60) });
      if (w !== 'ok') r.fail.push(`whisper after card ${c}: ${w}`);
    } else {
      r.picks.push({ card: cards ? cards[c] : c, right: true });
      break;
    }
  }

  // The ghost flees; wait for the comparison and the opening sweep to settle.
  await sleep(2400);
  check('comparison visible', await cdp.ev("__vis('.comparison')"));
  check('slider visible', await cdp.ev("__vis('.comparison input[type=range], .split-range')"));

  return { r, check };
}

/** Drive the slider to 0 (Home) or 100 (End) and return the layer signature. */
async function sigAt(cdp, end) {
  await cdp.ev(FOCUS_SLIDER);
  await cdp.key(end === 0 ? 'Home' : 'End');
  await sleep(300);
  return cdp.ev(TOP_SIG);
}

/** Walk one room fully, including the slider, layers, task and guide checks. */
async function walkRoom(cdp, baseUrl, n) {
  const { r, check } = await freeRoom(cdp, baseUrl, n);

  // Drive the slider to both ends. The signature of which layer is on top must
  // differ between 0 and 100 — proof the slider really changes what is shown.
  const sig0 = await sigAt(cdp, 0);
  check('all haunted at 0', await cdp.ev(LAYER('haunted')));
  const sig100 = await sigAt(cdp, 100);
  check('all honest at 100', await cdp.ev(LAYER('honest')));
  check('slider changes the comparison', sig0 !== sig100 && sig0 !== 'no comparison', true);
  r.checks['top layers 0/100'] = `${sig0} / ${sig100}`;

  check('guide visible', await cdp.ev("__vis('.guide-card')"));

  // The one-click task: focus each honest-layer control (visible?), press
  // Enter, and stop when the room reports free.
  const honestBtns = await cdp.ev(
    "[...document.querySelectorAll('.comparison-honest button, .comparison-honest a[href]')].length",
  );
  r.checks['honest controls'] = honestBtns;
  let done = false;
  for (let b = 0; b < (honestBtns || 0) && !done; b++) {
    await cdp.ev(
      `(() => { const list = [...document.querySelectorAll('.comparison-honest button, .comparison-honest a[href]')]; list[${b}] && list[${b}].focus(); })()`,
    );
    const fv = await cdp.ev('__vis(document.activeElement)');
    if (fv !== 'ok') r.fail.push(`focused honest control ${b} not visible: ${fv}`);
    await cdp.key('Enter');
    await sleep(700);
    done = /free/i.test((await cdp.ev('__heads()')) + ' ' + (await cdp.ev('__ann()')));
  }
  check('task completes', done, true);
  check('continue link visible', await cdp.ev("__vis('.room-continue')"));
  r.next = await cdp.ev("(document.querySelector('.room-continue')||{}).getAttribute ? document.querySelector('.room-continue').getAttribute('href') : null");

  return r;
}

/**
 * The walk_rooms tool entry point.
 * @param {{ rooms?: string, width?: number, height?: number }} args
 * @returns {Promise<string>} JSON text
 */
export async function runWalk(args = {}) {
  const rooms = parseRooms(args.rooms ?? '1-12');
  const width = Number(args.width ?? 1280);
  const height = Number(args.height ?? 720);

  if (!distReady()) return NO_DIST_MESSAGE;

  const session = await openSession({ width, height });
  const report = [];
  try {
    for (const n of rooms) {
      report.push(await walkRoom(session.cdp, session.baseUrl, n));
    }

    // The ending after the rooms: count the checklist lines. The ending is
    // gated until all twelve rooms are complete in this browser session, so a
    // full 1-12 walk reaches the twelve-line checklist; a partial walk reports
    // the gated count it sees.
    await session.cdp.send('Page.navigate', { url: `${session.baseUrl}#/end` });
    await sleep(1800);
    const endHead = await session.cdp.ev("(document.querySelector('h1')||{}).textContent");
    const endItems = await session.cdp.ev("document.querySelectorAll('ol.ending-checklist li, ol li').length");
    report.push({ ending: endHead, checklistItems: endItems, twelve: endItems === 12 });

    return JSON.stringify(
      { base: session.baseUrl, width, height, rooms, report, errors: session.errors },
      null,
      2,
    );
  } finally {
    await session.teardown();
  }
}
