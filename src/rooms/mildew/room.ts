import type { RoomData } from '../../engine/types';
import Haunted from './Haunted';
import Honest from './Honest';
import './room.css';

/**
 * Room 9 — The Study. The fictional cloud storage for a household's old
 * letters and ghost memories, Mildew Drive at mildew.manor, possessed by
 * Hidden costs: the haunted page is the last step of a three-step checkout
 * (step indicator "1 Plan · 2 Details · 3 Pay", step 3 current). The plan card
 * still shouts the advertised price, "From £1/month"; under it, and only now
 * at the last step, the real fees appear — "Service fee £1.50/month",
 * "Required backup add-on £2.00/month", "Setup fee £4.99" — with the real
 * total "£4.50/month + £4.99 today" beside a "Pay £9.49 today" button. The
 * block of fee lines is the possessed element; the £4.50/month is the £1 base
 * plus the £1.50 service fee plus the £2.00 required add-on, and the £9.49
 * today is that first month plus the £4.99 setup. The honest twin shows the
 * whole price up front on the step-1 plan card ("£4.50/month, all fees
 * included, + £4.99 setup"), with the same fee lines listed there, so finding
 * the real price takes one click.
 *
 * The correct card is placed in the MIDDLE here (Room 5 first, Room 6 middle,
 * Room 7 last, Room 8 first, Room 9 middle), so the correct-card position is
 * not constant across rooms.
 *
 * Against the engine's RELATIVE_PAIRS, ['Hidden costs', 'Sneaking'] is a
 * declared pair, so Sneaking is the relative; Nagging is paired only with
 * Confirmshaming, Forced action and Addictive design, so it is the (unrelated)
 * different card.
 *
 * The US and EU guide lines are the exact lines from the room brief and are
 * not rewritten; they are carried in each GuideLine's sourceLabel so the
 * player sees the full wording, linked to the primary source.
 */
const room: RoomData = {
  id: 9,
  slug: 'mildew',
  name: 'The Study',
  brand: 'Mildew Drive',
  brandKind: "cloud storage for a household's old letters and ghost memories",
  domain: 'mildew.manor',
  pattern: 'Hidden costs',
  task: 'find the real price',
  possessedId: 'study-fee-lines',
  Haunted,
  Honest,
  cards: [
    {
      pattern: 'Sneaking',
      role: 'relative',
      hint: 'Close, but no extra item arrived. These are fees on the same thing.',
    },
    { pattern: 'Hidden costs', role: 'correct' },
    {
      pattern: 'Nagging',
      role: 'different',
      hint: "Nothing keeps asking you. Read the last step\u2019s lines.",
    },
  ],
  guide: {
    definition:
      'The first price you see ("From \u00a31/month") isn\u2019t what you pay; fees appear only at the last step. By then you\u2019ve spent time and feel committed.',
    whereYouMeetIt:
      'ticketing, food delivery, hotels ("resort fees"), subscriptions, rentals.',
    us: {
      sourceLabel:
        'The FTC report calls it "drip pricing": advertising part of the price and adding mandatory charges late, such as a "convenience fee" that appears only at checkout (Appendix A; section II). Since May 2025 an FTC rule requires the total price up front for live-event tickets and short-term lodging (16 CFR Part 464, effective 12 May 2025).',
      url: 'https://www.ftc.gov/system/files/ftc_gov/pdf/P214800%20Dark%20Patterns%20Report%209.14.2022%20-%20FINAL.pdf',
    },
    eu: {
      sourceLabel:
        "Before you\u2019re bound, the trader must tell you the total price including taxes and all extra charges (Consumer Rights Directive, Art. 6(1)(e)).",
      url: 'https://eur-lex.europa.eu/eli/dir/2011/83/oj',
    },
    tip: 'Go to the final step before you decide; compare totals, not "from" prices.',
  },
};

export default room;
