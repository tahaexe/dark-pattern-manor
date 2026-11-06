import type { HauntedProps } from '../../engine/types';
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
                  <svg
                    viewBox="0 0 120 140"
                    width="120"
                    height="140"
                    class="ghost"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      class="ghost-body"
                      d="M20 70 Q20 24 60 24 Q100 24 100 70 L100 118
                         Q94 112 88 118 Q82 124 76 118 Q70 112 64 118
                         Q58 124 52 118 Q46 112 40 118 Q34 124 28 118
                         Q22 112 20 118 Z"
                    />
                    <circle class="ghost-eye" cx="48" cy="60" r="4" />
                    <circle class="ghost-eye" cx="72" cy="60" r="4" />
                    <path class="ghost-mouth" d="M52 74 Q60 82 68 74" />
                  </svg>
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
