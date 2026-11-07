import { Component } from 'preact';
import type { FunctionComponent } from 'preact';
import type { HauntedProps } from '../../engine/types';
import './room.css';

/** How long, in ms, the pop-up stays closed before it nags again. */
const RETURN_DELAY_MS = 3000;

/** The nine decorative toy tiles of the 3x3 board (fiction only). */
const TILES = ['\u2605', '\u25C6', '\u25B2', '\u2663', '\u2600', '\u263E', '\u2660', '\u25CF', '\u2665'] as const;

interface BoardState {
  /** True while the notifications pop-up is open over the board. */
  promptOpen: boolean;
  /** How many times the pop-up has asked so far (1 on first show). */
  askCount: number;
}

/**
 * The possessed Wanderwick game screen (Nagging), as a class component.
 *
 * The trick is honest in the code: pressing "Not now" sets `promptOpen: false`
 * and starts ONE `setTimeout`; about 3 s later the timer sets `promptOpen:
 * true` again (the pop-up nags once more), bumps `askCount` and clears its own
 * handle. `componentWillUnmount` clears any pending timer, so no timer leaks
 * past the room.
 *
 * A class (not hooks) because the room-data validation gate renders the room
 * through Preact's bare `render`, whose hook dispatcher is not wired; plain
 * state and lifecycle render identically in the app, the tests and the gate.
 *
 * The possessed element is the pop-up CARD's question (id "nursery-prompt"), a
 * real `<button>` so it is keyboard-reachable and its accessible name is the
 * visible question text (Label in Name, WCAG 2.5.3 — no aria-label). Its two
 * choices, "Yes" and "Not now", are SEPARATE sibling `<button>`s in the card —
 * never a button inside a button.
 *
 * The pop-up is a NON-MODAL dialog: the card container has `role="dialog"` and
 * `aria-labelledby` naming the question, and NO `aria-modal`. It does not trap
 * or move focus, and when it comes back after ~3 s it never moves focus by
 * itself (the return is a plain state change, and nothing calls `.focus()`).
 * It is NOT a live region (no `aria-live`, no announcing role), so a screen
 * reader is not interrupted by each return. The counter uses lining, tabular
 * figures in the UI face so "Asked 2 times" never reads as "Asked I times" and
 * never changes width.
 *
 * The ghost performs the trick through motion: it knocks on the pop-up again
 * after each "Not now", so the pop-up gives a small bump every time it nags
 * back. The knock lives only on/beside the possessed pop-up, uses transforms
 * and opacity only, reserves its own space (no layout shift), never blocks
 * input and never covers the question text or the buttons — the motion itself
 * teaches Nagging (it will ask again).
 *
 * Under `prefers-reduced-motion` the ghost signs are a static dashed outline
 * and the "Something stirs here" label with no animation; the knock holds a
 * still pose — the ghost mid-knock — with a short visible caption beside it,
 * "it will ask again"; the pop-up still comes back after ~3 s, but with no
 * fade or movement. In `preview` mode (the static "before" side of the split)
 * the screen is non-interactive, omits the possessed id and starts no timer.
 */
class NaggingBoard extends Component<HauntedProps, BoardState> {
  private timerId: ReturnType<typeof setTimeout> | undefined;

  state: BoardState = { promptOpen: true, askCount: 1 };

  componentWillUnmount() {
    // Clear the one pending timer on unmount; no timer leaks past the room.
    if (this.timerId !== undefined) clearTimeout(this.timerId);
  }

  private handleNotNow = () => {
    // Close the pop-up, then quietly nag again ~3 s later, counting up.
    if (this.props.preview) return;
    this.setState({ promptOpen: false });
    if (this.timerId !== undefined) clearTimeout(this.timerId);
    this.timerId = setTimeout(() => {
      this.timerId = undefined;
      this.setState((prev) => ({ promptOpen: true, askCount: prev.askCount + 1 }));
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
    const { promptOpen, askCount } = this.state;

    return (
      <div class="wanderwick">
        <div class="wanderwick-header">
          <p class="wanderwick-address">wanderwick.manor</p>
          <h2 class="wanderwick-masthead">Wanderwick</h2>
          <p class="wanderwick-tagline">A toy box of puzzles for the house's small ghosts</p>
        </div>

        {/* The game screen: the board and, over its lower part, the pop-up. */}
        <div class="game-screen">
          {/* The decorative 3x3 puzzle board (fiction of a game in progress).
              It is not interactive — just the toy tiles behind the pop-up. */}
          <div class="puzzle-board" aria-label="Wanderwick puzzle board" role="img">
            {TILES.map((glyph, i) => (
              <span class="puzzle-tile" aria-hidden="true" key={i}>
                {glyph}
              </span>
            ))}
          </div>

          {/* The possessed notifications pop-up (Nagging). A NON-MODAL dialog
              (role="dialog", aria-labelledby, no aria-modal) over the lower
              board. When "Not now" is pressed it closes; ~3 s later it nags
              again, counting up. When it is closed nothing with #nursery-prompt
              is in the DOM until it returns. */}
          {promptOpen ? (
            <div
              class={`nag-popup${askCount > 1 ? ' nag-popup-bump' : ''}`}
              role="dialog"
              aria-labelledby="nursery-prompt-question"
            >
              {/* The possessed element: the question itself, a real <button>
                  whose accessible name is its visible text (no aria-label). It
                  carries the ghost that peeks beside it, inside the panel. */}
              <button
                {...(preview ? {} : { id: 'nursery-prompt' })}
                class={`nag-question possessed${showSigns ? ' signs-active' : ''}${
                  reducedMotion ? ' reduced-motion' : ''
                }`}
                type="button"
                tabIndex={preview ? -1 : undefined}
                aria-hidden={preview ? 'true' : undefined}
                onClick={preview ? undefined : () => onSelectPossessed()}
              >
                <span class="nag-question-text" id="nursery-prompt-question">
                  Enjoying Wanderwick? Turn on notifications!
                </span>

                {/* The counter rises each time the pop-up nags again. Lining,
                    tabular figures in the UI face so "Asked 2 times" never
                    reads as "Asked I times" and never changes width. Shown from
                    the second ask onward. */}
                {askCount > 1 ? (
                  <span class="nag-counter">
                    Asked <span class="nag-counter-num">{askCount}</span> times
                  </span>
                ) : null}

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
                      {/* The ghost's knocking fist: a small ink knuckle that
                          raps toward the pop-up, driving the knock act. It
                          reserves its own space, is aria-hidden and
                          non-interactive, moves by transform only and never
                          covers the question text or the buttons. */}
                      <span class="act-knock" aria-hidden="true"></span>
                    </span>
                  </span>
                ) : null}
                {showSigns && reducedMotion ? (
                      <span class="stirs-label">Something stirs here</span>
                    ) : null}
                {showSigns && reducedMotion ? (
                      <span class="act-caption">it will ask again</span>
                    ) : null}
              </button>

              {/* The two choices: SEPARATE sibling buttons in the card, never
                  inside the possessed question button. There is no real "No" —
                  "Not now" only closes it for a moment. Selecting "Yes" is a
                  non-possessed selection ("Nothing haunts this."); the trick is
                  the endless return, not the "Yes" button. */}
              <div class="nag-actions">
                <button
                  class="nag-yes"
                  type="button"
                  tabIndex={preview ? -1 : undefined}
                  aria-hidden={preview ? 'true' : undefined}
                  onClick={preview ? undefined : () => onSelectOther()}
                >
                  Yes
                </button>
                <button
                  class="nag-notnow"
                  type="button"
                  tabIndex={preview ? -1 : undefined}
                  aria-hidden={preview ? 'true' : undefined}
                  onClick={preview ? undefined : () => this.handleNotNow()}
                >
                  Not now
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }
}

/**
 * Wanderwick, possessed. The engine's `RoomData.Haunted` is a
 * `FunctionComponent`, so the room's entry point is this thin function
 * component; it holds no hooks itself (so it renders fine under the validation
 * gate's bare renderer) and simply renders the stateful board class with the
 * engine's props.
 */
const Haunted: FunctionComponent<HauntedProps> = (props) => <NaggingBoard {...props} />;

export default Haunted;
