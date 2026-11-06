import type { JSX } from 'preact';
import type { PatternName } from '../engine/types';

/**
 * Inline-SVG symbols for spell cards, keyed by pattern name. Each is drawn in
 * ink (currentColor) per the look rules. Patterns without a bespoke symbol
 * fall back to a generic ward sigil, so every card always has a symbol.
 */

function Eye() {
  return (
    <svg viewBox="0 0 24 24" width="40" height="40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 7 Q6 7 2 12 Q6 17 12 17 Q18 17 22 12 Q18 7 12 7Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 12 L18 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function Quill() {
  return (
    <svg viewBox="0 0 24 24" width="40" height="40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 20 L8 6 L12 4 L16 6 L20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 18 L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="10" r="1" fill="currentColor" />
    </svg>
  );
}

function Bell() {
  return (
    <svg viewBox="0 0 24 24" width="40" height="40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 2 C9 2 7 4 7 7 L7 14 C7 15 6 16 5 17 L19 17 C18 16 17 15 17 14 L17 7 C17 4 15 2 12 2Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 17 Q9 20 12 20 Q15 20 15 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="20" r="0.5" fill="currentColor" />
    </svg>
  );
}

function Ward() {
  return (
    <svg viewBox="0 0 24 24" width="40" height="40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 3 L20 6 L20 12 Q20 19 12 21 Q4 19 4 12 L4 6 Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 8 L12 16 M8 12 L16 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const SYMBOLS: Record<string, () => JSX.Element> = {
  'Visual interference': Eye,
  'Trick wording': Quill,
  Nagging: Bell,
};

/** The inline-SVG symbol for a pattern, or a generic ward when none is set. */
export function cardSymbol(pattern: PatternName): JSX.Element {
  const Sym = SYMBOLS[pattern] ?? Ward;
  return <Sym />;
}
