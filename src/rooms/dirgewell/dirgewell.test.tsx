import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import axe from 'axe-core';
import Haunted from './Haunted';
import Honest from './Honest';
import room from './room';
import Room from '../../engine/Room';
import { __resetForTests, doneCount } from '../../engine/progress';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, 'room.css'), 'utf8');
const identityRng = () => 0;

/** The possessed "Sign up and download" button's visible text / accessible name. */
const POSSESSED_NAME = /Sign up and download/i;

describe('The Music Room — honest variant', () => {
  beforeEach(() => __resetForTests());

  it('completes "download the free song sheet" in one click', () => {
    const onCompleteTask = vi.fn();
    render(<Honest onCompleteTask={onCompleteTask} />);
    // One click on "Download free sheet" downloads at once — no account.
    fireEvent.click(screen.getByRole('button', { name: /Download free sheet/i }));
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
    // The button shows the visible "Downloaded" state.
    expect(screen.getByRole('button', { name: /Downloaded/i })).toBeDefined();
  });

  it('a single task activation moves the whole room to done', async () => {
    render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: POSSESSED_NAME }));
    fireEvent.click(await screen.findByRole('button', { name: 'Forced action' }));
    await screen.findByRole('heading', { level: 2, name: 'Forced action' });
    fireEvent.click(screen.getByRole('button', { name: /Download free sheet/i }));
    await waitFor(() => expect(doneCount()).toBe(1));
  });
});

describe('The Music Room — the possessed element', () => {
  it('is found by its id "musicroom-signup"', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#musicroom-signup');
    expect(possessed).not.toBeNull();
    expect(possessed!.id).toBe(room.possessedId);
  });

  it('is keyboard-reachable with a non-empty accessible name (its visible text)', () => {
    render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = screen.getByRole('button', { name: POSSESSED_NAME });
    expect(possessed.tagName).toBe('BUTTON');
    expect(possessed.getAttribute('aria-label')).toBeNull();
    expect((possessed as HTMLButtonElement).tabIndex).toBeGreaterThanOrEqual(0);
  });

  it('renders the ghost SVG at about 120 x 140 px inside the possessed button', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#musicroom-signup')!;
    const svg = possessed.querySelector('svg.ghost');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('width')).toBe('120');
    expect(svg!.getAttribute('height')).toBe('140');
    expect(svg!.getAttribute('viewBox')).toBe('0 0 120 140');
  });
});

describe('The Music Room — pattern rule (passes on honest, fails on haunted)', () => {
  it('on the haunted side the only path to the sheet is a sign-up gate with a pre-ticked contacts share and no skip', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    // A sign-up gate stands between the player and the download.
    expect(container.querySelector('.dirgewell-gate')).not.toBeNull();
    expect(container.querySelector('#musicroom-signup')).not.toBeNull();
    // The contacts share is pre-ticked (data the task does not need).
    const contacts = container.querySelector('.dirgewell-contacts-box') as HTMLInputElement;
    expect(contacts).not.toBeNull();
    expect(contacts.checked).toBe(true);
    // There is no guest/skip path — only "Sign up and download" or "Close".
    const btnNames = [...container.querySelectorAll('button')].map((b) =>
      (b.textContent || '').trim(),
    );
    expect(btnNames.some((n) => /continue as guest|skip|not now/i.test(n))).toBe(false);
    // No immediate download exists on the haunted side.
    expect(container.querySelector('.dirgewell-download')).toBeNull();
  });

  it('on the honest side the download happens at once and the account is a quiet optional control', () => {
    const { container } = render(<Honest onCompleteTask={() => {}} />);
    // The download button is present and comes before the optional control.
    const download = container.querySelector('.dirgewell-download');
    const optional = container.querySelector('.dirgewell-optional');
    expect(download).not.toBeNull();
    expect(optional).not.toBeNull();
    const pos = (download as HTMLElement).compareDocumentPosition(optional as HTMLElement);
    expect(pos & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The optional control names itself optional.
    expect(/optional/i.test(optional!.textContent || '')).toBe(true);
    // No sign-up gate stands on the honest side.
    expect(container.querySelector('.dirgewell-gate')).toBeNull();
    expect(container.querySelector('#musicroom-signup')).toBeNull();
  });

  it('the pattern rule is variant-specific: a sign-up gate vs an at-once download cannot both hold', () => {
    const haunted = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive={false}
        reducedMotion={false}
      />,
    );
    const hauntedGated = haunted.container.querySelector('.dirgewell-gate') !== null;

    const honest = render(<Honest onCompleteTask={() => {}} />);
    const honestGated = honest.container.querySelector('.dirgewell-gate') !== null;
    const honestDownloads = honest.container.querySelector('.dirgewell-download') !== null;

    expect(hauntedGated).toBe(true);
    expect(honestGated).toBe(false);
    expect(honestDownloads).toBe(true);
    expect(hauntedGated).not.toBe(honestGated);
  });
});

describe('The Music Room — the ghost act (Forced action performed)', () => {
  it('renders the lock and tick overlays in the haunted view, all aria-hidden', () => {
    const { container } = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
      />,
    );
    const possessed = container.querySelector('#musicroom-signup')!;
    const lock = possessed.querySelector('.act-lock');
    const tick = possessed.querySelector('.act-tick');
    expect(lock).not.toBeNull();
    expect(tick).not.toBeNull();
    expect(lock!.getAttribute('aria-hidden')).toBe('true');
    expect(tick!.getAttribute('aria-hidden')).toBe('true');
  });

  it('the act is non-interactive and runs one cycle of at least 4 s with transforms/opacity only', () => {
    expect(css).toMatch(/\.act-lock\s*\{[^}]*pointer-events:\s*none/);
    expect(css).toMatch(/\.act-tick\s*\{[^}]*pointer-events:\s*none/);
    const seconds = (sel: string) => {
      const m = css.match(new RegExp(`${sel}\\s*\\{[^}]*animation:\\s*[a-z-]+\\s*([\\d.]+)s`));
      return m ? parseFloat(m[1]) : 0;
    };
    expect(seconds('\\.act-lock')).toBeGreaterThanOrEqual(4);
    expect(seconds('\\.act-tick')).toBeGreaterThanOrEqual(4);
    const keyframeBody = (name: string): string => {
      const start = css.search(new RegExp(`@keyframes\\s+${name}\\s*\\{`));
      expect(start).toBeGreaterThanOrEqual(0);
      const open = css.indexOf('{', start);
      let depth = 0;
      for (let i = open; i < css.length; i++) {
        if (css[i] === '{') depth++;
        else if (css[i] === '}') {
          depth--;
          if (depth === 0) return css.slice(open + 1, i);
        }
      }
      return '';
    };
    for (const name of ['dirgewell-lock', 'dirgewell-tick']) {
      const body = keyframeBody(name);
      const props = Array.from(body.matchAll(/(?:^|[{;])\s*([a-z-]+)\s*:/g)).map((m) => m[1]);
      expect(props.length).toBeGreaterThan(0);
      for (const prop of props) {
        expect(['transform', 'opacity']).toContain(prop);
      }
    }
  });

  it('the act is absent in preview and in the honest twin', () => {
    const preview = render(
      <Haunted
        onSelectPossessed={() => {}}
        onSelectOther={() => {}}
        signsActive
        reducedMotion={false}
        preview
      />,
    );
    expect(preview.container.querySelector('.act-lock')).toBeNull();
    expect(preview.container.querySelector('.ghost-signs')).toBeNull();

    const honest = render(<Honest onCompleteTask={() => {}} />);
    expect(honest.container.querySelector('.act-lock')).toBeNull();
    expect(honest.container.querySelector('.ghost-wrap')).toBeNull();
  });

  it('stops the act when the ghost is named, so the shared unwind takes over', () => {
    expect(css).toMatch(
      /\.room-scene\[data-moment='right'\][^{]*\.act-lock[\s\S]*?animation:\s*none/,
    );
    expect(css).not.toMatch(/\.ghost-wrap\s*\{[^}]*animation:\s*[^;]*flee/);
  });
});

describe('The Music Room — the Ghost Guide sources', () => {
  it('carries an https ecfr.gov US source and an https eur-lex EU source', () => {
    expect(room.guide.us.url.startsWith('https://')).toBe(true);
    expect(room.guide.us.url).toContain('ecfr.gov');
    expect(room.guide.eu.url.startsWith('https://')).toBe(true);
    expect(room.guide.eu.url).toContain('eur-lex.europa.eu');
    expect(room.guide.us.sourceLabel.trim()).not.toBe('');
    expect(room.guide.eu.sourceLabel.trim()).not.toBe('');
  });
});

describe('The Music Room — contrast and axe on both variants', () => {
  async function noViolations(container: HTMLElement) {
    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: true } },
    });
    if (results.violations.length > 0) {
      console.log('axe violations:', JSON.stringify(results.violations, null, 2));
    }
    expect(results.violations).toHaveLength(0);
  }

  it('haunted variant: zero axe violations with color-contrast enabled', async () => {
    const { container } = render(
      <div class="manor-frame">
        <Haunted
          onSelectPossessed={() => {}}
          onSelectOther={() => {}}
          signsActive
          reducedMotion={false}
        />
      </div>,
    );
    await noViolations(container);
  });

  it('honest variant: zero axe violations with color-contrast enabled', async () => {
    const { container } = render(
      <div class="manor-frame">
        <Honest onCompleteTask={() => {}} />
      </div>,
    );
    await noViolations(container);
  });
});

describe('The Music Room — reduced motion static indicator', () => {
  let matchMediaSpy: ReturnType<typeof vi.spyOn> | undefined;

  beforeEach(() => {
    __resetForTests();
    matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query.includes('prefers-reduced-motion'),
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => false,
        }) as unknown as MediaQueryList,
    );
  });

  afterEach(() => {
    matchMediaSpy?.mockRestore();
  });

  it('the possessed button shows a static indicator and the act caption, no animation', () => {
    const { container } = render(<Room room={room} rng={identityRng} />);
    const possessed = container.querySelector('#musicroom-signup')!;
    expect(possessed.className).toContain('reduced-motion');
    expect(screen.getByText('Something stirs here')).toBeDefined();
    expect(screen.getByText('the free sheet asks a price')).toBeDefined();
    expect(css).toMatch(/prefers-reduced-motion/);
    expect(css).toMatch(/animation:\s*none/);
  });

  it('a wrong spell card under reduced motion shows the static indicator, no flicker animation', async () => {
    const { container } = render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: POSSESSED_NAME }));
    const wrong = await screen.findByRole('button', { name: 'Nagging' });
    fireEvent.click(wrong);
    expect(await screen.findByText(/you cannot go on without saying yes/i)).toBeDefined();
    const flickered = container.querySelector('.spell-card.is-flicker');
    expect(flickered).not.toBeNull();
    expect(css).toMatch(/animation:\s*none/);
  });
});
