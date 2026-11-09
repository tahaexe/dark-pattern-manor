import type { HauntedProps } from '../../engine/types';
import InkGhost from '../../ui/InkGhost';
import './room.css';

/**
 * Dirgewell, possessed. The player came for a free song sheet, but
 * "Download free sheet" opens a gate: "Create your account to download", with
 * name, email, password, a pre-ticked "Share your contacts to find friends"
 * and a "Sign up and download" button. The only other way out is to close the
 * gate — and get no sheet (Forced action: you must create an account and share
 * data you did not come to give before you can finish a simple task).
 *
 * The possessed element is the gate's "Sign up and download" button (the heart
 * of the forced action), found by id "musicroom-signup". It is a real button,
 * so it is keyboard-reachable and its accessible name is its visible text (no
 * aria-label). The form's other fields call `onSelectOther`. The whole gate is
 * kept compact so the possessed button sits within the first screen at
 * 1280x720 and 412x915. Every text meets WCAG AA contrast; the trick is the
 * gate, never readability.
 *
 * The ghost is the hero of the room: it peeks over the gate without covering
 * its text, with mist drifting around it, and performs the trick (Forced action
 * through motion): it snaps a padlock onto the download (.act-lock) and drags
 * the contacts box to ticked (.act-tick). Both are decorative overlays inside
 * the ghost wrap; only their transform/opacity change, so there is no layout
 * shift and nothing real moves. They sit beside the gate, never over its text
 * or focus ring, and pointer-events: none so they never block input. Every act
 * element is aria-hidden. Under reduced motion the act holds a still pose with
 * the caption "the free sheet asks a price" beside the ghost, keeping the
 * "Something stirs here" label.
 *
 * In `preview` mode (the static "before" side of the split) the component is
 * non-interactive and omits the possessed element's id, so the live page keeps
 * the only `musicroom-signup`.
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
    <div class="dirgewell">
      <div class="dirgewell-header">
        <p class="dirgewell-address">dirgewell.manor</p>
        <h2 class="dirgewell-masthead">Dirgewell</h2>
      </div>

      <p class="dirgewell-song">
        <strong class="dirgewell-song-title">"Lament for a Cold Hearth"</strong> · arranged for
        piano · free
      </p>

      {/* The gate: the only path to the free sheet runs through sign-up. */}
      <div class="dirgewell-gate">
        <p class="dirgewell-gate-title">Create your account to download</p>

        <div class="dirgewell-fields">
          <div class="dirgewell-field">
            <label class="dirgewell-label" for="dirgewell-name">
              Name
            </label>
            <input
              id="dirgewell-name"
              class="dirgewell-input"
              type="text"
              value="Robin Ash"
              readOnly
              tabIndex={preview ? -1 : undefined}
              aria-hidden={preview ? 'true' : undefined}
              onFocus={preview ? undefined : () => onSelectOther()}
            />
          </div>

          <div class="dirgewell-field">
            <label class="dirgewell-label" for="dirgewell-email">
              Email
            </label>
            <input
              id="dirgewell-email"
              class="dirgewell-input"
              type="email"
              value="robin@example.manor"
              readOnly
              tabIndex={preview ? -1 : undefined}
              aria-hidden={preview ? 'true' : undefined}
              onFocus={preview ? undefined : () => onSelectOther()}
            />
          </div>

          <div class="dirgewell-field">
            <label class="dirgewell-label" for="dirgewell-password">
              Password
            </label>
            <input
              id="dirgewell-password"
              class="dirgewell-input"
              type="password"
              value="candlelight"
              readOnly
              tabIndex={preview ? -1 : undefined}
              aria-hidden={preview ? 'true' : undefined}
              onFocus={preview ? undefined : () => onSelectOther()}
            />
          </div>
        </div>

        <label class="dirgewell-contacts">
          <input
            class="dirgewell-contacts-box"
            type="checkbox"
            checked
            tabIndex={preview ? -1 : undefined}
            aria-hidden={preview ? 'true' : undefined}
            onClick={preview ? undefined : () => onSelectOther()}
          />
          <span class="dirgewell-contacts-text">Share your contacts to find friends</span>
        </label>

        <div class="dirgewell-gate-actions">
          {/* The possessed element: the "Sign up and download" button — the
              heart of the forced action. A real button, keyboard-reachable, its
              visible text is its accessible name (no aria-label). */}
          <button
            {...(preview ? {} : { id: 'musicroom-signup' })}
            class={`dirgewell-signup possessed${showSigns ? ' signs-active' : ''}${
              reducedMotion ? ' reduced-motion' : ''
            }`}
            type="button"
            tabIndex={preview ? -1 : undefined}
            aria-hidden={preview ? 'true' : undefined}
            onClick={preview ? undefined : () => onSelectPossessed()}
          >
            <span class="dirgewell-signup-label">Sign up and download</span>

            {showSigns ? (
              <span class="ghost-signs" aria-hidden="true">
                <span class="mist mist-left"></span>
                <span class="mist mist-above"></span>
                <span class="mist mist-below"></span>
                <span class="ghost-wrap">
                  <InkGhost />
                  {/* The act: the ghost snaps a padlock onto the download
                      (.act-lock) and drags the contacts box to ticked
                      (.act-tick). Decorative overlays inside the ghost wrap;
                      transforms/opacity only, no layout shift; pointer-events:
                      none; never over the gate's text or focus ring. */}
                  <span class="act-lock" aria-hidden="true"></span>
                  <span class="act-tick" aria-hidden="true"></span>
                </span>
              </span>
            ) : null}
            {showSigns && reducedMotion ? (
              <span class="stirs-label">Something stirs here</span>
            ) : null}
            {showSigns && reducedMotion ? (
              <span class="act-caption">the free sheet asks a price</span>
            ) : null}
          </button>

          <button
            class="dirgewell-close"
            type="button"
            tabIndex={preview ? -1 : undefined}
            aria-hidden={preview ? 'true' : undefined}
            onClick={preview ? undefined : () => onSelectOther()}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
