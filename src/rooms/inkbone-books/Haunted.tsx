import type { HauntedProps } from '../../engine/types';
import './room.css';

/**
 * Inkbone Books, possessed. The sign-up form looks ordinary, but the newsletter
 * line is Trick wording: a double negative — "Tick this box if you would not
 * prefer to miss out on not receiving the Inkbone newsletter" — so leaving the
 * box empty keeps you subscribed and ticking it opts you out. Nothing is
 * pre-ticked; the trick is the sentence, not the state. The ghost is the hero
 * of the room: it peeks over the possessed newsletter sentence itself, at the
 * sentence's height, without covering the sentence, the box, the inputs, the
 * labels or the button. All text stays at WCAG AA contrast; the trick is the
 * wording, never readability.
 *
 * In `preview` mode (the static "before" side of the split) the component is
 * non-interactive and omits the possessed element's id, so the live page keeps
 * the only `library-newsletter`.
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
    <div class="inkbone">
      <div class="inkbone-header">
        <p class="inkbone-address">inkbone-books.manor</p>
        <h2 class="inkbone-masthead">Inkbone Books</h2>
        <p class="inkbone-tagline">Second-hand spells and well-thumbed classics</p>
      </div>

      <div class="signup-card">
        <h3 class="signup-title">Create your reader account</h3>

        <div class="signup-field">
          <label class="signup-label" for="inkbone-name">
            Name
          </label>
          <input
            id="inkbone-name"
            class="signup-input"
            type="text"
            value="Ada Quill"
            readOnly
            tabIndex={preview ? -1 : undefined}
            aria-hidden={preview ? 'true' : undefined}
            onFocus={preview ? undefined : () => onSelectOther()}
          />
        </div>

        <div class="signup-field">
          <label class="signup-label" for="inkbone-email">
            Email
          </label>
          <input
            id="inkbone-email"
            class="signup-input"
            type="email"
            value="ada@quill.manor"
            readOnly
            tabIndex={preview ? -1 : undefined}
            aria-hidden={preview ? 'true' : undefined}
            onFocus={preview ? undefined : () => onSelectOther()}
          />
        </div>

        {/* The possessed newsletter line. The checkbox is NOT pre-ticked; the
            trick is the double-negative sentence, which flips its own meaning:
            leaving the box empty keeps you subscribed. No aria-label, so the
            accessible name is the visible sentence itself (Label in Name,
            WCAG 2.5.3). */}
        <button
          {...(preview ? {} : { id: 'library-newsletter' })}
          class={`newsletter-line possessed${showSigns ? ' signs-active' : ''}${
            reducedMotion ? ' reduced-motion' : ''
          }`}
          type="button"
          tabIndex={preview ? -1 : undefined}
          aria-hidden={preview ? 'true' : undefined}
          onClick={preview ? undefined : () => onSelectPossessed()}
        >
          <span class="newsletter-box" aria-hidden="true"></span>
          <span class="newsletter-text">
            Tick this box if you would <em>not</em> prefer to miss out on <em>not</em> receiving the
            Inkbone newsletter.
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
          </span>
        </button>

        <button
          class="signup-submit"
          type="button"
          tabIndex={preview ? -1 : undefined}
          aria-hidden={preview ? 'true' : undefined}
          onClick={preview ? undefined : () => onSelectOther()}
        >
          Create account
        </button>
      </div>
    </div>
  );
}
