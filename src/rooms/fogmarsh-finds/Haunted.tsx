import type { HauntedProps } from '../../engine/types';
import InkGhost from '../../ui/InkGhost';
import './room.css';

/**
 * Fogmarsh Finds, possessed. A ranked "Our top 5 night lanterns" list styled
 * like editorial picks. The possessed element is the number-1 card ("Editor's
 * choice"): it looks exactly like the other picks — same type size, weight and
 * layout — but it is a paid placement, and its only honest sign is a small
 * "partner" tag after the price, in the same style as the rest of the card
 * (Disguised ads). The trick is placement and sameness, never faint text: the
 * "partner" tag meets WCAG AA like every other word on the card.
 *
 * The number-1 card is a real button, so it is keyboard-reachable and its
 * accessible name is its visible text (Label in Name, WCAG 2.5.3) — no
 * aria-label. The ghost is the hero of the room: it peeks over the card without
 * covering its text, with mist drifting around it, and performs the trick
 * (Disguised ads through motion): it slides the number-1 card up over the
 * others and tucks the "partner" tag behind the price. The act lives only
 * beside the possessed card, uses transforms and opacity only over a cycle of
 * 4 s or more, reserves its own space inside the already-sized ghost wrap (no
 * layout shift), never blocks input (pointer-events: none) and never covers the
 * card's text or its focus ring. Every act element is aria-hidden. Under
 * reduced motion the act holds a still pose with the caption "the advert wears
 * the review's coat" beside the ghost, keeping the "Something stirs here"
 * label.
 *
 * In `preview` mode (the static "before" side of the split) the component is
 * non-interactive and omits the possessed element's id, so the live page keeps
 * the only `maproom-top-pick`.
 */

interface Pick {
  rank: number;
  name: string;
  price: string;
  blurb: string;
}

/** The runner-up editorial picks (ranks 2–5), plain cards with no ghost. */
const RUNNERS_UP: Pick[] = [
  {
    rank: 2,
    name: 'Marshglow Hand Lantern',
    price: '£28',
    blurb: 'Warm, steady beam; light to carry.',
  },
  {
    rank: 3,
    name: 'Hollow Oak Storm Lamp',
    price: '£24',
    blurb: 'Weatherproof; good in wind off the fen.',
  },
  { rank: 4, name: 'Reedlight Clip Beacon', price: '£16', blurb: 'Clips to a coat; handy spare.' },
  {
    rank: 5,
    name: 'Tallow & Tin Classic',
    price: '£19',
    blurb: 'Old-fashioned glow; shorter runtime.',
  },
];

export default function Haunted({
  onSelectPossessed,
  onSelectOther,
  signsActive,
  reducedMotion,
  preview = false,
}: HauntedProps) {
  const showSigns = signsActive && !preview;

  return (
    <div class="fogmarsh">
      <div class="fogmarsh-header">
        <p class="fogmarsh-address">fogmarsh-finds.manor</p>
        <h2 class="fogmarsh-masthead">Fogmarsh Finds</h2>
        <p class="fogmarsh-tagline">Honest reviews for the long dark walk home</p>
      </div>

      <h3 class="fogmarsh-list-title">Our top 5 night lanterns</h3>

      <ol class="fogmarsh-list">
        <li class="fogmarsh-item">
          {/* The possessed number-1 card: an "Editor's choice" that is really a
              paid placement. It looks like the other picks; its only honest
              sign is a small "partner" tag after the price, in the SAME style
              as the rest of the card. A real button so it is keyboard-reachable
              with its visible text as its accessible name (no aria-label). */}
          <button
            {...(preview ? {} : { id: 'maproom-top-pick' })}
            class={`fogmarsh-card fogmarsh-card-top possessed${showSigns ? ' signs-active' : ''}${
              reducedMotion ? ' reduced-motion' : ''
            }`}
            type="button"
            tabIndex={preview ? -1 : undefined}
            aria-hidden={preview ? 'true' : undefined}
            onClick={preview ? undefined : () => onSelectPossessed()}
          >
            <span class="fogmarsh-card-body">
              <span class="fogmarsh-rank">1</span>
              <span class="fogmarsh-badge">Editor's choice</span>
              <span class="fogmarsh-name">Wickmere Beacon Pro</span>
              <span class="fogmarsh-blurb">Our brightest pick for the night walk.</span>
              <span class="fogmarsh-price-row">
                <span class="fogmarsh-price">£39</span>
                {/* The one honest sign, in the same style as the rest of the
                    card — easy to miss by placement and sameness, never by low
                    contrast. */}
                <span class="fogmarsh-partner">partner</span>
              </span>
              <span class="fogmarsh-buy" aria-hidden="true">
                Buy
              </span>
            </span>

            {showSigns ? (
              <span class="ghost-signs" aria-hidden="true">
                <span class="mist mist-left"></span>
                <span class="mist mist-above"></span>
                <span class="mist mist-below"></span>
                <span class="ghost-wrap">
                  <InkGhost />
                  {/* The act: the ghost slides the number-1 card up over the
                      others (.act-lift) and tucks the "partner" tag behind the
                      price (.act-tuck). Both are decorative overlays inside the
                      ghost wrap; only their transform/opacity change, so there
                      is no layout shift and nothing real moves. They sit beside
                      the card, never over its text or focus ring, and
                      pointer-events: none so they never block input. */}
                  <span class="act-lift" aria-hidden="true"></span>
                  <span class="act-tuck" aria-hidden="true"></span>
                </span>
              </span>
            ) : null}
            {showSigns && reducedMotion ? (
              <span class="stirs-label">Something stirs here</span>
            ) : null}
            {showSigns && reducedMotion ? (
              <span class="act-caption">the advert wears the review's coat</span>
            ) : null}
          </button>
        </li>

        {RUNNERS_UP.map((p) => (
          <li class="fogmarsh-item" key={p.rank}>
            <button
              class="fogmarsh-card"
              type="button"
              tabIndex={preview ? -1 : undefined}
              aria-hidden={preview ? 'true' : undefined}
              onClick={preview ? undefined : () => onSelectOther()}
            >
              <span class="fogmarsh-card-body">
                <span class="fogmarsh-rank">{p.rank}</span>
                <span class="fogmarsh-name">{p.name}</span>
                <span class="fogmarsh-blurb">{p.blurb}</span>
                <span class="fogmarsh-price-row">
                  <span class="fogmarsh-price">{p.price}</span>
                </span>
                <span class="fogmarsh-buy" aria-hidden="true">
                  Buy
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
