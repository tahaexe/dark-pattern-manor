import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import type { HauntedProps, HonestProps, RoomData } from '../engine/types';
import { loadAllRooms } from '../engine/registry';
import type { ControlStyle, Measure, Style } from './types';
import detectPreselection from './detectors/preselection';
import { detectVisualInterferenceWith } from './detectors/visual-interference';
import { detectFakeUrgencyWith } from './detectors/fake-urgency';
import detectFakeScarcity from './detectors/fake-scarcity';
import detectFakeSocialProof from './detectors/fake-social-proof';
import detectConfirmshaming from './detectors/confirmshaming';
import detectTrickWording from './detectors/trick-wording';
import { runAllDetectors } from './detect';

/**
 * jsdom has no layout, so the visual-interference size rule needs injected
 * boxes. The Foyer makes its "Reject all" a small control beside a big
 * "Accept all": give the reject a small box and the accept a large one.
 */
const roomMeasure: Measure = (el) => {
  const cls = el.className || '';
  if (/cookie-reject|reject/.test(String(cls))) return { width: 60, height: 20 };
  return { width: 200, height: 48 };
};

/** A faint, borderless link look. */
const FAINT: ControlStyle = {
  backgroundColor: 'rgba(0, 0, 0, 0)',
  backgroundImage: 'none',
  borderTopWidth: '0px',
  borderTopStyle: 'none',
  borderTopColor: 'rgba(0, 0, 0, 0)',
};

/** A solid, filled button look. */
const FILLED: ControlStyle = {
  backgroundColor: 'rgb(29, 20, 23)',
  backgroundImage: 'linear-gradient(135deg, rgb(240, 190, 119), rgb(201, 162, 39))',
  borderTopWidth: '0px',
  borderTopStyle: 'none',
  borderTopColor: 'rgba(0, 0, 0, 0)',
};

/**
 * jsdom has no real cascade, so the visual-interference LOOK rule needs
 * injected styles matching the Foyer's CSS: the possessed "Reject all"
 * (.cookie-reject) is transparent with no border (a faint link); "Accept all"
 * (.cookie-accept) and the honest equal buttons (.cookie-button-equal) carry a
 * visible fill (a solid button).
 */
const roomStyle: Style = (el) => {
  const cls = String(el.className || '');
  if (/cookie-reject/.test(cls)) return FAINT;
  if (/cookie-accept|cookie-button-equal/.test(cls)) return FILLED;
  return FAINT;
};

/** Props that keep the ghost signs on (as a live haunted page) and interactive. */
const hauntedProps: HauntedProps = {
  onSelectPossessed: () => {},
  onSelectOther: () => {},
  signsActive: true,
  reducedMotion: false,
  preview: false,
};

const honestProps: HonestProps = { onCompleteTask: () => {} };

/** The detector for each v1 pattern, with the room's own test observers. */
const DETECTOR_FOR: Record<string, (root: Element) => ReturnType<typeof detectFakeScarcity>> = {
  'Visual interference': (root) => detectVisualInterferenceWith(root, roomMeasure, roomStyle),
  'Trick wording': (root) => detectTrickWording(root),
  Confirmshaming: (root) => detectConfirmshaming(root),
  // A countdown that is watched and seen to change.
  'Fake urgency': (root) => detectFakeUrgencyWith(root, () => true),
  'Fake scarcity': (root) => detectFakeScarcity(root),
  'Fake social proof': (root) => detectFakeSocialProof(root),
  Preselection: (root) => detectPreselection(root),
};

let rooms: RoomData[] = [];

describe('the lantern agrees with the manor rooms', () => {
  afterEach(() => cleanup());

  it('loads all twelve rooms', async () => {
    rooms = await loadAllRooms();
    expect(rooms).toHaveLength(12);
  });

  it('marks each of the seven v1 rooms haunted page for its pattern', async () => {
    rooms = rooms.length ? rooms : await loadAllRooms();
    for (const room of rooms) {
      const detect = DETECTOR_FOR[room.pattern];
      if (!detect) continue; // not a v1 pattern (room's pattern not detected)
      const { container } = render(<room.Haunted {...hauntedProps} />);
      const found = detect(container);
      expect(
        found.length,
        `room ${room.id} (${room.name}, ${room.pattern}) should be marked`,
      ).toBeGreaterThanOrEqual(1);
      expect(found.some((s) => s.pattern === room.pattern)).toBe(true);
      cleanup();
    }
  });

  it('marks no honest twin, across all twelve rooms', async () => {
    rooms = rooms.length ? rooms : await loadAllRooms();
    for (const room of rooms) {
      const { container } = render(<room.Honest {...honestProps} />);
      // Run every detector; the urgency detector with a real "no change" so a
      // still honest clock is never marked, the sizing measure that treats
      // equal buttons as honest, and the look style that treats the honest
      // equal buttons as solid buttons (both solid → not marked).
      const found = runAllDetectors(container, undefined, {
        measure: roomMeasure,
        style: roomStyle,
        changed: () => false,
      });
      expect(
        found.length,
        `room ${room.id} (${room.name}) honest twin should be clean, got: ${found
          .map((s) => s.pattern)
          .join(', ')}`,
      ).toBe(0);
      cleanup();
    }
  });
});
