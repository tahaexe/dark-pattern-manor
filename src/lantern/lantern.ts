import { runAllDetectors } from './detect';
import { findCountdownCandidates } from './detectors/fake-urgency';
import { createOverlay, type Overlay, type OverlayProbe } from './overlay';
import { text } from './helpers';

/** The single global flag name that marks the lantern lit. */
const FLAG = '__ghostLantern__';

interface LanternGlobal {
  /** Put the lantern out (also what a second bookmarklet click calls). */
  putOut: () => void;
  /** The number of suspects found (0 while still watching a countdown). */
  count?: number;
  /** A read-only snapshot for the walk; absent while still watching. */
  probe?: () => OverlayProbe;
}

interface LitState {
  overlay: Overlay;
  previousFocus: Element | null;
  onKeyDown: (e: KeyboardEvent) => void;
}

let state: LitState | null = null;

/** How long a countdown is watched for a change before the marks are drawn. */
const URGENCY_WATCH_MS = 1100;

/** True when the lantern is currently lit. */
export function isLit(): boolean {
  return !!(window as unknown as Record<string, unknown>)[FLAG];
}

/** True under prefers-reduced-motion. */
function reducedMotion(): boolean {
  try {
    return !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Build the overlay for the suspects found under document.body (minus the
 * host), wire Escape and the Put-out button to a full put-out, remember focus,
 * and set the global flag. `changed` tells the urgency detector whether a
 * watched countdown moved.
 */
function lightWith(changed: (el: Element) => boolean, reduced: boolean): void {
  const previousFocus = document.activeElement;

  // Detection runs over a DOM without the lantern's host (the overlay is built
  // after), so no lantern node can ever be a suspect.
  const suspects = runAllDetectors(document.body, undefined, { changed });

  const overlay = createOverlay(suspects, reduced, () => putOut());

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      putOut();
    }
  };
  window.addEventListener('keydown', onKeyDown, true);

  state = { overlay, previousFocus, onKeyDown };
  (window as unknown as Record<string, LanternGlobal>)[FLAG] = {
    putOut,
    count: suspects.length,
    probe: () => overlay.probe(),
  };

  // Move focus into the panel so a keyboard player lands on the dialog.
  overlay.heading.focus();
}

/** Light the lantern on the current page. */
export function light(): void {
  if (isLit()) return;
  const reduced = reducedMotion();

  const candidates = findCountdownCandidates(document.body);
  if (candidates.length === 0) {
    lightWith(() => false, reduced);
    return;
  }

  // Watch the candidates for a change, then light with the urgency verdict.
  const before = new Map<Element, string>();
  for (const el of candidates) before.set(el, text(el));
  const timer = window.setTimeout(() => {
    const changed = (el: Element) => before.has(el) && before.get(el) !== text(el);
    lightWith(changed, reduced);
  }, URGENCY_WATCH_MS);

  // Hold the pending timer on a temporary flag so a second click during the
  // watch cancels it rather than lighting twice.
  (window as unknown as Record<string, LanternGlobal>)[FLAG] = {
    putOut: () => {
      window.clearTimeout(timer);
      delete (window as unknown as Record<string, unknown>)[FLAG];
    },
  };
}

/** Put the lantern out: remove every node, listener, timer and observer. */
export function putOut(): void {
  const current = state;
  const flag = (window as unknown as Record<string, LanternGlobal>)[FLAG];
  if (!current) {
    // Lantern is watching but not yet drawn: run the flag's putOut (cancels the
    // timer) if present.
    if (flag && flag.putOut) flag.putOut();
    delete (window as unknown as Record<string, unknown>)[FLAG];
    return;
  }
  window.removeEventListener('keydown', current.onKeyDown, true);
  current.overlay.destroy();
  const prev = current.previousFocus as HTMLElement | null;
  if (prev && typeof prev.focus === 'function' && document.contains(prev)) {
    prev.focus();
  }
  state = null;
  delete (window as unknown as Record<string, unknown>)[FLAG];
}
