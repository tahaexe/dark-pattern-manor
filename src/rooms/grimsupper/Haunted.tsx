import type { HauntedProps } from '../../engine/types';
import './room.css';

/**
 * Grimsupper, possessed. The shop page (masthead and two menu cards) sits in
 * the room's normal flow with no fixed or minimum heights; a dim backdrop (the
 * manor's ink at ~60%) lies over it, and the discount pop-up is centred over
 * the backdrop as a real overlay. The pop-up's decline link is Confirmshaming:
 * its wording shames you for saying no — "No thanks, I'd rather pay full price
 * and eat cold soup alone" — rendered small and dim beneath a big, bright "Yes,
 * give me 15% off" button, with NO plain close affordance (only the shaming
 * link closes it — that is the trap). The decline link is the possessed
 * element. The ghost is the hero of the room: it peeks beside the possessed
 * decline link, at the link's height, without covering the link's text, the
 * offer button, the pop-up heading or body, and the pop-up reserves enough
 * bottom room that the whole ghost is drawn. All text stays at WCAG AA
 * contrast; the trick is the wording and weight of the "no", never readability.
 *
 * The pop-up is a real modal dialog (`role="dialog"`, `aria-modal="true"`,
 * labelled by its heading).
 *
 * In `preview` mode (the static "before" side of the split) the component is
 * non-interactive and omits the possessed element's id, so the live page keeps
 * the only `dining-decline`.
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
    <div class="grimsupper">
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
          page, with the pop-up centred over it. */}
      <div class="discount-overlay">
        <div class="discount-backdrop" aria-hidden="true"></div>

        {/* The possessed discount pop-up. A real modal dialog, labelled by its
            heading. There is no close button — only the shaming decline link
            closes it (that is the trap). */}
        <div
          class="discount-pop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dining-pop-title"
        >
          <div class="discount-pop-body">
            <h3 id="dining-pop-title" class="discount-pop-title">
              Wait — take 15% off your first box
            </h3>
            <p class="discount-pop-text">
              Your table is laid. Claim the discount before you leave.
            </p>

            <div class="discount-pop-actions">
              {/* Loud, bright primary: the choice the shop wants. */}
              <button
                class="discount-accept"
                type="button"
                tabIndex={preview ? -1 : undefined}
                aria-hidden={preview ? 'true' : undefined}
                onClick={preview ? undefined : () => onSelectOther()}
              >
                Yes, give me 15% off
              </button>

              {/* The possessed decline link (Confirmshaming). A small, dim text
                  link whose wording shames the player for saying no. It carries
                  no aria-label, so the accessible name is the visible shaming
                  sentence itself (Label in Name, WCAG 2.5.3). The link is the
                  positioning context for the ghost that peeks beside it. */}
              <button
                {...(preview ? {} : { id: 'dining-decline' })}
                class={`discount-decline possessed${showSigns ? ' signs-active' : ''}${
                  reducedMotion ? ' reduced-motion' : ''
                }`}
                type="button"
                tabIndex={preview ? -1 : undefined}
                aria-hidden={preview ? 'true' : undefined}
                onClick={preview ? undefined : () => onSelectPossessed()}
              >
                <span class="discount-decline-label">
                  No thanks, I&rsquo;d rather pay full price and eat cold soup alone
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
                      {reducedMotion ? (
                        <span class="stirs-label">Something stirs here</span>
                      ) : null}
                    </span>
                  ) : null}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
