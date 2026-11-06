import type { RoomData } from '../../engine/types';
import Haunted from './Haunted';
import Honest from './Honest';
import './room.css';

/**
 * Room 7 — The Portrait Gallery. The fictional booking site for haunted inns,
 * Lanternstay at lanternstay.manor, possessed by Fake social proof: two rooms
 * of one inn side by side (two cards). The first, "The Moonlit Suite", carries
 * a possessed watchers badge "38 people are looking at this room right now" (a
 * static number — no ticking, not a live region) and three five-star reviews
 * with no dates and first names only ("Amazing!!! — Sam"). The second, "The
 * Ivy Room", has fewer stars but two dated reviews marked "Stayed in October
 * 2026". The crowd is made up and the glowing reviews are undated, so a choice
 * feels popular and safe when it is not. The honest twin is the same two cards
 * with no counter, every review dated and marked with its stay, so choosing a
 * room by real reviews takes one click.
 *
 * The correct card is placed LAST here (Room 5 first, Room 6 middle, Room 7
 * last), so the correct-card position is not constant across rooms.
 *
 * Against the engine's RELATIVE_PAIRS, ['Fake scarcity', 'Fake social proof']
 * is a declared pair, so Fake scarcity is the relative; Disguised ads is
 * paired only with Visual interference, not with Fake social proof, so it is
 * the (unrelated) different card.
 *
 * The US and EU guide lines are the exact lines from the room brief and are
 * not rewritten; they are carried in each GuideLine's sourceLabel so the
 * player sees the full wording, linked to the primary source.
 */
const room: RoomData = {
  id: 7,
  slug: 'lanternstay',
  name: 'The Portrait Gallery',
  brand: 'Lanternstay',
  brandKind: 'booking site for haunted inns',
  domain: 'lanternstay.manor',
  pattern: 'Fake social proof',
  task: 'choose a room by real reviews',
  possessedId: 'gallery-watchers',
  Haunted,
  Honest,
  cards: [
    {
      pattern: 'Fake scarcity',
      role: 'relative',
      hint: 'Close, but no one says it\u2019s running out. The crowd itself is fake.',
    },
    {
      pattern: 'Disguised ads',
      role: 'different',
      hint: 'These aren\u2019t ads dressed as news. Look at who is \u2018watching\u2019.',
    },
    { pattern: 'Fake social proof', role: 'correct' },
  ],
  guide: {
    definition:
      '"38 people are looking at this room" and glowing reviews no guest ever wrote make a choice feel popular and safe. The crowd is made up.',
    whereYouMeetIt:
      'hotel and travel sites, shops with "someone just bought this" pop-ups, review sections.',
    us: {
      sourceLabel:
        'The FTC report lists "false activity messages", with the example "24 other people are viewing this listing" (Appendix A; section I). An FTC rule in force since October 2024 bans fake consumer reviews and testimonials and fake social-media indicators (16 CFR Part 465, in force 21 October 2024).',
      url: 'https://www.ftc.gov/system/files/ftc_gov/pdf/P214800%20Dark%20Patterns%20Report%209.14.2022%20-%20FINAL.pdf',
    },
    eu: {
      sourceLabel:
        'Submitting or commissioning fake reviews, or claiming reviews come from real customers without checking, is unfair in all circumstances (Unfair Commercial Practices Directive, Annex I, points 23b and 23c).',
      url: 'https://eur-lex.europa.eu/eli/dir/2005/29/oj',
    },
    tip: 'Trust dated reviews tied to real stays or purchases; ignore "people are looking" counters.',
  },
};

export default room;
