import type { RoomData } from '../../engine/types';
import Haunted from './Haunted';
import Honest from './Honest';
import './room.css';

/**
 * Room 1 — The Foyer. The fictional news brand The Gravemoor Gazette at
 * gravemoor-gazette.manor, possessed by Visual interference: the "Reject all"
 * choice is a faint text link beside a bright "Accept all" button.
 */
const room: RoomData = {
  id: 1,
  slug: 'gravemoor-gazette',
  name: 'The Foyer',
  brand: 'The Gravemoor Gazette',
  brandKind: 'news',
  domain: 'gravemoor-gazette.manor',
  pattern: 'Visual interference',
  task: 'reject the cookies',
  possessedId: 'foyer-reject',
  Haunted,
  Honest,
  cards: [
    { pattern: 'Visual interference', role: 'correct' },
    {
      pattern: 'Trick wording',
      role: 'relative',
      hint: 'Close. The words here are plain; it is the look that lies, not the language.',
    },
    {
      pattern: 'Nagging',
      role: 'different',
      hint: 'No. Nothing pesters you over and over; the quiet choice is simply hidden by sight.',
    },
  ],
  guide: {
    definition:
      'The choice the company wants is big and bright; the one you may want is faint, tiny or hidden in plain sight. Nothing is missing, it is just made hard to see.',
    whereYouMeetIt: 'Cookie banners, cancel screens, upgrade prompts and unsubscribe pages.',
    us: {
      sourceLabel: 'FTC, Bringing Dark Patterns to Light (2022)',
      url: 'https://www.ftc.gov/system/files/ftc_gov/pdf/P214800%20Dark%20Patterns%20Report%209.14.2022%20-%20FINAL.pdf',
    },
    eu: {
      sourceLabel: 'EDPB cookie banner taskforce report (2023)',
      url: 'https://www.edpb.europa.eu/system/files/documents/2023-01/edpb_20230118_report_cookie_banner_taskforce_en.pdf',
    },
    tip: 'Find the quiet option before you click the loud one.',
  },
};

export default room;
