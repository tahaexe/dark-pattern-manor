import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import ShareCard from './ShareCard';

const SHARE_TEXT = 'I named all twelve ghosts of Dark Pattern Manor.';

describe('ShareCard', () => {
  afterEach(() => {
    // Remove any share mock so each test controls its own environment.
    delete (navigator as unknown as { share?: unknown }).share;
    vi.restoreAllMocks();
  });

  it('renders the sentence, the site URL, and a Share button', () => {
    render(<ShareCard />);
    expect(screen.getByRole('heading', { name: SHARE_TEXT })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Share' })).toBeDefined();
    // The site URL is derived from the page's own origin + base path.
    const expected = new URL(import.meta.env?.BASE_URL || '/', window.location.origin).href;
    expect(screen.getByText(expected)).toBeDefined();
  });

  it('links the share sentence to the teaching page', () => {
    render(<ShareCard />);
    const link = screen.getByRole('link', { name: SHARE_TEXT }) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('#/teach');
  });

  it('uses the Web Share API when navigator.share is present, and not the clipboard', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    (navigator as unknown as { share: typeof share }).share = share;
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<ShareCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const arg = share.mock.calls[0][0];
    expect(arg.title).toBe('Dark Pattern Manor');
    expect(arg.text).toBe(SHARE_TEXT);
    const expectedUrl = new URL(import.meta.env?.BASE_URL || '/', window.location.origin).href;
    expect(arg.url).toBe(expectedUrl);

    // The clipboard fallback is not used when share is available.
    expect(writeText).not.toHaveBeenCalled();
    // No "Copied" announcement either.
    expect(screen.queryByText('Copied')).toBeNull();
  });

  it('falls back to the clipboard and announces "Copied" when share is absent', async () => {
    // Ensure no share method exists.
    delete (navigator as unknown as { share?: unknown }).share;
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<ShareCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const expectedUrl = new URL(import.meta.env?.BASE_URL || '/', window.location.origin).href;
    expect(writeText).toHaveBeenCalledWith(`${SHARE_TEXT} ${expectedUrl}`);

    // The polite live region announces "Copied".
    const status = await screen.findByText('Copied');
    expect(status).toBeDefined();
    expect(status.getAttribute('aria-live')).toBe('polite');
  });
});
