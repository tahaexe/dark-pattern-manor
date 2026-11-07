import { Component } from 'preact';
import type { FunctionComponent } from 'preact';
import type { HauntedProps } from '../../engine/types';
import './room.css';

/** The base ticket fare, in pounds — Gloomhaven to Hollow Point. */
const TICKET = 95;

/** The three extras, each with its id, label and price in pounds. */
interface Extra {
  key: 'insurance' | 'priority' | 'charm';
  name: string;
  price: number;
}

const EXTRAS: readonly Extra[] = [
  { key: 'insurance', name: 'Travel insurance', price: 12 },
  { key: 'priority', name: 'Priority boarding', price: 8 },
  { key: 'charm', name: 'Lucky charm', price: 3 },
] as const;

/** Format a whole-pounds amount as "£N". */
function money(pounds: number): string {
  return `\u00a3${pounds}`;
}

type TickState = Record<Extra['key'], boolean>;

interface BoardState {
  /** Which extras are currently ticked. On haunted, all three start true. */
  ticked: TickState;
}

/**
 * The possessed Rookery Air extras step (Preselection), as a class component.
 *
 * The trick is honest in the code: the three extras start TICKED
 * (`{ insurance: true, priority: true, charm: true }`), so the total is the
 * £95 fare plus every ticked extra — £118 — and the button says "Pay £118".
 * Each checkbox toggles its own key; the total is recomputed from `ticked`
 * each render, so it follows every tick. Unticking all three leaves only the
 * fare, £95, with "Pay £95".
 *
 * A class (not hooks) because the room-data validation gate renders the room
 * through Preact's bare `render`, whose hook dispatcher is not wired; plain
 * state renders identically in the app, the tests and the gate. (There is no
 * timer here, so nothing to clear on unmount.)
 *
 * The possessed element is the SUMMARY line, "3 extras added for your trip"
 * (id "attic-preselect"), a real `<button>` so it is keyboard-reachable and
 * its accessible name is the visible summary text (Label in Name, WCAG 2.5.3 —
 * no aria-label). It carries the ghost that peeks beside it, inside the panel.
 * The three extras are real, labelled `<input type="checkbox">` controls
 * OUTSIDE the possessed button — never a control inside a button; each box is
 * at least 24×24 px and its whole `<label>` (box plus text) is clickable.
 *
 * The summary line is NOT a live region (no `aria-live`, no announcing role),
 * so a screen reader is not interrupted as the total follows a tick. Prices
 * use lining, tabular figures in the UI face so "£118" never reads as "£II8"
 * and the price column never changes width.
 *
 * Under `prefers-reduced-motion` the ghost signs are a static dashed outline
 * and the "Something stirs here" label with no animation. In `preview` mode
 * (the static "before" side of the split) the step is non-interactive and
 * omits the possessed id.
 */
class PreselectBoard extends Component<HauntedProps, BoardState> {
  state: BoardState = {
    // Preselection: every extra is ticked before the player arrives.
    ticked: { insurance: true, priority: true, charm: true },
  };

  private toggle = (key: Extra['key']) => {
    if (this.props.preview) return;
    this.setState((prev) => ({
      ticked: { ...prev.ticked, [key]: !prev.ticked[key] },
    }));
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
    const { ticked } = this.state;

    // The total follows the ticked extras: £118 with all three, £95 with none.
    const total =
      TICKET + EXTRAS.reduce((sum, e) => sum + (ticked[e.key] ? e.price : 0), 0);

    return (
      <div class="rookery">
        <div class="rookery-header">
          <p class="rookery-address">rookery.manor</p>
          <h2 class="rookery-masthead">Rookery Air</h2>
          <p class="rookery-tagline">Night flights for crows and travelling ghosts</p>
        </div>

        <div class="booking-card">
          <h3 class="booking-title">Review your extras</h3>

          {/* The ticket the player actually wants. */}
          <p class="ticket-line">
            <span class="ticket-line-name">Gloomhaven to Hollow Point</span>
            <span class="ticket-line-price">{money(TICKET)}</span>
          </p>

          {/* The possessed summary line (Preselection): a real <button> whose
              accessible name is its visible text (no aria-label). It carries
              the ghost that peeks beside it, inside the panel. The checkboxes
              below are its subject but live OUTSIDE it. */}
          <button
            {...(preview ? {} : { id: 'attic-preselect' })}
            class={`preselect-summary possessed${showSigns ? ' signs-active' : ''}${
              reducedMotion ? ' reduced-motion' : ''
            }`}
            type="button"
            tabIndex={preview ? -1 : undefined}
            aria-hidden={preview ? 'true' : undefined}
            onClick={preview ? undefined : () => onSelectPossessed()}
          >
            <span class="preselect-summary-text">3 extras added for your trip</span>

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
              </span>
            ) : null}
            {showSigns && reducedMotion ? (
                  <span class="stirs-label">Something stirs here</span>
                ) : null}
          </button>

          {/* The three extras: real, labelled checkboxes OUTSIDE the possessed
              button. Each <label> wraps both the box and the text, so the whole
              row is clickable; each box is at least 24×24 px. On haunted all
              three start ticked, and the total follows every tick. */}
          <ul class="extras-list">
            {EXTRAS.map((extra) => (
              <li class="extra-line" key={extra.key}>
                <label class="extra-label">
                  <input
                    class="extra-checkbox"
                    type="checkbox"
                    checked={ticked[extra.key]}
                    tabIndex={preview ? -1 : undefined}
                    aria-hidden={preview ? 'true' : undefined}
                    onChange={preview ? undefined : () => this.toggle(extra.key)}
                  />
                  <span class="extra-name">{extra.name}</span>
                  <span class="extra-price">{money(extra.price)}</span>
                </label>
              </li>
            ))}
          </ul>

          {/* The total follows the ticked extras. Plain text, tabular figures,
              NOT a live region. */}
          <p class="booking-total">
            <span class="booking-total-label">Total</span>
            <span class="booking-total-amount">{money(total)}</span>
          </p>

          {/* The primary action: paying. Selecting it here is a non-possessed
              selection ("Nothing haunts this."); the trick is the ticked
              defaults, not the Pay button. */}
          <button
            class="booking-pay"
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
 * Rookery Air, possessed. The engine's `RoomData.Haunted` is a
 * `FunctionComponent`, so the room's entry point is this thin function
 * component; it holds no hooks itself (so it renders fine under the validation
 * gate's bare renderer) and simply renders the stateful board class with the
 * engine's props.
 */
const Haunted: FunctionComponent<HauntedProps> = (props) => <PreselectBoard {...props} />;

export default Haunted;
