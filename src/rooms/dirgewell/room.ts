import type { RoomData } from '../../engine/types';
import Haunted from './Haunted';
import Honest from './Honest';
import './room.css';

/**
 * Room 14 — The Music Room. The fictional sheet music site Dirgewell at
 * dirgewell.manor, possessed by Forced action: pressing "Download free sheet"
 * opens a gate ("Create your account to download") demanding name, email,
 * password and a pre-ticked "Share your contacts to find friends" before the
 * download, with the only other way being to close the gate and get nothing.
 *
 * The honest twin lets "Download free sheet" download at once (a visible
 * "Downloaded" state; no real file needed), with the account offered beside it
 * as a quiet, clearly optional link — so the task takes one click.
 *
 * Against the engine's RELATIVE_PAIRS, ['Nagging', 'Forced action'] is a
 * declared pair, so Nagging is the relative; Fake urgency is paired with Fake
 * scarcity only, never with Forced action, so it is the (unrelated) different
 * card.
 *
 * The US and EU guide lines are the exact lines from the room brief and are not
 * rewritten; they are carried in each GuideLine's sourceLabel so the player
 * sees the full wording, linked to the primary source.
 */
const room: RoomData = {
  id: 14,
  slug: 'dirgewell',
  name: 'The Music Room',
  brand: 'Dirgewell',
  brandKind: 'sheet music',
  domain: 'dirgewell.manor',
  pattern: 'Forced action',
  task: 'download the free song sheet',
  possessedId: 'musicroom-signup',
  Haunted,
  Honest,
  cards: [
    {
      pattern: 'Nagging',
      role: 'relative',
      hint: 'Close. It asks only once; the trouble is that you cannot go on without saying yes.',
    },
    { pattern: 'Forced action', role: 'correct' },
    {
      pattern: 'Fake urgency',
      role: 'different',
      hint: 'No. Nothing is rushing you; the sheet is free, but only if you pay with data.',
    },
  ],
  guide: {
    definition:
      'You must do something you did not come for, such as create an account, share your contacts or install an app, before you can finish a simple task.',
    whereYouMeetIt:
      "Downloads behind sign-up walls, checkouts with no guest option, 'allow contacts to continue' screens in apps and games.",
    us: {
      sourceLabel:
        'For children under 13, the US COPPA Rule forbids making a game, a prize or another activity depend on the child giving more personal information than the activity reasonably needs.',
      url: 'https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312/section-312.7',
    },
    eu: {
      sourceLabel:
        'Under the GDPR, consent is presumed not freely given when a service is made to depend on agreeing to data use it does not need.',
      url: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj',
    },
    tip: "Look for 'Continue as guest', 'Skip' or 'Not now'. If a task asks for data it does not need, stop and find another way.",
  },
};

export default room;
