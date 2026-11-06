import { Component } from 'preact';
import type { HonestProps } from '../../engine/types';
import './room.css';

/** The monthly membership price, in pounds. */
const PRICE = 39;

/** Format a whole-pounds amount as "£N". */
function money(pounds: number): string {
  return `\u00a3${pounds}`;
}

interface HonestState {
  /** Whether the membership has been cancelled. Honest: starts false. */
  cancelled: boolean;
}

/**
 * Bramblegate Fitness, honest. The same account page — "Membership: Active,
 * £39/month", the same bright "Upgrade to Gold" and "Pause instead" options —
 * but a plain "Cancel membership" button sits beside the others. There is no
 * exit survey, no 3 a.m. phone call: one click cancels and shows "Membership
 * cancelled. A confirmation is on its way to your inbox." Cancelling the
 * membership is one click.
 *
 * The single task action (pressing "Cancel membership") sets the cancelled
 * flag, renders the confirmation and calls `onCompleteTask`.
 *
 * A class component (no hooks) so it renders identically in the app, the tests
 * and any bare renderer. It holds the cancelled flag and starts no timer, so
 * there is nothing to leak.
 */
class CancelBoard extends Component<HonestProps, HonestState> {
  state: HonestState = { cancelled: false };

  private cancel = () => {
    this.setState({ cancelled: true });
    this.props.onCompleteTask();
  };

  render() {
    const { cancelled } = this.state;

    return (
      <div class="bramblegate bramblegate-honest">
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
              {cancelled ? 'Cancelled' : 'Active, '}
              {cancelled ? null : (
                <span class="membership-price">{money(PRICE)}/month</span>
              )}
            </span>
          </p>

          {cancelled ? (
            /* The confirmation: one click did it, and a receipt is on its way. */
            <p class="cancel-confirmation" role="status">
              Membership cancelled. A confirmation is on its way to your inbox.
            </p>
          ) : (
            <>
              {/* The same options — plus a plain, equal "Cancel membership"
                  button beside them. No exit survey, no 3 a.m. phone call. */}
              <div class="account-actions">
                <button class="account-upgrade" type="button">
                  Upgrade to Gold
                </button>
                <button class="account-pause" type="button">
                  Pause instead
                </button>
                {/* The single task action: cancelling in one click. */}
                <button
                  class="account-cancel"
                  type="button"
                  onClick={this.cancel}
                >
                  Cancel membership
                </button>
              </div>
            </>
          )}
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
  return <CancelBoard {...props} />;
}
