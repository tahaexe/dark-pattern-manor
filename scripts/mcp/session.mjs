// Shared headless-browser session setup for the walk_rooms and contrast_scan
// tools: the dist/ guard, the static server, the Chrome launch, the CDP
// connection, the in-page visibility helpers, the layout-shift observer and
// the motion helpers, and the console/exception collectors. Returns everything
// the two tools need plus a single teardown.

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
//
// Added for motion QA:
//  - a buffered PerformanceObserver that sums layout-shift into window.__cls,
//    with __clsReset() to zero it at the start of each room's walk;
//  - a requestAnimationFrame COUNTER (window.__rafCount), installed before any
//    app code runs by wrapping requestAnimationFrame, with __rafReset() to zero
//    it — so the walk can prove an honest room requests NO animation frames for
//    a couple of seconds (the atmosphere's still pose means nothing paints);
//  - __animStates() → the play state of every running/finished animation, so
//    the reduced-motion walk can assert none is running;
//  - __stirsVisible() → whether the possessed element's "Something stirs here"
//    static label is visible (the reduced-motion sign);
//  - __labelClipData() → for the "Something stirs here" label and any
//    `.act-caption`, the label's box, the boxes of its clipping ancestors
//    (overflow hidden/clip or a clip-path) and whether it stays within the
//    viewport's WIDTH, so the walk can prove no visible label is cut (via the
//    pure labelWithinClip rule);
//  - __heldMotion() → the running animations inside the haunted page's frame,
//    each with its target's classes, the animation name and whether the target
//    is `.ghost-wrap` or inside it, so the walk can prove that during the named
//    hold nothing but the shared flee keeps moving (via the pure
//    heldMotionOffenders rule).
export const HELPERS = `
// Count every requestAnimationFrame call. Wrapped before app code runs (this
// script is added on new document), so an idle honest room's zero frames is
// genuinely measured. __rafReset() zeroes the counter for a fresh window.
window.__rafCount = 0;
window.__rafReset = () => { window.__rafCount = 0; };
try {
  const __raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => { window.__rafCount++; return __raf(cb); };
} catch (_e) { /* no rAF: __rafCount stays 0 */ }

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

// Cumulative layout shift, buffered so shifts from before this ran still count.
window.__cls = 0;
window.__clsReset = () => { window.__cls = 0; };
try {
  const __clsObs = new PerformanceObserver((list) => {
    for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
  });
  __clsObs.observe({ type: 'layout-shift', buffered: true });
} catch (_e) { /* layout-shift unsupported: __cls stays 0 (a pass) */ }

// The play state of every animation on the page (CSS + Web Animations).
window.__animStates = () => {
  try {
    return (document.getAnimations ? document.getAnimations() : []).map((a) => a.playState);
  } catch (_e) { return []; }
};

// Is the reduced-motion static label ("Something stirs here") visible?
window.__stirsVisible = () => {
  const nodes = [...document.querySelectorAll('.stirs-label, .possessed')];
  for (const el of nodes) {
    const text = (el.textContent || '').toLowerCase();
    if (text.includes('something stirs here')) {
      const r = el.getBoundingClientRect();
      if (r.width >= 2 && r.height >= 2) return 'ok';
    }
  }
  return 'missing';
};

// Clipping data for the static labels: the "Something stirs here" label and any
// act caption (class act-caption). For each rendered label we report its box,
// the boxes of every ancestor that clips overflow (overflow-x/y hidden or clip,
// or a clip-path other than none), and whether it stays within the viewport's
// WIDTH. The walk applies the pure labelWithinClip rule to decide pass/fail; a
// label cut by any clip ancestor, or extending past the left/right edge of the
// viewport, fails. The horizontal edge is what the frame cuts (the game never
// scrolls sideways, so a label past the edge can never be reached); a label
// merely below the fold is reachable by scrolling and is not a cut, so the
// vertical position is not required to be within the first screen.
window.__labelClipData = () => {
  const out = [];
  const nodes = [...document.querySelectorAll('.stirs-label, .act-caption')];
  for (const el of nodes) {
    const r = el.getBoundingClientRect();
    // Skip labels that are not rendered (display:none etc.).
    if (r.width < 1 && r.height < 1) continue;
    const clips = [];
    let p = el.parentElement;
    while (p) {
      const cs = getComputedStyle(p);
      const clipsOverflow =
        cs.overflowX === 'hidden' ||
        cs.overflowX === 'clip' ||
        cs.overflowY === 'hidden' ||
        cs.overflowY === 'clip' ||
        (cs.clipPath && cs.clipPath !== 'none');
      if (clipsOverflow) {
        const pr = p.getBoundingClientRect();
        clips.push({ left: pr.left, right: pr.right, top: pr.top, bottom: pr.bottom, who: p.className || p.tagName });
      }
      p = p.parentElement;
    }
    const label = { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    const withinWidth = r.left >= -1 && r.right <= innerWidth + 1;
    out.push({
      sel: el.className || el.tagName,
      text: (el.textContent || '').trim().slice(0, 40),
      label,
      clips,
      withinWidth,
    });
  }
  return out;
};

// The running animations inside the haunted page's frame during the named
// hold. After the right card lands the engine holds the haunted page for the
// shared unwind and flee of .ghost-wrap; the named-hold rule (motion.mjs) then
// fails a room if anything OTHER than .ghost-wrap (or something inside it) is
// still animating in the frame — a leftover act, mist or flicker. We read
// document.getAnimations(), keep the ones whose play state is 'running' and
// whose target element sits inside .manor-frame (the live haunted page, not a
// preview), and report each target's classes, the animation's name and whether
// the target is .ghost-wrap or inside it (the one place the shared flee is
// allowed). A pseudo-element animation (e.g. ::after) reports its owning
// element, which is what we want to name.
window.__heldMotion = () => {
  try {
    if (!document.getAnimations) return [];
    const frames = [...document.querySelectorAll('.manor-frame')].filter(
      (f) => !f.classList.contains('manor-frame-preview'),
    );
    if (!frames.length) return [];
    const inFrame = (el) => frames.some((f) => f.contains(el));
    const nameOf = (a) => {
      if (typeof a.animationName === 'string' && a.animationName) return a.animationName;
      if (a.transitionProperty) return 'transition:' + a.transitionProperty;
      return a.id || '';
    };
    const classesOf = (el) => {
      const c = el.className;
      if (c && typeof c === 'object' && 'baseVal' in c) return c.baseVal || el.tagName;
      return (typeof c === 'string' && c) || el.tagName || '';
    };
    const out = [];
    for (const a of document.getAnimations()) {
      if (a.playState !== 'running') continue;
      const target = a.effect && a.effect.target ? a.effect.target : null;
      if (!target || !inFrame(target)) continue;
      const wrap = target.closest ? target.closest('.ghost-wrap') : null;
      out.push({ name: nameOf(a), classes: classesOf(target), insideGhostWrap: !!wrap });
    }
    return out;
  } catch (_e) {
    return [];
  }
};
`;

/**
 * Open a browser session serving dist/.
 * @param {{ width: number, height: number, reducedMotion?: boolean }} opts
 * @returns {Promise<{ server, chrome, cdp, baseUrl, errors: string[], teardown: () => Promise<void> }>}
 */
export async function openSession({ width, height, reducedMotion = false }) {
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
  // Emulate the motion preference BEFORE any navigation, so the very first
  // paint of each room already honours prefers-reduced-motion.
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [
      {
        name: 'prefers-reduced-motion',
        value: reducedMotion ? 'reduce' : 'no-preference',
      },
    ],
  });
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: HELPERS });

  const teardown = async () => {
    cdp.close();
    chrome.close();
    await server.close();
  };

  return { server, chrome, cdp, baseUrl: server.baseUrl, errors, teardown };
}
