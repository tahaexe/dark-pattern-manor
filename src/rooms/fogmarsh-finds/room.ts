import type { RoomData } from '../../engine/types';
import Haunted from './Haunted';
import Honest from './Honest';
import './room.css';

/**
 * Room 13 — The Map Room. The fictional review site Fogmarsh Finds at
 * fogmarsh-finds.manor, possessed by Disguised ads: a ranked "top 5 night
 * lanterns" list styled like editorial picks, where number 1 ("Editor's
 * choice", the brightest card, the first "Buy" button) is really a paid
 * placement — its only honest sign is a small "partner" tag after the price, in
 * the same style as the rest of the card. The trick is placement and sameness,
 * never faint text: every text meets WCAG AA.
 *
 * The honest twin lifts the paid placement out into a clearly-marked
 * "Advertisement · paid by Wickmere Lamps" box, visually different from the
 * editorial cards, then shows the ranking with its criterion stated in one line
 * ("ranked by 1,240 verified owner reviews; no brand pays for a place"), so the
 * task — choosing the real top-rated lantern — takes one click.
 *
 * Against the engine's RELATIVE_PAIRS, ['Visual interference', 'Disguised ads']
 * is a declared pair, so Visual interference is the relative; Hidden costs is
 * never paired with Disguised ads, so it is the (unrelated) different card.
 *
 * The US and EU guide lines are the exact lines from the room brief and are not
 * rewritten; they are carried in each GuideLine's sourceLabel so the player
 * sees the full wording, linked to the primary source.
 */
const room: RoomData = {
  id: 13,
  slug: 'fogmarsh-finds',
  name: 'The Map Room',
  brand: 'Fogmarsh Finds',
  brandKind: 'review site',
  domain: 'fogmarsh-finds.manor',
  pattern: 'Disguised ads',
  task: 'find the best-reviewed lantern for a night walk',
  possessedId: 'maproom-top-pick',
  Haunted,
  Honest,
  cards: [
    { pattern: 'Disguised ads', role: 'correct' },
    {
      pattern: 'Visual interference',
      role: 'relative',
      hint: 'Close. Nothing is hidden by how it looks; it is what it pretends to be that lies.',
    },
    {
      pattern: 'Hidden costs',
      role: 'different',
      hint: 'No. The price is right there; the question is who is paying for the praise.',
    },
  ],
  guide: {
    definition:
      'An advert dressed as something else: a news story, a review, a neutral ranking or a search result. You trust it as independent advice, but someone paid for it.',
    whereYouMeetIt:
      "'Top 10' lists, sponsored search results, recommended articles and posts that say 'partner' only in small print.",
    us: {
      sourceLabel:
        'The FTC treats ads that people cannot recognise as ads as deceptive when they make people believe the message is independent or impartial.',
      url: 'https://www.ftc.gov/system/files/documents/public_statements/896923/151222deceptiveenforcement.pdf',
    },
    eu: {
      sourceLabel:
        'EU law bans paid editorial content that hides the payment, and search results that hide paid placement or paid ranking; online platforms must mark every ad clearly.',
      url: 'https://eur-lex.europa.eu/eli/dir/2005/29/oj',
    },
    tip: "Look for 'Ad', 'Sponsored' or 'Partner' before you trust a ranking. If a list never says how it ranks, treat its number one as an ad.",
  },
};

export default room;
