import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/preact';
import LiveRegion from './LiveRegion';
import type { RoomState } from '../engine/machine';

const base: RoomState = {
  tag: 'inspecting',
  announcement: 'Inspecting now.',
  whisperNonce: 0,
};

describe('LiveRegion', () => {
  it('renders the announcement text', () => {
    render(<LiveRegion state={base} />);
    expect(screen.getByText('Inspecting now.')).toBeDefined();
  });

  it('is a polite status region labelled for spell card feedback', () => {
    render(<LiveRegion state={base} />);
    const region = screen.getByRole('status', { name: /Spell card feedback/i });
    expect(region.getAttribute('aria-live')).toBe('polite');
  });

  it('renders a wrong-pick whisper when present', () => {
    const state: RoomState = {
      tag: 'picking',
      announcement: 'Name the trick.',
      wrongHint: 'Close, but the words are plain.',
      flicker: true,
      whisperNonce: 1,
    };
    render(<LiveRegion state={state} />);
    expect(screen.getByText('Close, but the words are plain.')).toBeDefined();
  });

  it('updates the announcement when state changes', () => {
    const { rerender } = render(<LiveRegion state={base} />);
    rerender(<LiveRegion state={{ ...base, tag: 'picking', announcement: 'Name the trick.' }} />);
    expect(screen.getByText('Name the trick.')).toBeDefined();
  });

  it('does not show a whisper with no wrongHint (no stale re-announce)', () => {
    const state: RoomState = {
      tag: 'picking',
      announcement: 'Name the trick.',
      whisperNonce: 2,
    };
    render(<LiveRegion state={state} />);
    expect(screen.queryByText(/Close/)).toBeNull();
  });
});

describe('LiveRegion: the whisper scrolls into view', () => {
  const proto = HTMLElement.prototype as unknown as { scrollIntoView?: unknown };
  const original = proto.scrollIntoView;
  afterEach(() => {
    proto.scrollIntoView = original;
  });

  const wrong = (nonce: number): RoomState => ({
    tag: 'picking',
    announcement: 'Name the trick.',
    wrongHint: 'Close, but the words are plain.',
    flicker: true,
    whisperNonce: nonce,
  });

  it('scrolls the whisper to the nearest edge on each wrong pick, never on mount without one', () => {
    const spy = vi.fn();
    proto.scrollIntoView = spy;
    const { rerender } = render(<LiveRegion state={base} />);
    expect(spy).not.toHaveBeenCalled();
    rerender(<LiveRegion state={wrong(1)} />);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toMatchObject({ block: 'nearest' });
    rerender(<LiveRegion state={wrong(2)} />);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('does not throw where scrollIntoView is missing', () => {
    proto.scrollIntoView = undefined;
    expect(() => render(<LiveRegion state={wrong(1)} />)).not.toThrow();
  });
});
