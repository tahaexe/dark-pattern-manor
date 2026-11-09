import { useEffect, useRef, useState } from 'preact/hooks';
import { doneCount } from '../engine/progress';
import { ROOM_COUNT } from '../engine/registry';
import { quiet } from '../audio/sound';
import ShareCard from './ShareCard';
import { CHECKLIST, WANDERING } from './checklist';
import { bookmarkletFor, fetchBundle } from './runBundle';
import './ending.css';

/**
 * The "Take the lantern with you" block: a draggable "Ghost Lantern" link the
 * player drags to their bookmarks bar, the one-line install note, and a link to
 * the practice page.
 *
 * A framework may refuse a `javascript:` href in JSX, so the link's href is set
 * through a ref with setAttribute once the bundle has been fetched from our own
 * site. Until then the link reads "Preparing the lantern…", carries no href,
 * and is not draggable. The lantern bundle itself makes no request; this one
 * same-origin fetch is the app fetching its own `./lantern.js`.
 */
function TakeTheLantern() {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetchBundle()
      .then((source) => {
        if (!active) return;
        const link = linkRef.current;
        if (link) {
          // setAttribute, not a JSX prop, so the framework does not strip it.
          link.setAttribute('href', bookmarkletFor(source));
          setReady(true);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section class="ending-section ending-lantern" aria-labelledby="ending-lantern-heading">
      <h2 id="ending-lantern-heading" class="ending-heading">
        Take the lantern with you
      </h2>
      <p class="ending-para">
        The Ghost Lantern is a bookmarklet. On any page, one click lights it: it marks the parts
        that show a possible dark pattern and names each one. It reads only what is on your screen,
        sends nothing anywhere, and leaves no trace when you put it out.
      </p>
      <p class="ending-lantern-grab">
        <a
          ref={linkRef}
          class="ending-lantern-link"
          draggable={ready}
          aria-disabled={ready ? undefined : 'true'}
        >
          {ready
            ? 'Ghost Lantern'
            : failed
              ? 'The lantern could not be prepared'
              : 'Preparing the lantern…'}
        </a>
      </p>
      <p class="ending-lantern-note">Drag this to your bookmarks bar, then click it on any page.</p>
      <p class="ending-lantern-practice">
        Or{' '}
        <a class="ending-lantern-practice-link" href="#/lantern-practice">
          try the lantern on a practice page
        </a>{' '}
        first.
      </p>
    </section>
  );
}

/**
 * The ending, reached at `#/end`. Before every room is complete it is gated: a
 * short line and a way back, never the checklist. Once all rooms are complete it
 * shows the closing heading, the "Ghost hunt in your own browser" checklist
 * (each line linking to its room), the four wandering ghosts, the "Take the
 * lantern with you" block, and the privacy-respecting share card.
 *
 * The completion threshold is the registry's room count, so adding a room needs
 * no change here. The checklist lines and the wandering ghosts come from the
 * shared `./checklist` module, so this page and the teaching page
 * (`ClassroomPage`) can never drift.
 */
export default function EndingPage() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const complete = doneCount() >= ROOM_COUNT;

  // Move focus to the page heading on entry, matching the room pattern.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // The gentle three-note descending chime, once, when the ending opens with
  // every ghost named. A no-op when sound is off or there is no audio.
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
          <p class="ending-lead">Name all fourteen ghosts first.</p>
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
        <p class="ending-lead">You named all fourteen ghosts.</p>

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
            Four ghosts still wander
          </h2>
          <ul class="ending-wandering">
            {WANDERING.map((ghost) => (
              <li key={ghost.name} class="ending-wandering-item">
                <strong class="ending-wandering-name">{ghost.name}</strong>: {ghost.desc}
              </li>
            ))}
          </ul>
        </section>

        <TakeTheLantern />

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
