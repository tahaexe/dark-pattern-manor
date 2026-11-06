import type { RoomData } from '../../engine/types';
import Haunted from './Haunted';
import Honest from './Honest';
import './room.css';

/**
 * Room 6 — The Ballroom. The fictional shop for ghostly ballroom cloaks,
 * Shroudery at shroudery.manor, possessed by Fake scarcity: a cloak product
 * page with size buttons XS, S, M, L, XL and, under them, one stock line that
 * always says "Only 1 left in <the size you picked>! Order soon." for
 * whichever size is picked (and "Only 1 left! Order soon." before any pick),
 * whatever the real stock. The scarcity is a lie — it claims the last item on
 * every size, every time. The honest twin is the same cloak page where the
 * stock line tells the truth in plain text ("In stock" for every size, "3
 * left" only on XL), so picking the right size calmly takes one click.
 *
 * The correct card is placed in the MIDDLE here (Room 4 last, Room 5 first,
 * Room 6 middle), so the correct-card position is not constant across rooms.
 *
 * Against the engine's RELATIVE_PAIRS, ['Fake urgency', 'Fake scarcity'] is a
 * declared pair, so Fake urgency is the relative; Visual interference is
 * paired with Trick wording and Disguised ads, not with Fake scarcity, so it
 * is the (unrelated) different card.
 *
 * The US and EU guide lines are the exact lines from the room brief and are
 * not rewritten; they are carried in each GuideLine's sourceLabel so the
 * player sees the full wording, linked to the primary source.
 */
const room: RoomData = {
  id: 6,
  slug: 'shroudery',
  name: 'The Ballroom',
  brand: 'Shroudery',
  brandKind: 'shop for ghostly ballroom cloaks',
  domain: 'shroudery.manor',
  pattern: 'Fake scarcity',
  task: 'pick the right size',
  possessedId: 'ballroom-stock',
  Haunted,
  Honest,
  cards: [
    {
      pattern: 'Fake urgency',
      role: 'relative',
      hint: 'Close, but no clock is ticking. It\u2019s the stock count that lies.',
    },
    { pattern: 'Fake scarcity', role: 'correct' },
    {
      pattern: 'Visual interference',
      role: 'different',
      hint: 'The buttons look fair. Touch the \u2018only 1 left\u2019 label again.',
    },
  ],
  guide: {
    definition:
      '"Only 1 left!" sits on every size, every time, whatever the real stock. The fear of missing out does the selling.',
    whereYouMeetIt: 'clothing shops, hotel and flight sites, marketplaces.',
    us: {
      sourceLabel:
        'The FTC report lists the "false low stock message", with the example "Only 1 left in stock – order soon" (Appendix A; section I: claims "that an item is almost sold out when there is actually ample supply").',
      url: 'https://www.ftc.gov/system/files/ftc_gov/pdf/P214800%20Dark%20Patterns%20Report%209.14.2022%20-%20FINAL.pdf',
    },
    eu: {
      sourceLabel:
        'Misleading people about a product\u2019s availability is a misleading commercial practice (Unfair Commercial Practices Directive, Art. 6(1)(b)).',
      url: 'https://eur-lex.europa.eu/eli/dir/2005/29/oj',
    },
    tip: 'If every option is "almost gone", none of them is. Pick what fits, not what\u2019s "last".',
  },
};

export default room;
