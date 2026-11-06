import { describe, it, expect } from 'vitest';
import { initialState, reduce } from './machine';
import type { RoomState } from './machine';
import { testRoom } from './testRoom';

const correctCard = testRoom.cards.find((c) => c.role === 'correct')!;
const relativeCard = testRoom.cards.find((c) => c.role === 'relative')!;
const differentCard = testRoom.cards.find((c) => c.role === 'different')!;

describe('room state machine transitions', () => {
  it('initialState starts in haunted', () => {
    const s = initialState(testRoom);
    expect(s.tag).toBe('haunted');
    expect(s.announcement).not.toBe('');
    expect(s.whisperNonce).toBe(0);
  });

  it('LANTERN moves haunted -> inspecting', () => {
    const s = reduce(initialState(testRoom), { type: 'LANTERN' }, testRoom);
    expect(s.tag).toBe('inspecting');
  });

  it('SELECT_POSSESSED moves inspecting -> picking', () => {
    const inspecting = reduce(initialState(testRoom), { type: 'LANTERN' }, testRoom);
    const s = reduce(inspecting, { type: 'SELECT_POSSESSED' }, testRoom);
    expect(s.tag).toBe('picking');
  });

  it('SELECT_OTHER stays in inspecting and announces "Nothing haunts this."', () => {
    const inspecting = reduce(initialState(testRoom), { type: 'LANTERN' }, testRoom);
    const s = reduce(inspecting, { type: 'SELECT_OTHER' }, testRoom);
    expect(s.tag).toBe('inspecting');
    expect(s.announcement).toBe('Nothing haunts this.');
  });

  const toPicking = (): RoomState => {
    let s = initialState(testRoom);
    s = reduce(s, { type: 'LANTERN' }, testRoom);
    s = reduce(s, { type: 'SELECT_POSSESSED' }, testRoom);
    return s;
  };

  it('correct PICK moves picking -> named, then ADVANCE -> honest', () => {
    const picking = toPicking();
    const named = reduce(picking, { type: 'PICK', card: correctCard }, testRoom);
    expect(named.tag).toBe('named');
    const honest = reduce(named, { type: 'ADVANCE' }, testRoom);
    expect(honest.tag).toBe('honest');
  });

  it('wrong relative PICK stays in picking with the hint and a bumped whisperNonce', () => {
    const picking = toPicking();
    const s = reduce(picking, { type: 'PICK', card: relativeCard }, testRoom);
    expect(s.tag).toBe('picking');
    expect(s.wrongHint).toBe(relativeCard.hint);
    expect(s.flicker).toBe(true);
    expect(s.whisperNonce).toBe(picking.whisperNonce + 1);
  });

  it('wrong different PICK also stays in picking with its own hint', () => {
    const picking = toPicking();
    const s = reduce(picking, { type: 'PICK', card: differentCard }, testRoom);
    expect(s.tag).toBe('picking');
    expect(s.wrongHint).toBe(differentCard.hint);
  });

  it('each wrong PICK bumps whisperNonce again (announces once per pick)', () => {
    const picking = toPicking();
    const once = reduce(picking, { type: 'PICK', card: relativeCard }, testRoom);
    const twice = reduce(once, { type: 'PICK', card: differentCard }, testRoom);
    expect(twice.whisperNonce).toBe(once.whisperNonce + 1);
  });

  it('a wrong pick does not change progress position (stays picking, still can win)', () => {
    const picking = toPicking();
    const afterWrong = reduce(picking, { type: 'PICK', card: relativeCard }, testRoom);
    const named = reduce(afterWrong, { type: 'PICK', card: correctCard }, testRoom);
    expect(named.tag).toBe('named');
  });

  it('COMPLETE_TASK moves honest -> done', () => {
    let s = toPicking();
    s = reduce(s, { type: 'PICK', card: correctCard }, testRoom);
    s = reduce(s, { type: 'ADVANCE' }, testRoom);
    const done = reduce(s, { type: 'COMPLETE_TASK' }, testRoom);
    expect(done.tag).toBe('done');
  });

  it('unexpected events are no-ops', () => {
    const haunted = initialState(testRoom);
    expect(reduce(haunted, { type: 'COMPLETE_TASK' }, testRoom).tag).toBe('haunted');
    expect(reduce(haunted, { type: 'SELECT_POSSESSED' }, testRoom).tag).toBe('haunted');
    const done = reduce(
      reduce(
        reduce(reduce(reduce(haunted, { type: 'LANTERN' }, testRoom), { type: 'SELECT_POSSESSED' }, testRoom), { type: 'PICK', card: correctCard }, testRoom),
        { type: 'ADVANCE' },
        testRoom,
      ),
      { type: 'COMPLETE_TASK' },
      testRoom,
    );
    expect(reduce(done, { type: 'LANTERN' }, testRoom).tag).toBe('done');
  });
});
