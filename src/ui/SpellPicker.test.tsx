import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/preact';
import SpellPicker from './SpellPicker';
import type { SpellCards } from '../engine/types';

const cards: SpellCards = [
  { pattern: 'Visual interference', role: 'correct' },
  { pattern: 'Trick wording', role: 'relative', hint: 'The words are plain here.' },
  { pattern: 'Nagging', role: 'different', hint: 'Nothing nags you here.' },
];

describe('SpellPicker', () => {
  it('renders three buttons labelled by pattern name', () => {
    render(<SpellPicker cards={cards} onPick={() => {}} />);
    expect(screen.getByRole('button', { name: 'Visual interference' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Trick wording' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Nagging' })).toBeDefined();
  });

  it('cards are real BUTTON elements, not div role="button"', () => {
    render(<SpellPicker cards={cards} onPick={() => {}} />);
    const btn = screen.getByRole('button', { name: 'Visual interference' });
    expect(btn.tagName).toBe('BUTTON');
  });

  it('picking a card dispatches that card', () => {
    const onPick = vi.fn();
    render(<SpellPicker cards={cards} onPick={onPick} />);
    screen.getByRole('button', { name: 'Trick wording' }).click();
    expect(onPick).toHaveBeenCalledWith(cards[1]);
  });

  it('all cards stay enabled after a wrong pick (flicker set)', () => {
    render(<SpellPicker cards={cards} onPick={() => {}} flicker />);
    for (const name of ['Visual interference', 'Trick wording', 'Nagging']) {
      const btn = screen.getByRole('button', { name }) as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    }
  });

  it('renders a permutation of the three cards (same set)', () => {
    render(<SpellPicker cards={cards} onPick={() => {}} rng={() => 0.5} />);
    const names = screen.getAllByRole('button').map((b) => b.textContent);
    expect(names.length).toBe(3);
    const set = new Set(names?.map((n) => n?.trim()));
    expect(set.size).toBe(3);
  });
});
