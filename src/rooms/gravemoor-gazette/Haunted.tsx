import type { HauntedProps } from '../../engine/types';
import InkGhost from '../../ui/InkGhost';
import './room.css';

/**
 * The Gravemoor Gazette, possessed. The "Reject all" control is a small plain
 * text link (Visual interference: the quiet option is made hard to see), while
 * "Accept all" is a full bright button. The ghost is the hero of the room: it
 * peeks over the possessed link without covering its text, with mist drifting
 * around it, and performs the trick: it breathes a slow mist puff that dims the
 * link's surround (never its text) while holding a finger to its lips — the
 * "look away" gesture that teaches Visual interference through motion. All text
 * stays at WCAG AA contrast; the trick is size, weight and placement, never
 * readability.
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
            {/* The ghost's breath puff. It performs the Visual-interference
                trick: a slow mist puff dims the link's SURROUND only (a
                low-alpha glow behind the label), never the text. It sits below
                the label's z-index and is aria-hidden and non-interactive, so
                it neither covers nor blocks "Reject all" and adds nothing to
                the accessible name. Reserved space only; transforms/opacity. */}
            {showSigns ? <span class="act-breath" aria-hidden="true"></span> : null}
            <span class="cookie-reject-label">Reject all</span>
            {showSigns ? (
              <span class="ghost-signs" aria-hidden="true">
                <span class="mist mist-left"></span>
                <span class="mist mist-above"></span>
                <span class="mist mist-below"></span>
                <span class="ghost-wrap">
                  <InkGhost />
                  {/* The ghost holds a finger to its lips: the "look away"
                      gesture that names the trick through motion. Decorative,
                      aria-hidden, transforms/opacity only. */}
                  <span class="act-finger" aria-hidden="true"></span>
                </span>
              </span>
            ) : null}
            {showSigns && reducedMotion ? (
                  <span class="stirs-label">Something stirs here</span>
                ) : null}
            {showSigns && reducedMotion ? (
                  <span class="act-caption">it wants you to look away</span>
                ) : null}
          </button>
        </div>
      </div>
    </div>
  );
}
