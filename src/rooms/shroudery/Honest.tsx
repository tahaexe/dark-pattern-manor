import type { HonestProps } from '../../engine/types';
import './room.css';

/** The cloak's sizes, in order, with their honest stock truth. */
const HONEST_STOCK: ReadonlyArray<{ size: string; stock: string }> = [
  { size: 'XS', stock: 'In stock' },
  { size: 'S', stock: 'In stock' },
  { size: 'M', stock: 'In stock' },
  { size: 'L', stock: 'In stock' },
  { size: 'XL', stock: '3 left' },
];

/**
 * Shroudery, honest. The same cloak page, but the stock line tells the truth
 * in plain text: "In stock" for every size, and "3 left" only on XL (the real
 * best practice, no Fake scarcity). Nothing claims the last item on every
 * size, so picking the right size is calm and takes one click: pressing the
 * size button, which completes the task.
 */
export default function Honest({ onCompleteTask }: HonestProps) {
  return (
    <div class="shroudery shroudery-honest">
      <div class="shroudery-header">
        <p class="shroudery-address">shroudery.manor</p>
        <h2 class="shroudery-masthead">Shroudery</h2>
        <p class="shroudery-tagline">Cloaks for the dancing dead</p>
      </div>

      <div class="cloak-card">
        <div class="cloak-body">
          <p class="cloak-name">The Revenant ballroom cloak</p>
          <p class="cloak-price">£88</p>

          {/* The size buttons. Picking a size is the single task action, so
              picking the right size calmly completes "pick the right size" in
              one click. */}
          <div class="cloak-sizes" role="group" aria-label="Size">
            {HONEST_STOCK.map(({ size }) => (
              <button
                key={size}
                class="cloak-size"
                type="button"
                aria-pressed="false"
                onClick={() => onCompleteTask()}
              >
                {size}
              </button>
            ))}
          </div>

          {/* The honest stock truths, plain text, no "Only 1 left" anywhere. */}
          <ul class="cloak-stock-honest">
            {HONEST_STOCK.map(({ size, stock }) => (
              <li key={size}>
                <span class="cloak-stock-size">{size}</span> — {stock}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
