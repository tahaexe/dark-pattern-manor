import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { PATTERNS, isPattern } from './patterns';
import { RELATIVE_PAIRS, areRelatives, relativesOf } from './relatives';

describe('patterns vocabulary', () => {
  it('holds exactly the 18 named pattern types', () => {
    expect(PATTERNS).toHaveLength(18);
  });

  it('includes the 12 room patterns', () => {
    const room = [
      'Visual interference',
      'Trick wording',
      'Confirmshaming',
      'Hidden subscription',
      'Fake urgency',
      'Fake scarcity',
      'Fake social proof',
      'Sneaking',
      'Hidden costs',
      'Nagging',
      'Preselection',
      'Hard to cancel',
    ];
    for (const p of room) expect(PATTERNS).toContain(p);
  });

  it('includes the 6 wandering patterns', () => {
    const wandering = [
      'Disguised ads',
      'Forced action',
      'Obstruction',
      'Comparison prevention',
      'Addictive design',
      'Currency confusion',
    ];
    for (const p of wandering) expect(PATTERNS).toContain(p);
  });

  it('has no duplicate pattern names', () => {
    expect(new Set(PATTERNS).size).toBe(PATTERNS.length);
  });

  it('isPattern accepts named types and rejects others', () => {
    expect(isPattern('Visual interference')).toBe(true);
    expect(isPattern('Not a pattern')).toBe(false);
  });
});

describe('relatives table', () => {
  it('has exactly the 15 declared pairs', () => {
    expect(RELATIVE_PAIRS).toHaveLength(15);
  });

  it('every listed pair is a relative in both directions', () => {
    for (const [a, b] of RELATIVE_PAIRS) {
      expect(areRelatives(a, b)).toBe(true);
      expect(areRelatives(b, a)).toBe(true);
    }
  });

  it('an unlisted pair is not a relative', () => {
    // 'Visual interference' and 'Confirmshaming' are not a declared pair.
    expect(areRelatives('Visual interference', 'Confirmshaming')).toBe(false);
  });

  it('relativesOf returns every declared relative of a pattern', () => {
    const rels = relativesOf('Hidden costs');
    expect(rels).toContain('Hidden subscription');
    expect(rels).toContain('Sneaking');
    expect(rels).toContain('Comparison prevention');
    expect(rels).toContain('Currency confusion');
  });

  it('areRelatives is symmetric for all pattern-name pairs (fast-check)', () => {
    const pattern = fc.constantFrom(...PATTERNS);
    fc.assert(
      fc.property(pattern, pattern, (a, b) => {
        expect(areRelatives(a, b)).toBe(areRelatives(b, a));
      }),
    );
  });
});
