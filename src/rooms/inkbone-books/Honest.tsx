import type { HonestProps } from '../../engine/types';
import './room.css';

/**
 * Inkbone Books, honest. The newsletter line is one plain, unticked opt-in —
 * "Send me the Inkbone newsletter" — with no double negative and nothing
 * pre-ticked (the real best practice, no Trick wording). Leaving the box alone
 * keeps the newsletter off, so "sign up without the newsletter" completes in
 * one click: pressing "Create account" with the box left as it is.
 */
export default function Honest({ onCompleteTask }: HonestProps) {
  return (
    <div class="inkbone inkbone-honest">
      <div class="inkbone-header">
        <p class="inkbone-address">inkbone-books.manor</p>
        <h2 class="inkbone-masthead">Inkbone Books</h2>
        <p class="inkbone-tagline">Second-hand spells and well-thumbed classics</p>
      </div>

      <div class="signup-card">
        <h3 class="signup-title">Create your reader account</h3>

        <div class="signup-field">
          <label class="signup-label" for="inkbone-name-honest">
            Name
          </label>
          <input
            id="inkbone-name-honest"
            class="signup-input"
            type="text"
            value="Ada Quill"
            readOnly
          />
        </div>

        <div class="signup-field">
          <label class="signup-label" for="inkbone-email-honest">
            Email
          </label>
          <input
            id="inkbone-email-honest"
            class="signup-input"
            type="email"
            value="ada@quill.manor"
            readOnly
          />
        </div>

        {/* One plain opt-in, unticked. Leave it alone and you get no newsletter. */}
        <label class="newsletter-line-honest" for="inkbone-newsletter-honest">
          <input id="inkbone-newsletter-honest" class="newsletter-box-honest" type="checkbox" />
          <span class="newsletter-text-honest">Send me the Inkbone newsletter</span>
        </label>

        <button class="signup-submit" type="button" onClick={() => onCompleteTask()}>
          Create account
        </button>
      </div>
    </div>
  );
}
