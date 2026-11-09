import type { Suspect } from './types';
import { LANTERN_CSS } from './lantern-css';
import {
  LEARN_IN_MANOR,
  MANOR_BASE,
  PANEL_HEADING,
  PUT_OUT,
  SHOW_ME,
  ZERO_TEXT,
  chip,
  warningText,
} from './words';

/** A read-only snapshot the walk can use without piercing the closed root. */
export interface OverlayProbe {
  /** The number of suspects (marks). */
  count: number;
  /** Per mark: the suspect's box, the mark's box, and the pattern. */
  marks: Array<{
    pattern: string;
    suspect: { left: number; top: number; width: number; height: number };
    mark: { left: number; top: number; width: number; height: number };
    outline: string;
  }>;
  /** The panel's computed background colour. */
  panelBackground: string;
  /** The panel's warning text. */
  warning: string;
}

/** A handle the lit-state owns: it can place marks, focus one, and tear down. */
export interface Overlay {
  /** The single host element added to the page. */
  host: HTMLElement;
  /** The dialog heading, so the lit-state can move focus into the panel. */
  heading: HTMLElement;
  /** Re-place every mark from its suspect's current box (scroll/resize). */
  place: () => void;
  /** Scroll a suspect into view and focus its mark. */
  showMark: (index: number) => void;
  /** A read-only snapshot for the walk (no page data, test affordance only). */
  probe: () => OverlayProbe;
  /** Remove the host and every listener/observer/timer this overlay added. */
  destroy: () => void;
}

/** Load the CSS into a shadow root: constructed stylesheet, <style> fallback. */
function loadStyles(root: ShadowRoot): void {
  try {
    const Ctor = (window as unknown as { CSSStyleSheet?: typeof CSSStyleSheet }).CSSStyleSheet;
    // Only the constructable path: a sheet that supports replaceSync + adoption.
    if (Ctor && 'adoptedStyleSheets' in Document.prototype) {
      const sheet = new Ctor();
      sheet.replaceSync(LANTERN_CSS);
      (root as unknown as { adoptedStyleSheets: CSSStyleSheet[] }).adoptedStyleSheets = [sheet];
      return;
    }
  } catch {
    /* fall through to the <style> element */
  }
  const style = document.createElement('style');
  style.textContent = LANTERN_CSS;
  root.appendChild(style);
}

/** Build a button with text and a click handler (createElement/textContent). */
function button(label: string, cls: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

/**
 * Build the overlay for a set of suspects under one host with a closed shadow
 * root. Draws a mark per suspect and a bottom-right dialog panel. Returns a
 * handle whose `destroy` removes everything the overlay added, so the lit-state
 * can guarantee a clean put-out. `reduced` drops the flicker class. `onPutOut`
 * is called by the "Put out the lantern" button so the owner can run the full
 * put-out (restore focus, drop the flag); when omitted the button calls
 * `destroy` directly.
 */
export function createOverlay(
  suspects: Suspect[],
  reduced: boolean,
  onPutOut?: () => void,
): Overlay {
  const host = document.createElement('div');
  host.setAttribute('data-ghost-lantern', '');
  const root = host.attachShadow({ mode: 'closed' });
  loadStyles(root);

  // One mark per suspect, kept in order with its suspect.
  const marks: HTMLElement[] = suspects.map((s) => {
    const mark = document.createElement('div');
    mark.className = reduced ? 'gl-mark' : 'gl-mark gl-flicker';
    mark.setAttribute('tabindex', '-1');
    mark.setAttribute('data-step', 'mark');
    const chipEl = document.createElement('span');
    chipEl.className = 'gl-chip';
    chipEl.textContent = chip(s.pattern);
    mark.appendChild(chipEl);
    root.appendChild(mark);
    return mark;
  });

  // The panel.
  const panel = document.createElement('div');
  panel.className = 'gl-panel';
  panel.setAttribute('role', 'dialog');
  const headingId = 'gl-heading';
  panel.setAttribute('aria-labelledby', headingId);

  const heading = document.createElement('h2');
  heading.id = headingId;
  heading.textContent = PANEL_HEADING;
  heading.setAttribute('tabindex', '-1');
  panel.appendChild(heading);

  const warningStr = suspects.length === 0 ? ZERO_TEXT : warningText(suspects.length);
  const warning = document.createElement('p');
  warning.className = 'gl-warning';
  warning.textContent = warningStr;
  panel.appendChild(warning);

  const showMark = (index: number) => {
    const s = suspects[index];
    if (!s) return;
    s.element.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    // Re-place after the scroll settles, then focus the mark.
    window.requestAnimationFrame(() => {
      place();
      marks[index].focus();
    });
  };

  if (suspects.length > 0) {
    const list = document.createElement('ul');
    list.className = 'gl-list';
    suspects.forEach((s, i) => {
      const item = document.createElement('li');
      item.className = 'gl-item';

      const pattern = document.createElement('p');
      pattern.className = 'gl-item-pattern';
      pattern.textContent = s.pattern;
      item.appendChild(pattern);

      const sign = document.createElement('p');
      sign.className = 'gl-item-sign';
      sign.textContent = s.sign;
      item.appendChild(sign);

      const actions = document.createElement('div');
      actions.className = 'gl-item-actions';
      actions.appendChild(button(SHOW_ME, 'gl-btn gl-showme', () => showMark(i)));

      const link = document.createElement('a');
      link.className = 'gl-link';
      link.textContent = LEARN_IN_MANOR;
      link.href = `${MANOR_BASE}${s.room}`; // only the room number travels
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      actions.appendChild(link);

      item.appendChild(actions);
      list.appendChild(item);
    });
    panel.appendChild(list);
  }

  panel.appendChild(
    button(PUT_OUT, 'gl-btn gl-putout', () => {
      if (onPutOut) onPutOut();
      else destroy();
    }),
  );
  root.appendChild(panel);

  // Placement: transform each mark to its suspect's current viewport box.
  const place = () => {
    for (let i = 0; i < suspects.length; i++) {
      const r = suspects[i].element.getBoundingClientRect();
      const mark = marks[i];
      mark.style.width = `${Math.max(0, r.width)}px`;
      mark.style.height = `${Math.max(0, r.height)}px`;
      mark.style.transform = `translate(${r.left}px, ${r.top}px)`;
    }
  };

  // rAF-throttled re-place on scroll and resize.
  let frame = 0;
  const onScrollResize = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      place();
    });
  };
  window.addEventListener('scroll', onScrollResize, { passive: true, capture: true });
  window.addEventListener('resize', onScrollResize, { passive: true });

  let ro: ResizeObserver | undefined;
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(onScrollResize);
    ro.observe(document.documentElement);
  }

  // A read-only probe for the walk. It does not expose page content beyond the
  // boxes and pattern names the panel already shows; it exists so the walk can
  // measure the overlay without piercing the closed shadow root.
  const probe = (): OverlayProbe => {
    const rect = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    };
    let panelBackground = '';
    let markOutline = '';
    try {
      panelBackground = getComputedStyle(panel).backgroundColor;
      if (marks[0]) markOutline = getComputedStyle(marks[0]).borderTopStyle;
    } catch {
      /* no computed style available */
    }
    return {
      count: suspects.length,
      warning: warningStr,
      panelBackground,
      marks: suspects.map((s, i) => ({
        pattern: s.pattern,
        suspect: rect(s.element),
        mark: rect(marks[i]),
        outline: markOutline,
      })),
    };
  };

  const destroy = () => {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    window.removeEventListener('scroll', onScrollResize, { capture: true } as EventListenerOptions);
    window.removeEventListener('resize', onScrollResize);
    if (ro) ro.disconnect();
    if (host.parentNode) host.parentNode.removeChild(host);
  };

  // Attach and place immediately.
  document.documentElement.appendChild(host);
  place();

  return { host, heading, place, showMark, probe, destroy };
}
