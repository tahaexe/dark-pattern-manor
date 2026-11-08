// The walk_rooms tool: walk each requested room in headless Chrome against the
// real engine selectors, then open the ending and count its twelve checklist
// lines. Returns JSON text: per room the checks and any failures, plus any
// console errors. Writes nothing to disk.
//
// Two input paths, so both are proven: EVEN rooms are walked by keyboard (light
// the lantern with L, Tab to the ringed possessed element, Enter), and ODD
// rooms by pointer (click the possessed element straight away, no lantern) —
// the first tap must work without the lantern. The SAME even/odd split drives
// the honest task at the end of the walk: even rooms finish it by keyboard
// (focus, Enter), odd rooms finish it with a REAL pointer — a CDP mouse click
// at 1280x720 and a CDP touch (touchStart, touchEnd) at 412x915 — so the
// pointer path all the way to `done` is exercised and a comparison that
// captures a control's click (the pointer dead-end bug) is caught.
//
// First sight: on entry each room is measured against the first-sight rule
// (at least half the possessed element's box and at least 44 px of its height
// inside the viewport) AND the frame-top rule (the live haunted frame's top at
// most 150 px at 1280x720, at most 210 px at 412x915). A room that misses
// either fails.
//
// Target size: the engine's own controls (the bar buttons, the lantern, the
// spell cards, the slider, the continue link, the dialog controls) must be at
// least 44 x 44; the possessed element's tap area at least 24 x 24.
//
// Next-room time: after the room is freed, the walk clicks the continue link
// and RECORDS (does not fail on) how long until the next room's instruction is
// visible, so the prefetch's effect is observable. It then returns to the title
// (#/) so the NEXT iteration starts from a non-room state: otherwise the timing
// click would have already moved us to room n+1, and the next iteration's
// readiness read (which waits for a title other than the previous room's) would
// never see a change and would time out on a room that is actually there.
//
// Motion QA, named-hold QA, label QA and divider QA are unchanged (see below).

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
import {
  possessedInFirstSight,
  frameTopWithinLimit,
  frameTopLimit,
  meetsTargetSize,
  TARGET_MIN,
  POSSESSED_MIN,
} from './firstsight.mjs';

const ROOM_READY_TIMEOUT_MS = 15000;
const ROOM_POLL_MS = 100;
const ROOM_SETTLE_MS = 1500;

/** The room name shown in the instruction card, or null when no room renders. */
const ROOM_TITLE = "(document.querySelector('.room-instructions-name') || {}).textContent || null";

/** A snapshot of the page for roomReadiness. */
const ROOM_STATE = `(() => {
  const t = document.querySelector('.room-instructions-name');
  return {
    hash: location.hash,
    loading: !!document.querySelector('.room-loading'),
    error: !!document.querySelector('.room-load-error'),
    title: t ? t.textContent : null,
    lantern: !!document.querySelector('.lantern-button'),
  };
})()`;

/** The slider points the divider is measured at. */
const SPLIT_POINTS = [0, 25, 50, 75, 100];

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

const FOCUS_SLIDER =
  "(() => { const i = document.querySelector('.comparison input[type=range], .split-range'); if (i) i.focus(); return !!i; })()";

const SET_SLIDER = (value) => `(() => {
  const i = document.querySelector('.comparison input[type=range], .split-range');
  if (!i) return null;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(i, String(${value}));
  i.dispatchEvent(new Event('input', { bubbles: true }));
  return Number(i.value);
})()`;

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

/** The possessed element's box inside the live (non-preview) frame. */
const POSSESSED_BOX = `(() => {
  const frame = [...document.querySelectorAll('.manor-frame')].find(
    (f) => !f.classList.contains('manor-frame-preview'),
  );
  if (!frame) return null;
  const target = frame.querySelector('.possessed');
  if (!target) return null;
  const r = target.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
})()`;

/** The top of the live (non-preview) haunted frame, in CSS px from the top. */
const FRAME_TOP = `(() => {
  const frame = [...document.querySelectorAll('.manor-frame')].find(
    (f) => !f.classList.contains('manor-frame-preview'),
  );
  if (!frame) return null;
  return frame.getBoundingClientRect().top;
})()`;

/** Measure a single engine control's box by selector, or null if absent. */
const SIZE_OF = (sel) => `(() => {
  const el = document.querySelector(${JSON.stringify(sel)});
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { width: r.width, height: r.height };
})()`;

/**
 * Scroll the n-th honest control into view and report its centre point plus
 * whether document.elementFromPoint there is that control (or inside it). The
 * walk uses this before a real pointer gesture so a control hidden under the
 * comparison overlay is reported as a failure rather than a silent miss.
 */
const HONEST_CONTROL_HIT = (index) => `(() => {
  const list = [...document.querySelectorAll('.comparison-honest button, .comparison-honest a[href]')];
  const el = list[${index}];
  if (!el) return null;
  el.scrollIntoView({ block: 'center' });
  const r = el.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const top = document.elementFromPoint(x, y);
  const onTop = !!(top && (top === el || el.contains(top) || (top.contains && top.contains(el))));
  return {
    x,
    y,
    onTop,
    cover: onTop ? '' : (top ? (top.className || top.tagName) : 'nothing'),
  };
})()`;

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

/** First-sight: the possessed element must be on screen on entry. */
async function checkFirstSight(cdp, r, check, width, height) {
  const box = await cdp.ev(POSSESSED_BOX);
  if (!box || typeof box.width !== 'number') {
    check('first sight: possessed box measurable', box ? 'bad shape' : 'missing');
    return;
  }
  r.checks['possessed box'] =
    `${Math.round(box.width)}x${Math.round(box.height)} @ ${Math.round(box.left)},${Math.round(box.top)}`;
  const ok = possessedInFirstSight(box, width, height);
  check('first sight: possessed on screen', ok, true);
  if (!ok) {
    r.fail.push(
      `first sight: possessed element not on screen at ${width}x${height} (box ${r.checks['possessed box']})`,
    );
  }
}

/** Frame top: the live haunted frame's top must clear the per-size limit. */
async function checkFrameTop(cdp, r, check, width) {
  const top = await cdp.ev(FRAME_TOP);
  if (typeof top !== 'number') {
    check('frame top measurable', top === null ? 'missing' : 'bad shape');
    return;
  }
  const rounded = Math.round(top);
  r.checks['frame top'] = rounded;
  const limit = frameTopLimit(width);
  const ok = frameTopWithinLimit(top, width);
  check(`frame top <= ${limit}`, ok, true);
  if (!ok) {
    r.fail.push(`frame top ${rounded} > ${limit} at ${width}px wide`);
  }
}

/** Target size: engine controls >= 44x44; possessed tap area >= 24x24. */
async function checkTargetSizes(cdp, r, check) {
  const controls = [
    ['.room-bar-manor', TARGET_MIN],
    ['.room-bar-button', TARGET_MIN],
    ['.lantern-button', TARGET_MIN],
    ['.sound-toggle', TARGET_MIN],
  ];
  const small = [];
  for (const [sel, min] of controls) {
    const s = await cdp.ev(SIZE_OF(sel));
    if (!s) continue; // control not present in this state
    if (!meetsTargetSize(s.width, s.height, min)) {
      small.push(`${sel} ${Math.round(s.width)}x${Math.round(s.height)} < ${min}`);
    }
  }
  const pbox = await cdp.ev(POSSESSED_BOX);
  if (pbox && typeof pbox.width === 'number') {
    if (!meetsTargetSize(pbox.width, pbox.height, POSSESSED_MIN)) {
      small.push(
        `possessed ${Math.round(pbox.width)}x${Math.round(pbox.height)} < ${POSSESSED_MIN}`,
      );
    }
  }
  r.checks['target sizes ok'] = small.length === 0;
  check('engine controls meet target size', small.length === 0, true);
  if (small.length) r.fail.push(...small.map((s) => `target size: ${s}`));
}

/** Target size for the spell cards (picking). */
async function checkCardTargetSizes(cdp, r, check) {
  const cards = await cdp.ev(
    "[...document.querySelectorAll('.spell-card')].map((c)=>{const r=c.getBoundingClientRect();return {w:r.width,h:r.height};})",
  );
  const small = [];
  for (const c of Array.isArray(cards) ? cards : []) {
    if (!meetsTargetSize(c.w, c.h)) small.push(`spell-card ${Math.round(c.w)}x${Math.round(c.h)}`);
  }
  if (small.length) {
    r.fail.push(...small.map((s) => `target size: ${s} < ${TARGET_MIN}`));
  }
  check('spell cards meet target size', small.length === 0, true);
}

/**
 * Drive one room from haunted to the honest comparison. EVEN rooms by keyboard
 * (lantern L, Tab to the ringed possessed element, Enter); ODD rooms by pointer
 * (click the possessed element straight away, no lantern).
 */
export async function freeRoom(cdp, baseUrl, n, reducedMotion = false, width = 1280, height = 720) {
  const r = { room: n, checks: {}, picks: [], fail: [] };
  const check = (name, val, want = 'ok') => {
    r.checks[name] = val;
    const ok = val === want || (want === true && !!val);
    if (!ok) r.fail.push(`${name}: ${val}`);
  };
  const byKeyboard = n % 2 === 0;
  r.checks['input path'] = byKeyboard ? 'keyboard' : 'pointer';

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
    r.fail.push(
      `room not on the page after ${r.readyMs} ms (${readiness}): ${JSON.stringify(state)}`,
    );
  }
  await sleep(ROOM_SETTLE_MS);
  await cdp.ev('window.__clsReset && window.__clsReset()');

  r.name = await cdp.ev(
    "(document.querySelector('.room-instructions-name') || document.querySelector('h1') || {}).textContent",
  );

  // The instruction card's step line carries the current step on screen (the
  // polite live region is visually hidden), so "instruction visible" reads it.
  check('instruction visible', await cdp.ev("__vis('.room-step')"));
  check(
    'step 1 line',
    /Step 1 of 3 · Find the trick/.test(
      await cdp.ev("(document.querySelector('.room-step')||{}).textContent||''"),
    ),
    true,
  );
  check('lantern present', await cdp.ev("!!document.querySelector('.lantern-button')"), true);

  await checkFirstSight(cdp, r, check, width, height);
  await checkFrameTop(cdp, r, check, width);
  await checkTargetSizes(cdp, r, check);

  if (byKeyboard) {
    await cdp.ev("(document.querySelector('.room-step') || document.querySelector('h1'))?.focus()");
    await cdp.key('l');
    await sleep(400);
    check('inspecting', /lantern lights the trick/i.test(await cdp.ev('__ann()')), true);

    let found = false;
    for (let i = 0; i < 20 && !found; i++) {
      await cdp.key('Tab');
      await sleep(60);
      found = await cdp.ev("document.activeElement.classList.contains('possessed')");
    }
    check('possessed reachable by Tab', found, true);

    if (reducedMotion) {
      check('stirs label visible', await cdp.ev('__stirsVisible()'));
    }
    await checkLabelsNotClipped(cdp, r, check, width, height);

    await cdp.key('Enter');
    await sleep(500);
  } else {
    if (reducedMotion) {
      check('stirs label visible', await cdp.ev('__stirsVisible()'));
    }
    await checkLabelsNotClipped(cdp, r, check, width, height);

    const clicked = await cdp.ev(`(() => {
      const frame = [...document.querySelectorAll('.manor-frame')].find((f) => !f.classList.contains('manor-frame-preview'));
      const el = frame && frame.querySelector('.possessed');
      if (!el) return false;
      el.scrollIntoView({ block: 'center' });
      el.click();
      return true;
    })()`);
    check('possessed tappable without lantern', clicked, true);
    await sleep(500);
  }

  check(
    'step 2 line',
    /Step 2 of 3 · Name it/.test(
      await cdp.ev("(document.querySelector('.room-step')||{}).textContent||''"),
    ),
    true,
  );
  const cards = await cdp.ev(
    "[...document.querySelectorAll('.spell-card')].map((c) => c.textContent.trim())",
  );
  check('three cards', (cards || []).length === 3, true);
  check(
    'cards visible',
    await cdp.ev(
      "[...document.querySelectorAll('.spell-card')].map((c)=>__vis(c)).every((v)=>v==='ok')",
    ),
    true,
  );
  await checkCardTargetSizes(cdp, r, check);

  let heldSampled = false;
  for (let c = 0; c < 3; c++) {
    const stillPicking = await cdp.ev(
      "/Name it/i.test((document.querySelector('.room-step')||{}).textContent||'')",
    );
    if (!stillPicking) break;
    await cdp.ev(
      `document.querySelectorAll('.spell-card')[${c}] && document.querySelectorAll('.spell-card')[${c}].focus()`,
    );
    await cdp.key('Enter');
    await sleep(140);
    const still = await cdp.ev("!!document.querySelector('.spell-card')");
    if (still) {
      const w = await cdp.ev("__vis('.spell-card-reason')");
      const hint = await cdp.ev(
        "(document.querySelector('.spell-card-reason')||{}).textContent||''",
      );
      r.picks.push({
        card: cards ? cards[c] : c,
        right: false,
        reason: w,
        hint: (hint || '').slice(0, 60),
      });
      if (w !== 'ok') r.fail.push(`inline reason after card ${c}: ${w}`);
      await sleep(560);
    } else {
      r.picks.push({ card: cards ? cards[c] : c, right: true });
      await checkNamedHold(cdp, r, check, reducedMotion);
      heldSampled = true;
      break;
    }
  }
  if (!heldSampled)
    r.checks['held-hold animations'] = r.checks['held-hold animations'] ?? 'not sampled';

  await sleep(2400);
  check('comparison visible', await cdp.ev("__vis('.comparison')"));
  check('slider visible', await cdp.ev("__vis('.comparison input[type=range], .split-range')"));

  return { r, check };
}

async function sigAt(cdp, end) {
  await cdp.ev(FOCUS_SLIDER);
  await cdp.key(end === 0 ? 'Home' : 'End');
  await sleep(300);
  return cdp.ev(TOP_SIG);
}

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
  const entry = {
    split,
    applied,
    edgeOff,
    gripOff,
    boxWidth: Number(m.boxWidth.toFixed(1)),
  };
  (r.dividerOffsets || (r.dividerOffsets = [])).push(entry);
  return entry;
}

/**
 * Finish the honest task. EVEN rooms by keyboard (focus each honest control,
 * press Enter); ODD rooms with a REAL pointer: scroll the first honest control
 * into view, confirm document.elementFromPoint at its centre is that control
 * (a control hidden under the comparison overlay — the pointer dead-end bug —
 * is reported, not silently missed), then a CDP mouse click at 1280x720 or a
 * CDP touch at 412x915. The shared `task completes` check (in walkRoom) then
 * covers whichever path ran.
 */
async function completeHonestTask(cdp, r, byKeyboard, width) {
  const honestBtns = await cdp.ev(
    "[...document.querySelectorAll('.comparison-honest button, .comparison-honest a[href]')].length",
  );
  r.checks['honest controls'] = honestBtns;

  if (byKeyboard) {
    let done = false;
    for (let b = 0; b < (honestBtns || 0) && !done; b++) {
      await cdp.ev(
        `(() => { const list = [...document.querySelectorAll('.comparison-honest button, .comparison-honest a[href]')]; list[${b}] && list[${b}].focus(); })()`,
      );
      const fv = await cdp.ev('__vis(document.activeElement)');
      if (fv !== 'ok') r.fail.push(`focused honest control ${b} not visible: ${fv}`);
      await cdp.key('Enter');
      await sleep(700);
      const stepText = await cdp.ev("(document.querySelector('.room-step')||{}).textContent||''");
      const ann = await cdp.ev('__ann()');
      done = /Freed!/i.test(`${stepText} ${ann}`);
    }
    return done;
  }

  // Pointer path (odd rooms): a real mouse click (desktop) or touch (phone) on
  // the honest control. The comparison must not capture the pointer, so the
  // click reaches the control and the room reaches done.
  let done = false;
  const usesTouch = width < 600;
  r.checks['honest pointer'] = usesTouch ? 'touch 412x915' : 'mouse 1280x720';
  for (let b = 0; b < (honestBtns || 0) && !done; b++) {
    const hit = await cdp.ev(HONEST_CONTROL_HIT(b));
    if (!hit) break;
    await sleep(120);
    if (!hit.onTop) {
      r.fail.push(
        `honest control ${b} covered at its centre by ${hit.cover} (pointer could not reach it)`,
      );
      continue;
    }
    if (usesTouch) {
      await cdp.tap(hit.x, hit.y);
    } else {
      await cdp.mouseClick(hit.x, hit.y);
    }
    await sleep(700);
    const stepText = await cdp.ev("(document.querySelector('.room-step')||{}).textContent||''");
    const ann = await cdp.ev('__ann()');
    done = /Freed!/i.test(`${stepText} ${ann}`);
  }
  return done;
}

/** Walk one room fully, including the slider, layers, task and guide checks. */
async function walkRoom(cdp, baseUrl, n, reducedMotion = false, width = 1280, height = 720) {
  const { r, check } = await freeRoom(cdp, baseUrl, n, reducedMotion, width, height);
  const byKeyboard = n % 2 === 0;

  const sig0 = await sigAt(cdp, 0);
  check('all haunted at 0', await cdp.ev(LAYER('haunted')));
  const sig100 = await sigAt(cdp, 100);
  check('all honest at 100', await cdp.ev(LAYER('honest')));
  check('slider changes the comparison', sig0 !== sig100 && sig0 !== 'no comparison', true);
  r.checks['top layers 0/100'] = `${sig0} / ${sig100}`;

  for (const split of SPLIT_POINTS) {
    await checkDividerAt(cdp, split, r, check);
  }
  await cdp.ev(SET_SLIDER(100));
  await sleep(120);
  check(
    'no sideways scroll at 100',
    await cdp.ev('document.documentElement.scrollWidth <= document.documentElement.clientWidth'),
    true,
  );

  check('guide visible', await cdp.ev("__vis('.guide-card')"));

  check(
    'step 3 line',
    /Step 3 of 3 · Drag the line to compare/.test(
      await cdp.ev("(document.querySelector('.room-step')||{}).textContent||''"),
    ),
    true,
  );

  // Finish the honest task by the room's input path (even: keyboard; odd: a
  // real pointer). The shared check below then covers both paths.
  const done = await completeHonestTask(cdp, r, byKeyboard, width);
  check('task completes', done, true);

  // The continue link now sits directly under the slider, above the Ghost Guide
  // card. Confirm its placement (its DOM position precedes the guide card) and
  // that it is visible.
  check('continue link visible', await cdp.ev("__vis('.room-continue')"));
  check(
    'continue link above the guide',
    await cdp.ev(`(() => {
      const c = document.querySelector('.room-continue');
      const g = document.querySelector('.guide-card');
      if (!c || !g) return false;
      return !!(c.compareDocumentPosition(g) & Node.DOCUMENT_POSITION_FOLLOWING);
    })()`),
    true,
  );
  r.next = await cdp.ev(
    "(document.querySelector('.room-continue')||{}).getAttribute ? document.querySelector('.room-continue').getAttribute('href') : null",
  );

  const contSize = await cdp.ev(SIZE_OF('.room-continue'));
  if (contSize && contSize.height < TARGET_MIN - 0.5) {
    r.fail.push(
      `target size: .room-continue height ${Math.round(contSize.height)} < ${TARGET_MIN}`,
    );
  }

  if (reducedMotion) {
    await sleep(400);
    const states = await cdp.ev('__animStates()');
    check('animations at rest', animationsAtRest(states), true);
    r.checks['animation states'] = Array.isArray(states)
      ? states.join(',') || '(none)'
      : String(states);
  }

  const cls = await cdp.ev('window.__cls');
  const clsNum = typeof cls === 'number' ? cls : Number(cls) || 0;
  r.checks['cls'] = Number(clsNum.toFixed(4));
  check('layout shift within 0.01', clsWithinLimit(clsNum), true);

  // Record (do not fail on) the time from clicking the continue link until the
  // next room's instruction is visible — the prefetch's effect is observable.
  // THEN return to the title so the next iteration starts from a non-room state:
  // the timing click has already moved us to room n+1, so if we left the page
  // there the next iteration's readiness read (which needs a title other than
  // the previous room's) would never see a change. From the title the next
  // navigation genuinely changes the title and roomReadiness resolves.
  if (typeof r.next === 'string' && r.next.startsWith('#/room/')) {
    const t0 = Date.now();
    await cdp.ev(
      "document.querySelector('.room-continue') && document.querySelector('.room-continue').click()",
    );
    let visible = false;
    while (Date.now() - t0 < ROOM_READY_TIMEOUT_MS) {
      visible = (await cdp.ev("__vis('.room-step')")) === 'ok';
      if (visible) break;
      await sleep(ROOM_POLL_MS);
    }
    r.checks['next room ms'] = Date.now() - t0;
  }

  // Leave the room route so the next room starts clean (see above).
  await cdp.send('Page.navigate', { url: `${baseUrl}#/` });
  await sleep(ROOM_POLL_MS * 3);

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

    await session.cdp.send('Page.navigate', { url: `${session.baseUrl}#/end` });
    await sleep(1800);
    const endHead = await session.cdp.ev("(document.querySelector('h1')||{}).textContent");
    const endItems = await session.cdp.ev(
      "document.querySelectorAll('ol.ending-checklist li, ol li').length",
    );
    report.push({
      ending: endHead,
      checklistItems: endItems,
      twelve: endItems === 12,
    });

    return JSON.stringify(
      {
        base: session.baseUrl,
        width,
        height,
        reducedMotion,
        rooms,
        report,
        errors: session.errors,
      },
      null,
      2,
    );
  } finally {
    await session.teardown();
  }
}
