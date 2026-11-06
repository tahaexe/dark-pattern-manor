import type { FunctionComponent } from 'preact';

/**
 * The name of a dark pattern. Must be one of the 18 named types in
 * `patterns.ts` (12 room patterns + 6 wandering patterns). Kept as a string
 * alias so room data stays authorable; `check-rooms.mjs` and the room-data
 * property tests reject any name outside `PATTERNS`.
 */
export type PatternName = string;

/** The role a spell card plays in a room. */
export type SpellRole = 'correct' | 'relative' | 'different';

/**
 * One of exactly three spell cards a player picks to name the room's pattern.
 * The `correct` card's pattern equals the room's pattern. A `relative` card
 * names a close relative; a `different` card names an unrelated pattern. Both
 * wrong cards carry a non-empty hint (≤ 20 words, never naming the correct
 * pattern).
 */
export interface SpellCard {
  /** Non-empty; one of the 18 pattern types. */
  pattern: PatternName;
  role: SpellRole;
  /** Required when role !== 'correct'. */
  hint?: string;
}

/** A single legal source line in the Ghost Guide (US or EU). */
export interface GuideLine {
  /** Non-empty label shown to the player. */
  sourceLabel: string;
  /** Non-empty, absolute, https, on the primary-source allowlist. */
  url: string;
}

/** The Ghost Guide entry that opens when the ghost flees. */
export interface GuideEntry {
  /** Non-empty, two sentences. */
  definition: string;
  /** Non-empty: where the player meets this pattern. */
  whereYouMeetIt: string;
  /** US legal line. */
  us: GuideLine;
  /** EU legal line. */
  eu: GuideLine;
  /** Non-empty; exactly one protection tip. */
  tip: string;
}

/** Props the room's Haunted component receives from the engine. */
export interface HauntedProps {
  /** Dispatch SELECT_POSSESSED: the player selected the possessed element. */
  onSelectPossessed: () => void;
  /** Dispatch SELECT_OTHER: the player selected a non-possessed element. */
  onSelectOther: () => void;
  /** True while the room is haunted or inspecting (ghost signs shown). */
  signsActive: boolean;
  /** True when prefers-reduced-motion is active (static signs only). */
  reducedMotion: boolean;
  /**
   * True when rendered as the static "before" side of the Before/After split.
   * In preview mode the component is non-interactive and MUST NOT set the
   * possessed element's id, so the live haunted page keeps the only copy of
   * that id. Defaults to false.
   */
  preview?: boolean;
}

/** Props the room's Honest component receives from the engine. */
export interface HonestProps {
  /** Dispatch COMPLETE_TASK: the single honest task action. */
  onCompleteTask: () => void;
}

/** Exactly three spell cards. */
export type SpellCards = [SpellCard, SpellCard, SpellCard];

/**
 * The single typed object describing one room. The engine renders every room
 * from this object and hard-codes nothing brand- or pattern-specific.
 */
export interface RoomData {
  /** Unique positive integer across all rooms, 1–12. */
  id: number;
  /** Non-empty kebab-case; matches the room's folder name. */
  slug: string;
  /** Display name, e.g. "The Foyer". */
  name: string;
  /** Fictional brand, e.g. "The Gravemoor Gazette". */
  brand: string;
  /** Brand kind, e.g. "news". */
  brandKind: string;
  /** Fictional `.manor` pseudo-domain, e.g. "gravemoor-gazette.manor". */
  domain: string;
  /** The room's dark pattern, used exactly once across rooms. */
  pattern: PatternName;
  /** The player's goal, e.g. "reject the cookies". */
  task: string;
  /** Id of the possessed element; found in the DOM by this id. */
  possessedId: string;
  Haunted: FunctionComponent<HauntedProps>;
  Honest: FunctionComponent<HonestProps>;
  /** Exactly three cards: one correct, one relative, one different. */
  cards: SpellCards;
  guide: GuideEntry;
}
