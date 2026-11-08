import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { RoomData, SpellCards } from './types';
import { PATTERNS, isPattern } from './patterns';
import { areRelatives, relativesOf } from './relatives';
import { validateRoom, wordCount, APPROVED_BRANDS } from './validate';
import { shuffle } from './shuffle';
import { loadAllRooms } from './registry';

/**
 * A generator of valid rooms: it picks a room pattern, a relative of it for
 * the relative card, and an unrelated pattern for the different card, then
 * assembles a RoomData that satisfies every rule.
 */
function validRoomArb(): fc.Arbitrary<RoomData> {
  const patternsWithRelatives = PATTERNS.filter((p) => relativesOf(p).length > 0);
  return fc
    .record({
      id: fc.integer({ min: 1, max: 12 }),
      pattern: fc.constantFrom(...patternsWithRelatives),
      brand: fc.constantFrom(...APPROVED_BRANDS),
      nonce: fc.integer({ min: 0, max: 9999 }),
    })
    .chain(({ id, pattern, brand, nonce }) => {
      const rels = relativesOf(pattern);
      const unrelated = PATTERNS.filter(
        (p) => p !== pattern && !areRelatives(pattern, p),
      );
      return fc
        .record({
          relative: fc.constantFrom(...rels),
          different: fc.constantFrom(...unrelated),
        })
        .map(({ relative, different }): RoomData => {
          const cards: SpellCards = [
            { pattern, role: 'correct' },
            { pattern: relative, role: 'relative', hint: 'Close but not it; look again.' },
            { pattern: different, role: 'different', hint: 'No; that trick is not at work here.' },
          ];
          return {
            id,
            slug: `room-${nonce}`,
            name: 'A Room',
            brand,
            brandKind: 'test',
            domain: `room-${nonce}.manor`,
            pattern,
            task: 'do the task',
            possessedId: `possessed-${nonce}`,
            Haunted: () => null,
            Honest: () => null,
            cards,
            guide: {
              definition: 'One sentence here. A second sentence here.',
              whereYouMeetIt: 'Somewhere online.',
              us: { sourceLabel: 'FTC', url: 'https://www.ftc.gov/' },
              eu: { sourceLabel: 'EDPB', url: 'https://www.edpb.europa.eu/' },
              tip: 'Look twice before you click.',
            },
          };
        });
    });
}

describe('room data properties (generated valid rooms)', () => {
  it('a valid generated room passes validateRoom', () => {
    fc.assert(
      fc.property(validRoomArb(), (room) => {
        expect(validateRoom(room)).toEqual([]);
      }),
    );
  });

  it('cards length is 3 with exactly one correct/relative/different', () => {
    fc.assert(
      fc.property(validRoomArb(), (room) => {
        expect(room.cards).toHaveLength(3);
        expect(room.cards.filter((c) => c.role === 'correct')).toHaveLength(1);
        expect(room.cards.filter((c) => c.role === 'relative')).toHaveLength(1);
        expect(room.cards.filter((c) => c.role === 'different')).toHaveLength(1);
      }),
    );
  });

  it('each wrong card hint is non-empty, <= 20 words, and never names the pattern', () => {
    fc.assert(
      fc.property(validRoomArb(), (room) => {
        for (const c of room.cards) {
          if (c.role !== 'correct') {
            expect(c.hint && c.hint.trim().length).toBeTruthy();
            expect(wordCount(c.hint!)).toBeLessThanOrEqual(20);
            expect(c.hint!.toLowerCase()).not.toContain(room.pattern.toLowerCase());
          }
        }
      }),
    );
  });

  it('every card pattern is one of the 18 pattern types', () => {
    fc.assert(
      fc.property(validRoomArb(), (room) => {
        for (const c of room.cards) expect(isPattern(c.pattern)).toBe(true);
      }),
    );
  });

  it('the relative card is a relative; the different card is neither pattern nor relative', () => {
    fc.assert(
      fc.property(validRoomArb(), (room) => {
        const rel = room.cards.find((c) => c.role === 'relative')!;
        const diff = room.cards.find((c) => c.role === 'different')!;
        expect(areRelatives(room.pattern, rel.pattern)).toBe(true);
        expect(diff.pattern).not.toBe(room.pattern);
        expect(areRelatives(room.pattern, diff.pattern)).toBe(false);
      }),
    );
  });

  it('shuffle yields a permutation of the same set', () => {
    fc.assert(
      fc.property(validRoomArb(), fc.double({ min: 0, max: 0.999, noNaN: true }), (room, r) => {
        const s = shuffle(room.cards, () => r);
        expect(new Set(s)).toEqual(new Set(room.cards));
      }),
    );
  });
});

describe('room data properties (live registry)', () => {
  it('every registered room passes validateRoom', async () => {
    const rooms = await loadAllRooms();
    for (const room of rooms) {
      const errors = validateRoom(room);
      expect(errors, `${room.name}: ${errors.join('; ')}`).toEqual([]);
    }
  });

  it('all room ids are unique across the registry', async () => {
    const rooms = await loadAllRooms();
    const ids = rooms.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('guide US and EU lines are non-empty for every registered room', async () => {
    const rooms = await loadAllRooms();
    for (const room of rooms) {
      expect(room.guide.us.sourceLabel.trim()).not.toBe('');
      expect(room.guide.us.url.trim()).not.toBe('');
      expect(room.guide.eu.sourceLabel.trim()).not.toBe('');
      expect(room.guide.eu.url.trim()).not.toBe('');
    }
  });

  it('exactly one room (room 1, the Foyer) defines coach marks', async () => {
    const rooms = await loadAllRooms();
    const withCoach = rooms.filter((r) => Array.isArray(r.coach) && r.coach.length > 0);
    expect(withCoach).toHaveLength(1);
    expect(withCoach[0].id).toBe(1);
    expect(withCoach[0].slug).toBe('gravemoor-gazette');
  });

  it("room 1's coach marks cover spot, name and free with non-empty target and body", async () => {
    const rooms = await loadAllRooms();
    const foyer = rooms.find((r) => r.id === 1)!;
    expect(foyer.coach).toBeDefined();
    const steps = foyer.coach!.map((m) => m.step);
    expect(steps).toEqual(['spot', 'name', 'free']);
    for (const mark of foyer.coach!) {
      expect(['spot', 'name', 'free']).toContain(mark.step);
      expect(mark.target.trim()).not.toBe('');
      expect(mark.body.trim()).not.toBe('');
    }
  });

  it('no room other than room 1 defines a coach field', async () => {
    const rooms = await loadAllRooms();
    for (const room of rooms) {
      if (room.id === 1) continue;
      expect(room.coach).toBeUndefined();
    }
  });
});
