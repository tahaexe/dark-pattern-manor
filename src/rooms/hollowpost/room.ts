import type { RoomData } from '../../engine/types';
import Haunted from './Haunted';
import Honest from './Honest';
import './room.css';

/**
 * Room 5 — The Conservatory. The fictional ticket shop for a midnight séance
 * concert, Hollowpost Tickets at hollowpost.manor, possessed by Fake urgency:
 * a red banner "Offer ends in 04:59" counts down second by second and, when it
 * reaches 00:00, quietly starts again from 04:59 — a deadline that never truly
 * arrives. The reset is honest in the code: one timer drives the countdown and
 * is cleared on unmount. The honest twin is the same ticket page with the
 * price, the date of the concert and "Tickets on sale until 31 October" as
 * plain text and no countdown, so buying calmly takes one click.
 *
 * The correct card is placed FIRST here (Room 1 first, Room 2 last, Room 3
 * middle, Room 4 last), so the correct-card position is not constant across
 * rooms.
 *
 * Against the engine's RELATIVE_PAIRS, ['Fake urgency', 'Fake scarcity'] is a
 * declared pair, so Fake scarcity is the relative; Confirmshaming is paired
 * only with Nagging, so it is the (unrelated) different card.
 *
 * The US and EU guide lines are the exact lines from the room brief and are
 * not rewritten; they are carried in each GuideLine's sourceLabel so the
 * player sees the full wording, linked to the primary source.
 */
const room: RoomData = {
  id: 5,
  slug: 'hollowpost',
  name: 'The Conservatory',
  brand: 'Hollowpost Tickets',
  brandKind: 'ticket shop for a midnight séance concert',
  domain: 'hollowpost.manor',
  pattern: 'Fake urgency',
  task: 'buy the ticket without rushing',
  possessedId: 'conservatory-countdown',
  Haunted,
  Honest,
  cards: [
    { pattern: 'Fake urgency', role: 'correct' },
    {
      pattern: 'Fake scarcity',
      role: 'relative',
      hint: 'Close, but it isn\u2019t about how many are left. It\u2019s about the clock.',
    },
    {
      pattern: 'Confirmshaming',
      role: 'different',
      hint: 'No one is shaming you here. Watch the timer.',
    },
  ],
  guide: {
    definition:
      'A countdown or "ends tonight" banner pushes you to decide now, but the deadline is invented and resets when it runs out. Hurry shrinks the time you spend comparing.',
    whereYouMeetIt: 'ticket sites, flash sales, travel booking, online courses.',
    us: {
      sourceLabel:
        'The FTC report lists the "baseless countdown timer": a fake clock "that just goes away or resets when it times out" (Appendix A; section I, false beliefs).',
      url: 'https://www.ftc.gov/system/files/ftc_gov/pdf/P214800%20Dark%20Patterns%20Report%209.14.2022%20-%20FINAL.pdf',
    },
    eu: {
      sourceLabel:
        'Falsely saying a product or offer is available only for a very limited time, to force a quick decision, is unfair in all circumstances (Unfair Commercial Practices Directive, Annex I, point 7).',
      url: 'https://eur-lex.europa.eu/eli/dir/2005/29/oj',
    },
    tip: 'Reload or come back later: a real deadline doesn\u2019t move. If the clock resets, so can you.',
  },
};

export default room;
