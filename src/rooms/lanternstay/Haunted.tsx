import type { FunctionComponent } from 'preact';
import type { HauntedProps } from '../../engine/types';
import './room.css';

/**
 * A star rating as text plus an accessible label, never an image alone. The
 * star glyphs are decorative (`aria-hidden`); the `.visually-hidden` label is
 * what a screen reader reads, so the rating "N out of 5 stars" is perceivable
 * to every player (Requirement 4).
 */
function Stars({ rating }: { rating: number }) {
  const full = '\u2605'.repeat(rating);
  const empty = '\u2606'.repeat(5 - rating);
  return (
    <span class="stars">
      <span class="stars-glyphs" aria-hidden="true">
        {full}
        {empty}
      </span>
      <span class="visually-hidden">{rating} out of 5 stars</span>
    </span>
  );
}

/**
 * Lanternstay, possessed by Fake social proof. Two rooms of one inn sit side
 * by side (two cards). The first, "The Moonlit Suite", carries the possessed
 * watchers badge and three five-star reviews with no dates and first names
 * only ("Amazing!!! — Sam"). The second, "The Ivy Room", has fewer stars but
 * two dated reviews marked "Stayed in October 2026".
 *
 * The possessed element is the single watchers badge on the first card. It
 * reads "38 people are looking at this room right now": a STATIC number — it
 * never ticks — and it is NOT a live region (no `aria-live`, no announcing
 * role). It is a real `<button>` so it is keyboard-reachable and has an
 * accessible name; it carries NO `aria-label`, so the accessible name is the
 * visible text itself (Label in Name, WCAG 2.5.3). The badge is the
 * positioning context for the ghost that peeks beside it.
 *
 * The room needs no per-element state (the badge is a fixed number, the cards
 * are static), so a plain function component is enough: no hooks, so it renders
 * identically in the app, the tests and the `check:rooms` bare renderer.
 *
 * In `preview` mode (the static "before" side of the split) the page is
 * non-interactive and omits the possessed id, so the live haunted page keeps
 * the only `gallery-watchers`.
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
    <div class="lanternstay">
      <div class="lanternstay-header">
        <p class="lanternstay-address">lanternstay.manor</p>
        <h2 class="lanternstay-masthead">Lanternstay</h2>
        <p class="lanternstay-tagline">Rooms at the old haunted inns</p>
      </div>

      <p class="inn-name">The Gallows Lantern Inn — choose your room</p>

      <div class="inn-rooms">
        {/* The first inn room: The Moonlit Suite. It carries the possessed
            watchers badge and three undated, first-name-only five-star
            reviews — the fake crowd and the glowing praise no guest ever
            wrote. */}
        <div class="inn-card">
          <div class="inn-card-body">
            <h3 class="inn-room-name">The Moonlit Suite</h3>
            <p class="inn-room-price">£120 a night</p>
            <p class="inn-room-rating">
              <Stars rating={5} /> <span class="inn-room-score">5.0</span>
            </p>

            {/* The possessed watchers badge (Fake social proof). A real button
                so it is keyboard-reachable and has an accessible name. It
                carries no aria-label, so the accessible name is the visible
                text itself (Label in Name, WCAG 2.5.3). It is NOT a live
                region: no aria-live, no announcing role. The number is STATIC
                — it never ticks. The label is the positioning context for the
                ghost that peeks beside it. */}
            <button
              {...(preview ? {} : { id: 'gallery-watchers' })}
              class={`inn-watchers possessed${showSigns ? ' signs-active' : ''}${
                reducedMotion ? ' reduced-motion' : ''
              }`}
              type="button"
              tabIndex={preview ? -1 : undefined}
              aria-hidden={preview ? 'true' : undefined}
              onClick={preview ? undefined : () => onSelectPossessed()}
            >
              <span class="inn-watchers-label">
                38 people are looking at this room right now
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
                  </span>
                ) : null}
                {showSigns && reducedMotion ? (
                      <span class="stirs-label">Something stirs here</span>
                    ) : null}
              </span>
            </button>

            {/* Three five-star reviews with no dates and first names only:
                the glowing praise that gives no way to tell it is real. */}
            <ul class="inn-reviews">
              <li class="inn-review">
                <Stars rating={5} />
                <p class="inn-review-text">Amazing!!! — Sam</p>
              </li>
              <li class="inn-review">
                <Stars rating={5} />
                <p class="inn-review-text">Best stay ever!! — Alex</p>
              </li>
              <li class="inn-review">
                <Stars rating={5} />
                <p class="inn-review-text">So lovely, loved it — Jo</p>
              </li>
            </ul>

            {/* Choosing this room is a non-possessed selection ("Nothing
                haunts this."); the trick is the badge, not the button. */}
            <button
              class="inn-choose"
              type="button"
              tabIndex={preview ? -1 : undefined}
              aria-hidden={preview ? 'true' : undefined}
              onClick={preview ? undefined : () => onSelectOther()}
            >
              Choose the Moonlit Suite
            </button>
          </div>
        </div>

        {/* The second inn room: The Ivy Room. Fewer stars, but two dated
            reviews marked with the stay — the real signal, half-buried beside
            the fake crowd next door. */}
        <div class="inn-card">
          <div class="inn-card-body">
            <h3 class="inn-room-name">The Ivy Room</h3>
            <p class="inn-room-price">£108 a night</p>
            <p class="inn-room-rating">
              <Stars rating={4} /> <span class="inn-room-score">4.2</span>
            </p>

            <ul class="inn-reviews">
              <li class="inn-review">
                <Stars rating={4} />
                <p class="inn-review-text">
                  Warm and quiet, good breakfast. — Priya R.
                </p>
                <p class="inn-review-stay">Stayed in October 2026</p>
              </li>
              <li class="inn-review">
                <Stars rating={5} />
                <p class="inn-review-text">
                  Creaky floors, kind host, slept well. — Daniel O.
                </p>
                <p class="inn-review-stay">Stayed in October 2026</p>
              </li>
            </ul>

            <button
              class="inn-choose"
              type="button"
              tabIndex={preview ? -1 : undefined}
              aria-hidden={preview ? 'true' : undefined}
              onClick={preview ? undefined : () => onSelectOther()}
            >
              Choose the Ivy Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Haunted;
