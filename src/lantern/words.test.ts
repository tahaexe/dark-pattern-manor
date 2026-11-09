import { describe, it, expect } from 'vitest';
import * as words from './words';
import { chip, warningText, ZERO_TEXT, FORBIDDEN_VERDICT_WORDS } from './words';

describe('the lantern words (hints, not verdicts)', () => {
  it('builds the warning text with the right count and noun', () => {
    expect(warningText(1)).toBe(
      'The Ghost Lantern found 1 possible trick on this page. ' +
        'These are hints, not proof: the lantern reads only what is on the screen ' +
        'and it can be wrong. Look for yourself before you decide.',
    );
    expect(warningText(2)).toBe(
      'The Ghost Lantern found 2 possible tricks on this page. ' +
        'These are hints, not proof: the lantern reads only what is on the screen ' +
        'and it can be wrong. Look for yourself before you decide.',
    );
    expect(warningText(5)).toContain('5 possible tricks');
  });

  it('has the exact zero-count text', () => {
    expect(ZERO_TEXT).toBe(
      'The Ghost Lantern found no clear signs here. That does not mean the page ' +
        'is honest: some tricks only show in a flow, like a cancel path or a basket ' +
        'that changes.',
    );
  });

  it('writes each chip as "Possible: <pattern>"', () => {
    expect(chip('Fake urgency')).toBe('Possible: Fake urgency');
    expect(chip('Preselection')).toBe('Possible: Preselection');
  });

  it('contains no verdict word anywhere in the player-facing strings', () => {
    // Scan every exported value EXCEPT the guard list itself (which, by
    // definition, holds the forbidden words).
    const facing = Object.entries(words)
      .filter(([key]) => key !== 'FORBIDDEN_VERDICT_WORDS')
      .map(([, value]) => {
        if (typeof value === 'function') {
          // Exercise the string builders with a sample count/pattern.
          try {
            return (
              String((value as (x: unknown) => unknown)(1)) +
              ' ' +
              String((value as (x: unknown) => unknown)('X'))
            );
          } catch {
            return '';
          }
        }
        return JSON.stringify(value);
      })
      .join(' ')
      .toLowerCase();

    for (const bad of FORBIDDEN_VERDICT_WORDS) {
      expect(facing).not.toContain(bad);
    }
  });
});
