import { useEffect, useRef } from 'preact/hooks';
import { doneCount } from '../engine/progress';
import { quiet } from '../audio/sound';
import ShareCard from './ShareCard';
import { CHECKLIST, WANDERING } from './checklist';
import './ending.css';

/**
 * The ending, reached at `#/end`. Before all twelve rooms are complete it is
 * gated: a short line and a way back, never the checklist. Once twelve are
 * complete it shows the closing heading, the "Ghost hunt in your own browser"
 * checklist (each line linking to its room), the six wandering ghosts, and the
 * privacy-respecting share card.
 *
 * The checklist lines and the six wandering ghosts come from the shared
 * `./checklist` module, so this page and the teaching page (`ClassroomPage`)
 * can never drift.
 */
export default function EndingPage() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const complete = doneCount() >= 12;

  // Move focus to the page heading on entry, matching the room pattern.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // The gentle three-note descending chime, once, when the ending opens with
  // all twelve named. A no-op when sound is off or there is no audio.
  useEffect(() => {
    if (complete) quiet();
  }, [complete]);

  if (!complete) {
    return (
      <div class="room-scene ending">
        <div class="room" aria-hidden="true">
          <div class="room-wall"></div>
        </div>
        <div class="manor-frame ending-card ending-gate">
          <h1 class="ending-title" tabIndex={-1} ref={headingRef}>
            The manor waits
          </h1>
          <p class="ending-lead">Name all twelve ghosts first.</p>
          <p class="ending-back">
            <a href="#/">Back to the door</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div class="room-scene ending">
      <div class="room" aria-hidden="true">
        <div class="room-wall"></div>
      </div>

      <div class="manor-frame ending-card">
        <h1 class="ending-title" tabIndex={-1} ref={headingRef}>
          The manor is quiet
        </h1>
        <p class="ending-lead">You named all twelve ghosts.</p>

        <section class="ending-section" aria-labelledby="ending-checklist-heading">
          <h2 id="ending-checklist-heading" class="ending-heading">
            Ghost hunt in your own browser
          </h2>
          <ol class="ending-checklist">
            {CHECKLIST.map((item) => (
              <li key={item.room} class="ending-checklist-item">
                <span class="ending-checklist-line">{item.line}</span>{' '}
                <a
                  class="ending-room-link"
                  href={`#/room/${item.room}`}
                  aria-label={`Revisit room ${item.room}: ${item.title}`}
                >
                  Revisit {item.title}
                </a>
              </li>
            ))}
          </ol>
        </section>

        <section class="ending-section" aria-labelledby="ending-wandering-heading">
          <h2 id="ending-wandering-heading" class="ending-heading">
            Six ghosts still wander
          </h2>
          <ul class="ending-wandering">
            {WANDERING.map((ghost) => (
              <li key={ghost.name} class="ending-wandering-item">
                <strong class="ending-wandering-name">{ghost.name}</strong>: {ghost.desc}
              </li>
            ))}
          </ul>
        </section>

        <ShareCard />
        <p class="ending-back">
          <a href="#/teach">For teachers</a>
        </p>
        <p class="ending-back">
          <a href="#/">Back to the door</a>
        </p>
      </div>
    </div>
  );
}
