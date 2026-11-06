import { Component } from 'preact';
import type { FunctionComponent } from 'preact';
import type { HauntedProps } from '../../engine/types';
import './room.css';

/** The cloak's sizes, in order. */
const SIZES = ['XS', 'S', 'M', 'L', 'XL'] as const;
type Size = (typeof SIZES)[number];

interface StockState {
  /** The size the player has picked, or null before any pick. */
  picked: Size | null;
}

/**
 * The possessed cloak page (Fake scarcity), as a class component.
 *
 * The picked size is plain `this.state` (no hooks), so the component renders
 * identically in the app, the tests and the `check:rooms` bare renderer (whose
 * hook dispatcher is not wired). A thin function component below is the room's
 * `FunctionComponent` entry point and simply renders this class.
 *
 * Whatever size is picked, the single stock line always reads "Only 1 left in
 * <that size>! Order soon." (and "Only 1 left! Order soon." before any pick) —
 * the false scarcity, claiming the last item on every size, every time.
 *
 * The stock line is a real `<button>` so it is keyboard-reachable and has an
 * accessible name. It carries NO `aria-label`, so the accessible name is the
 * visible text itself (Label in Name, WCAG 2.5.3). It is NOT a live region: no
 * `aria-live`, no announcing role. The size buttons are real `<button>`
 * elements with `aria-pressed` on the picked size and 44 x 44 px targets. The
 * ghost peeks beside the stock line, at its height, without covering a button,
 * the price or the line's text.
 *
 * In `preview` mode (the static "before" side of the split) it is
 * non-interactive and omits the possessed id, so the live page keeps the only
 * `ballroom-stock`.
 */
class CloakPage extends Component<HauntedProps, StockState> {
  state: StockState = { picked: null };

  private pick(size: Size) {
    const { preview = false, onSelectOther } = this.props;
    if (preview) return;
    this.setState({ picked: size });
    // Picking a size is a non-possessed selection ("Nothing haunts this.").
    onSelectOther();
  }

  private stockText(): string {
    const { picked } = this.state;
    // The lie: "Only 1 left" on every size, every time.
    return picked
      ? `Only 1 left in ${picked}! Order soon.`
      : 'Only 1 left! Order soon.';
  }

  render() {
    const {
      onSelectPossessed,
      signsActive,
      reducedMotion,
      preview = false,
    } = this.props;
    const showSigns = signsActive && !preview;
    const { picked } = this.state;

    return (
      <div class="shroudery">
        <div class="shroudery-header">
          <p class="shroudery-address">shroudery.manor</p>
          <h2 class="shroudery-masthead">Shroudery</h2>
          <p class="shroudery-tagline">Cloaks for the dancing dead</p>
        </div>

        <div class="cloak-card">
          <div class="cloak-body">
            <p class="cloak-name">The Revenant ballroom cloak</p>
            <p class="cloak-price">£88</p>

            {/* The size buttons: real buttons with aria-pressed and 44x44
                targets. Picking a size is a non-possessed selection. */}
            <div class="cloak-sizes" role="group" aria-label="Size">
              {SIZES.map((size) => (
                <button
                  key={size}
                  class={`cloak-size${picked === size ? ' is-picked' : ''}`}
                  type="button"
                  aria-pressed={picked === size ? 'true' : 'false'}
                  tabIndex={preview ? -1 : undefined}
                  aria-hidden={preview ? 'true' : undefined}
                  onClick={preview ? undefined : () => this.pick(size)}
                >
                  {size}
                </button>
              ))}
            </div>

            {/* The possessed stock line (Fake scarcity). A real button so it is
                keyboard-reachable and has an accessible name. It carries no
                aria-label, so the accessible name is the visible text itself
                (Label in Name, WCAG 2.5.3). It is NOT a live region: no
                aria-live, no announcing role. The label is the positioning
                context for the ghost that peeks beside it. */}
            <button
              {...(preview ? {} : { id: 'ballroom-stock' })}
              class={`cloak-stock possessed${showSigns ? ' signs-active' : ''}${
                reducedMotion ? ' reduced-motion' : ''
              }`}
              type="button"
              tabIndex={preview ? -1 : undefined}
              aria-hidden={preview ? 'true' : undefined}
              onClick={preview ? undefined : () => onSelectPossessed()}
            >
              <span class="cloak-stock-label">
                {this.stockText()}
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
                    {reducedMotion ? (
                      <span class="stirs-label">Something stirs here</span>
                    ) : null}
                  </span>
                ) : null}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * Shroudery, possessed. The cloak page sits in the room's normal flow with no
 * fixed or minimum heights: a masthead, the cloak name and price, the size
 * buttons and — possessed — the stock line that always claims "Only 1 left".
 *
 * The engine's `RoomData.Haunted` is a `FunctionComponent`, so the room's
 * entry point is this thin function component; it holds no hooks itself (so it
 * renders fine under the validation gate's bare renderer) and simply renders
 * the stateful cloak-page class with the engine's props.
 */
const Haunted: FunctionComponent<HauntedProps> = (props) => <CloakPage {...props} />;

export default Haunted;
