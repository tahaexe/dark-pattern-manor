import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/preact';
import LiveRegion from './LiveRegion';
import type { RoomState } from '../engine/machine';

const base: RoomState = {
  tag: 'inspecting',
  announcement: 'Inspecting now.',
  misses: 0,
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

  it('stays in the DOM and keeps announcing, but is visually hidden (no strip, no layout shift)', () => {
    render(<LiveRegion state={base} />);
    const region = screen.getByRole('status', { name: /Spell card feedback/i });
    // It still carries the announcement for assistive technology…
    expect(region.textContent).toContain('Inspecting now.');
    // …and is taken out of flow with the visually-hidden pattern, so it never
    // shows as a dark strip under the instruction card and never shifts the page.
    expect(region.classList.contains('visually-hidden')).toBe(true);
    expect(region.classList.contains('spell-card-whisper-region')).toBe(true);
  });

  it('updates the announcement when state changes', () => {
    const { rerender } = render(<LiveRegion state={base} />);
    rerender(<LiveRegion state={{ ...base, tag: 'picking', announcement: 'Name the trick.' }} />);
    expect(screen.getByText('Name the trick.')).toBeDefined();
  });

  it('announces the wrong-look nudge', () => {
    render(
      <LiveRegion
        state={{
          ...base,
          tag: 'haunted',
          announcement: 'Not that one. Look again, or light the lantern for a hint.',
          misses: 1,
        }}
      />,
    );
    expect(screen.getByText(/Not that one\. Look again/)).toBeDefined();
  });

  it('does not render the wrong-card hint here (the inline reason under the cards carries it)', () => {
    // Even with a wrongHint on the state, LiveRegion shows only the announcement.
    render(
      <LiveRegion
        state={{
          tag: 'picking',
          announcement: 'Step 2 of 3 · Name it: pick the card that names the trick.',
          misses: 0,
          wrongHint: 'Close, but the words are plain.',
          flicker: true,
          whisperNonce: 1,
        }}
      />,
    );
    expect(screen.queryByText(/Close, but the words are plain\./)).toBeNull();
  });
});
