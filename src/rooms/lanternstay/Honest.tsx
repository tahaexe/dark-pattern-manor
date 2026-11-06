import type { HonestProps } from '../../engine/types';
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
 * Lanternstay, honest. The same two inn-room cards, but there is no watchers
 * counter at all, and every review is dated and marked with its stay ("Stayed
 * in October 2026"): the real best practice, no Fake social proof. With the
 * fake crowd and the undated praise gone, choosing a room by real reviews is
 * calm and takes one click — pressing a "Choose" button, which completes the
 * task.
 */
export default function Honest({ onCompleteTask }: HonestProps) {
  return (
    <div class="lanternstay lanternstay-honest">
      <div class="lanternstay-header">
        <p class="lanternstay-address">lanternstay.manor</p>
        <h2 class="lanternstay-masthead">Lanternstay</h2>
        <p class="lanternstay-tagline">Rooms at the old haunted inns</p>
      </div>

      <p class="inn-name">The Gallows Lantern Inn — choose your room</p>

      <div class="inn-rooms">
        {/* The Moonlit Suite: no watchers counter now, and every review is
            dated and tied to a real stay. */}
        <div class="inn-card">
          <div class="inn-card-body">
            <h3 class="inn-room-name">The Moonlit Suite</h3>
            <p class="inn-room-price">£120 a night</p>
            <p class="inn-room-rating">
              <Stars rating={4} /> <span class="inn-room-score">3.9</span>
            </p>

            <ul class="inn-reviews">
              <li class="inn-review">
                <Stars rating={4} />
                <p class="inn-review-text">
                  Lovely room, a little noisy at night. — Sam T.
                </p>
                <p class="inn-review-stay">Stayed in September 2026</p>
              </li>
              <li class="inn-review">
                <Stars rating={3} />
                <p class="inn-review-text">
                  Good host, bathroom needs work. — Alex M.
                </p>
                <p class="inn-review-stay">Stayed in August 2026</p>
              </li>
            </ul>

            <button
              class="inn-choose"
              type="button"
              onClick={() => onCompleteTask()}
            >
              Choose the Moonlit Suite
            </button>
          </div>
        </div>

        {/* The Ivy Room: the same two dated reviews, every one marked with its
            stay. */}
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
              onClick={() => onCompleteTask()}
            >
              Choose the Ivy Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
