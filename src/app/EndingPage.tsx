import { useEffect, useRef } from 'preact/hooks';
import { doneCount } from '../engine/progress';
import { quiet } from '../audio/sound';
import ShareCard from './ShareCard';
import './ending.css';

/**
 * One checklist line: a practical self-check, the room it recaps, and that
 * room's display title. The room link's accessible name is the title, so
 * assistive technology announces which room the link leads to. The line texts
 * are product copy, carried here word for word.
 */
interface ChecklistItem {
  line: string;
  room: number;
  title: string;
}

const CHECKLIST: ReadonlyArray<ChecklistItem> = [
  { line: 'On a cookie banner, find "Reject all" before you click anything.', room: 1, title: 'The Foyer' },
  {
    line: 'Read every checkbox sentence twice: what happens if I leave it alone?',
    room: 2,
    title: 'The Library',
  },
  { line: 'When the "no" button insults you, click it anyway.', room: 3, title: 'The Dining Room' },
  {
    line: 'Before a free trial: the price after, the start date, the way to cancel.',
    room: 4,
    title: 'The Parlour',
  },
  { line: 'A countdown that resets is a costume. Reload and see.', room: 5, title: 'The Conservatory' },
  { line: '"Only 1 left" on everything means nothing.', room: 6, title: 'The Ballroom' },
  {
    line: 'Trust dated, verified reviews; ignore "people are looking".',
    room: 7,
    title: 'The Portrait Gallery',
  },
  { line: 'Read the basket line by line before paying.', room: 8, title: 'The Pantry' },
  { line: 'Compare final totals, never "from" prices.', room: 9, title: 'The Study' },
  {
    line: 'Find "Don\'t ask again", or switch the prompt off in settings.',
    room: 10,
    title: 'The Nursery',
  },
  { line: "Untick every box you didn't tick.", room: 11, title: 'The Attic' },
  {
    line: 'Find the cancel path before you subscribe; keep the confirmation.',
    room: 12,
    title: 'The Cellar',
  },
];

/** The six patterns that only ever lived in the Guide. Name and one line. */
interface WanderingGhost {
  name: string;
  desc: string;
}

const WANDERING: ReadonlyArray<WanderingGhost> = [
  { name: 'Disguised ads', desc: 'ads dressed as news, reviews or neutral rankings.' },
  {
    name: 'Forced action',
    desc: 'you must create an account or share data to finish a simple task.',
  },
  { name: 'Obstruction', desc: 'the path you want is made long and tiring on purpose.' },
  {
    name: 'Comparison prevention',
    desc: 'bundles, odd units or per-week prices that make prices hard to compare.',
  },
  { name: 'Addictive design', desc: 'endless feeds, autoplay and streaks that keep you there.' },
  { name: 'Currency confusion', desc: 'gems and coins that hide the real price.' },
];

/**
 * The ending, reached at `#/end`. Before all twelve rooms are complete it is
 * gated: a short line and a way back, never the checklist. Once twelve are
 * complete it shows the closing heading, the "Ghost hunt in your own browser"
 * checklist (each line linking to its room), the six wandering ghosts, and the
 * privacy-respecting share card.
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
          <a href="#/">Back to the door</a>
        </p>
      </div>
    </div>
  );
}
