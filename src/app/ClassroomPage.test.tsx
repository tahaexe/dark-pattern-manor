import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import axe from 'axe-core';
import ClassroomPage from './ClassroomPage';
import { CHECKLIST } from './checklist';

/** The page's headings, in the order they must appear in the document. */
const HEADINGS_IN_ORDER = [
  { level: 1, name: 'Teaching with Dark Pattern Manor' },
  { level: 2, name: 'A 45-minute lesson' },
  { level: 2, name: 'Six questions for discussion' },
  { level: 2, name: 'Fourteen rules for the real web (printable)' },
  { level: 2, name: 'Sources and further reading' },
];

describe('ClassroomPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders exactly one h1 and the four h2 section headings, in order', () => {
    const { container } = render(<ClassroomPage />);

    // Exactly one h1, with the page title.
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toBe('Teaching with Dark Pattern Manor');

    // Every heading, read in document order, matches the expected outline.
    const headings = Array.from(container.querySelectorAll('h1, h2'));
    expect(headings).toHaveLength(HEADINGS_IN_ORDER.length);
    headings.forEach((el, i) => {
      expect(el.tagName).toBe(`H${HEADINGS_IN_ORDER[i].level}`);
      expect(el.textContent).toBe(HEADINGS_IN_ORDER[i].name);
    });
  });

  it('prints every checklist line from the shared data, each with its room and pattern', () => {
    const { container } = render(<ClassroomPage />);
    const items = container.querySelectorAll('.classroom-checklist-item');
    expect(items).toHaveLength(CHECKLIST.length);
    CHECKLIST.forEach((item, i) => {
      const text = (items[i].textContent ?? '').replace(/\s+/g, ' ').trim();
      // The product line, word for word.
      expect(text).toContain(item.line);
      // The room title and the pattern name, from the shared data, in brackets.
      expect(text).toContain(`(${item.title}: ${item.pattern})`);
    });
  });

  it("the printable lines equal EndingPage's lines (one shared source)", () => {
    // Both pages read CHECKLIST from ./checklist; this proves the classroom
    // page renders exactly those lines, so the two can never drift.
    const { container } = render(<ClassroomPage />);
    const items = container.querySelectorAll('.classroom-checklist-item');
    const rendered = Array.from(items).map((el) => {
      const room = el.querySelector('.classroom-checklist-room');
      // The line is the item's text with the trailing "(Room: pattern)" removed.
      return (el.textContent ?? '').replace(room?.textContent ?? '', '').trim();
    });
    const endingLines = CHECKLIST.map((c) => c.line);
    expect(rendered).toEqual(endingLines);
  });

  it('the "Print this page" button calls window.print exactly once', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<ClassroomPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Print this page' }));
    expect(print).toHaveBeenCalledTimes(1);
  });

  it('every external link opens in a new tab with rel="noopener noreferrer"', () => {
    const { container } = render(<ClassroomPage />);
    const external = Array.from(container.querySelectorAll('a')).filter((a) =>
      (a.getAttribute('href') ?? '').startsWith('http'),
    );
    // The five sources each have one external link.
    expect(external.length).toBeGreaterThanOrEqual(5);
    external.forEach((a) => {
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    });
    // No in-page (#/…) link is marked target=_blank.
    const internal = Array.from(container.querySelectorAll('a')).filter((a) =>
      (a.getAttribute('href') ?? '').startsWith('#/'),
    );
    internal.forEach((a) => {
      expect(a.getAttribute('target')).toBeNull();
    });
  });

  it('reports zero axe-core violations', async () => {
    const { container } = render(<ClassroomPage />);
    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  });
});
