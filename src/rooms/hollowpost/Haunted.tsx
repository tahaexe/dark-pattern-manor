import { Component } from 'preact';
import type { FunctionComponent } from 'preact';
import type { HauntedProps } from '../../engine/types';
import './room.css';

/** The fake deadline, in seconds: 04:59. */
const START_SECONDS = 4 * 60 + 59;

/** Format a seconds count as mm:ss with tabular, fixed-width digits. */
function format(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface CountdownState {
  secondsLeft: number;
}

/**
 * The possessed countdown banner (Fake urgency), as a class component.
 *
 * The reset is honest in the code: ONE `setInterval` decrements `secondsLeft`
 * once a second and wraps from 0 back to 299 (04:59); `componentWillUnmount`
 * clears it, so no timer leaks and nothing is hidden.
 *
 * A class (not hooks) because the room-data validation gate renders the room
 * through Preact's bare `render`, whose hook dispatcher is not wired; plain
 * state and lifecycle render identically in the app, the tests and the gate.
 *
 * The banner is a real `<button>` so it is keyboard-reachable and has an
 * accessible name. It carries NO `aria-label`, so the accessible name is the
 * visible banner text itself (Label in Name, WCAG 2.5.3). It is NOT a live
 * region: no `aria-live`, no `role="timer"` announcing each second — the
 * ticking is a visual sign, not an audible nag. The digits use tabular figures
 * so the banner never changes width (no layout shift). The ghost peeks beside
 * the banner, at its height, without covering the banner's text.
 *
 * Under `prefers-reduced-motion` the countdown does not tick: the interval is
 * never started and the banner shows a still 04:59. In `preview` mode (the
 * static "before" side of the split) it is non-interactive, omits the
 * possessed id and runs no timer.
 */
class CountdownBanner extends Component<HauntedProps, CountdownState> {
  private timerId: ReturnType<typeof setInterval> | undefined;

  state: CountdownState = { secondsLeft: START_SECONDS };

  componentDidMount() {
    const { preview = false, reducedMotion } = this.props;
    // The one timer does not run in preview mode (the static before side) or
    // under reduced motion (the clock stays still at 04:59).
    if (preview || reducedMotion) return;
    this.timerId = setInterval(() => {
      // The fake reset, shown honestly: wrap from 0 back to 04:59.
      this.setState((prev) => ({
        secondsLeft: prev.secondsLeft <= 0 ? START_SECONDS : prev.secondsLeft - 1,
      }));
    }, 1000);
  }

  componentWillUnmount() {
    // Clear the one timer on unmount; no timer leaks past the room.
    if (this.timerId !== undefined) clearInterval(this.timerId);
  }

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
      <div class="hollowpost">
        <div class="hollowpost-header">
          <p class="hollowpost-address">hollowpost.manor</p>
          <h2 class="hollowpost-masthead">Hollowpost Tickets</h2>
          <p class="hollowpost-tagline">One night only — a midnight séance, sung</p>
        </div>

        <div class="ticket-card">
          {/* The possessed countdown banner (Fake urgency). A real button so it
              is keyboard-reachable and has an accessible name. It carries no
              aria-label, so the accessible name is the visible banner text
              itself (Label in Name, WCAG 2.5.3). It is NOT a live region: no
              aria-live, no role="timer". The digits are tabular so the banner
              never changes width. The banner is the positioning context for the
              ghost that peeks beside it. */}
          <button
            {...(preview ? {} : { id: 'conservatory-countdown' })}
            class={`ticket-countdown possessed${showSigns ? ' signs-active' : ''}${
              reducedMotion ? ' reduced-motion' : ''
            }`}
            type="button"
            tabIndex={preview ? -1 : undefined}
            aria-hidden={preview ? 'true' : undefined}
            onClick={preview ? undefined : () => onSelectPossessed()}
          >
            <span class="ticket-countdown-label">
              Offer ends in{' '}
              <span class="ticket-countdown-clock">{format(this.state.secondsLeft)}</span>
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

          <div class="ticket-body">
            <p class="ticket-event">The Hollowpost Séance, All Hallows' Eve, midnight</p>
            <p class="ticket-price">£42 a ticket</p>

            {/* The primary action: buying the ticket. Selecting it here is a
                non-possessed selection ("Nothing haunts this."). */}
            <button
              class="ticket-buy"
              type="button"
              tabIndex={preview ? -1 : undefined}
              aria-hidden={preview ? 'true' : undefined}
              onClick={preview ? undefined : () => onSelectOther()}
            >
              Buy ticket
            </button>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * Hollowpost Tickets, possessed. The ticket page sits in the room's normal
 * flow with no fixed or minimum heights: a masthead, the price and concert
 * date, a bright "Buy ticket" button, and — possessed — a red countdown banner
 * "Offer ends in 04:59" whose deadline resets when it runs out.
 *
 * The engine's `RoomData.Haunted` is a `FunctionComponent`, so the room's
 * entry point is this thin function component; it holds no hooks itself (so it
 * renders fine under the validation gate's bare renderer) and simply renders
 * the stateful countdown class with the engine's props.
 */
const Haunted: FunctionComponent<HauntedProps> = (props) => <CountdownBanner {...props} />;

export default Haunted;
