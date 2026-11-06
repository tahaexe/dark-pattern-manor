import type { RoomData } from './types';

/**
 * A minimal, valid RoomData used by engine-level tests that need a room but
 * do not care about any one brand. Not a shipped room; not in the registry.
 */
export const testRoom: RoomData = {
  id: 999,
  slug: 'test-room',
  name: 'The Test Room',
  brand: 'Test Brand',
  brandKind: 'test',
  domain: 'test-room.manor',
  pattern: 'Visual interference',
  task: 'do the thing',
  possessedId: 'test-possessed',
  Haunted: () => null,
  Honest: () => null,
  cards: [
    { pattern: 'Visual interference', role: 'correct' },
    {
      pattern: 'Trick wording',
      role: 'relative',
      hint: 'Close. The words are plain here; the look is what lies.',
    },
    {
      pattern: 'Nagging',
      role: 'different',
      hint: 'No. Nothing nags you here; the choice is hidden by sight.',
    },
  ],
  guide: {
    definition: 'One choice is loud and one is faint. Nothing is missing.',
    whereYouMeetIt: 'Cookie banners and cancel screens.',
    us: { sourceLabel: 'FTC', url: 'https://www.ftc.gov/' },
    eu: { sourceLabel: 'EDPB', url: 'https://www.edpb.europa.eu/' },
    tip: 'Find the quiet option before the loud one.',
  },
};
