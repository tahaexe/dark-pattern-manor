import { Component } from 'preact';
import type { HonestProps } from '../../engine/types';
import './room.css';

/** The nine decorative toy tiles of the 3x3 board (fiction only). */
const TILES = ['\u2605', '\u25C6', '\u25B2', '\u2663', '\u2600', '\u263E', '\u2660', '\u25CF', '\u2665'] as const;

interface HonestState {
  /** True while the one, honest prompt is still showing. */
  promptOpen: boolean;
}

/**
 * Wanderwick, honest. The same board and one prompt — but it offers a real way
 * out: "Turn on" and "No, don't ask again". Pressing EITHER choice dismisses
 * the prompt for good; it never returns (no timer, no nagging), so the player
 * is back to keeping playing in one click. The single task action, pressing
 * either choice, calls `onCompleteTask`.
 *
 * A class component (no hooks) so it renders identically in the app, the tests
 * and any bare renderer. It holds one boolean and starts no timer, so there is
 * nothing to leak.
 */
class HonestBoard extends Component<HonestProps, HonestState> {
  state: HonestState = { promptOpen: true };

  private dismissForGood = () => {
    // One click ends the prompt for good — it never returns.
    this.setState({ promptOpen: false });
    this.props.onCompleteTask();
  };

  render() {
    const { promptOpen } = this.state;

    return (
      <div class="wanderwick wanderwick-honest">
        <div class="wanderwick-header">
          <p class="wanderwick-address">wanderwick.manor</p>
          <h2 class="wanderwick-masthead">Wanderwick</h2>
          <p class="wanderwick-tagline">A toy box of puzzles for the house's small ghosts</p>
        </div>

        <div class="game-screen">
          <div class="puzzle-board" aria-label="Wanderwick puzzle board" role="img">
            {TILES.map((glyph, i) => (
              <span class="puzzle-tile" aria-hidden="true" key={i}>
                {glyph}
              </span>
            ))}
          </div>

          {/* The one honest prompt: a real choice with a real "No, don't ask
              again". Once either choice is pressed the prompt is gone for good
              and never returns (no sneaked #nursery-prompt, no timer). */}
          {promptOpen ? (
            <div
              class="nag-popup nag-popup-honest"
              role="dialog"
              aria-labelledby="nursery-honest-question"
            >
              <p class="nag-question-honest" id="nursery-honest-question">
                Turn on notifications for Wanderwick?
              </p>
              <div class="nag-actions">
                <button class="nag-turnon" type="button" onClick={this.dismissForGood}>
                  Turn on
                </button>
                <button class="nag-nomore" type="button" onClick={this.dismissForGood}>
                  No, don't ask again
                </button>
              </div>
            </div>
          ) : (
            <p class="nag-dismissed" role="status">
              Back to your puzzle — play on.
            </p>
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
  return <HonestBoard {...props} />;
}
