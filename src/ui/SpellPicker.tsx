import { useEffect, useMemo, useRef } from 'preact/hooks';
import type { SpellCard, SpellCards } from '../engine/types';
import { shuffle } from '../engine/shuffle';
import { cardSymbol } from './cardSymbols';

export interface SpellPickerProps {
  cards: SpellCards;
  /** Called with the picked card. */
  onPick: (card: SpellCard) => void;
  /** True after a wrong pick, so the flicker/indicator can show. */
  flicker?: boolean;
  /**
   * The last wrong card's hint, shown inline under the cards. This element is
   * the polite live region for the hint, so the hint is spoken and shown by one
   * node (no duplicate announcement, no scroll to the top strip).
   */
  reason?: string;
  /** Bumped on each wrong pick, so the reason scrolls into view once per pick. */
  reasonNonce?: number;
  /** Optional rng for deterministic tests of the shuffle order. */
  rng?: () => number;
}

/** True when the user asks for reduced motion (so scrolls are instant). */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * The three spell cards as real buttons, shuffled once per mount, each labelled
 * by its pattern name with an inline-SVG symbol. All cards stay enabled after a
 * wrong pick so the player can try again at no cost.
 *
 * On entering picking, the cards are scrolled into view (block nearest) so they
 * are never left below the fold. After a wrong pick, that card's hint shows
 * inline right under the cards and is announced politely from the same node; if
 * it lands below the fold it is scrolled into view with block nearest. The page
 * is never yanked to the top strip.
 */
export default function SpellPicker({
  cards,
  onPick,
  flicker,
  reason,
  reasonNonce,
  rng,
}: SpellPickerProps) {
  const ordered = useMemo(() => shuffle(cards, rng), [cards, rng]);
  const containerRef = useRef<HTMLDivElement>(null);
  const reasonRef = useRef<HTMLParagraphElement>(null);

  // Bring the cards onto the screen when they first appear.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof el.scrollIntoView !== 'function') return;
    el.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    // Run once on mount (the cards mount only in picking).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bring the inline reason onto the screen after each wrong pick, if needed.
  useEffect(() => {
    if (!reason) return;
    const el = reasonRef.current;
    if (!el || typeof el.scrollIntoView !== 'function') return;
    el.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [reasonNonce, reason]);

  return (
    <div class="spell-cards-wrap">
      <div class="spell-cards" ref={containerRef}>
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
      {reason ? (
        <p
          class="spell-card-reason"
          role="status"
          aria-live="polite"
          ref={reasonRef}
          key={reasonNonce}
        >
          {reason}
        </p>
      ) : null}
    </div>
  );
}
