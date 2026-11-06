import { useEffect } from 'preact/hooks';

export interface LanternProps {
  /** Called when the lantern is raised (button click or L key). */
  onLantern: () => void;
  /** When true, the L key triggers the lantern (room is haunted). */
  keyActive: boolean;
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
 * The lantern: a real button labelled "Lantern (L)". While the room is
 * haunted (keyActive), pressing the L key raises it too. Operable by pointer
 * and keyboard.
 */
export default function Lantern({ onLantern, keyActive }: LanternProps) {
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
    <button class="task-bar-lantern" aria-label="Lantern (L)" onClick={() => onLantern()}>
      <CandleIcon />
      <span class="task-bar-hint" aria-hidden="true">
        L
      </span>
    </button>
  );
}
