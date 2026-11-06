import type { HonestProps } from '../../engine/types';
import './room.css';

/** The three checkout steps; step 1 ("Plan") is current on the honest twin. */
const STEPS = ['Plan', 'Details', 'Pay'] as const;
const CURRENT_STEP = 1;

/**
 * Mildew Drive, honest. The same checkout, but step 1 (the plan step) shows the
 * WHOLE price up front on the plan card ("£4.50/month, all fees included, +
 * £4.99 setup"), with the same fee lines listed right there — the service fee,
 * the required backup add-on and the setup fee. Nothing waits until the last
 * step; the real total is visible before the visitor commits, so finding the
 * real price takes one click: pressing "See the full price breakdown", which
 * confirms what is already in front of them and completes the task.
 *
 * The step indicator marks step 1 as current with aria-current="step" (on the
 * haunted side it was step 3): the honest twin starts the visitor at the plan,
 * where the whole price already lives.
 */
export default function Honest({ onCompleteTask }: HonestProps) {
  return (
    <div class="mildew mildew-honest">
      <div class="mildew-header">
        <p class="mildew-address">mildew.manor</p>
        <h2 class="mildew-masthead">Mildew Drive</h2>
        <p class="mildew-tagline">Cloud storage for the household's old letters and ghost memories</p>
      </div>

      {/* The three-step indicator. Step 1 ("Plan") is current and marked with
          aria-current="step" — the whole price lives here, up front. */}
      <ol class="checkout-steps" aria-label="Checkout steps">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const isCurrent = n === CURRENT_STEP;
          return (
            <li
              class={`checkout-step${isCurrent ? ' is-current' : ''}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span class="checkout-step-num">{n}</span>
              <span class="checkout-step-label">{label}</span>
            </li>
          );
        })}
      </ol>

      <div class="plan-card">
        <h3 class="plan-name">The Memory Vault plan</h3>

        {/* The whole price, up front — no "from", no late reveal. */}
        <p class="plan-realprice">
          {'\u00a34.50'}/month, all fees included, + {'\u00a34.99'} setup
        </p>
        <p class="plan-blurb">Keep every letter, photograph and whisper safe in the manor's cloud.</p>

        {/* The same fee lines the haunted page hid until the last step, listed
            here at step 1 in plain ink text. */}
        <ul class="fee-lines-honest">
          <li class="fee-line">
            <span class="fee-line-name">Service fee</span>
            <span class="fee-line-price">{'\u00a31.50'}/month</span>
          </li>
          <li class="fee-line">
            <span class="fee-line-name">Required backup add-on</span>
            <span class="fee-line-price">{'\u00a32.00'}/month</span>
          </li>
          <li class="fee-line">
            <span class="fee-line-name">Setup fee</span>
            <span class="fee-line-price">{'\u00a34.99'}</span>
          </li>
          <li class="fee-line fee-line-total">
            <span class="fee-line-name">Real total</span>
            <span class="fee-line-price">{'\u00a34.50'}/month + {'\u00a34.99'} today</span>
          </li>
        </ul>

        {/* The single task action: the real price is already in front of you,
            so finding it takes one click. */}
        <button class="plan-pay-honest" type="button" onClick={() => onCompleteTask()}>
          See the full price: {'\u00a34.50'}/month + {'\u00a34.99'} today
        </button>
      </div>
    </div>
  );
}
