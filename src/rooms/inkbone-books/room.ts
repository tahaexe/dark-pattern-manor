import type { RoomData } from '../../engine/types';
import Haunted from './Haunted';
import Honest from './Honest';
import './room.css';

/**
 * Room 2 — The Library. The fictional bookshop Inkbone Books at
 * inkbone-books.manor, possessed by Trick wording: the newsletter checkbox
 * sentence is a double negative, so leaving the box empty keeps you subscribed
 * and ticking it opts you out. The honest twin is one plain, unticked opt-in
 * ("Send me the Inkbone newsletter"), so signing up without the newsletter
 * takes one click.
 *
 * The correct card is placed LAST here (Room 1 places it first), so the
 * correct-card position is not constant across rooms.
 *
 * The US and EU guide lines are the exact legal lines from the room brief and
 * are not rewritten; they are carried in each GuideLine's sourceLabel so the
 * player sees the full wording, linked to the primary source.
 */
const room: RoomData = {
  id: 2,
  slug: 'inkbone-books',
  name: 'The Library',
  brand: 'Inkbone Books',
  brandKind: 'bookshop',
  domain: 'inkbone-books.manor',
  pattern: 'Trick wording',
  task: 'sign up without the newsletter',
  possessedId: 'library-newsletter',
  Haunted,
  Honest,
  cards: [
    {
      pattern: 'Preselection',
      role: 'relative',
      hint: 'Close, but nothing is ticked for you. It\u2019s the sentence that flips.',
    },
    {
      pattern: 'Fake urgency',
      role: 'different',
      hint: 'No clock is ticking. Read the words beside the box.',
    },
    { pattern: 'Trick wording', role: 'correct' },
  ],
  guide: {
    definition:
      'The sentence is built to confuse: double negatives, flipped checkboxes, a "No" that means yes. Skim it and you agree to something you never wanted.',
    whereYouMeetIt:
      'sign-up forms, email preferences, cancel flows ("No, cancel" that doesn\u2019t cancel).',
    us: {
      sourceLabel:
        'The FTC report lists "trick questions", with the example "Uncheck the box if you prefer not to receive email updates" (Appendix A).',
      url: 'https://www.ftc.gov/system/files/ftc_gov/pdf/P214800%20Dark%20Patterns%20Report%209.14.2022%20-%20FINAL.pdf',
    },
    eu: {
      sourceLabel:
        'A request for consent must be in clear and plain language (GDPR Art. 7(2)); silence, pre-ticked boxes or inactivity are not consent (GDPR Recital 32).',
      url: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj',
    },
    tip: 'Read checkbox sentences twice, slowly, and ask: if I leave this alone, what happens?',
  },
};

export default room;
