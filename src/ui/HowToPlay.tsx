import { useEffect, useRef } from 'preact/hooks';
import { HOW_TO_PLAY } from '../app/howToPlay';

export interface HowToPlayProps {
  /** Close the popover; the caller returns focus to the "?" button. */
  onClose: () => void;
}

/**
 * The "How to play" popover behind the "?" button. A small panel showing the
 * three steps of play (from the one `howToPlay.ts` source). It is a dialog with
 * a Close button; Esc closes it; the caller returns focus to "?". Opened on the
 * first render, it moves focus to its Close button so a keyboard player lands
 * inside it.
 */
export default function HowToPlay({ onClose }: HowToPlayProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div class="how-to-play" role="dialog" aria-modal="false" aria-label="How to play">
      <h2 class="how-to-play-title">How to play</h2>
      <ol class="how-to-play-list">
        {HOW_TO_PLAY.map((step, i) => (
          <li key={i} class="how-to-play-step">
            <span class="how-to-play-step-title">{step.title}</span>
            <span class="how-to-play-step-body">{step.body}</span>
          </li>
        ))}
      </ol>
      <button type="button" class="how-to-play-close" ref={closeRef} onClick={() => onClose()}>
        Close
      </button>
    </div>
  );
}
