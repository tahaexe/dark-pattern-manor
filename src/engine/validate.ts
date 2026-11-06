import type { RoomData, SpellCard } from './types';
import { isPattern } from './patterns';
import { areRelatives } from './relatives';

/** The 12 approved fictional brands (one per room). */
export const APPROVED_BRANDS: readonly string[] = Object.freeze([
  'The Gravemoor Gazette',
  'Inkbone Books',
  'Grimsupper',
  'Gloamline',
  'Hollowpost Tickets',
  'Shroudery',
  'Lanternstay',
  'Mothmilk Market',
  'Mildew Drive',
  'Wanderwick',
  'Rookery Air',
  'Bramblegate Fitness',
]);

/** The 12 room patterns, each used by exactly one room. */
export const ROOM_PATTERNS: readonly string[] = Object.freeze([
  'Visual interference',
  'Trick wording',
  'Confirmshaming',
  'Hidden subscription',
  'Fake urgency',
  'Fake scarcity',
  'Fake social proof',
  'Sneaking',
  'Hidden costs',
  'Nagging',
  'Preselection',
  'Hard to cancel',
]);

/** Primary-source allowlist for Ghost Guide links. */
export const SOURCE_ALLOWLIST: readonly string[] = Object.freeze([
  'ftc.gov',
  'eur-lex.europa.eu',
  'edpb.europa.eu',
]);

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/** True when host equals, or is a subdomain of, an allowlisted domain. */
export function isAllowlistedUrl(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:') return false;
  const host = u.hostname.toLowerCase();
  return SOURCE_ALLOWLIST.some((d) => host === d || host.endsWith('.' + d));
}

/**
 * Validate a single room against the structural, card, relatives, hint, and
 * guide rules. Returns a list of human-readable errors (empty when valid).
 * `countsAsSentences` validates roughly: a two-sentence definition has at
 * least one sentence terminator.
 */
export function validateRoom(room: RoomData): string[] {
  const errors: string[] = [];

  // Structural.
  if (!(Number.isInteger(room.id) && room.id > 0)) errors.push('id must be a positive integer');
  if (!room.slug || !KEBAB.test(room.slug)) errors.push('slug must be non-empty kebab-case');
  for (const [field, val] of Object.entries({
    name: room.name,
    brand: room.brand,
    brandKind: room.brandKind,
    domain: room.domain,
    pattern: room.pattern,
    task: room.task,
    possessedId: room.possessedId,
  })) {
    if (!val || String(val).trim() === '') errors.push(`${field} must be non-empty`);
  }

  // Brand and address.
  if (!APPROVED_BRANDS.includes(room.brand)) {
    errors.push(`brand "${room.brand}" is not one of the 12 approved fictional brands`);
  }
  if (!room.domain.endsWith('.manor')) {
    errors.push(`domain "${room.domain}" must use the .manor pseudo-domain`);
  }

  // Cards.
  if (!Array.isArray(room.cards) || room.cards.length !== 3) {
    errors.push('cards must have length exactly 3');
    return errors;
  }
  const byRole = (r: SpellCard['role']) => room.cards.filter((c) => c.role === r);
  const corrects = byRole('correct');
  const relatives = byRole('relative');
  const differents = byRole('different');
  if (corrects.length !== 1) errors.push('there must be exactly one correct card');
  if (relatives.length !== 1) errors.push('there must be exactly one relative card');
  if (differents.length !== 1) errors.push('there must be exactly one different card');

  for (const c of room.cards) {
    if (!isPattern(c.pattern)) {
      errors.push(`card pattern "${c.pattern}" is not one of the 18 pattern types`);
    }
  }

  const correct = corrects[0];
  if (correct && correct.pattern !== room.pattern) {
    errors.push("the correct card's pattern must equal the room's pattern");
  }

  // Wrong-card hint quality.
  for (const c of room.cards) {
    if (c.role !== 'correct') {
      if (!c.hint || c.hint.trim() === '') {
        errors.push(`the ${c.role} card must carry a non-empty hint`);
      } else {
        if (wordCount(c.hint) > 20) errors.push(`the ${c.role} card's hint exceeds 20 words`);
        if (c.hint.toLowerCase().includes(room.pattern.toLowerCase())) {
          errors.push(`the ${c.role} card's hint must not name the correct pattern`);
        }
      }
    }
  }

  // Relatives validity rule.
  const relative = relatives[0];
  if (relative && !areRelatives(room.pattern, relative.pattern)) {
    errors.push(
      `the relative card "${relative.pattern}" must be a relative of "${room.pattern}"`,
    );
  }
  const different = differents[0];
  if (
    different &&
    (different.pattern === room.pattern || areRelatives(room.pattern, different.pattern))
  ) {
    errors.push(
      `the different card "${different.pattern}" must be neither the room's pattern nor a relative`,
    );
  }

  // Guide.
  const g = room.guide;
  if (!g) {
    errors.push('guide is required');
    return errors;
  }
  if (!g.definition || g.definition.trim() === '') errors.push('guide definition must be non-empty');
  else if (!/[.!?]/.test(g.definition)) errors.push('guide definition must be two sentences');
  if (!g.whereYouMeetIt || g.whereYouMeetIt.trim() === '') errors.push('guide whereYouMeetIt must be non-empty');
  if (!g.us?.sourceLabel?.trim()) errors.push('guide US sourceLabel must be non-empty');
  if (!g.eu?.sourceLabel?.trim()) errors.push('guide EU sourceLabel must be non-empty');
  if (!g.us?.url || !isAllowlistedUrl(g.us.url)) {
    errors.push('guide US url must be https and on the primary-source allowlist');
  }
  if (!g.eu?.url || !isAllowlistedUrl(g.eu.url)) {
    errors.push('guide EU url must be https and on the primary-source allowlist');
  }
  if (!g.tip || g.tip.trim() === '') errors.push('guide tip must be non-empty');

  return errors;
}
