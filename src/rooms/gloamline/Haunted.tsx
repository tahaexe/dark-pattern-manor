import type { HauntedProps } from '../../engine/types';
import './room.css';

/**
 * Gloamline, possessed. The sign-up page sits in the room's normal flow with
 * no fixed or minimum heights: a big "7 days free" headline, a short pitch, a
 * card field and a bright "Start my free trial" button. The possessed element
 * is the small-print paragraph far below the button: it carries the three
 * facts the trial hides until later — the price after, the date billing starts
 * and the way to cancel ("Then £9.99 a month from 13 November, billed
 * automatically until you cancel in Settings, Billing, Manage plan.") —
 * rendered small and light and placed well below the button (Hidden
 * subscription). The small print is the possessed element; it carries no
 * aria-label, so its accessible name is the visible small-print text itself
 * (Label in Name, WCAG 2.5.3). The ghost is the hero of the room: it peeks
 * beside the small print, at its height, without covering the small print's
 * text, the button, the headline or the inputs. All text stays at WCAG AA
 * contrast; the trick is the size, weight and placement of the terms, never
 * readability — the small print still meets AA.
 *
 * In `preview` mode (the static "before" side of the split) the component is
 * non-interactive and omits the possessed element's id, so the live page keeps
 * the only `parlour-smallprint`.
 */
export default function Haunted({
  onSelectPossessed,
  onSelectOther,
  signsActive,
  reducedMotion,
  preview = false,
}: HauntedProps) {
  const showSigns = signsActive && !preview;

  return (
    <div class="gloamline">
      <div class="gloamline-header">
        <p class="gloamline-address">gloamline.manor</p>
        <h2 class="gloamline-masthead">Gloamline</h2>
        <p class="gloamline-tagline">Ghost stories, read aloud in the dark</p>
      </div>

      <div class="trial-card">
        {/* The loud offer — the only thing the eye is meant to catch. */}
        <p class="trial-headline">7 days free</p>
        <p class="trial-pitch">
          A thousand hauntings, whispered to you. Begin tonight.
        </p>

        <div class="trial-field">
          <label class="trial-label" for="gloamline-card">
            Card number
          </label>
          <input
            id="gloamline-card"
            class="trial-input"
            type="text"
            inputMode="numeric"
            value="4242 4242 4242 4242"
            readOnly
            tabIndex={preview ? -1 : undefined}
            aria-hidden={preview ? 'true' : undefined}
            onFocus={preview ? undefined : () => onSelectOther()}
          />
        </div>

        {/* Loud, bright primary: the choice the service wants. Its text names
            only the free part — not the recurring price. */}
        <button
          class="trial-start"
          type="button"
          tabIndex={preview ? -1 : undefined}
          aria-hidden={preview ? 'true' : undefined}
          onClick={preview ? undefined : () => onSelectOther()}
        >
          Start my free trial
        </button>

        {/* The possessed small print (Hidden subscription). A real button so it
            is keyboard-reachable and has an accessible name. It carries no
            aria-label, so the accessible name is the visible small-print text
            itself (Label in Name, WCAG 2.5.3). It is small and light and placed
            far below the button — made quiet by size, weight and placement,
            never by low contrast (--parchment-2 on the dark card stays AA). The
            paragraph itself is the positioning context for the ghost beside it. */}
        <button
          {...(preview ? {} : { id: 'parlour-smallprint' })}
          class={`trial-smallprint possessed${showSigns ? ' signs-active' : ''}${
            reducedMotion ? ' reduced-motion' : ''
          }`}
          type="button"
          tabIndex={preview ? -1 : undefined}
          aria-hidden={preview ? 'true' : undefined}
          onClick={preview ? undefined : () => onSelectPossessed()}
        >
          <span class="trial-smallprint-label">
            Then £9.99 a month from 13 November, billed automatically until you cancel in Settings,
            Billing, Manage plan.
            {showSigns ? (
              <span class="ghost-signs" aria-hidden="true">
                <span class="mist mist-left"></span>
                <span class="mist mist-above"></span>
                <span class="mist mist-below"></span>
                <span class="ghost-wrap">
                  <svg
                    viewBox="0 0 120 140"
                    width="120"
                    height="140"
                    class="ghost"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      class="ghost-body"
                      d="M20 70 Q20 24 60 24 Q100 24 100 70 L100 118
                         Q94 112 88 118 Q82 124 76 118 Q70 112 64 118
                         Q58 124 52 118 Q46 112 40 118 Q34 124 28 118
                         Q22 112 20 118 Z"
                    />
                    <circle class="ghost-eye" cx="48" cy="60" r="4" />
                    <circle class="ghost-eye" cx="72" cy="60" r="4" />
                    <path class="ghost-mouth" d="M52 74 Q60 82 68 74" />
                  </svg>
                </span>
              </span>
            ) : null}
            {showSigns && reducedMotion ? <span class="stirs-label">Something stirs here</span> : null}
          </span>
        </button>
      </div>
    </div>
  );
}
