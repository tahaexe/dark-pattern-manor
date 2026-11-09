import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/preact';
import EndingPage from './EndingPage';
import { roomSlugs } from '../engine/registry';
import { __resetForTests, completeRoom } from '../engine/progress';
import { __resetBundleCacheForTests } from './runBundle';

// Every registered room slug; completing all of them opens the ending (and so
// the lantern block). Read from the registry so adding a room needs no change.
const ALL_SLUGS = roomSlugs();

/** A fake bundle the ending-page link turns into a javascript: href. */
const FAKE_BUNDLE = '(function(){/* lantern */})();';

describe('EndingPage — Take the lantern with you', () => {
  beforeEach(() => {
    __resetForTests();
    __resetBundleCacheForTests();
    for (const slug of ALL_SLUGS) completeRoom(slug);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows the install note and a link to the practice page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, text: () => Promise.resolve(FAKE_BUNDLE) })),
    );
    const { container } = render(<EndingPage />);
    expect(
      screen.getByText('Drag this to your bookmarks bar, then click it on any page.'),
    ).toBeDefined();
    const practice = container.querySelector('a[href="#/lantern-practice"]');
    expect(practice).not.toBeNull();
  });

  it('starts as "Preparing the lantern…", not draggable, then becomes a javascript: link', async () => {
    let resolveFetch: (v: unknown) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise((res) => {
            resolveFetch = res;
          }),
      ),
    );

    const { container } = render(<EndingPage />);
    const link = container.querySelector('.ending-lantern-link') as HTMLAnchorElement;
    expect(link).not.toBeNull();
    // Before the fetch resolves: preparing, no href, not draggable.
    expect(link.textContent).toBe('Preparing the lantern…');
    expect(link.getAttribute('href')).toBeNull();
    expect(link.getAttribute('aria-disabled')).toBe('true');

    // Resolve the fetch with the fake bundle.
    resolveFetch({ ok: true, text: () => Promise.resolve(FAKE_BUNDLE) });

    await waitFor(() => {
      expect(link.getAttribute('href')).toMatch(/^javascript:/);
    });
    expect(link.textContent).toBe('Ghost Lantern');
    expect(link.getAttribute('href')).toContain(encodeURIComponent(FAKE_BUNDLE));
  });
});
