import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import axe from 'axe-core';
import Room from './Room';
import { loadRoom } from './registry';
import { __resetForTests } from './progress';
import type { RoomData } from './types';

const identityRng = () => 0;

async function foyer(): Promise<RoomData> {
  return loadRoom('gravemoor-gazette');
}

async function expectNoViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: { 'color-contrast': { enabled: true } },
  });
  if (results.violations.length > 0) {
    console.log('axe violations:', JSON.stringify(results.violations, null, 2));
  }
  expect(results.violations).toHaveLength(0);
}

describe('Room axe-core checks across all six states', () => {
  beforeEach(() => {
    __resetForTests();
  });

  it('haunted: zero axe violations', async () => {
    const room = await foyer();
    const { container } = render(<Room room={room} rng={identityRng} />);
    await expectNoViolations(container);
  });

  it('inspecting: zero axe violations', async () => {
    const room = await foyer();
    const { container } = render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    await expectNoViolations(container);
  });

  it('picking: zero axe violations', async () => {
    const room = await foyer();
    const { container } = render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    await screen.findByRole('button', { name: 'Visual interference' });
    await expectNoViolations(container);
  });

  it('named/honest: zero axe violations after the correct pick', async () => {
    const room = await foyer();
    const { container } = render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Visual interference' }));
    await screen.findByRole('heading', { level: 2, name: 'Visual interference' });
    await expectNoViolations(container);
  });

  it('done: zero axe violations after completing the task', async () => {
    const room = await foyer();
    const { container } = render(<Room room={room} rng={identityRng} />);
    fireEvent.click(screen.getByRole('button', { name: /Lantern/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Visual interference' }));
    await screen.findByRole('heading', { level: 2, name: 'Visual interference' });
    fireEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    await waitFor(() => {
      expect(screen.getByRole('slider')).toBeDefined();
    });
    await expectNoViolations(container);
  });
});
