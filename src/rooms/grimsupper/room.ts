import type { RoomData } from '../../engine/types';
import Haunted from './Haunted';
import Honest from './Honest';
import './room.css';

/**
 * Room 3 — The Dining Room. The fictional restaurant and meal-box shop
 * Grimsupper at grimsupper.manor, possessed by Confirmshaming: the discount
 * pop-up's decline link is written to shame you for saying no — "No thanks,
 * I'd rather pay full price and eat cold soup alone" — small and dim beside a
 * big "Yes, give me 15% off" button. The honest twin is the same pop-up with
 * two plain, equal choices ("Get 15% off" and "No thanks") and a visible close
 * button, so closing it takes one click.
 *
 * The correct card is placed in the MIDDLE here (Room 1 places it first, Room 2
 * last), so the correct-card position is not constant across rooms.
 *
 * The US and EU guide lines are the exact lines from the room brief and are not
 * rewritten; they are carried in each GuideLine's sourceLabel so the player
 * sees the full wording, linked to the primary source.
 */
const room: RoomData = {
  id: 3,
  slug: 'grimsupper',
  name: 'The Dining Room',
  brand: 'Grimsupper',
  brandKind: 'restaurant and meal-box shop',
  domain: 'grimsupper.manor',
  pattern: 'Confirmshaming',
  task: 'close the discount pop-up',
  possessedId: 'dining-decline',
  Haunted,
  Honest,
  cards: [
    {
      pattern: 'Nagging',
      role: 'relative',
      hint: 'Close, but it isn\u2019t asking again and again. Listen to how the \u2018no\u2019 talks to you.',
    },
    { pattern: 'Confirmshaming', role: 'correct' },
    {
      pattern: 'Hidden costs',
      role: 'different',
      hint: 'No price is hiding here. Read the button that says no.',
    },
  ],
  guide: {
    definition:
      'The "no" button is written to make you feel foolish or guilty for saying no. A simple choice becomes a small insult.',
    whereYouMeetIt:
      'discount and newsletter pop-ups, unsubscribe pages, "Are you sure?" screens.',
    us: {
      sourceLabel:
        'The FTC report lists "confirm shaming", with the example "No, I don\u2019t want to save money" (Appendix A).',
      url: 'https://www.ftc.gov/system/files/ftc_gov/pdf/P214800%20Dark%20Patterns%20Report%209.14.2022%20-%20FINAL.pdf',
    },
    eu: {
      sourceLabel:
        'The Digital Services Act bars online platforms from interfaces that deceive or manipulate users or materially distort their free and informed choices (Art. 25(1)), unless the unfair-practices law or the GDPR already covers the practice (Art. 25(2)); Recital 67 mentions presenting choices in a non-neutral manner.',
      url: 'https://eur-lex.europa.eu/eli/reg/2022/2065/oj',
    },
    tip: 'A guilt trip is a sales tactic, not a fact. Click the plain "no"; the page will survive.',
  },
};

export default room;
