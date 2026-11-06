import { useEffect, useState } from 'preact/hooks';
import { isSoundOn, setSoundOn, subscribe } from './sound';

/** Speaker icon (24 x 24). With sound on, waves; off, a slash. */
function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Speaker body */}
      <path
        d="M4 9 L8 9 L13 5 L13 19 L8 15 L4 15 Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinejoin="round"
      />
      {on ? (
        <>
          <path d="M16 9 Q18 12 16 15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M18 7 Q22 12 18 17" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <line x1="17" y1="9" x2="22" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
      {!on ? (
        <line x1="22" y1="9" x2="17" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : null}
    </svg>
  );
}

/**
 * The Sound toggle: one button shown on every page, top-right inside the manor
 * frame. A speaker icon plus the visible word "Sound". `aria-pressed` is true
 * when sound is on. The click is a user gesture, which is the moment the audio
 * engine is allowed to wake — sound stays silent until this first gesture.
 */
export default function SoundToggle() {
  const [on, setOn] = useState(isSoundOn());

  useEffect(() => subscribe(() => setOn(isSoundOn())), []);

  return (
    <button
      type="button"
      class="sound-toggle"
      aria-pressed={on}
      onClick={() => setSoundOn(!on)}
    >
      <SpeakerIcon on={on} />
      <span class="sound-toggle-label">Sound</span>
    </button>
  );
}
