import type { HonestProps } from '../../engine/types';
import './room.css';

/**
 * The Gravemoor Gazette, honest. "Reject all" and "Accept all" are the same
 * kind of button — equal size, padding and fill — so the quiet choice is as
 * easy to find as the loud one (the real best practice, no Visual
 * interference). The task "reject the cookies" completes in one click.
 */
export default function Honest({ onCompleteTask }: HonestProps) {
  return (
    <div class="gazette gazette-honest">
      <div class="gazette-header">
        <p class="gazette-address">gravemoor-gazette.manor</p>
        <h2 class="gazette-masthead">The Gravemoor Gazette</h2>
      </div>

      <article class="gazette-content">
        <h3>Fog rolls in over the moor</h3>
        <p>
          Lamplighters report the thickest fog in forty years. The ferry to Hollow Point will run at
          half speed until Thursday, and the night editor asks readers to keep a candle in the window.
        </p>
      </article>

      <div class="cookie-banner-honest">
        <div class="cookie-text">
          <p class="cookie-title-honest">We value your privacy</p>
          <p class="cookie-description-honest">
            We and our 1,312 partners use cookies to personalise your experience.
          </p>
        </div>
        <div class="cookie-buttons-equal">
          <button class="cookie-button-equal" type="button" onClick={() => onCompleteTask()}>
            Reject all
          </button>
          <button class="cookie-button-equal" type="button">
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
