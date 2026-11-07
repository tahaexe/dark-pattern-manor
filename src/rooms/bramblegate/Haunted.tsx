import { Component } from 'preact';
import type { FunctionComponent } from 'preact';
import type { HauntedProps } from '../../engine/types';
import './room.css';

/** The monthly membership price, in pounds. */
const PRICE = 39;

/** Format a whole-pounds amount as "£N". */
function money(pounds: number): string {
  return `\u00a3${pounds}`;
}

/**
 * The possessed Bramblegate Fitness account page (Hard to cancel), as a class
 * component.
 *
 * The trick is honest in the code: joining was one click, but there is NO
 * cancel button here. The page reads "Membership: Active, £39/month" and
 * offers a bright "Upgrade to Gold" button and a "Pause instead" button; the
 * only way out is the small possessed line at the bottom — "To cancel,
 * complete our 7-step exit survey or call 0800 000 000 between 3 and 4 a.m."
 * The maze (seven steps, a 3 a.m. phone call) is the Hard to cancel trick.
 *
 * A class (not hooks) for parity with Rooms 8–11 and because the room-data
 * validation gate renders the room through Preact's bare `render`, whose hook
 * dispatcher is not wired; plain components render identically in the app, the
 * tests and the gate. There is nothing to cancel on the haunted side, so the
 * class holds no mutable state and starts no timer (nothing to clear on
 * unmount).
 *
 * The possessed element is the CANCEL line (id "cellar-cancel"), a real
 * `<button>` so it is keyboard-reachable and its accessible name is the
 * visible line text (Label in Name, WCAG 2.5.3 — no aria-label). It carries
 * the ghost that peeks beside it, inside the panel. The "Upgrade to Gold" and
 * "Pause instead" buttons are real `<button>` controls OUTSIDE the possessed
 * button — never a control inside a button.
 *
 * The cancel line is NOT a live region (no `aria-live`, no announcing role),
 * so a screen reader is not interrupted by the ghost signs. The price uses
 * lining, tabular figures in the UI face so "£39" never reads as "£I9" and the
 * price column never changes width.
 *
 * Under `prefers-reduced-motion` the ghost signs are a static dashed outline
 * and the "Something stirs here" label with no animation. In `preview` mode
 * (the static "before" side of the split) the page is non-interactive and
 * omits the possessed id.
 */
class CellarBoard extends Component<HauntedProps> {
  render() {
    const {
      onSelectPossessed,
      onSelectOther,
      signsActive,
      reducedMotion,
      preview = false,
    } = this.props;
    const showSigns = signsActive && !preview;

    return (
      <div class="bramblegate">
        <div class="bramblegate-header">
          <p class="bramblegate-address">bramblegate.manor</p>
          <h2 class="bramblegate-masthead">Bramblegate Fitness</h2>
          <p class="bramblegate-tagline">A gym for restless spirits</p>
        </div>

        <div class="account-card">
          <h3 class="account-title">Your membership</h3>

          {/* The membership line: active, £39/month. */}
          <p class="membership-line">
            <span class="membership-label">Membership</span>
            <span class="membership-value">
              Active, <span class="membership-price">{money(PRICE)}/month</span>
            </span>
          </p>

          {/* The loud options the gym wants you to pick: upgrade or pause.
              Real buttons OUTSIDE the possessed cancel line. Selecting either
              is a non-possessed selection ("Nothing haunts this."). */}
          <div class="account-actions">
            <button
              class="account-upgrade"
              type="button"
              tabIndex={preview ? -1 : undefined}
              aria-hidden={preview ? 'true' : undefined}
              onClick={preview ? undefined : () => onSelectOther()}
            >
              Upgrade to Gold
            </button>
            <button
              class="account-pause"
              type="button"
              tabIndex={preview ? -1 : undefined}
              aria-hidden={preview ? 'true' : undefined}
              onClick={preview ? undefined : () => onSelectOther()}
            >
              Pause instead
            </button>
          </div>

          {/* The possessed cancel line (Hard to cancel): the ONLY way out, and
              it is a maze — a 7-step exit survey or a call between 3 and 4 a.m.
              A real <button> whose accessible name is its visible text (no
              aria-label). It carries the ghost that peeks beside it, inside the
              panel. There is NO cancel button on this page. */}
          <button
            {...(preview ? {} : { id: 'cellar-cancel' })}
            class={`cancel-line possessed${showSigns ? ' signs-active' : ''}${
              reducedMotion ? ' reduced-motion' : ''
            }`}
            type="button"
            tabIndex={preview ? -1 : undefined}
            aria-hidden={preview ? 'true' : undefined}
            onClick={preview ? undefined : () => onSelectPossessed()}
          >
            <span class="cancel-line-text">
              To cancel, complete our 7-step exit survey or call 0800 000 000
              between 3 and 4 a.m.
            </span>

            {showSigns ? (
              <span class="ghost-signs" aria-hidden="true">
                <span class="mist mist-left"></span>
                <span class="mist mist-above"></span>
                <span class="mist mist-below"></span>

                {/* The ghost's ACT (Hard to cancel): the motion itself teaches
                    the pattern. The ghost drags the tiny "Cancel" line through
                    a row of small doors that slam shut in front of it, so the
                    way out keeps disappearing. Decorative and aria-hidden: it
                    adds nothing to the accessible name and never announces.
                    Transforms/opacity only; the maze strip's space is reserved
                    by the CSS so the act causes no layout shift, and it never
                    covers the line text, a button or the price. Under reduced
                    motion the strip holds a single still pose (below) and does
                    not animate. The engine stops the act on data-moment='right'
                    (see room.css) so it is calm through the unwind and flee. */}
                <span class={`maze${reducedMotion ? ' maze-still' : ''}`}>
                  <span class="maze-door maze-door-1"></span>
                  <span class="maze-door maze-door-2"></span>
                  <span class="maze-door maze-door-3"></span>
                  {/* The tiny cancel line the ghost drags through the maze. */}
                  <span class="maze-line">Cancel</span>
                </span>

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
              </span>
            ) : null}
            {showSigns && reducedMotion ? (
              <>
                <span class="stirs-label">Something stirs here</span>
                {/* The still pose's caption, beside the ghost: the line sits
                    behind one closed door and the way out is hidden. Decorative
                    and aria-hidden so it adds nothing to the accessible name or
                    to live announcements. */}
                <span class="act-caption" aria-hidden="true">
                  the way out is hidden
                </span>
              </>
            ) : null}
          </button>
        </div>
      </div>
    );
  }
}

/**
 * Bramblegate Fitness, possessed. The engine's `RoomData.Haunted` is a
 * `FunctionComponent`, so the room's entry point is this thin function
 * component; it holds no hooks itself (so it renders fine under the validation
 * gate's bare renderer) and simply renders the account board class with the
 * engine's props.
 */
const Haunted: FunctionComponent<HauntedProps> = (props) => <CellarBoard {...props} />;

export default Haunted;
