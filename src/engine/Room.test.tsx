import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import Room from './Room';
import { loadRoom, roomSlugs, ROOM_COUNT } from './registry';
import { __resetForTests, doneCount } from './progress';
import type { RoomData } from './types';

/** A deterministic card order: no shuffling. */
const identityRng = () => 0;

async function foyer(): Promise<RoomData> {
  return loadRoom('gravemoor-gazette');
}

/** Mock matchMedia so `prefers-reduced-motion: reduce` is on (deterministic). */
function mockReducedMotion() {
  return vi.spyOn(window, 'matchMedia').mockImplementation(
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
}

describe('registry (on-demand loading)', () => {
  it('loads a room by slug through dynamic import', async () => {
    const room = await loadRoom('gravemoor-gazette');
    expect(room.slug).toBe('gravemoor-gazette');
    expect(room.name).toBe('The Foyer');
  });

  it('exposes room slugs through lazy loader thunks', () => {
    expect(roomSlugs()).toContain('gravemoor-gazette');
    expect(typeof roomSlugs).toBe('function');
  });
});

describe('Room component — the first tap works', () => {
  beforeEach(() => {
    __resetForTests();
  });

  it('tapping the possessed element straight from haunted reaches picking (no lantern)', async () => {
    const room = await foyer();
    render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    const correct = await screen.findByRole('button', {
      name: 'Visual interference',
    });
    expect(correct).toBeDefined();
  });

  it('tapping a non-possessed element while haunted nudges and stays haunted', async () => {
    const room = await foyer();
    render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: 'Accept all' }));
    const region = screen.getByRole('status', { name: /Spell card feedback/i });
    await waitFor(() => expect(region.textContent).toMatch(/Not that one\. Look again/i));
    expect(screen.queryByRole('button', { name: 'Visual interference' })).toBeNull();
  });
});

describe('Room component — the lantern lights the trick', () => {
  beforeEach(() => {
    __resetForTests();
  });

  it('lighting the lantern rings the possessed element and focuses it', async () => {
    const room = await foyer();
    const { container } = render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    await waitFor(() => {
      expect(container.querySelector('.possessed-ring')).not.toBeNull();
    });
    const possessed = screen.getByRole('button', { name: 'Reject all' });
    expect(document.activeElement).toBe(possessed);
    fireEvent.click(possessed);
    await screen.findByRole('button', { name: 'Visual interference' });
  });
});

describe('Room component — full loop', () => {
  beforeEach(() => {
    __resetForTests();
  });

  it('runs lantern -> inspecting -> pick possessed -> picking -> correct -> honest -> done', async () => {
    const room = await foyer();
    render(<Room room={room} nextSlug="inkbone-books" rng={identityRng} />);

    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));

    const correct = await screen.findByRole('button', {
      name: 'Visual interference',
    });
    fireEvent.click(correct);

    await screen.findByRole('heading', {
      level: 2,
      name: 'Visual interference',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));

    await waitFor(() => {
      expect(doneCount()).toBe(1);
    });
  });

  it('moves focus to the step heading on a state change', async () => {
    const room = await foyer();
    const { container } = render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    await waitFor(() => {
      const step = container.querySelector('.room-step') as HTMLElement;
      expect(document.activeElement).toBe(step);
    });
  });
});

describe('Room component — the step line and the bar', () => {
  beforeEach(() => {
    __resetForTests();
  });

  it('shows the haunted step line and the task in the instruction card', async () => {
    const room = await foyer();
    const { container } = render(<Room room={room} roomNum={1} rng={identityRng} />);
    const step = container.querySelector('.room-step') as HTMLElement;
    expect(step.textContent).toMatch(/Step 1 of 3 · Find the trick/);
    expect(container.querySelector('.room-instructions-task')?.textContent).toMatch(
      /reject the cookies/,
    );
  });

  it('the bar reads "Room N of <total>, M freed" and renders one dot per room', async () => {
    const room = await foyer();
    const freed = new Set([1, 2]);
    const { container } = render(<Room room={room} roomNum={3} freed={freed} rng={identityRng} />);
    // The total comes from the registry's room count, so adding a room needs no
    // change here.
    expect(container.querySelector('.room-bar-counter')?.textContent).toMatch(
      new RegExp(`Room 3 of ${ROOM_COUNT}, 2 freed`),
    );
    expect(container.querySelectorAll('.room-bar-dot')).toHaveLength(ROOM_COUNT);
    expect(container.querySelectorAll('.room-bar-dot.is-freed')).toHaveLength(2);
    expect(container.querySelectorAll('.room-bar-dot.is-current')).toHaveLength(1);
  });

  it('shows a "‹ Manor", a "Rooms" and a "?" control', async () => {
    const room = await foyer();
    render(<Room room={room} roomNum={1} rng={identityRng} />);
    expect(screen.getByRole('button', { name: /Manor/ })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Rooms' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'How to play' })).toBeDefined();
  });

  it('the bar keeps all five controls in one row with their accessible names (phone-safe)', async () => {
    // jsdom does not resolve the imported CSS, so the single-row/44x44 layout is
    // asserted in the walk (a real browser); here we assert the structure the
    // CSS relies on: one bar, one actions group holding the three action
    // controls in order, each keeping an accessible name even where the phone
    // drops the visible word.
    const room = await foyer();
    const { container } = render(<Room room={room} roomNum={1} rng={identityRng} />);
    const bar = container.querySelector('.room-bar') as HTMLElement;
    expect(bar).not.toBeNull();
    // "‹ Manor" on the left, the counter in the middle, the actions on the right.
    expect(bar.querySelector('.room-bar-manor')).not.toBeNull();
    expect(bar.querySelector('.room-bar-counter')).not.toBeNull();
    const actions = bar.querySelector('.room-bar-actions') as HTMLElement;
    const names = [...actions.querySelectorAll('button')].map(
      (b) => b.getAttribute('aria-label') || b.textContent?.trim(),
    );
    // "Rooms", "How to play", and the Sound toggle (its own name "Sound").
    expect(names[0]).toBe('Rooms');
    expect(names[1]).toBe('How to play');
    expect(names[2]).toMatch(/Sound/i);
    // The Rooms button carries both a (phone-droppable) visible label and an
    // icon, so the name survives when the word is hidden.
    const roomsBtn = screen.getByRole('button', { name: 'Rooms' });
    expect(roomsBtn.querySelector('.room-bar-button-label')?.textContent).toBe('Rooms');
    expect(roomsBtn.querySelector('.room-bar-button-icon')).not.toBeNull();
  });

  it('the lantern sits inside the instruction card beside the step line (never its own row)', async () => {
    const room = await foyer();
    const { container } = render(<Room room={room} roomNum={1} rng={identityRng} />);
    const card = container.querySelector('.room-instructions') as HTMLElement;
    const text = card.querySelector('.room-instructions-text');
    const lantern = card.querySelector('.lantern-button');
    // Both are direct children of the same card (a two-column grid in CSS): the
    // text on the left, the lantern on the right — the lantern is never pushed
    // into a row of its own (the computed two-column layout is checked in the
    // walk, where jsdom's missing CSS does not apply).
    expect(text?.parentElement).toBe(card);
    expect(lantern?.parentElement).toBe(card);
    // The lantern comes after the text in DOM order (left text, right lantern).
    const pos = (text as HTMLElement).compareDocumentPosition(lantern as HTMLElement);
    expect(pos & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('Room component — the Rooms dialog', () => {
  beforeEach(() => {
    __resetForTests();
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function () {
        this.open = true;
      };
    }
    if (!HTMLDialogElement.prototype.close) {
      HTMLDialogElement.prototype.close = function () {
        this.open = false;
      };
    }
  });

  it('lists one link per room, freed rooms show their pattern, and closes with focus return', async () => {
    const room = await foyer();
    const freed = new Set([1]);
    render(<Room room={room} roomNum={1} freed={freed} rng={identityRng} />);

    const roomsBtn = screen.getByRole('button', { name: 'Rooms' });
    fireEvent.click(roomsBtn);

    const links = await screen.findAllByRole('link');
    const roomLinks = links.filter((l) =>
      (l as HTMLAnchorElement).getAttribute('href')?.startsWith('#/room/'),
    );
    expect(roomLinks).toHaveLength(ROOM_COUNT);
    expect(screen.getByText(/freed: visual interference/i)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(document.activeElement).toBe(roomsBtn));
  });
});

describe('Room component — the How-to-play popover', () => {
  beforeEach(() => {
    __resetForTests();
  });

  it('opens the three steps and returns focus to "?" on Esc', async () => {
    const room = await foyer();
    render(<Room room={room} roomNum={1} rng={identityRng} />);
    const helpBtn = screen.getByRole('button', { name: 'How to play' });
    fireEvent.click(helpBtn);

    expect(await screen.findByText('Spot the trick')).toBeDefined();
    expect(screen.getByText('Name it')).toBeDefined();
    expect(screen.getByText('Set the page free')).toBeDefined();

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(document.activeElement).toBe(helpBtn));
  });
});

describe('Room component — stuck help', () => {
  beforeEach(() => {
    __resetForTests();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('after two misses the lantern glows and the step line offers help', async () => {
    const room = await foyer();
    const { container } = render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: 'Accept all' }));
    fireEvent.click(screen.getByRole('button', { name: 'Accept all' }));
    await vi.waitFor(() => {
      expect(container.querySelector('.lantern-button.is-stuck')).not.toBeNull();
    });
    expect((container.querySelector('.room-step') as HTMLElement).textContent).toMatch(
      /Stuck\? Light the lantern\./,
    );
  });

  it('after twenty seconds in haunted the lantern glows', async () => {
    const room = await foyer();
    const { container } = render(<Room room={room} rng={identityRng} />);
    expect(container.querySelector('.lantern-button.is-stuck')).toBeNull();
    vi.advanceTimersByTime(20000);
    await vi.waitFor(() => {
      expect(container.querySelector('.lantern-button.is-stuck')).not.toBeNull();
    });
  });
});

describe('Room component — the continue affordance', () => {
  beforeEach(() => {
    __resetForTests();
  });

  /**
   * Drive the room all the way to `done`: pick the possessed element, the right
   * card, then do the one-click honest task. The continue link appears only at
   * `done`, directly under the slider.
   */
  async function reachDone(nextHash: string, nextName?: string) {
    const room = await foyer();
    const { container } = render(
      <Room room={room} nextHash={nextHash} nextName={nextName} rng={identityRng} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Visual interference' }));
    await screen.findByRole('heading', {
      level: 2,
      name: 'Visual interference',
    });
    // The honest one-click task (the honest "Reject all") completes the room.
    const honest = container.querySelector('.comparison-honest') as HTMLElement;
    const taskBtn = honest.querySelector('button') as HTMLButtonElement;
    fireEvent.click(taskBtn);
    await waitFor(() => expect(doneCount()).toBe(1));
    return container;
  }

  it('reads "Next room: <name>" for a room before the last once done', async () => {
    await reachDone('#/room/2', 'The Library');
    const link = screen.getByRole('link', {
      name: 'Next room: The Library',
    }) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('#/room/2');
  });

  it('for the last room the continue link reads "Leave the manor" and leads to #/end', async () => {
    await reachDone('#/end');
    const link = screen.getByRole('link', {
      name: 'Leave the manor',
    }) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('#/end');
  });

  it('places the continue link directly under the slider, above the Ghost Guide card', async () => {
    const container = await reachDone('#/room/2', 'The Library');
    const link = container.querySelector('.room-continue') as HTMLElement;
    const slider = container.querySelector('[role="slider"]') as HTMLElement;
    const guide = container.querySelector('.guide-card') as HTMLElement;
    expect(link).not.toBeNull();
    expect(guide).not.toBeNull();
    // DOM order: slider … continue link … guide card.
    const linkBeforeGuide = link.compareDocumentPosition(guide);
    expect(linkBeforeGuide & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    if (slider) {
      const sliderBeforeLink = slider.compareDocumentPosition(link);
      expect(sliderBeforeLink & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it('scrolls the continue link into view when the room is done (block nearest)', async () => {
    const room = await foyer();
    const calls: Array<ScrollIntoViewOptions | boolean | undefined> = [];
    const proto = HTMLElement.prototype as unknown as {
      scrollIntoView: (arg?: ScrollIntoViewOptions | boolean) => void;
    };
    const original = proto.scrollIntoView;
    proto.scrollIntoView = function (arg?: ScrollIntoViewOptions | boolean) {
      if ((this as HTMLElement).classList.contains('room-continue')) calls.push(arg);
    };
    try {
      const { container } = render(
        <Room room={room} nextHash="#/room/2" nextName="The Library" rng={identityRng} />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Visual interference' }));
      await screen.findByRole('heading', {
        level: 2,
        name: 'Visual interference',
      });
      const honest = container.querySelector('.comparison-honest') as HTMLElement;
      fireEvent.click(honest.querySelector('button') as HTMLButtonElement);
      await waitFor(() => expect(doneCount()).toBe(1));
      await waitFor(() => expect(calls.length).toBeGreaterThan(0));
      const opt = calls[0] as ScrollIntoViewOptions;
      expect(opt && opt.block).toBe('nearest');
    } finally {
      proto.scrollIntoView = original;
    }
  });

  it('shows no continue link before the room is done', async () => {
    const room = await foyer();
    render(<Room room={room} nextHash="#/room/2" nextName="The Library" rng={identityRng} />);
    // Haunted: no link.
    expect(screen.queryByRole('link', { name: /Next room|Leave/ })).toBeNull();
    // Honest (task not yet done): still no link.
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Visual interference' }));
    await screen.findByRole('heading', {
      level: 2,
      name: 'Visual interference',
    });
    expect(screen.queryByRole('link', { name: /Next room|Leave/ })).toBeNull();
  });
});

describe('Room component — the honest comparison keeps a control’s click (pointer)', () => {
  beforeEach(() => {
    __resetForTests();
  });

  /**
   * Drive the foyer to the honest comparison (not yet done): pick the possessed
   * element, then the right card. Returns the rendered container.
   */
  async function reachHonestComparison(nextHash = '#/room/2', nextName = 'The Library') {
    const room = await foyer();
    const view = render(
      <Room room={room} nextHash={nextHash} nextName={nextName} rng={identityRng} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Visual interference' }));
    await screen.findByRole('heading', { level: 2, name: 'Visual interference' });
    return view;
  }

  /**
   * Spy on the comparison's setPointerCapture. The Room only takes pointer
   * capture (and so only starts a drag) when a pointerdown should move the
   * divider; the dead-end fix's early-return skips it for controls. jsdom fires
   * the Preact handler through fireEvent.pointerDown but exposes no clientX, so
   * the capture call — not the resulting divider percent — is the signal that a
   * drag started.
   */
  function spyCapture(comparison: HTMLElement) {
    const spy = vi.fn();
    (comparison as unknown as { setPointerCapture: (id: number) => void }).setPointerCapture = spy;
    (comparison as unknown as { releasePointerCapture: (id: number) => void }).releasePointerCapture =
      () => {};
    return spy;
  }

  it('a pointerdown then click on the honest "Reject all" reaches done and renders the continue link', async () => {
    const { container } = await reachHonestComparison();
    const comparison = container.querySelector('.comparison') as HTMLElement;
    spyCapture(comparison);
    const honest = container.querySelector('.comparison-honest') as HTMLElement;
    const taskBtn = honest.querySelector('button') as HTMLButtonElement;
    // The real browser sequence: a pointerdown on the control, then its click.
    // The comparison must NOT capture the pointer, so the click reaches the
    // button and the task completes.
    fireEvent.pointerDown(taskBtn);
    fireEvent.click(taskBtn);
    await waitFor(() => expect(doneCount()).toBe(1));
    const link = screen.getByRole('link', {
      name: 'Next room: The Library',
    }) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('#/room/2');
  });

  it('a pointerdown on a non-interactive part of the comparison starts a drag (takes pointer capture)', async () => {
    const { container } = await reachHonestComparison();
    const comparison = container.querySelector('.comparison') as HTMLElement;
    const capture = spyCapture(comparison);
    // The target is the comparison group itself (role=group, not a control), so
    // the drag starts: the comparison takes pointer capture.
    fireEvent.pointerDown(comparison);
    expect(capture).toHaveBeenCalledTimes(1);
  });

  it('a pointerdown on a control inside the comparison does not start a drag (no pointer capture)', async () => {
    const { container } = await reachHonestComparison();
    const comparison = container.querySelector('.comparison') as HTMLElement;
    const capture = spyCapture(comparison);
    const honest = container.querySelector('.comparison-honest') as HTMLElement;
    const taskBtn = honest.querySelector('button') as HTMLButtonElement;
    // The pointerdown lands on an interactive control, so the early-return fires
    // and no pointer capture (no drag) is taken.
    fireEvent.pointerDown(taskBtn);
    expect(capture).not.toHaveBeenCalled();
  });
});

describe('Room component — wrong-pick reason under the cards', () => {
  beforeEach(() => {
    __resetForTests();
  });

  it('a single wrong pick shows the hint once, inline under the cards, and keeps the cards selectable', async () => {
    const room = await foyer();
    const { container } = render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));

    const wrong = await screen.findByRole('button', { name: 'Trick wording' });
    fireEvent.click(wrong);

    // The hint appears exactly once, as the inline reason under the cards.
    const matches = await screen.findAllByText(/it is the look that lies/i);
    expect(matches).toHaveLength(1);
    const inline = container.querySelector('.spell-card-reason') as HTMLElement;
    expect(inline).not.toBeNull();
    // It is its own polite live region (spoken and shown by one node).
    expect(inline.getAttribute('aria-live')).toBe('polite');

    // All cards still selectable.
    for (const name of ['Visual interference', 'Trick wording', 'Nagging']) {
      const btn = screen.getByRole('button', { name }) as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    }
  });

  it('does not scroll the state live region to the top strip on a wrong pick', async () => {
    const room = await foyer();
    render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    const region = screen.getByRole('status', { name: /Spell card feedback/i });
    const spy = vi.fn();
    (region as HTMLElement).scrollIntoView = spy as unknown as typeof region.scrollIntoView;
    const wrong = await screen.findByRole('button', { name: 'Trick wording' });
    fireEvent.click(wrong);
    await screen.findByText(/it is the look that lies/i);
    expect(spy).not.toHaveBeenCalled();
  });

  it('a correct pick after a wrong one still reaches honest (no penalty)', async () => {
    const room = await foyer();
    render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Nagging' }));
    fireEvent.click(screen.getByRole('button', { name: 'Visual interference' }));
    await screen.findByRole('heading', {
      level: 2,
      name: 'Visual interference',
    });
  });
});

describe('Room component — the Before/After comparison wipe', () => {
  let spy: ReturnType<typeof mockReducedMotion> | undefined;

  beforeEach(() => {
    __resetForTests();
    spy = mockReducedMotion();
  });

  afterEach(() => {
    spy?.mockRestore();
  });

  async function reachHonest() {
    const room = await foyer();
    const view = render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Visual interference' }));
    await screen.findByRole('heading', {
      level: 2,
      name: 'Visual interference',
    });
    return view;
  }

  it('renders one comparison box, role=group, with both versions stacked', async () => {
    const { container } = await reachHonest();
    const box = screen.getByRole('group', {
      name: 'Haunted and honest versions',
    });
    expect(box.querySelector('.comparison-haunted')).not.toBeNull();
    expect(box.querySelector('.comparison-honest')).not.toBeNull();
    expect(container.querySelectorAll('.comparison')).toHaveLength(1);
  });

  it('under reduced motion the slider starts at 50 and the honest layer carries --split: 50%', async () => {
    const { container } = await reachHonest();
    const slider = screen.getByRole('slider', {
      name: 'Before and After slider',
    }) as HTMLInputElement;
    expect(slider.value).toBe('50');
    const honest = container.querySelector('.comparison-honest') as HTMLElement;
    expect(honest.style.getPropertyValue('--split')).toBe('50%');
  });

  it('arrow keys move by 5, Page Up/Down by 25, Home/End to 0/100 (clamped)', async () => {
    const { container } = await reachHonest();
    const slider = screen.getByRole('slider', {
      name: 'Before and After slider',
    }) as HTMLInputElement;
    const split = () =>
      (container.querySelector('.comparison-honest') as HTMLElement).style.getPropertyValue(
        '--split',
      );

    expect(slider.value).toBe('50');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    await waitFor(() => expect(slider.value).toBe('55'));
    expect(split()).toBe('55%');
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    await waitFor(() => expect(slider.value).toBe('50'));
    fireEvent.keyDown(slider, { key: 'PageUp' });
    await waitFor(() => expect(slider.value).toBe('75'));
    fireEvent.keyDown(slider, { key: 'PageDown' });
    fireEvent.keyDown(slider, { key: 'PageDown' });
    await waitFor(() => expect(slider.value).toBe('25'));
    fireEvent.keyDown(slider, { key: 'End' });
    await waitFor(() => expect(slider.value).toBe('100'));
    fireEvent.keyDown(slider, { key: 'Home' });
    await waitFor(() => expect(slider.value).toBe('0'));
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    await waitFor(() => expect(slider.value).toBe('0'));
  });

  it('focusing the honest twin task button snaps the reveal fully to honest (100)', async () => {
    const { container } = await reachHonest();
    const slider = screen.getByRole('slider', {
      name: 'Before and After slider',
    }) as HTMLInputElement;
    fireEvent.keyDown(slider, { key: 'Home' });
    await waitFor(() => expect(slider.value).toBe('0'));
    const honest = container.querySelector('.comparison-honest') as HTMLElement;
    const taskButton = honest.querySelector('button') as HTMLButtonElement;
    fireEvent.focusIn(taskButton);
    await waitFor(() => expect(slider.value).toBe('100'));
    expect(honest.style.getPropertyValue('--split')).toBe('100%');
  });

  it('the one-click task completes the room (reaches done) at any slider value', async () => {
    await reachHonest();
    const slider = screen.getByRole('slider', {
      name: 'Before and After slider',
    }) as HTMLInputElement;
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    await waitFor(() => expect(slider.value).toBe('45'));
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    await waitFor(() => expect(doneCount()).toBe(1));
  });
});
