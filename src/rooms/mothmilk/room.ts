import type { RoomData } from '../../engine/types';
import Haunted from './Haunted';
import Honest from './Honest';
import './room.css';

/**
 * Room 8 — The Pantry. The fictional night grocer for the household's ghosts,
 * Mothmilk Market at mothmilk.manor, possessed by Sneaking: the checkout
 * basket holds the two items the visitor picked and a third line nobody
 * picked, "Ghost Protection £2.99", already in the basket, with the total
 * including it ("Pay £6.59"). Removing the sneaked line takes it out and drops
 * the total to £3.60 — but about 1.5 s later it quietly comes back and the
 * total returns to £6.59. The reset is honest in the code: one timer per
 * removal drives the return and is cleared on unmount. The honest twin holds
 * only the two picked items and "Pay £3.60", with Ghost Protection offered
 * outside the basket as an unticked, plainly priced option, so paying only for
 * what you picked takes one click.
 *
 * The correct card is placed FIRST here (Room 5 first, Room 6 middle, Room 7
 * last, Room 8 first again), so the correct-card position is not constant
 * across rooms.
 *
 * Against the engine's RELATIVE_PAIRS, ['Sneaking', 'Preselection'] is a
 * declared pair, so Preselection is the relative; Confirmshaming is paired
 * only with Nagging, so it is the (unrelated) different card.
 *
 * The US and EU guide lines are the exact lines from the room brief and are
 * not rewritten; they are carried in each GuideLine's sourceLabel so the
 * player sees the full wording, linked to the primary source.
 */
const room: RoomData = {
  id: 8,
  slug: 'mothmilk',
  name: 'The Pantry',
  brand: 'Mothmilk Market',
  brandKind: "night grocer for the household's ghosts",
  domain: 'mothmilk.manor',
  pattern: 'Sneaking',
  task: 'pay only for what you picked',
  possessedId: 'pantry-sneaked-line',
  Haunted,
  Honest,
  cards: [
    { pattern: 'Sneaking', role: 'correct' },
    {
      pattern: 'Preselection',
      role: 'relative',
      hint: 'Close, but no box was ticked. The item walked into your basket by itself.',
    },
    {
      pattern: 'Confirmshaming',
      role: 'different',
      hint: 'No one is insulting you. Check the basket\u2019s lines.',
    },
  ],
  guide: {
    definition:
      'Something you never chose ("Ghost Protection \u00a32.99") slips into your basket and comes back when you take it out. You pay for it unless you notice.',
    whereYouMeetIt:
      'checkout pages, ticket and travel booking, insurance and warranty add-ons, donation add-ons.',
    us: {
      sourceLabel:
        'The FTC report lists "sneak-into-basket": "Automatically adding items to the shopping cart without a shopper\u2019s permission" (Appendix A).',
      url: 'https://www.ftc.gov/system/files/ftc_gov/pdf/P214800%20Dark%20Patterns%20Report%209.14.2022%20-%20FINAL.pdf',
    },
    eu: {
      sourceLabel:
        'A trader needs your express consent for any extra payment; if it was inferred from a default you had to reject, you\u2019re entitled to a refund (Consumer Rights Directive, Art. 22).',
      url: 'https://eur-lex.europa.eu/eli/dir/2011/83/oj',
    },
    tip: 'Read the basket line by line before you pay; anything you didn\u2019t add is a ghost.',
  },
};

export default room;
