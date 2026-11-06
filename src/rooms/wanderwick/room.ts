import type { RoomData } from '../../engine/types';
import Haunted from './Haunted';
import Honest from './Honest';
import './room.css';

/**
 * Room 10 — The Nursery. The fictional toy-box puzzle game for the house's
 * small ghosts, Wanderwick at wanderwick.manor, possessed by Nagging: over a
 * small decorative puzzle board, a non-modal pop-up asks "Enjoying Wanderwick?
 * Turn on notifications!" and offers only "Yes" and "Not now" — there is no
 * real "No". Pressing "Not now" closes the pop-up, but about 3 s later it comes
 * back, every time, with a counter that rises ("Asked 2 times", "Asked 3
 * times"). The return is honest in the code: one timer per "Not now" drives it
 * and is cleared on unmount. The honest twin is the same board and one prompt
 * with "Turn on" and a real "No, don't ask again"; once answered it never
 * returns, so keeping playing takes one click.
 *
 * The correct card is placed LAST here (Room 8 first, Room 9 middle, Room 10
 * last), so the correct-card position is not constant across rooms.
 *
 * Against the engine's RELATIVE_PAIRS, ['Confirmshaming', 'Nagging'] is a
 * declared pair, so Confirmshaming is the relative; Hidden subscription is
 * paired only with Hidden costs and Hard to cancel, never with Nagging, so it
 * is the (unrelated) different card.
 *
 * The US and EU guide lines are the exact lines from the room brief and are
 * not rewritten; they are carried in each GuideLine's sourceLabel so the player
 * sees the full wording, linked to the primary source. The FTC PDF is the same
 * link Room 1 uses; the Digital Services Act regulation is the same link Room 3
 * uses.
 */
const room: RoomData = {
  id: 10,
  slug: 'wanderwick',
  name: 'The Nursery',
  brand: 'Wanderwick',
  brandKind: "toy-box puzzle game for the house's small ghosts",
  domain: 'wanderwick.manor',
  pattern: 'Nagging',
  task: 'keep playing',
  possessedId: 'nursery-prompt',
  Haunted,
  Honest,
  cards: [
    {
      pattern: 'Confirmshaming',
      role: 'relative',
      hint: 'Close, but the question isn\u2019t rude, just endless. Count how often it returns.',
    },
    {
      pattern: 'Hidden subscription',
      role: 'different',
      hint: 'No trial is turning into a bill. Watch the pop-up come back.',
    },
    { pattern: 'Nagging', role: 'correct' },
  ],
  guide: {
    definition:
      'The same request pops up again and again until you give in, and "No" only means "not now". You pay with your attention until you say yes.',
    whereYouMeetIt:
      'app rating prompts, notification and location requests, cookie re-prompts, upgrade pop-ups in games.',
    us: {
      sourceLabel:
        'The FTC report lists "nagging": asking repeatedly, or offering "Yes" and "Not Now" instead of "Yes" and "No" (Appendix A).',
      url: 'https://www.ftc.gov/system/files/ftc_gov/pdf/P214800%20Dark%20Patterns%20Report%209.14.2022%20-%20FINAL.pdf',
    },
    eu: {
      sourceLabel:
        'The Digital Services Act names "repeatedly requesting" a choice already made, "especially by presenting pop-ups", as a practice the Commission may issue guidelines on for online platforms (Art. 25(3)(b)).',
      url: 'https://eur-lex.europa.eu/eli/reg/2022/2065/oj',
    },
    tip: 'Look for a real "No" or "Don\u2019t ask again", and turn the prompts off in the app\u2019s settings.',
  },
};

export default room;
