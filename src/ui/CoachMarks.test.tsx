import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { createRef } from 'preact';
import type { RefObject } from 'preact';
import CoachMarks from './CoachMarks';
import type { CoachMark } from '../engine/types';

const MARKS: ReadonlyArray<CoachMark> = [
  { step: 'spot', target: '#foyer-reject', body: 'This part is tricking you. Tap it.' },
  { step: 'name', target: '.spell-cards', body: 'Pick the card that names the trick.' },
  { step: 'free', target: '.comparison', body: 'Drag the line to compare.' },
];

/**
 * jsdom has no layout, so getBoundingClientRect returns zeros and the mark
 * would never place. Build a scene element with a target inside it, stub both
 * rects so placement succeeds, and give the ref that scene.
 */
function sceneWithTarget(selector: string): {
  scene: HTMLElement;
  ref: RefObject<HTMLElement>;
} {
  const scene = document.createElement('div');
  scene.className = 'room-scene';
  const bareSel = selector.replace(/^[#.]/, '');
  const target = document.createElement('div');
  if (selector.startsWith('#')) target.id = bareSel;
  else target.className = bareSel;
  scene.appendChild(target);
  document.body.appendChild(scene);

  scene.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: 600, bottom: 800, width: 600, height: 800 }) as DOMRect;
  target.getBoundingClientRect = () =>
    ({ left: 100, top: 200, right: 300, bottom: 240, width: 200, height: 40 }) as DOMRect;

  const ref = createRef<HTMLElement>();
  (ref as { current: HTMLElement }).current = scene;
  return { scene, ref };
}

describe('CoachMarks', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    // A roomy viewport so "below" placement is chosen.
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
  });

  it('renders the mark for the current step with its body and a Skip link', () => {
    const { ref } = sceneWithTarget('#foyer-reject');
    const { container } = render(
      <CoachMarks
        marks={MARKS}
        step="spot"
        sceneRef={ref}
        onSkip={() => {}}
        reducedMotion={false}
      />,
    );
    const mark = container.querySelector('.coach-mark');
    expect(mark).not.toBeNull();
    expect(mark!.getAttribute('data-step')).toBe('spot');
    expect(container.querySelector('.coach-mark-body')!.textContent).toBe(
      'This part is tricking you. Tap it.',
    );
    expect(container.querySelector('.coach-mark-skip')).not.toBeNull();
  });

  it('renders nothing when the target cannot be found', () => {
    const scene = document.createElement('div');
    scene.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: 600, bottom: 800, width: 600, height: 800 }) as DOMRect;
    document.body.appendChild(scene);
    const ref = createRef<HTMLElement>();
    (ref as { current: HTMLElement }).current = scene;
    const { container } = render(
      <CoachMarks
        marks={MARKS}
        step="spot"
        sceneRef={ref}
        onSkip={() => {}}
        reducedMotion={false}
      />,
    );
    expect(container.querySelector('.coach-mark')).toBeNull();
  });

  it('the Skip link calls onSkip', () => {
    const onSkip = vi.fn();
    const { ref } = sceneWithTarget('#foyer-reject');
    const { container } = render(
      <CoachMarks marks={MARKS} step="spot" sceneRef={ref} onSkip={onSkip} reducedMotion={false} />,
    );
    fireEvent.click(container.querySelector('.coach-mark-skip')!);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('Escape calls onSkip', () => {
    const onSkip = vi.fn();
    const { ref } = sceneWithTarget('#foyer-reject');
    render(
      <CoachMarks marks={MARKS} step="spot" sceneRef={ref} onSkip={onSkip} reducedMotion={false} />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('showing the mark does not move focus', () => {
    const { ref } = sceneWithTarget('.spell-cards');
    const before = document.activeElement;
    render(
      <CoachMarks
        marks={MARKS}
        step="name"
        sceneRef={ref}
        onSkip={() => {}}
        reducedMotion={false}
      />,
    );
    expect(document.activeElement).toBe(before);
  });

  it('under reduced motion the mark carries the still class (no animation)', () => {
    const { ref } = sceneWithTarget('.comparison');
    const { container } = render(
      <CoachMarks
        marks={MARKS}
        step="free"
        sceneRef={ref}
        onSkip={() => {}}
        reducedMotion={true}
      />,
    );
    const mark = container.querySelector('.coach-mark')!;
    expect(mark.classList.contains('is-still')).toBe(true);
  });

  it('only the Skip button is focusable inside the mark (no stray tabindex)', () => {
    const { ref } = sceneWithTarget('#foyer-reject');
    const { container } = render(
      <CoachMarks
        marks={MARKS}
        step="spot"
        sceneRef={ref}
        onSkip={() => {}}
        reducedMotion={false}
      />,
    );
    const focusable = container.querySelectorAll(
      '.coach-mark button, .coach-mark a[href], .coach-mark [tabindex]:not([tabindex="-1"])',
    );
    expect(focusable.length).toBe(1);
    expect(focusable[0].classList.contains('coach-mark-skip')).toBe(true);
  });
});
