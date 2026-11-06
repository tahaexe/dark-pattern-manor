import type { HauntedProps } from '../../engine/types';
import InkGhost from '../../ui/InkGhost';
import './room.css';

/**
 * The Gravemoor Gazette, possessed. The "Reject all" control is a small plain
 * text link (Visual interference: the quiet option is made hard to see), while
 * "Accept all" is a full bright button. The ghost is the hero of the room: it
 * peeks over the possessed link without covering its text, with mist drifting
 * around it. All text stays at WCAG AA contrast; the trick is size, weight and
 * placement, never readability.
 *
 * In `preview` mode (the static "before" side of the split) the component is
 * non-interactive and omits the possessed element's id, so the live page keeps
 * the only `foyer-reject`.
 */
export default function Haunted({
  onSelectPossessed,
  onSelectOther,
  signsActive,
  reducedMotion,
  preview = false,
}: HauntedProps) {
  const showSigns = signsActive && !preview;

  return (
    <div class="gazette">
      <div class="gazette-header">
        <p class="gazette-address">gravemoor-gazette.manor</p>
        <h2 class="gazette-masthead">The Gravemoor Gazette</h2>
      </div>

      <article class="gazette-content">
        <h3>Fog rolls in over the moor</h3>
        <p>
          Lamplighters report the thickest fog in forty years. The ferry to Hollow Point will run at
          half speed until Thursday, and the night editor asks readers to keep a candle in the window.
        </p>
      </article>

      <div class="cookie-banner">
        <div class="cookie-text">
          <p class="cookie-title">We value your privacy</p>
          <p class="cookie-description">
            We and our 1,312 partners use cookies to personalise your experience.
          </p>
        </div>
        <div class="cookie-buttons">
          <button
            class="cookie-accept"
            type="button"
            tabIndex={preview ? -1 : undefined}
            aria-hidden={preview ? 'true' : undefined}
            onClick={preview ? undefined : () => onSelectOther()}
          >
            Accept all
          </button>
          <button
            {...(preview ? {} : { id: 'foyer-reject' })}
            class={`cookie-reject possessed${showSigns ? ' signs-active' : ''}${
              reducedMotion ? ' reduced-motion' : ''
            }`}
            type="button"
            aria-label="Reject all"
            tabIndex={preview ? -1 : undefined}
            aria-hidden={preview ? 'true' : undefined}
            onClick={preview ? undefined : () => onSelectPossessed()}
          >
            <span class="cookie-reject-label">Reject all</span>
            {showSigns ? (
              <span class="ghost-signs" aria-hidden="true">
                <span class="mist mist-left"></span>
                <span class="mist mist-above"></span>
                <span class="mist mist-below"></span>
                <span class="ghost-wrap">
                  <InkGhost />
                </span>
                {reducedMotion ? <span class="stirs-label">Something stirs here</span> : null}
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </div>
  );
}
