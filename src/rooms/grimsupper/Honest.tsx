import type { JSX } from 'preact';
import type { HonestProps } from '../../engine/types';
import './room.css';

/**
 * Grimsupper, honest. The same shop page with the same discount pop-up shown as
 * a real overlay (a dim backdrop over the shop page, the pop-up centred over
 * it), but the two choices are plain and equal — "Get 15% off" and "No thanks"
 * — rendered as the same kind of button, and there is a visible close (×)
 * button in the corner. Declining carries no guilt (the real best practice, no
 * Confirmshaming), so "close the discount pop-up" completes in one click:
 * pressing the close button, picking either equal choice, or Escape.
 *
 * The pop-up is a real modal dialog (`role="dialog"`, `aria-modal="true"`,
 * labelled by its heading); the close button and the choices are plain, and
 * Escape closes it.
 */
export default function Honest({ onCompleteTask }: HonestProps) {
  const onKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCompleteTask();
    }
  };

  return (
    <div class="grimsupper grimsupper-honest">
      {/* The shop page behind the pop-up — masthead and the two menu cards, in
          normal flow, no fixed or minimum heights. */}
      <div class="grimsupper-shop-page">
        <div class="grimsupper-header">
          <p class="grimsupper-address">grimsupper.manor</p>
          <h2 class="grimsupper-masthead">Grimsupper</h2>
          <p class="grimsupper-tagline">Dusk-cooked suppers and meal boxes, left at your door</p>
        </div>

        <div class="grimsupper-shop" aria-hidden="true">
          <article class="dish-card">
            <h3 class="dish-name">Smoked parsnip broth</h3>
            <p class="dish-note">Box of four — serves a long table</p>
          </article>
          <article class="dish-card">
            <h3 class="dish-name">Blackbread &amp; marrow pie</h3>
            <p class="dish-note">Box of four — serves a long table</p>
          </article>
        </div>
      </div>

      {/* A real overlay inside the room's frame: a dim backdrop over the shop
          page, with the honest pop-up centred over it. */}
      <div class="discount-overlay">
        <div class="discount-backdrop" aria-hidden="true"></div>

        {/* The honest discount pop-up: a real modal dialog with a visible close
            button, two plain equal choices, and Escape to close. */}
        <div
          class="discount-pop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dining-pop-title-honest"
          onKeyDown={onKeyDown}
        >
          {/* Visible close button — one click completes "close the discount pop-up". */}
          <button
            class="discount-close-honest"
            type="button"
            aria-label="Close"
            onClick={() => onCompleteTask()}
          >
            ×
          </button>

          <div class="discount-pop-body">
            <h3 id="dining-pop-title-honest" class="discount-pop-title">
              Take 15% off your first box
            </h3>
            <p class="discount-pop-text">
              Your table is laid. The offer is here whenever you want it.
            </p>

            <div class="discount-pop-actions-honest">
              {/* Two plain, equal choices — the same kind of button, no shame. */}
              <button class="discount-button-equal" type="button">
                Get 15% off
              </button>
              <button class="discount-button-equal" type="button" onClick={() => onCompleteTask()}>
                No thanks
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
