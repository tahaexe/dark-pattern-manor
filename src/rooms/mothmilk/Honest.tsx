import type { HonestProps } from '../../engine/types';
import './room.css';

/**
 * Mothmilk Market, honest. The same basket, but it holds only the two items
 * the visitor picked ("Mothmilk, 1 pint £1.20", "Cobweb loaf £2.40") and a
 * total of £3.60 — nothing sneaks in. Ghost Protection is still offered, but
 * OUTSIDE the basket, as an unticked, plainly priced option the visitor can
 * choose for themselves (the real best practice, no Sneaking). With nothing
 * added behind the visitor's back, paying only for what you picked takes one
 * click: pressing "Pay £3.60".
 */
export default function Honest({ onCompleteTask }: HonestProps) {
  return (
    <div class="mothmilk mothmilk-honest">
      <div class="mothmilk-header">
        <p class="mothmilk-address">mothmilk.manor</p>
        <h2 class="mothmilk-masthead">Mothmilk Market</h2>
        <p class="mothmilk-tagline">Night deliveries for the household's ghosts</p>
      </div>

      <div class="basket-card">
        <h3 class="basket-title">Your basket</h3>

        {/* Only the two items the visitor actually picked. */}
        <ul class="basket-lines">
          <li class="basket-line">
            <span class="basket-line-name">Mothmilk, 1 pint</span>
            <span class="basket-line-price">{'\u00a31.20'}</span>
          </li>
          <li class="basket-line">
            <span class="basket-line-name">Cobweb loaf</span>
            <span class="basket-line-price">{'\u00a32.40'}</span>
          </li>
        </ul>

        {/* The total of only what was picked — no sneaked line. */}
        <p class="basket-total">
          <span class="basket-total-label">Total</span>
          <span class="basket-total-amount">{'\u00a33.60'}</span>
        </p>

        {/* The single task action: paying only for what you picked, in one
            click. */}
        <button class="basket-pay-honest" type="button" onClick={() => onCompleteTask()}>
          Pay {'\u00a33.60'}
        </button>
      </div>

      {/* Ghost Protection offered OUTSIDE the basket as an unticked, plainly
          priced option — the visitor chooses it for themselves, nothing is
          added behind their back. */}
      <div class="addon-offer">
        <input type="checkbox" id="mothmilk-ghost-protection" checked={false} />
        <label for="mothmilk-ghost-protection">
          Add Ghost Protection for <span class="addon-price">{'\u00a32.99'}</span> — optional cover
          against things that go bump in your delivery.
        </label>
      </div>
    </div>
  );
}
