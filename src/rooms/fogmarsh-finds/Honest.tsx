import type { HonestProps } from '../../engine/types';
import './room.css';

/**
 * Fogmarsh Finds, honest. The paid placement is lifted out of the ranking into
 * a clearly-marked advertisement box above the list ("Advertisement · paid by
 * Wickmere Lamps"), visually different from the editorial cards, so no one
 * mistakes it for an impartial pick (the real best practice, no Disguised ads).
 * Below it the ranking states its criterion in one line — "ranked by 1,240
 * verified owner reviews; no brand pays for a place" — and the genuine
 * top-rated lantern sits at number 1 with a "Choose" button, so finding the
 * best-reviewed lantern for a night walk takes one click.
 */

interface HonestPick {
  rank: number;
  name: string;
  price: string;
  reviews: string;
}

const RANKED: HonestPick[] = [
  { rank: 2, name: 'Hollow Oak Storm Lamp', price: '£24', reviews: '4.6 from 980 reviews' },
  { rank: 3, name: 'Tallow & Tin Classic', price: '£19', reviews: '4.4 from 610 reviews' },
  { rank: 4, name: 'Reedlight Clip Beacon', price: '£16', reviews: '4.2 from 540 reviews' },
];

export default function Honest({ onCompleteTask }: HonestProps) {
  return (
    <div class="fogmarsh fogmarsh-honest">
      <div class="fogmarsh-header">
        <p class="fogmarsh-address">fogmarsh-finds.manor</p>
        <h2 class="fogmarsh-masthead">Fogmarsh Finds</h2>
        <p class="fogmarsh-tagline">Honest reviews for the long dark walk home</p>
      </div>

      {/* The paid placement, clearly marked and visually set apart from the
          editorial cards — never mistaken for an impartial pick. */}
      <aside class="fogmarsh-ad" aria-label="Advertisement">
        <p class="fogmarsh-ad-tag">Advertisement · paid by Wickmere Lamps</p>
        <p class="fogmarsh-ad-name">Wickmere Beacon Pro — £39</p>
        <p class="fogmarsh-ad-blurb">Our brightest beam. Paid placement, not a review.</p>
      </aside>

      <h3 class="fogmarsh-list-title">Top night lanterns</h3>
      <p class="fogmarsh-criteria">
        ranked by 1,240 verified owner reviews; no brand pays for a place
      </p>

      <ol class="fogmarsh-list fogmarsh-list-honest">
        <li class="fogmarsh-item">
          {/* The genuine top-rated lantern — the one-click task. */}
          <button
            class="fogmarsh-card fogmarsh-card-honest-top"
            type="button"
            onClick={() => onCompleteTask()}
          >
            <span class="fogmarsh-card-body">
              <span class="fogmarsh-rank">1</span>
              <span class="fogmarsh-name">Marshglow Hand Lantern</span>
              <span class="fogmarsh-reviews">4.8 from 1,240 reviews</span>
              <span class="fogmarsh-price-row">
                <span class="fogmarsh-price">£28</span>
              </span>
              <span class="fogmarsh-buy" aria-hidden="true">
                Choose
              </span>
            </span>
          </button>
        </li>

        {RANKED.map((p) => (
          <li class="fogmarsh-item" key={p.rank}>
            <div class="fogmarsh-card fogmarsh-card-static">
              <span class="fogmarsh-card-body">
                <span class="fogmarsh-rank">{p.rank}</span>
                <span class="fogmarsh-name">{p.name}</span>
                <span class="fogmarsh-reviews">{p.reviews}</span>
                <span class="fogmarsh-price-row">
                  <span class="fogmarsh-price">{p.price}</span>
                </span>
              </span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
