import { useMemo } from 'preact/hooks';
import type { SpellCard, SpellCards } from '../engine/types';
import { shuffle } from '../engine/shuffle';
import { cardSymbol } from './cardSymbols';

export interface SpellPickerProps {
  cards: SpellCards;
  /** Called with the picked card. */
  onPick: (card: SpellCard) => void;
  /** True after a wrong pick, so the flicker/indicator can show. */
  flicker?: boolean;
  /** Optional rng for deterministic tests of the shuffle order. */
  rng?: () => number;
}

/**
 * The three spell cards as real buttons, shuffled once per mount, each
 * labelled by its pattern name with an inline-SVG symbol. All cards stay
 * enabled after a wrong pick so the player can try again at no cost.
 */
export default function SpellPicker({ cards, onPick, flicker, rng }: SpellPickerProps) {
  const ordered = useMemo(() => shuffle(cards, rng), [cards, rng]);

  return (
    <div class="spell-cards">
      {ordered.map((card) => (
        <button
          key={card.pattern}
          type="button"
          class={`spell-card${flicker ? ' is-flicker' : ''}`}
          onClick={() => onPick(card)}
        >
          {cardSymbol(card.pattern)}
          <p class="spell-card-name">{card.pattern}</p>
        </button>
      ))}
    </div>
  );
}
