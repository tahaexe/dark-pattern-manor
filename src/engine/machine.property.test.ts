import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { initialState, reduce } from './machine';
import type { RoomEvent, RoomState, RoomStateTag } from './machine';
import { testRoom } from './testRoom';

const correctCard = testRoom.cards.find((c) => c.role === 'correct')!;
const wrongCards = testRoom.cards.filter((c) => c.role !== 'correct');

/** Arbitrary events, including wrong and correct picks. */
const anyEvent: fc.Arbitrary<RoomEvent> = fc.oneof(
  fc.constant<RoomEvent>({ type: 'LANTERN' }),
  fc.constant<RoomEvent>({ type: 'SELECT_POSSESSED' }),
  fc.constant<RoomEvent>({ type: 'SELECT_OTHER' }),
  fc.constant<RoomEvent>({ type: 'ADVANCE' }),
  fc.constant<RoomEvent>({ type: 'COMPLETE_TASK' }),
  fc.constantFrom(...wrongCards).map((card): RoomEvent => ({ type: 'PICK', card })),
  fc.constant<RoomEvent>({ type: 'PICK', card: correctCard }),
);

const VALID_TAGS: RoomStateTag[] = [
  'haunted',
  'inspecting',
  'picking',
  'named',
  'honest',
  'done',
];

/** A fail state would be any tag outside the six valid states. */
function isValidState(s: RoomState): boolean {
  return VALID_TAGS.includes(s.tag);
}

describe('state machine properties', () => {
  it('no event sequence ever reaches a state outside the six (no fail state)', () => {
    fc.assert(
      fc.property(fc.array(anyEvent, { maxLength: 40 }), (events) => {
        let s = initialState(testRoom);
        for (const e of events) {
          s = reduce(s, e, testRoom);
          expect(isValidState(s)).toBe(true);
        }
      }),
    );
  });

  it('dispatching the correct card from any reachable picking state leads to honest', () => {
    fc.assert(
      fc.property(fc.array(anyEvent, { maxLength: 40 }), (events) => {
        let s = initialState(testRoom);
        for (const e of events) s = reduce(s, e, testRoom);
        // Drive to honest: lantern, select possessed, pick correct, advance.
        s = reduce(s, { type: 'LANTERN' }, testRoom);
        s = reduce(s, { type: 'SELECT_POSSESSED' }, testRoom);
        s = reduce(s, { type: 'PICK', card: correctCard }, testRoom);
        s = reduce(s, { type: 'ADVANCE' }, testRoom);
        // Unless already past honest (done), we must be able to reach honest/done.
        expect(['honest', 'done']).toContain(s.tag);
      }),
    );
  });

  it('a wrong pick in picking keeps the state in picking', () => {
    fc.assert(
      fc.property(fc.constantFrom(...wrongCards), (card) => {
        let s = initialState(testRoom);
        s = reduce(s, { type: 'LANTERN' }, testRoom);
        s = reduce(s, { type: 'SELECT_POSSESSED' }, testRoom);
        const after = reduce(s, { type: 'PICK', card }, testRoom);
        expect(after.tag).toBe('picking');
      }),
    );
  });

  it('the done count is monotonic: once done, no event un-dones it', () => {
    fc.assert(
      fc.property(fc.array(anyEvent, { maxLength: 40 }), (events) => {
        let s = initialState(testRoom);
        // Reach done.
        s = reduce(s, { type: 'LANTERN' }, testRoom);
        s = reduce(s, { type: 'SELECT_POSSESSED' }, testRoom);
        s = reduce(s, { type: 'PICK', card: correctCard }, testRoom);
        s = reduce(s, { type: 'ADVANCE' }, testRoom);
        s = reduce(s, { type: 'COMPLETE_TASK' }, testRoom);
        expect(s.tag).toBe('done');
        // No further event leaves done.
        for (const e of events) {
          s = reduce(s, e, testRoom);
          expect(s.tag).toBe('done');
        }
      }),
    );
  });
});
