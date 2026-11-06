import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/preact';
import GuideCard from './GuideCard';
import type { GuideEntry } from '../engine/types';

const guide: GuideEntry = {
  definition: 'One choice is loud and one is faint. Nothing is missing here.',
  whereYouMeetIt: 'Cookie banners and cancel screens.',
  us: { sourceLabel: 'FTC, Bringing Dark Patterns to Light (2022)', url: 'https://www.ftc.gov/report' },
  eu: { sourceLabel: 'EDPB cookie banner taskforce report (2023)', url: 'https://www.edpb.europa.eu/report' },
  tip: 'Find the quiet option before the loud one.',
};

describe('GuideCard', () => {
  it('renders the pattern name as the level-2 title', () => {
    render(<GuideCard pattern="Visual interference" guide={guide} />);
    const title = screen.getByRole('heading', { level: 2, name: 'Visual interference' });
    expect(title).toBeDefined();
  });

  it('renders the definition, where-you-meet-it and tip', () => {
    render(<GuideCard pattern="Visual interference" guide={guide} />);
    expect(screen.getByText(guide.definition)).toBeDefined();
    expect(screen.getByText(guide.whereYouMeetIt)).toBeDefined();
    expect(screen.getByText(/Find the quiet option/)).toBeDefined();
  });

  it('renders US and EU source links with https hrefs', () => {
    render(<GuideCard pattern="Visual interference" guide={guide} />);
    const us = screen.getByRole('link', { name: /FTC, Bringing Dark Patterns to Light/ });
    const eu = screen.getByRole('link', { name: /EDPB cookie banner taskforce report/ });
    expect(us.getAttribute('href')).toMatch(/^https:/);
    expect(eu.getAttribute('href')).toMatch(/^https:/);
  });

  it('hard-codes no brand or pattern text — title comes from props', () => {
    render(<GuideCard pattern="Hard to cancel" guide={guide} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Hard to cancel' })).toBeDefined();
  });
});
