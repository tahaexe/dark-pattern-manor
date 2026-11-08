import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadProgress,
  completeRoom,
  doneCount,
  areTipsSkipped,
  skipTips,
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

  describe('the first-minute tips flag', () => {
    it('is not skipped by default', () => {
      expect(areTipsSkipped()).toBe(false);
      expect(loadProgress().tipsSkipped).toBe(false);
    });

    it('turns on after skipTips and survives a reload', () => {
      skipTips();
      expect(areTipsSkipped()).toBe(true);
      // A fresh read (reload) still sees it.
      expect(loadProgress().tipsSkipped).toBe(true);
    });

    it('is monotonic and does not disturb completed/unlocked', () => {
      completeRoom('gravemoor-gazette', 'inkbone-books');
      skipTips();
      skipTips();
      const p = loadProgress();
      expect(p.tipsSkipped).toBe(true);
      expect(p.completed).toEqual(['gravemoor-gazette']);
      expect(p.unlocked).toEqual(['inkbone-books']);
      // Completing another room leaves the flag on.
      completeRoom('inkbone-books', 'grimsupper');
      expect(areTipsSkipped()).toBe(true);
    });

    it('works when localStorage is unavailable (in-memory fallback)', () => {
      const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        get() {
          throw new Error('localStorage blocked');
        },
      });
      try {
        __resetForTests();
        expect(areTipsSkipped()).toBe(false);
        expect(() => skipTips()).not.toThrow();
        expect(areTipsSkipped()).toBe(true);
      } finally {
        if (original) {
          Object.defineProperty(globalThis, 'localStorage', original);
        }
        __resetForTests();
      }
    });
  });
});
