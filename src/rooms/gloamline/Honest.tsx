import type { HonestProps } from '../../engine/types';
import './room.css';

/**
 * Gloamline, honest. The same sign-up page, but the three facts the trial
 * carries — the price after, the date billing starts and the way to cancel —
 * sit beside the button at the body text's size, in a plain list, and the
 * button itself names the price: "Start free trial, then £9.99 a month" (the
 * real best practice, no Hidden subscription). Starting the trial knowingly
 * takes one click: pressing the button, which has already told you what comes
 * after.
 */
export default function Honest({ onCompleteTask }: HonestProps) {
  return (
    <div class="gloamline gloamline-honest">
      <div class="gloamline-header">
        <p class="gloamline-address">gloamline.manor</p>
        <h2 class="gloamline-masthead">Gloamline</h2>
        <p class="gloamline-tagline">Ghost stories, read aloud in the dark</p>
      </div>

      <div class="trial-card">
        <p class="trial-headline">7 days free</p>
        <p class="trial-pitch">
          A thousand hauntings, whispered to you. Begin tonight.
        </p>

        <div class="trial-field">
          <label class="trial-label" for="gloamline-card-honest">
            Card number
          </label>
          <input
            id="gloamline-card-honest"
            class="trial-input"
            type="text"
            inputMode="numeric"
            value="4242 4242 4242 4242"
            readOnly
          />
        </div>

        {/* The three facts, beside the button, at body-text size — no small
            print, no hidden terms. */}
        <ul class="trial-terms-honest">
          <li>After the trial it costs £9.99 a month.</li>
          <li>Billing starts on 13 November.</li>
          <li>Cancel any time in Settings, Billing, Manage plan.</li>
        </ul>

        {/* The button names the recurring price itself: starting the trial is a
            knowing choice in one click. */}
        <button class="trial-start-honest" type="button" onClick={() => onCompleteTask()}>
          Start free trial, then £9.99 a month
        </button>
      </div>
    </div>
  );
}
