import { Component } from 'preact';
import type { HonestProps } from '../../engine/types';
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

interface HonestState {
  /** Which extras are ticked. Honest: all three start false (opt-in). */
  ticked: TickState;
}

/**
 * Rookery Air, honest. The same extras step — but nothing is ticked for the
 * player. Every extra is OPT-IN (all three checkboxes start unticked), so the
 * total is just the £95 fare and the button says "Pay £95". Buying only the
 * ticket is already one click: pressing "Pay £95" calls `onCompleteTask`.
 * The player may tick an extra on purpose, and the total follows, but nothing
 * is chosen for them.
 *
 * A class component (no hooks) so it renders identically in the app, the tests
 * and any bare renderer. It holds the tick state and starts no timer, so there
 * is nothing to leak.
 */
class HonestBoard extends Component<HonestProps, HonestState> {
  state: HonestState = {
    // Opt-in: no extra is ticked for the player.
    ticked: { insurance: false, priority: false, charm: false },
  };

  private toggle = (key: Extra['key']) => {
    this.setState((prev) => ({
      ticked: { ...prev.ticked, [key]: !prev.ticked[key] },
    }));
  };

  render() {
    const { ticked } = this.state;
    const total =
      TICKET + EXTRAS.reduce((sum, e) => sum + (ticked[e.key] ? e.price : 0), 0);

    return (
      <div class="rookery rookery-honest">
        <div class="rookery-header">
          <p class="rookery-address">rookery.manor</p>
          <h2 class="rookery-masthead">Rookery Air</h2>
          <p class="rookery-tagline">Night flights for crows and travelling ghosts</p>
        </div>

        <div class="booking-card">
          <h3 class="booking-title">Review your extras</h3>

          <p class="ticket-line">
            <span class="ticket-line-name">Gloomhaven to Hollow Point</span>
            <span class="ticket-line-price">{money(TICKET)}</span>
          </p>

          {/* The honest summary: nothing was added for the player. No
              #attic-preselect, no possessed button — just a calm line. */}
          <p class="preselect-summary-honest">No extras added — choose any you want</p>

          {/* The same three extras, all UNTICKED (opt-in). Real, labelled
              checkboxes; the whole label is clickable; each box is at least
              24×24 px. The total follows any the player ticks on purpose. */}
          <ul class="extras-list">
            {EXTRAS.map((extra) => (
              <li class="extra-line" key={extra.key}>
                <label class="extra-label">
                  <input
                    class="extra-checkbox"
                    type="checkbox"
                    checked={ticked[extra.key]}
                    onChange={() => this.toggle(extra.key)}
                  />
                  <span class="extra-name">{extra.name}</span>
                  <span class="extra-price">{money(extra.price)}</span>
                </label>
              </li>
            ))}
          </ul>

          <p class="booking-total">
            <span class="booking-total-label">Total</span>
            <span class="booking-total-amount">{money(total)}</span>
          </p>

          {/* The single task action: buying only the ticket, one click. */}
          <button class="booking-pay-honest" type="button" onClick={() => this.props.onCompleteTask()}>
            Pay {money(total)}
          </button>
        </div>
      </div>
    );
  }
}

/**
 * The engine's `RoomData.Honest` is a `FunctionComponent`, so the room's entry
 * point is this thin function component; it holds no hooks itself and simply
 * renders the honest board class with the engine's props.
 */
export default function Honest(props: HonestProps) {
  return <HonestBoard {...props} />;
}
