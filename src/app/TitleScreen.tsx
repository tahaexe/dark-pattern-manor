import InkGhost from '../ui/InkGhost';
import { roomSlugs, ROOM_NAMES } from '../engine/registry';
import { doneCount, loadProgress } from '../engine/progress';
import './title-screen.css';

/**
 * The manor's front hall, shown at route `#/`. The same painted foyer backdrop
 * the rooms use sits full-bleed behind a candlelit column: the large heading,
 * the tagline, the floating ink-line ghost, one line of three honest facts,
 * and a primary control whose label and destination follow the player's
 * progress.
 *
 * Everything navigates with plain `#/…` anchors, so the app's hash router
 * drives every transition. No room chunk is loaded: the next unfinished room's
 * name comes from the static `ROOM_NAMES` list, index-aligned with
 * `roomSlugs()`. The heading keeps `tabindex={-1}` so `App` can return focus to
 * it when the player comes back to the title.
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
      </div>
    </div>
  );
}
