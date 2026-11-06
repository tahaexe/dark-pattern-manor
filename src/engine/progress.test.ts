import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadProgress,
  completeRoom,
  doneCount,
  __resetForTests,
} from './progress';

describe('progress store', () => {
  beforeEach(() => {
    __resetForTests();
  });

  it('starts empty', () => {
    const p = loadProgress();
    expect(p.completed).toEqual([]);
    expect(p.unlocked).toEqual([]);
    expect(doneCount()).toBe(0);
  });

  it('completing a room increases the done count and unlocks the next', () => {
    completeRoom('gravemoor-gazette', 'inkbone-books');
    expect(doneCount()).toBe(1);
    const p = loadProgress();
    expect(p.completed).toContain('gravemoor-gazette');
    expect(p.unlocked).toContain('inkbone-books');
  });

  it('repeated completion of the same room never decreases the count', () => {
    completeRoom('gravemoor-gazette', 'inkbone-books');
    completeRoom('gravemoor-gazette', 'inkbone-books');
    completeRoom('gravemoor-gazette');
    expect(doneCount()).toBe(1);
  });

  it('completing more rooms only grows the count (monotonic)', () => {
    completeRoom('gravemoor-gazette', 'inkbone-books');
    const after1 = doneCount();
    completeRoom('inkbone-books', 'grimsupper');
    const after2 = doneCount();
    expect(after2).toBeGreaterThanOrEqual(after1);
    expect(after2).toBe(2);
  });

  it('persists across loads via localStorage', () => {
    completeRoom('gravemoor-gazette', 'inkbone-books');
    // A fresh read sees the persisted state.
    expect(loadProgress().completed).toContain('gravemoor-gazette');
  });

  it('works when localStorage is unavailable (in-memory fallback)', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    // Make localStorage access throw.
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('localStorage blocked');
      },
    });
    try {
      __resetForTests();
      expect(() => completeRoom('gravemoor-gazette', 'inkbone-books')).not.toThrow();
      expect(doneCount()).toBe(1);
      expect(loadProgress().unlocked).toContain('inkbone-books');
    } finally {
      if (original) {
        Object.defineProperty(globalThis, 'localStorage', original);
      }
      __resetForTests();
    }
  });
});
