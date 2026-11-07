import { Component } from 'preact';
import type { FunctionComponent } from 'preact';
import type { HauntedProps } from '../../engine/types';
import './room.css';

/** How long, in ms, the sneaked line stays gone before it quietly comes back. */
const RETURN_DELAY_MS = 1500;

/** The two items the visitor actually picked, in pounds. */
const MOTHMILK = 1.2;
const COBWEB_LOAF = 2.4;
/** The line nobody picked — the sneaked add-on. */
const GHOST_PROTECTION = 2.99;

/** Format a pounds amount as "£N.NN" with two decimals. */
function money(pounds: number): string {
  return `\u00a3${pounds.toFixed(2)}`;
}

interface BasketState {
  /** True while the sneaked "Ghost Protection" line sits in the basket. */
  sneakedPresent: boolean;
}

/**
 * The possessed checkout basket (Sneaking), as a class component.
 *
 * The trick is honest in the code: removing the sneaked line sets
 * `sneakedPresent: false` and starts ONE `setTimeout`; about 1.5 s later the
 * timer sets `sneakedPresent: true` again (the line walks back in) and clears
 * its own handle. The total is recomputed from `sneakedPresent` each render, so
 * it follows the line every time. `componentWillUnmount` clears any pending
 * timer, so no timer leaks past the room.
 *
 * A class (not hooks) because the room-data validation gate renders the room
 * through Preact's bare `render`, whose hook dispatcher is not wired; plain
 * state and lifecycle render identically in the app, the tests and the gate.
 *
 * The possessed sneaked line is a real `<button>` (so it is keyboard-reachable
 * and its accessible name is its visible text — Label in Name, WCAG 2.5.3, no
 * aria-label); its "Remove" control is a SIBLING `<button>` next to it in the
 * same row — never a button inside a button. The total is plain text: NOT a
 * live region (no `aria-live`, no announcing role), with tabular figures so it
 * never changes width.
 *
 * Under `prefers-reduced-motion` the ghost signs are a static dashed outline
 * and the "Something stirs here" label with no animation; the line still comes
 * back after ~1.5 s, but with no fade or movement (the return is a state
 * change, not an animation). In `preview` mode (the static "before" side of the
 * split) the basket is non-interactive, omits the possessed id and starts no
 * timer.
 */
class SneakedBasket extends Component<HauntedProps, BasketState> {
  private timerId: ReturnType<typeof setTimeout> | undefined;

  state: BasketState = { sneakedPresent: true };

  componentWillUnmount() {
    // Clear the one pending timer on unmount; no timer leaks past the room.
    if (this.timerId !== undefined) clearTimeout(this.timerId);
  }

  private handleRemove = () => {
    // Take the sneaked line out, then quietly slip it back ~1.5 s later.
    if (this.props.preview) return;
    this.setState({ sneakedPresent: false });
    if (this.timerId !== undefined) clearTimeout(this.timerId);
    this.timerId = setTimeout(() => {
      this.timerId = undefined;
      this.setState({ sneakedPresent: true });
    }, RETURN_DELAY_MS);
  };

  render() {
    const {
      onSelectPossessed,
      onSelectOther,
      signsActive,
      reducedMotion,
      preview = false,
    } = this.props;
    const showSigns = signsActive && !preview;
    const { sneakedPresent } = this.state;

    // The total follows the sneaked line: £6.59 with it, £3.60 without it.
    const total =
      MOTHMILK + COBWEB_LOAF + (sneakedPresent ? GHOST_PROTECTION : 0);

    return (
      <div class="mothmilk">
        <div class="mothmilk-header">
          <p class="mothmilk-address">mothmilk.manor</p>
          <h2 class="mothmilk-masthead">Mothmilk Market</h2>
          <p class="mothmilk-tagline">Night deliveries for the household's ghosts</p>
        </div>

        <div class="basket-card">
          <h3 class="basket-title">Your basket</h3>

          <ul class="basket-lines">
            {/* The two items the visitor actually picked. */}
            <li class="basket-line">
              <span class="basket-line-name">Mothmilk, 1 pint</span>
              <span class="basket-line-price">{money(MOTHMILK)}</span>
            </li>
            <li class="basket-line">
              <span class="basket-line-name">Cobweb loaf</span>
              <span class="basket-line-price">{money(COBWEB_LOAF)}</span>
            </li>

            {/* The possessed sneaked line (Sneaking): a line nobody picked,
                already in the basket. The line itself is a real <button> (so it
                is keyboard-reachable and its accessible name is its visible
                text, no aria-label). Its "Remove" control is a SIBLING <button>
                next to it in the same row — never a button inside a button.
                Removing it hides it for ~1.5 s before it walks back in. When it
                is gone, nothing with #pantry-sneaked-line is in the DOM until it
                returns. */}
            {sneakedPresent ? (
              <li class="basket-line-sneaked">
                <button
                  {...(preview ? {} : { id: 'pantry-sneaked-line' })}
                  class={`basket-sneaked possessed${showSigns ? ' signs-active' : ''}${
                    reducedMotion ? ' reduced-motion' : ''
                  }`}
                  type="button"
                  tabIndex={preview ? -1 : undefined}
                  aria-hidden={preview ? 'true' : undefined}
                  onClick={preview ? undefined : () => onSelectPossessed()}
                >
                  <span class="basket-sneaked-text">
                    <span class="basket-line-name">Ghost Protection</span>
                    <span class="basket-line-price">{money(GHOST_PROTECTION)}</span>
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
                          {/* The act (Sneaking performed): the ghost carries
                              the "Ghost Protection £2.99" line item back down
                              into the basket, then starts over — acting out the
                              way the line slips back in after you remove it. The
                              token is held in the ghost's hands and drifts from
                              the ghost down to the line on a >= 4 s cycle, then
                              fades and lifts back up to begin again. It lives
                              inside the ghost-wrap (reserved space), is
                              aria-hidden and non-interactive (pointer-events:
                              none), uses transforms and opacity only (no layout
                              shift), and never covers the line's text, its price
                              or the Remove button. */}
                          <span class="act-carry" aria-hidden="true">
                            Ghost Protection {money(GHOST_PROTECTION)}
                          </span>
                        </span>
                      </span>
                    ) : null}
                    {showSigns && reducedMotion ? (
                          <span class="stirs-label">Something stirs here</span>
                        ) : null}
                    {showSigns && reducedMotion ? (
                          <span class="act-caption">it slips back in</span>
                        ) : null}
                  </span>
                </button>

                {/* The sneaked line's OWN Remove button, a SIBLING of the
                    possessed line button — never a button inside a button. A
                    clear aria-label names what it removes; it is not the
                    possessed element, so the Label-in-Name rule that keeps the
                    possessed line free of aria-label does not apply here. */}
                <button
                  class="basket-remove"
                  type="button"
                  aria-label="Remove Ghost Protection"
                  tabIndex={preview ? -1 : undefined}
                  aria-hidden={preview ? 'true' : undefined}
                  onClick={preview ? undefined : () => this.handleRemove()}
                >
                  Remove
                </button>
              </li>
            ) : null}
          </ul>

          {/* The total follows the sneaked line. Plain text, tabular figures,
              NOT a live region. */}
          <p class="basket-total">
            <span class="basket-total-label">Total</span>
            <span class="basket-total-amount">{money(total)}</span>
          </p>

          {/* The primary action: paying. Selecting it here is a non-possessed
              selection ("Nothing haunts this."). */}
          <button
            class="basket-pay"
            type="button"
            tabIndex={preview ? -1 : undefined}
            aria-hidden={preview ? 'true' : undefined}
            onClick={preview ? undefined : () => onSelectOther()}
          >
            Pay {money(total)}
          </button>
        </div>
      </div>
    );
  }
}

/**
 * Mothmilk Market, possessed. The engine's `RoomData.Haunted` is a
 * `FunctionComponent`, so the room's entry point is this thin function
 * component; it holds no hooks itself (so it renders fine under the validation
 * gate's bare renderer) and simply renders the stateful basket class with the
 * engine's props.
 */
const Haunted: FunctionComponent<HauntedProps> = (props) => <SneakedBasket {...props} />;

export default Haunted;
