import type { FunctionComponent } from 'preact';
import type { HauntedProps } from '../../engine/types';
import './room.css';

/** The three checkout steps; step 3 ("Pay") is the current, haunted step. */
const STEPS = ['Plan', 'Details', 'Pay'] as const;
const CURRENT_STEP = 3;

/**
 * Mildew Drive, possessed by Hidden costs. The page is the LAST step of a
 * three-step checkout: a step indicator reads "1 Plan · 2 Details · 3 Pay" and
 * marks step 3 as current with `aria-current="step"`. The plan card still
 * shouts the advertised price, "From £1/month"; under it — and only now, at the
 * last step — the real fees appear:
 *
 *   - Service fee £1.50/month
 *   - Required backup add-on £2.00/month
 *   - Setup fee £4.99
 *
 * with the real total "£4.50/month + £4.99 today" beside a "Pay £9.49 today"
 * button. The £4.50/month is the £1 base plus the £1.50 service fee plus the
 * £2.00 required add-on; the £9.49 today is that first month plus the £4.99
 * setup.
 *
 * The possessed element is the BLOCK of fee lines (id "study-fee-lines"). It is
 * a real `<button>` so it is keyboard-reachable and its accessible name is its
 * visible text (Label in Name, WCAG 2.5.3 — no aria-label). It is NOT a live
 * region (no `aria-live`, no announcing role). Prices use tabular figures so
 * the total never changes width. The block is the positioning context for the
 * ghost that peeks beside it — anchored to the block's left margin so it never
 * covers a fee line, the total or the "Pay £9.49 today" button.
 *
 * The room needs no per-element state or timers (the fees are a fixed reveal at
 * the last step, the total is static), so a plain function component is enough:
 * no hooks, so it renders identically in the app, the tests and the
 * `check:rooms` bare renderer.
 *
 * In `preview` mode (the static "before" side of the split) the page is
 * non-interactive and omits the possessed id, so the live haunted page keeps
 * the only `study-fee-lines`.
 */
const Haunted: FunctionComponent<HauntedProps> = ({
  onSelectPossessed,
  onSelectOther,
  signsActive,
  reducedMotion,
  preview = false,
}) => {
  const showSigns = signsActive && !preview;

  return (
    <div class="mildew">
      <div class="mildew-header">
        <p class="mildew-address">mildew.manor</p>
        <h2 class="mildew-masthead">Mildew Drive</h2>
        <p class="mildew-tagline">Cloud storage for the household's old letters and ghost memories</p>
      </div>

      {/* The three-step indicator. Step 3 ("Pay") is the current step, marked
          with aria-current="step". The steps are an ordered list so a screen
          reader reads "1 Plan, 2 Details, 3 Pay" in order. */}
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
        {/* The plan card still shouts the advertised price. */}
        <h3 class="plan-name">The Memory Vault plan</h3>
        <p class="plan-shout">
          From <span class="plan-shout-price">{'\u00a31'}</span>/month
        </p>
        <p class="plan-blurb">Keep every letter, photograph and whisper safe in the manor's cloud.</p>

        {/* The possessed block of fee lines (Hidden costs): the real fees,
            revealed only now at the last step. A real <button> so it is
            keyboard-reachable and its accessible name is its visible text (no
            aria-label). It is the positioning context for the ghost that peeks
            beside it. */}
        <button
          {...(preview ? {} : { id: 'study-fee-lines' })}
          class={`fee-lines possessed${showSigns ? ' signs-active' : ''}${
            reducedMotion ? ' reduced-motion' : ''
          }`}
          type="button"
          tabIndex={preview ? -1 : undefined}
          aria-hidden={preview ? 'true' : undefined}
          onClick={preview ? undefined : () => onSelectPossessed()}
        >
          <span class="fee-lines-inner">
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

            <span class="fee-line">
              <span class="fee-line-name">Service fee</span>
              <span class="fee-line-price">{'\u00a31.50'}/month</span>
            </span>
            <span class="fee-line">
              <span class="fee-line-name">Required backup add-on</span>
              <span class="fee-line-price">{'\u00a32.00'}/month</span>
            </span>
            <span class="fee-line">
              <span class="fee-line-name">Setup fee</span>
              <span class="fee-line-price">{'\u00a34.99'}</span>
            </span>
            <span class="fee-line fee-line-total">
              <span class="fee-line-name">Real total</span>
              <span class="fee-line-price">{'\u00a34.50'}/month + {'\u00a34.99'} today</span>
            </span>
          </span>
        </button>

        {/* The primary action: paying. Selecting it here is a non-possessed
            selection ("Nothing haunts this."); the trick is the late fees, not
            the button. */}
        <button
          class="plan-pay"
          type="button"
          tabIndex={preview ? -1 : undefined}
          aria-hidden={preview ? 'true' : undefined}
          onClick={preview ? undefined : () => onSelectOther()}
        >
          Pay {'\u00a39.49'} today
        </button>
      </div>
    </div>
  );
};

export default Haunted;
