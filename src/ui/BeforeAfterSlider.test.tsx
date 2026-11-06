import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { useState } from 'preact/hooks';
import BeforeAfterSlider from './BeforeAfterSlider';

function Harness({ initial = 50, step }: { initial?: number; step?: number }) {
  const [v, setV] = useState(initial);
  return (
    <>
      <BeforeAfterSlider value={v} onChange={setV} step={step} />
      <span data-testid="value">{v}</span>
    </>
  );
}

describe('BeforeAfterSlider', () => {
  it('renders a range slider labelled "Before and After slider"', () => {
    render(<BeforeAfterSlider value={50} onChange={() => {}} />);
    const slider = screen.getByRole('slider', { name: 'Before and After slider' });
    expect((slider as HTMLInputElement).type).toBe('range');
  });

  it('ArrowRight increases and ArrowLeft decreases the value', () => {
    render(<Harness initial={50} />);
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(screen.getByTestId('value').textContent).toBe('51');
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(screen.getByTestId('value').textContent).toBe('49');
  });

  it('ArrowUp increases and ArrowDown decreases the value', () => {
    render(<Harness initial={50} />);
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(screen.getByTestId('value').textContent).toBe('51');
    fireEvent.keyDown(slider, { key: 'ArrowDown' });
    fireEvent.keyDown(slider, { key: 'ArrowDown' });
    expect(screen.getByTestId('value').textContent).toBe('49');
  });

  it('Home sets the value to the minimum (fully haunted)', () => {
    render(<Harness initial={50} />);
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(screen.getByTestId('value').textContent).toBe('0');
  });

  it('End sets the value to the maximum (fully honest)', () => {
    render(<Harness initial={50} />);
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'End' });
    expect(screen.getByTestId('value').textContent).toBe('100');
  });

  it('does not go below 0 or above 100', () => {
    const onChange = vi.fn();
    render(<BeforeAfterSlider value={0} onChange={onChange} />);
    const slider = screen.getByRole('slider');
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(onChange).not.toHaveBeenCalled();
  });

  describe('Page Up / Page Down (one page = step × 5)', () => {
    it('at the default step of 1, Page keys move the value by 5', () => {
      render(<Harness initial={50} />);
      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'PageUp' });
      expect(screen.getByTestId('value').textContent).toBe('55');
      fireEvent.keyDown(slider, { key: 'PageDown' });
      fireEvent.keyDown(slider, { key: 'PageDown' });
      expect(screen.getByTestId('value').textContent).toBe('45');
    });

    it('with step=5 the arrows move 5 and the Page keys move 25', () => {
      render(<Harness initial={50} step={5} />);
      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'ArrowRight' });
      expect(screen.getByTestId('value').textContent).toBe('55');
      fireEvent.keyDown(slider, { key: 'ArrowLeft' });
      expect(screen.getByTestId('value').textContent).toBe('50');
      fireEvent.keyDown(slider, { key: 'PageUp' });
      expect(screen.getByTestId('value').textContent).toBe('75');
      fireEvent.keyDown(slider, { key: 'PageDown' });
      fireEvent.keyDown(slider, { key: 'PageDown' });
      expect(screen.getByTestId('value').textContent).toBe('25');
    });

    it('Page keys clamp at the ends', () => {
      render(<Harness initial={90} step={5} />);
      const slider = screen.getByRole('slider');
      // One page of 25 from 90 would be 115 → clamp to 100.
      fireEvent.keyDown(slider, { key: 'PageUp' });
      expect(screen.getByTestId('value').textContent).toBe('100');
      // Already at 100: another PageUp is a no-op (no change).
      fireEvent.keyDown(slider, { key: 'PageUp' });
      expect(screen.getByTestId('value').textContent).toBe('100');
    });
  });
});
