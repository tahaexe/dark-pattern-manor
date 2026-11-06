import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { useState } from 'preact/hooks';
import BeforeAfterSlider from './BeforeAfterSlider';

function Harness({ initial = 50 }: { initial?: number }) {
  const [v, setV] = useState(initial);
  return (
    <>
      <BeforeAfterSlider value={v} onChange={setV} />
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
});
