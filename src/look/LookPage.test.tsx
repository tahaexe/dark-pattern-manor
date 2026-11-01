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

  it('renders the three spell cards: Visual interference, Trick wording, and Nagging', () => {
    render(<LookPage />);
    // All three card names should be present in the document
    const cards = screen.getAllByText('Visual interference');
    expect(cards.length).toBeGreaterThan(0);
    const trickWording = screen.getByText('Trick wording');
    const nagging = screen.getByText('Nagging');
    expect(trickWording).toBeDefined();
    expect(nagging).toBeDefined();
  });

  it('renders the split slider with range input', () => {
    render(<LookPage />);
    const slider = screen.getByRole('slider');
    expect(slider).toBeDefined();
    expect((slider as HTMLInputElement).type).toBe('range');
  });

  it('renders both source links: FTC and EDPB', () => {
    render(<LookPage />);
    const ftcLink = screen.getByText(/FTC, Bringing Dark Patterns to Light/);
    const edpbLink = screen.getByText(/EDPB cookie banner taskforce report/);
    expect(ftcLink).toBeDefined();
    expect(edpbLink).toBeDefined();
    expect(ftcLink.tagName).toBe('A');
    expect(edpbLink.tagName).toBe('A');
  });

  it('renders the Ghost Guide card with guide title and definition', () => {
    render(<LookPage />);
    // Check for the guide definition text
    const definition = screen.getByText(/The choice the company wants is big and bright/);
    expect(definition).toBeDefined();
  });

  it('axe-core reports no violations on the look page', async () => {
    const { container } = render(<LookPage />);
    const results = await axe.run(container);
    if (results.violations.length > 0) {
      console.log('Violations:', JSON.stringify(results.violations, null, 2));
    }
    expect(results.violations).toHaveLength(0);
  });
});
