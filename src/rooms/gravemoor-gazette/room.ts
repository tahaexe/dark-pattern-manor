import type { RoomData } from '../../engine/types';
import Haunted from './Haunted';
import Honest from './Honest';
import './room.css';

/**
 * Room 1 — The Foyer. The fictional news brand The Gravemoor Gazette at
 * gravemoor-gazette.manor, possessed by Visual interference: the "Reject all"
 * choice is a faint text link beside a bright "Accept all" button.
 *
 * Room 1 is the tutorial: it alone carries a `coach` field, so the engine shows
 * one skippable coach mark per loop step (spot → name → free) while the room is
 * not done and the tips are not skipped. No other room defines `coach`.
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
      'The choice the company wants is big and bright; the one you may want is faded, tiny or hidden in plain sight. Nothing is missing, it’s just made hard to see.',
    whereYouMeetIt: 'cookie banners, cancel screens, upgrade prompts, unsubscribe pages.',
    us: {
      sourceLabel:
        'The FTC report lists a bold "Accept" beside a greyed-out, small "Reject" as subverting privacy choices (Appendix A, "Subverting Privacy Preferences"; section IV). In California, agreement obtained through a dark pattern is not consent (CCPA as amended by the CPRA, Cal. Civ. Code § 1798.140(h)).',
      url: 'https://www.ftc.gov/system/files/ftc_gov/pdf/P214800%20Dark%20Patterns%20Report%209.14.2022%20-%20FINAL.pdf',
    },
    eu: {
      sourceLabel:
        'Consent to non-essential cookies must be freely given (ePrivacy Directive Art. 5(3) with the GDPR’s consent rules); EU data protection authorities said a banner must not clearly push you to accept, and that a "reject" button too faded to read can be misleading (EDPB cookie banner taskforce report, January 2023).',
      url: 'https://www.edpb.europa.eu/system/files/documents/2023-01/edpb_20230118_report_cookie_banner_taskforce_en.pdf',
    },
    tip: 'Find the quiet option before you click the loud one; "Reject all" is often there, just pale.',
  },
  coach: [
    { step: 'spot', target: '#foyer-reject', body: 'This part is tricking you. Tap it.' },
    {
      step: 'name',
      target: '.spell-cards',
      body: 'Pick the card that names the trick. A wrong card costs nothing.',
    },
    {
      step: 'free',
      target: '.comparison',
      body: 'Drag the line to compare, then finish your task on the honest page.',
    },
  ],
};

export default room;
