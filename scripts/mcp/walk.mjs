// The walk_rooms tool: walk each requested room by keyboard in headless Chrome
// against the real engine selectors, then open the ending and count its twelve
// checklist lines. Returns JSON text: per room the checks and any failures,
// plus any console errors. Writes nothing to disk.
//
// Motion QA: with reducedMotion true the session emulates
// prefers-reduced-motion: reduce before each page loads; the walk then also
// checks that the "Something stirs here" static label is visible and that no
// animation is running. Every room also reports its cumulative layout shift
// and fails if it exceeds 0.01.
//
// Named-hold QA: once the right card lands the engine names the room and holds
// the haunted page (data-moment='right', then data-fleeing) for about 600 ms
// so the shared unwind and flee of `.ghost-wrap` is seen before the honest
// twin appears. During that hold nothing else in the haunted page may keep
// moving. The walk samples the running animations inside the frame during the
// hold (with motion on) and fails a room if any animation runs on a target
// that is neither `.ghost-wrap` nor inside it — a leftover act, mist or
// flicker — naming each offender's classes and the animation name.
//
// Label QA: the static labels ("Something stirs here" and any act caption,
// class act-caption) must sit fully inside the room's page — inside every
// clipping ancestor (overflow hidden/clip or a clip-path) and inside the
// viewport. The walk gathers each visible label's box, its clip ancestors'
// boxes and viewport containment, and applies the pure labelWithinClip rule.
// It runs in both motion modes but has teeth under reduced motion, where these
// labels are the ghost's static sign; a cut label fails the room.
//
// Divider QA: at each slider point (0, 25, 50, 75, 100) the walk measures the
// visible divider edge (the track's left edge after its transform, where the
// ::before edge sits) and the round grip's centre against the comparison box,
// and fails the room when either is more than 2px from
// box.left + split/100 × box.width. This is the check that catches a divider
// that no longer tracks the split (the translateX(percent) bug).

import { setTimeout as sleep } from 'node:timers/promises';
import { parseRooms, roomReadiness } from './rooms.mjs';
import { openSession, distReady, NO_DIST_MESSAGE } from './session.mjs';
import {
  wantsReducedMotion,
  clsWithinLimit,
  animationsAtRest,
  labelWithinClip,
  heldMotionOffenders,
} from './motion.mjs';
import { dividerAtSplit, dividerOffset, DIVIDER_TOLERANCE } from './divider.mjs';

/** How long a room may take to appear after the navigation, how often the walk
 *  looks, and how long it lets a ready room settle before play (the old fixed
 *  pause was 1800 ms in all, with the room usually ready in a few hundred). */
const ROOM_READY_TIMEOUT_MS = 15000;
const ROOM_POLL_MS = 100;
const ROOM_SETTLE_MS = 1500;

/** The task-bar title, or null when no room is rendered. */
const ROOM_TITLE = "(document.querySelector('.task-bar-title') || {}).textContent || null";

/** A snapshot of the page for roomReadiness. */
const ROOM_STATE = `(() => {
  const t = document.querySelector('.task-bar-title');
  return {
    hash: location.hash,
    loading: !!document.querySelector('.room-loading'),
    error: !!document.querySelector('.room-load-error'),
    title: t ? t.textContent : null,
    lantern: !!document.querySelector('.task-bar-lantern'),
  };
})()`;

/** The slider points the divider is measured at. */
const SPLIT_POINTS = [0, 25, 50, 75, 100];

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

// Set the reveal slider to an exact value by writing the range input and firing
// its `input` event, so the engine's onInput runs and `--split` updates — the
// same path a drag or arrow key takes. Returns the value actually applied.
const SET_SLIDER = (value) => `(() => {
  const i = document.querySelector('.comparison input[type=range], .split-range');
  if (!i) return null;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(i, String(${value}));
  i.dispatchEvent(new Event('input', { bubbles: true }));
  return Number(i.value);
})()`;

// Measure the comparison box, the visible divider edge and the grip centre, in
// viewport pixels. The edge is drawn as the track's ::before at left:-1px on a
// full-width track moved by transform: translateX(--split); the track's own
// rect.left after the transform is therefore the edge's position, and the
// ::before (left:-1px, width:2px) is centred on it. The grip sits at the
// track's left edge, centred by its own translate(-50%,-50%). We report both
// the track-left edge x and the grip's measured centre x.
const MEASURE_DIVIDER = `(() => {
  const g = document.querySelector('.comparison');
  if (!g) return null;
  const track = g.querySelector('.comparison-divider');
  const grip = g.querySelector('.comparison-grip');
  if (!track || !grip) return null;
  const gr = g.getBoundingClientRect();
  const tr = track.getBoundingClientRect();
  const kr = grip.getBoundingClientRect();
  return {
    boxLeft: gr.left,
    boxWidth: gr.width,
    edgeX: tr.left,
    gripX: kr.left + kr.width / 2,
  };
})()`;

/**
 * Read the static-label clip data and decide whether every visible label sits
 * inside its clipping ancestors and within the viewport's width. Records the
 * result on the room report and fails the room on any cut label, naming it and
 * the size. The horizontal edge is what the frame cuts (the game never scrolls
 * sideways); a label merely below the fold is reachable by scrolling and is not
 * a cut, so vertical position is not required to be within the first screen.
 */
async function checkLabelsNotClipped(cdp, r, check, width, height) {
  const data = await cdp.ev('__labelClipData()');
  const labels = Array.isArray(data) ? data : [];
  r.checks['static labels'] = labels.length;
  const cut = [];
  for (const d of labels) {
    const insideClips = labelWithinClip(d.label, d.clips);
    if (!insideClips || !d.withinWidth) {
      const why = !insideClips ? 'clipped by ancestor' : 'past the viewport width';
      cut.push(`${d.sel} ("${d.text}") ${why} at ${width}x${height}`);
    }
  }
  check('static labels not clipped', cut.length === 0, true);
  if (cut.length) r.fail.push(...cut.map((c) => `label cut: ${c}`));
}

/**
 * During the named hold — right after the right card lands and before the
 * honest twin appears — sample the running animations inside the haunted
 * page's frame and apply the named-hold rule: only the shared flee of
 * `.ghost-wrap` (the wrap itself or something inside it) may keep moving.
 * Records the count and fails the room, naming each offender's classes and the
 * animation name, when anything else is still animating.
 *
 * Only meaningful with motion on (under reduced motion the engine runs no
 * unwind or flee and the room's own animations are off), so the caller passes
 * `reducedMotion` and this is a no-op record under reduced motion.
 */
async function checkNamedHold(cdp, r, check, reducedMotion) {
  if (reducedMotion) return;
  const running = await cdp.ev('__heldMotion()');
  const list = Array.isArray(running) ? running : [];
  r.checks['held-hold animations'] = list.length;
  const offenders = heldMotionOffenders(list);
  check('named hold: only the shared flee moves', offenders.length === 0, true);
  if (offenders.length) {
    r.heldMotion = offenders;
    r.fail.push(
      ...offenders.map((o) => `named hold still moving: .${o.classes} (${o.name || 'animation'})`),
    );
  }
}

/**
 * Drive one room from haunted to the honest comparison, by keyboard. Returns a
 * partial report with the picks and the checks gathered up to the comparison.
 * Shared with contrast_scan, which only needs the room freed.
 *
 * When `reducedMotion` is true, the walk checks the static "Something stirs
 * here" label while the possessed element still shows its signs (before the
 * ghost is named), since that label is the reduced-motion ghost sign. The
 * label-clip check also runs here, while the labels are on the page.
 */
export async function freeRoom(cdp, baseUrl, n, reducedMotion = false, width = 1280, height = 720) {
  const r = { room: n, checks: {}, picks: [], fail: [] };
  const check = (name, val, want = 'ok') => {
    r.checks[name] = val;
    const ok = val === want || (want === true && !!val);
    if (!ok) r.fail.push(`${name}: ${val}`);
  };

  // Wait for the room itself rather than a fixed pause: its chunk arrives by
  // dynamic import(), and on a busy machine a fixed 1800 ms was sometimes too
  // short (the room-12-at-412 finding, 7 Nov). Poll until this room is on the
  // page (roomReadiness), record how long it took, then let it settle.
  const prevTitle = (await cdp.ev(ROOM_TITLE)) || '';
  const navStart = Date.now();
  await cdp.send('Page.navigate', { url: `${baseUrl}#/room/${n}` });
  let readiness = 'waiting';
  let state = null;
  while (Date.now() - navStart < ROOM_READY_TIMEOUT_MS) {
    state = await cdp.ev(ROOM_STATE);
    readiness = roomReadiness(state, n, prevTitle);
    if (readiness !== 'waiting') break;
    await sleep(ROOM_POLL_MS);
  }
  r.readyMs = Date.now() - navStart;
  r.checks['ready ms'] = r.readyMs;
  if (readiness !== 'ready') {
    r.fail.push(`room not on the page after ${r.readyMs} ms (${readiness}): ${JSON.stringify(state)}`);
  }
  await sleep(ROOM_SETTLE_MS);
  // Reset CLS after the navigation settles, so the reported shift is movement
  // during play, not the initial room paint.
  await cdp.ev('window.__clsReset && window.__clsReset()');

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

  // Reduced motion: the possessed element shows the static "Something stirs
  // here" label in place of the flicker/mist. Check it while still haunted.
  if (reducedMotion) {
    check('stirs label visible', await cdp.ev('__stirsVisible()'));
  }

  // Static labels (the stirs label and any act caption) must not be cut by a
  // clipping ancestor or the viewport. Checked here, while the labels are on
  // the page (they render while the possessed element shows signs). Runs in
  // both modes; under reduced motion the labels exist, so this has teeth.
  await checkLabelsNotClipped(cdp, r, check, width, height);

  await cdp.key('Enter');
  await sleep(500);

  const cards = await cdp.ev("[...document.querySelectorAll('.spell-card')].map((c) => c.textContent.trim())");
  check('three cards', (cards || []).length === 3, true);
  check('cards visible', await cdp.ev("[...document.querySelectorAll('.spell-card')].map((c)=>__vis(c)).every((v)=>v==='ok')"), true);

  // Try each card; wrong cards whisper, the right one frees the room.
  let heldSampled = false;
  for (let c = 0; c < 3; c++) {
    const stillPicking = await cdp.ev("/Name the trick/i.test(__heads())");
    if (!stillPicking) break;
    await cdp.ev(`document.querySelectorAll('.spell-card')[${c}] && document.querySelectorAll('.spell-card')[${c}].focus()`);
    await cdp.key('Enter');
    // A wrong pick whispers and leaves the cards; the right pick names the room
    // and the engine holds the haunted page (about 600 ms) for the shared
    // unwind and flee. Sample the frame's running animations DURING that hold,
    // before the honest twin appears, so the named-hold check sees whatever is
    // still moving. Give the `named` state a moment to render, then sample well
    // within the ~600 ms hold.
    await sleep(140);
    const still = await cdp.ev("!!document.querySelector('.spell-card')");
    if (still) {
      const w = await cdp.ev("__vis('.spell-card-whisper')");
      const hint = await cdp.ev("(document.querySelector('.spell-card-whisper')||{}).textContent||''");
      r.picks.push({ card: cards ? cards[c] : c, right: false, whisper: w, hint: (hint || '').slice(0, 60) });
      if (w !== 'ok') r.fail.push(`whisper after card ${c}: ${w}`);
      // Let the whisper settle before the next pick.
      await sleep(560);
    } else {
      r.picks.push({ card: cards ? cards[c] : c, right: true });
      // The right card landed: sample the named hold now (motion on only).
      await checkNamedHold(cdp, r, check, reducedMotion);
      heldSampled = true;
      break;
    }
  }
  if (!heldSampled) r.checks['held-hold animations'] = r.checks['held-hold animations'] ?? 'not sampled';

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

/**
 * Set the slider to `split`, measure the divider edge and grip against the box,
 * and record the offsets. Fails the room when the edge or the grip is more than
 * the tolerance from where the split should put them. Returns the measurement.
 */
async function checkDividerAt(cdp, split, r, check) {
  const applied = await cdp.ev(SET_SLIDER(split));
  await sleep(120);
  const m = await cdp.ev(MEASURE_DIVIDER);
  if (!m || typeof m.boxWidth !== 'number') {
    check(`divider measurable at ${split}`, m ? 'bad shape' : 'missing');
    return null;
  }
  const edgeOff = Number(dividerOffset(m.boxLeft, m.boxWidth, split, m.edgeX).toFixed(2));
  const gripOff = Number(dividerOffset(m.boxLeft, m.boxWidth, split, m.gripX).toFixed(2));
  const edgeOk = dividerAtSplit(m.boxLeft, m.boxWidth, split, m.edgeX, DIVIDER_TOLERANCE);
  const gripOk = dividerAtSplit(m.boxLeft, m.boxWidth, split, m.gripX, DIVIDER_TOLERANCE);
  if (!edgeOk) r.fail.push(`divider edge at ${split}: ${edgeOff}px off (> ${DIVIDER_TOLERANCE})`);
  if (!gripOk) r.fail.push(`divider grip at ${split}: ${gripOff}px off (> ${DIVIDER_TOLERANCE})`);
  const entry = { split, applied, edgeOff, gripOff, boxWidth: Number(m.boxWidth.toFixed(1)) };
  (r.dividerOffsets || (r.dividerOffsets = [])).push(entry);
  return entry;
}

/** Walk one room fully, including the slider, layers, task and guide checks. */
async function walkRoom(cdp, baseUrl, n, reducedMotion = false, width = 1280, height = 720) {
  const { r, check } = await freeRoom(cdp, baseUrl, n, reducedMotion, width, height);

  // Drive the slider to both ends. The signature of which layer is on top must
  // differ between 0 and 100 — proof the slider really changes what is shown.
  const sig0 = await sigAt(cdp, 0);
  check('all haunted at 0', await cdp.ev(LAYER('haunted')));
  const sig100 = await sigAt(cdp, 100);
  check('all honest at 100', await cdp.ev(LAYER('honest')));
  check('slider changes the comparison', sig0 !== sig100 && sig0 !== 'no comparison', true);
  r.checks['top layers 0/100'] = `${sig0} / ${sig100}`;

  // The divider must track the split: measure the visible edge and the grip
  // against the box at 0, 25, 50, 75 and 100. Done before the honest-control
  // task below, since completing the task leaves the comparison.
  for (const split of SPLIT_POINTS) {
    await checkDividerAt(cdp, split, r, check);
  }
  // Nothing should scroll sideways at the full-width (narrow) layout once the
  // divider is driven all the way to 100.
  await cdp.ev(SET_SLIDER(100));
  await sleep(120);
  check(
    'no sideways scroll at 100',
    await cdp.ev('document.documentElement.scrollWidth <= document.documentElement.clientWidth'),
    true,
  );

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

  // Reduced motion: once everything has settled, nothing should still be
  // animating anywhere on the page.
  if (reducedMotion) {
    await sleep(400);
    const states = await cdp.ev('__animStates()');
    check('animations at rest', animationsAtRest(states), true);
    r.checks['animation states'] = Array.isArray(states) ? states.join(',') || '(none)' : String(states);
  }

  // Cumulative layout shift for this room's walk.
  const cls = await cdp.ev('window.__cls');
  const clsNum = typeof cls === 'number' ? cls : Number(cls) || 0;
  r.checks['cls'] = Number(clsNum.toFixed(4));
  check('layout shift within 0.01', clsWithinLimit(clsNum), true);

  return r;
}

/**
 * The walk_rooms tool entry point.
 * @param {{ rooms?: string, width?: number, height?: number, reducedMotion?: boolean }} args
 * @returns {Promise<string>} JSON text
 */
export async function runWalk(args = {}) {
  const rooms = parseRooms(args.rooms ?? '1-12');
  const width = Number(args.width ?? 1280);
  const height = Number(args.height ?? 720);
  const reducedMotion = wantsReducedMotion(args);

  if (!distReady()) return NO_DIST_MESSAGE;

  const session = await openSession({ width, height, reducedMotion });
  const report = [];
  try {
    for (const n of rooms) {
      report.push(await walkRoom(session.cdp, session.baseUrl, n, reducedMotion, width, height));
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
      { base: session.baseUrl, width, height, reducedMotion, rooms, report, errors: session.errors },
      null,
      2,
    );
  } finally {
    await session.teardown();
  }
}
