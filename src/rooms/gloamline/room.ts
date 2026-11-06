import type { RoomData } from '../../engine/types';
import Haunted from './Haunted';
import Honest from './Honest';
import './room.css';

/**
 * Room 4 — The Parlour. The fictional streaming service for ghost stories
 * Gloamline at gloamline.manor, possessed by Hidden subscription: the sign-up
 * page shouts "7 days free" and offers a bright "Start my free trial" button,
 * while the price after the trial, the date billing starts and the way to
 * cancel sit in one small, light paragraph far below the button. The honest
 * twin puts those three facts beside the button at body-text size and names
 * the price on the button itself — "Start free trial, then £9.99 a month" — so
 * starting the trial knowingly takes one click.
 *
 * The correct card is placed LAST here (Room 1 places it first, Room 3 in the
 * middle), so the correct-card position is not constant across rooms.
 *
 * Against the engine's RELATIVE_PAIRS, ['Hidden subscription', 'Hidden costs']
 * is a declared pair, so Hidden costs is the relative; Fake social proof is
 * paired only with Fake scarcity, so it is the (unrelated) different card.
 *
 * The US and EU guide lines are the exact lines from the room brief and are
 * not rewritten; they are carried in each GuideLine's sourceLabel so the
 * player sees the full wording, linked to the primary source.
 */
const room: RoomData = {
  id: 4,
  slug: 'gloamline',
  name: 'The Parlour',
  brand: 'Gloamline',
  brandKind: 'streaming service for ghost stories',
  domain: 'gloamline.manor',
  pattern: 'Hidden subscription',
  task: 'start the free trial, knowing what comes after',
  possessedId: 'parlour-smallprint',
  Haunted,
  Honest,
  cards: [
    {
      pattern: 'Hidden costs',
      role: 'relative',
      hint: 'Close, but this isn\u2019t an extra fee at checkout. It\u2019s a charge that starts later, every month.',
    },
    {
      pattern: 'Fake social proof',
      role: 'different',
      hint: 'No crowd is watching. Shine your light on the small print.',
    },
    { pattern: 'Hidden subscription', role: 'correct' },
  ],
  guide: {
    definition:
      '"Free" quietly turns into a monthly charge, and the price, the date and the way out sit in small grey print. Many people only find out from their bank statement.',
    whereYouMeetIt:
      'free trials for streaming, apps and software; "first box free" offers.',
    us: {
      sourceLabel:
        'The FTC report lists "hidden subscription or forced continuity" (Appendix A) and treats free trials that roll into charges as leading to unauthorized charges (section III). The Restore Online Shoppers\u2019 Confidence Act (ROSCA) requires clear disclosure of the material terms before billing details are taken, express informed consent, and a simple way to stop recurring charges (15 U.S.C. \u00a7 8403).',
      url: 'https://www.ftc.gov/system/files/ftc_gov/pdf/P214800%20Dark%20Patterns%20Report%209.14.2022%20-%20FINAL.pdf',
    },
    eu: {
      sourceLabel:
        'Just before you order, the trader must show the total price, the contract\u2019s length and how to end it clearly and prominently, and the order button must say that ordering means paying (Consumer Rights Directive, Art. 8(2)).',
      url: 'https://eur-lex.europa.eu/eli/dir/2011/83/oj',
    },
    tip: 'Before you enter a card for a free trial, find three things: the price after, the date it starts, the way to cancel. Then set a reminder.',
  },
};

export default room;
