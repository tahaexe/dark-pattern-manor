import { useEffect } from 'preact/hooks';

export interface LanternProps {
  /** Called when the lantern is raised (button click or L key). */
  onLantern: () => void;
  /** When true, the L key triggers the lantern (room is haunted). */
  keyActive: boolean;
  /** When true, the button glows to offer stuck help. */
  stuck?: boolean;
}

/** Candle flame icon for the lantern button (24 x 24). */
function CandleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="9" y="12" width="6" height="10" stroke="currentColor" strokeWidth="2" fill="none" />
      <line x1="12" y1="10" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 4 Q10 8 12 10 Q14 8 12 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The lantern: a real button at least 44 x 44 with the visible word "Lantern"
 * and a small "hint" under it. Its accessible name — "Lantern: show me the
 * trick (L)" — tells a screen-reader player what it does, not just its key.
 * While the room is haunted (keyActive), pressing the L key raises it too. When
 * `stuck` it glows (a slow pulse; a still candle outline under reduced motion)
 * to offer help. Operable by pointer and keyboard.
 */
export default function Lantern({ onLantern, keyActive, stuck = false }: LanternProps) {
  useEffect(() => {
    if (!keyActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'l' || e.key === 'L') {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName;
        // Ignore the L key while typing in a field.
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
        e.preventDefault();
        onLantern();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [keyActive, onLantern]);

  return (
    <button
      class={`lantern-button${stuck ? ' is-stuck' : ''}`}
      aria-label="Lantern: show me the trick (L)"
      type="button"
      onClick={() => onLantern()}
    >
      <CandleIcon />
      <span class="lantern-button-text" aria-hidden="true">
        Lantern
      </span>
      <span class="lantern-button-hint" aria-hidden="true">
        hint
      </span>
    </button>
  );
}
