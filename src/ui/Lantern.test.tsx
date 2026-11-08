import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import Lantern from './Lantern';

describe('Lantern', () => {
  it('renders a button whose accessible name says what it does and the L key', () => {
    render(<Lantern onLantern={() => {}} keyActive />);
    const btn = screen.getByRole('button', { name: /Lantern: show me the trick \(L\)/ });
    expect(btn.tagName).toBe('BUTTON');
    // The visible word "Lantern" and the small "hint" label are present.
    expect(screen.getByText('Lantern')).toBeDefined();
    expect(screen.getByText('hint')).toBeDefined();
  });

  it('click dispatches the lantern', () => {
    const onLantern = vi.fn();
    render(<Lantern onLantern={onLantern} keyActive />);
    screen.getByRole('button', { name: /Lantern/ }).click();
    expect(onLantern).toHaveBeenCalledTimes(1);
  });

  it('the L key dispatches the lantern while active', () => {
    const onLantern = vi.fn();
    render(<Lantern onLantern={onLantern} keyActive />);
    fireEvent.keyDown(window, { key: 'l' });
    expect(onLantern).toHaveBeenCalledTimes(1);
  });

  it('the L key does nothing when not active', () => {
    const onLantern = vi.fn();
    render(<Lantern onLantern={onLantern} keyActive={false} />);
    fireEvent.keyDown(window, { key: 'l' });
    expect(onLantern).not.toHaveBeenCalled();
  });

  it('glows when stuck help is active', () => {
    const { container } = render(<Lantern onLantern={() => {}} keyActive stuck />);
    expect(container.querySelector('.lantern-button.is-stuck')).not.toBeNull();
  });
});
