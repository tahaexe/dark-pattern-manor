/**
 * Every phrase list and every player-facing string the Ghost Lantern shows,
 * English only in v1. Keeping them in one file makes the "no verdict word"
 * test a single scan and a future translation a single file.
 *
 * The lantern gives hints, not verdicts: no string here names a score, a
 * grade, or words like "illegal" or "scam".
 */

/** The manor site the "Learn it in the manor" links point at. */
export const MANOR_BASE = 'https://tahaexe.github.io/dark-pattern-manor/#/room/';

/** The panel's heading (also the dialog's accessible name). */
export const PANEL_HEADING = 'The Ghost Lantern';

/** The chip over each marked element. */
export function chip(pattern: string): string {
  return `Possible: ${pattern}`;
}

/** The panel's opening warning text for N suspects (N >= 1). */
export function warningText(n: number): string {
  const noun = n === 1 ? 'trick' : 'tricks';
  return (
    `The Ghost Lantern found ${n} possible ${noun} on this page. ` +
    'These are hints, not proof: the lantern reads only what is on the screen ' +
    'and it can be wrong. Look for yourself before you decide.'
  );
}

/** The panel's opening text when nothing clear was found. */
export const ZERO_TEXT =
  'The Ghost Lantern found no clear signs here. That does not mean the page ' +
  'is honest: some tricks only show in a flow, like a cancel path or a basket ' +
  'that changes.';

/** The per-item and panel control labels. */
export const SHOW_ME = 'Show me';
export const LEARN_IN_MANOR = 'Learn it in the manor';
export const PUT_OUT = 'Put out the lantern';

/** The plain sentence each detector writes as the sign it saw. */
export const SIGNS = {
  preselection:
    'A box is ticked for you at load, and it is an extra — not something you must accept.',
  visualInterferenceLink: 'The refuse choice is a faint link beside a solid accept button.',
  visualInterferenceDisguised:
    'The refuse choice is dressed as a faint link next to a solid accept button.',
  visualInterferenceSmall: 'The refuse choice is far smaller than the accept button.',
  visualInterferenceHidden: 'The first layer offers no plain refuse — only "Manage" or "Settings".',
  fakeUrgency: 'A countdown beside selling words is ticking down while you watch.',
  fakeScarcity: 'This claims the stock is nearly gone. The lantern cannot know the real stock.',
  fakeSocialProof: 'This claims a crowd is here now. The lantern cannot know the real numbers.',
  confirmshaming: 'The decline choice is worded to make you feel bad for choosing it.',
  trickWording: 'This box\u2019s wording stacks two negatives, so what ticking it does is unclear.',
} as const;

/* ---- Phrase lists the detectors match against (all lowercased at use) ---- */

/** Words that mark a container as a cookie / consent box. */
export const CONSENT_WORDS = [
  'cookie',
  'cookies',
  'consent',
  'we value your privacy',
  'your privacy',
  'gdpr',
  'we use cookies',
];

/** Words on an accept-everything control. */
export const ACCEPT_WORDS = [
  'accept all',
  'accept',
  'allow all',
  'agree',
  'i agree',
  'got it',
  'ok',
];

/** Words on a refuse control. */
export const REFUSE_WORDS = [
  'reject all',
  'reject',
  'decline',
  'refuse',
  'deny',
  'no thanks',
  'necessary only',
  'only necessary',
];

/** Second-layer-only controls that are not a plain refuse. */
export const MANAGE_WORDS = [
  'manage',
  'settings',
  'options',
  'preferences',
  'customize',
  'customise',
];

/** Words in a preselection label that mark it as an extra (not a gate). */
export const OFFER_WORDS = [
  'offer',
  'offers',
  'newsletter',
  'subscribe',
  'partner',
  'partners',
  'share',
  'sharing',
  'insurance',
  'protection',
  'protect',
  'donate',
  'donation',
  'add ',
  'marketing',
  'deals',
];

/** Labels that are a gate to continue — never marked as preselection. */
export const GATE_WORDS = [
  'terms',
  'privacy policy',
  'i am over',
  'i am at least',
  'age',
  'i accept the',
  'i agree to the',
  'conditions',
];

/** Selling words that make a nearby countdown an urgency trick. */
export const SELLING_WORDS = ['ends', 'left', 'hurry', 'expires', 'offer', 'only'];

/** Fake-scarcity phrases (regexes applied to lowercased text). */
export const SCARCITY_PATTERNS: RegExp[] = [
  /\bonly\s+\d+\s+left\b/,
  /\bselling fast\b/,
  /\balmost gone\b/,
  /\bin high demand\b/,
  /\b\d+\s+left in stock\b/,
];

/** Fake-social-proof phrases. */
export const SOCIAL_PROOF_PATTERNS: RegExp[] = [
  /\b\d+\s+(people|others|shoppers)\s+(are\s+)?(viewing|looking|watching)\b/,
  /\b\d+\s+(bought|purchased|sold)\s+(today|in the last|this)\b/,
  /\b\d+\s+(people|others)\s+bought this\b/,
];

/**
 * Confirmshaming openings on a decline control. Text is normalized (curly
 * apostrophes to straight) before these run, so a plain `'` covers both.
 */
export const SHAMING_PATTERNS: RegExp[] = [
  /\bi'?d rather\b/,
  /\bi would rather\b/,
  /\bno thanks,? i('?d| would| do| don'?t| am| like| love| hate| prefer)/,
  /\bi don'?t (like|want) (saving|discounts|to save|money)/,
  /\bi (like|love|enjoy|prefer) paying\b/,
  /\bno,? i('?d| would| like| love| prefer| enjoy| hate)\b/,
  /\bi('?m| am) (fine|happy) paying\b/,
];

/** A plain, un-shaming decline that must NOT be marked. */
export const PLAIN_DECLINE: RegExp[] = [
  /^no thanks\.?$/,
  /^no\.?$/,
  /^decline\.?$/,
  /^cancel\.?$/,
  /^close\.?$/,
  /^maybe later\.?$/,
  /^not now\.?$/,
];

/** The negation tokens the trick-wording detector counts. */
export const NEGATIONS: RegExp[] = [
  /\bnot\b/g,
  /\bno\b/g,
  /\bnever\b/g,
  /\bdon'?t\b/g,
  /\bdo not\b/g,
  /\bwon'?t\b/g,
  /\buncheck\b/g,
  /\buntick\b/g,
  /\bopt out\b/g,
];

/** A countdown shape: mm:ss or hh:mm:ss. */
export const COUNTDOWN_RE = /\b\d{1,2}:\d{2}(?::\d{2})?\b/;

/** Words that must never appear in any player-facing string (verdict guard). */
export const FORBIDDEN_VERDICT_WORDS = ['illegal', 'scam', 'score', 'grade', 'fraud'];
