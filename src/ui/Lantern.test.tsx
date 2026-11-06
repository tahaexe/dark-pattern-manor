import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import Lantern from './Lantern';

describe('Lantern', () => {
  it('renders a button labelled "Lantern (L)" with a visible key hint', () => {
    render(<Lantern onLantern={() => {}} keyActive />);
    const btn = screen.getByRole('button', { name: /Lantern \(L\)/ });
    expect(btn.tagName).toBe('BUTTON');
    expect(screen.getByText('L')).toBeDefined();
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
});
