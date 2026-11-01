import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/preact';
import axe from 'axe-core';
import LookPage from './LookPage';

describe('LookPage', () => {
  it('renders the task bar with title "The Foyer"', () => {
    render(<LookPage />);
    const heading = screen.getByText('The Foyer');
    expect(heading).toBeDefined();
  });

  it('renders the three spell cards as buttons with names', () => {
    render(<LookPage />);
    const visualCard = screen.getByRole('button', { name: 'Visual interference' });
    const trickCard = screen.getByRole('button', { name: 'Trick wording' });
    const naggingCard = screen.getByRole('button', { name: 'Nagging' });
    expect(visualCard).toBeDefined();
    expect(trickCard).toBeDefined();
    expect(naggingCard).toBeDefined();
  });

  it('spell cards are real button elements, not divs with role="button"', () => {
    render(<LookPage />);
    const visualCard = screen.getByRole('button', { name: 'Visual interference' });
    expect(visualCard.tagName).toBe('BUTTON');
  });

  it('whisper feedback sits in a polite live region', () => {
    render(<LookPage />);
    const liveRegion = screen.getByRole('status', { name: /Spell card feedback/i });
    expect(liveRegion).toBeDefined();
    expect(liveRegion.getAttribute('aria-live')).toBe('polite');
  });

  it('haunted and honest sections have buttons', () => {
    render(<LookPage />);
    // Haunted side: Accept all and Reject all
    const acceptButtons = screen.getAllByRole('button', { name: /Accept all/i });
    expect(acceptButtons.length).toBeGreaterThan(0);
    const rejectButtons = screen.getAllByRole('button', { name: /Reject all/i });
    expect(rejectButtons.length).toBeGreaterThan(0);
  });

  it('renders the split slider with range input', () => {
    render(<LookPage />);
    const slider = screen.getByRole('slider');
    expect(slider).toBeDefined();
    expect((slider as HTMLInputElement).type).toBe('range');
  });

  it('lantern button has aria-label with visible key hint', () => {
    render(<LookPage />);
    const lanternBtn = screen.getByRole('button', { name: /Lantern/i });
    expect(lanternBtn).toBeDefined();
    expect(lanternBtn.getAttribute('aria-label')).toContain('Lantern (L)');
  });

  it('renders the gazette header and content', () => {
    render(<LookPage />);
    const masthead = screen.getByText('The Gravemoor Gazette');
    expect(masthead).toBeDefined();
  });

  it('axe-core reports no violations on the look page', async () => {
    const { container } = render(<LookPage />);
    const results = await axe.run(container);
    if (results.violations.length > 0) {
      console.log('Violations:', JSON.stringify(results.violations, null, 2));
    }
    expect(results.violations).toHaveLength(0);
  });

  it('Ghost Guide card is open on first render with title and source links visible', () => {
    render(<LookPage />);
    const guideTitle = screen.getByRole('heading', { level: 2, name: 'Visual interference' });
    expect(guideTitle).toBeDefined();
    const ftcLink = screen.getByRole('link', { name: /FTC, Bringing Dark Patterns to Light/ });
    expect(ftcLink).toBeDefined();
    const edpbLink = screen.getByRole('link', { name: /EDPB cookie banner taskforce report/ });
    expect(edpbLink).toBeDefined();
  });
});
