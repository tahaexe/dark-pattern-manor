import InkGhost from '../ui/InkGhost';
import { roomSlugs, ROOM_NAMES } from '../engine/registry';
import { doneCount, loadProgress } from '../engine/progress';
import { TITLE_STEPS } from './howToPlay';
import './title-screen.css';

/**
 * A small ink drawing for one title step, in the manor's thin-white-line look.
 * A few strokes each, no fill (or a faint one), stroke from tokens via CSS. It
 * is decorative (aria-hidden): the ordered list reads "1, 2, 3" and the title
 * and line carry the meaning. No new image file — all three are inline SVG.
 *
 * - 0 "Spot": a page with a tapping hand pointing at it.
 * - 1 "Name": a spell card with a check stroke.
 * - 2 "Free": a split rectangle with a vertical divider (the Before/After motif).
 */
function StepGlyph({ step }: { step: number }) {
  if (step === 0) {
    return (
      <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" focusable="false">
        <rect x="8" y="6" width="22" height="28" rx="2" />
        <line x1="13" y1="13" x2="25" y2="13" />
        <line x1="13" y1="19" x2="25" y2="19" />
        <path d="M24 30 l6 8 q1 2 3 1 l5 -3 q2 -1 1 -3 l-5 -8" />
        <circle cx="30" cy="30" r="2.5" />
      </svg>
    );
  }
  if (step === 1) {
    return (
      <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" focusable="false">
        <rect x="12" y="8" width="24" height="32" rx="2" />
        <path d="M18 24 l5 6 l9 -13" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" focusable="false">
      <rect x="8" y="12" width="32" height="24" rx="2" />
      <line x1="24" y1="8" x2="24" y2="40" />
      <circle cx="24" cy="24" r="3" />
    </svg>
  );
}

/**
 * The manor's front hall, shown at route `#/`. The same painted foyer backdrop
 * the rooms use sits full-bleed behind a candlelit column: the large heading,
 * the tagline, the floating ink-line ghost, one line of three honest facts, the
 * three steps of play (each a small ink drawing, its name and a short line), and
 * a primary control whose label and destination follow the player's progress. A
 * small footer link points teachers to the teaching page.
 *
 * The three steps show the loop before the player enters — spot the trick, name
 * it, set the page free — reading from the shared `TITLE_STEPS` so they never
 * drift from the in-room "?" popover. They are page content above the single
 * "Enter the manor" button, not a dialog: one tap still starts, with nothing to
 * dismiss.
 *
 * Everything navigates with plain `#/…` anchors, so the app's hash router drives
 * every transition. No room chunk is loaded: the next unfinished room's name
 * comes from the static `ROOM_NAMES` list, index-aligned with `roomSlugs()`. The
 * heading keeps `tabindex={-1}` so `App` can return focus to it when the player
 * comes back to the title.
 */
export default function TitleScreen() {
  const done = doneCount();
  const { completed } = loadProgress();
  const slugs = roomSlugs();
  // The first room, in product order, not yet completed. -1 when all are done.
  const firstUnfinishedIndex = slugs.findIndex((s) => !completed.includes(s));

  const allComplete = done >= 12;
  const inProgress = done >= 1 && !allComplete;

  return (
    <div class="title-screen">
      <div class="room" aria-hidden="true">
        <div class="room-wall"></div>
      </div>
      <div class="title-vignette" aria-hidden="true"></div>

      <div class="title-inner">
        <div class="title-headline">
          <h1 class="title-heading" tabIndex={-1}>
            Dark Pattern Manor
          </h1>
          <span class="title-ghost" aria-hidden="true">
            <InkGhost class="title-ghost-svg" />
          </span>
        </div>

        <p class="title-tagline">Every trick is a ghost. Name it to set the page free.</p>

        <p class="title-facts">
          12 haunted rooms · No account, nothing tracked · Plays by keyboard and screen reader
        </p>

        <ol class="title-steps" aria-label="How to play">
          {TITLE_STEPS.map((step, i) => (
            <li key={step.title} class="title-step">
              <span class="title-step-glyph" aria-hidden="true">
                <StepGlyph step={i} />
              </span>
              <span class="title-step-title">{step.title}</span>
              <span class="title-step-line">{step.line}</span>
            </li>
          ))}
        </ol>

        <div class="title-actions">
          {allComplete ? (
            <>
              <a class="title-button" href="#/end">
                The manor is quiet
              </a>
              <a class="title-link" href="#/room/1">
                Walk the rooms again
              </a>
            </>
          ) : inProgress ? (
            <>
              <a class="title-button" href={`#/room/${firstUnfinishedIndex + 1}`}>
                Continue: {ROOM_NAMES[firstUnfinishedIndex]}
              </a>
              <a class="title-link" href="#/room/1">
                Start from the Foyer
              </a>
            </>
          ) : (
            <a class="title-button" href="#/room/1">
              Enter the manor
            </a>
          )}
        </div>

        <p class="title-footer">
          <a class="title-footer-link" href="#/teach">
            For teachers
          </a>
        </p>
      </div>
    </div>
  );
}
