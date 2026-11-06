import { describe, it, expect } from 'vitest';
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
