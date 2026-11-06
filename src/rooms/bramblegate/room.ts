import type { RoomData } from '../../engine/types';
import Haunted from './Haunted';
import Honest from './Honest';
import './room.css';

/**
 * Room 12 — The Cellar. The fictional gym for restless spirits, Bramblegate
 * Fitness at bramblegate.manor, possessed by Hard to cancel: the member's
 * account page reads "Membership: Active, £39/month" and offers a bright
 * "Upgrade to Gold" button and a "Pause instead" button, while the only way
 * out is one small line at the bottom — "To cancel, complete our 7-step exit
 * survey or call 0800 000 000 between 3 and 4 a.m." That line is the possessed
 * element, a button of its own; there is NO cancel button on the haunted side.
 * The honest twin is the same page with a plain "Cancel membership" button
 * beside the others; one click cancels and shows "Membership cancelled. A
 * confirmation is on its way to your inbox.", so cancelling takes one click.
 *
 * The correct card is placed in the MIDDLE here (Room 10 last, Room 11 first,
 * Room 12 middle), so the correct-card position is not constant across rooms.
 *
 * Against the engine's RELATIVE_PAIRS, ['Hard to cancel', 'Hidden subscription']
 * is a declared pair, so Hidden subscription is the relative; Fake urgency is
 * paired only with Fake scarcity, never with Hard to cancel, so it is the
 * (unrelated) different card.
 *
 * The US and EU guide lines are the exact lines from the room brief and are
 * not rewritten; they are carried in each GuideLine's sourceLabel so the player
 * sees the full wording, linked to the primary source. The FTC PDF is the same
 * link Room 1 uses; the Digital Services Act, Regulation (EU) 2022/2065, is on
 * eur-lex.europa.eu — the same link Rooms 3 and 10 use — as the steering's
 * allowlist allows. The phone number 0800 000 000 is a fictional placeholder,
 * written exactly as given.
 */
const room: RoomData = {
  id: 12,
  slug: 'bramblegate',
  name: 'The Cellar',
  brand: 'Bramblegate Fitness',
  brandKind: 'gym for restless spirits',
  domain: 'bramblegate.manor',
  pattern: 'Hard to cancel',
  task: 'cancel the membership',
  possessedId: 'cellar-cancel',
  Haunted,
  Honest,
  cards: [
    {
      pattern: 'Hidden subscription',
      role: 'relative',
      hint: 'Close, but you knew you were subscribing. The trick is the way out.',
    },
    { pattern: 'Hard to cancel', role: 'correct' },
    {
      pattern: 'Fake urgency',
      role: 'different',
      hint: "No timer here. Count the doors between you and 'Cancel'.",
    },
  ],
  guide: {
    definition:
      'Joining takes one click; leaving takes seven pages, a phone call at 3 a.m. or a chat that keeps offering deals. The maze is the point.',
    whereYouMeetIt:
      'gyms, newspapers, streaming, software subscriptions, memberships.',
    us: {
      sourceLabel:
        'The FTC report lists "roadblocks to cancellation": easy to sign up, hard to cancel, e.g. a phone line open only at limited hours (Appendix A; section III). ROSCA requires a simple way to stop recurring charges (15 U.S.C. \u00a7 8403(3)). The FTC\u2019s 2024 "click-to-cancel" rule was vacated by the Eighth Circuit on 8 July 2025 (Custom Communications v. FTC, No. 24-3137), so the game never rests on it.',
      url: 'https://www.ftc.gov/system/files/ftc_gov/pdf/P214800%20Dark%20Patterns%20Report%209.14.2022%20-%20FINAL.pdf',
    },
    eu: {
      sourceLabel:
        'The Digital Services Act names "making the procedure for terminating a service more difficult than subscribing to it" as a practice the Commission may issue guidelines on for online platforms (Art. 25(3)(c)).',
      url: 'https://eur-lex.europa.eu/eli/reg/2022/2065/oj',
    },
    tip: 'Before you subscribe, find the cancel path. Cancel in writing if you can and keep the confirmation.',
  },
};

export default room;
