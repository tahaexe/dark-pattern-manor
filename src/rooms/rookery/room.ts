import type { RoomData } from '../../engine/types';
import Haunted from './Haunted';
import Honest from './Honest';
import './room.css';

/**
 * Room 11 — The Attic. The fictional airline for crows and travelling ghosts,
 * Rookery Air at rookery.manor, possessed by Preselection: the booking's
 * extras step for one ticket "Gloomhaven to Hollow Point, £95" arrives with
 * three extras already ticked — "Travel insurance £12", "Priority boarding
 * £8", "Lucky charm £3" — so the total reads "£118" beside a "Pay £118"
 * button. Above the extras a summary line reads "3 extras added for your trip";
 * that line is the possessed element, a button of its own. The checkboxes are
 * real, labelled inputs outside the button; unticking works and the total
 * follows (£118 → £95). The honest twin is the same extras, all unticked
 * (opt-in), so the button says "Pay £95" and buying only the ticket takes one
 * click.
 *
 * The correct card is placed FIRST here (Room 9 middle, Room 10 last, Room 11
 * first), so the correct-card position is not constant across rooms.
 *
 * Against the engine's RELATIVE_PAIRS, ['Sneaking', 'Preselection'] is a
 * declared pair, so Sneaking is the relative; Fake social proof is paired only
 * with Fake scarcity, never with Preselection, so it is the (unrelated)
 * different card.
 *
 * The US and EU guide lines are the exact lines from the room brief and are
 * not rewritten; they are carried in each GuideLine's sourceLabel so the player
 * sees the full wording, linked to the primary source. The FTC PDF is the same
 * link Room 1 uses; Regulation (EC) No 1008/2008 is on eur-lex.europa.eu, as
 * the steering's allowlist allows.
 */
const room: RoomData = {
  id: 11,
  slug: 'rookery',
  name: 'The Attic',
  brand: 'Rookery Air',
  brandKind: 'airline for crows and travelling ghosts',
  domain: 'rookery.manor',
  pattern: 'Preselection',
  task: 'buy only the ticket',
  possessedId: 'attic-preselect',
  Haunted,
  Honest,
  cards: [
    { pattern: 'Preselection', role: 'correct' },
    {
      pattern: 'Sneaking',
      role: 'relative',
      hint: 'Close, but nothing was slipped into a basket. The boxes were ticked before you came.',
    },
    {
      pattern: 'Fake social proof',
      role: 'different',
      hint: 'No crowd is watching you here. Look at what was chosen before you arrived.',
    },
  ],
  guide: {
    definition:
      'Extras are ticked before you arrive: travel insurance, priority boarding, a "lucky charm". If you don\u2019t untick them, you pay.',
    whereYouMeetIt:
      'flight and travel booking, software installers, newsletter boxes, privacy settings.',
    us: {
      sourceLabel:
        'The FTC report lists "preselection": a default good for the company, not the user, such as trip insurance "automatically tacked on to a purchase unless the customer notices and opts out" (Appendix A).',
      url: 'https://www.ftc.gov/system/files/ftc_gov/pdf/P214800%20Dark%20Patterns%20Report%209.14.2022%20-%20FINAL.pdf',
    },
    eu: {
      sourceLabel:
        'Airlines must show optional extras clearly at the start of booking and add them only on an opt-in basis (Regulation (EC) 1008/2008, Art. 23(1)); a default you must reject is not consent to an extra payment (Consumer Rights Directive, Art. 22).',
      url: 'https://eur-lex.europa.eu/eli/reg/2008/1008/oj',
    },
    tip: 'Scan every ticked box before you pay. A tick you didn\u2019t make is a choice someone made for you.',
  },
};

export default room;
