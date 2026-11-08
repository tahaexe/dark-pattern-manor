import { describe, it, expect } from 'vitest';
import { HOW_TO_PLAY, TITLE_STEPS, assertLoopTextAligned } from './howToPlay';

describe('howToPlay — one loop story', () => {
  it('both arrays carry the same three titles, in the same order', () => {
    expect(HOW_TO_PLAY.map((s) => s.title)).toEqual(TITLE_STEPS.map((s) => s.title));
    expect(HOW_TO_PLAY.map((s) => s.title)).toEqual([
      'Spot the trick',
      'Name it',
      'Set the page free',
    ]);
  });

  it('step 1 describes the lantern as the hint with the agreed wording', () => {
    expect(HOW_TO_PLAY[0].body).toContain('Stuck? The lantern lights the trick.');
  });

  it('the title lines are the terse one-liners under each step', () => {
    // Each line binds its last word with a non-breaking space so a wrapped line
    // never strands that word alone on a second line.
    expect(TITLE_STEPS.map((s) => s.line)).toEqual([
      'One part of the page is haunted. Tap\u00A0it.',
      'Pick the card that names the\u00A0trick.',
      'See the honest page and finish your\u00A0task.',
    ]);
  });

  it('every title line ends with a non-breaking space before its last word (no widow)', () => {
    for (const step of TITLE_STEPS) {
      // There is a non-breaking space, and no plain space after the last one,
      // so the final word can never wrap by itself.
      const lastNbsp = step.line.lastIndexOf('\u00A0');
      expect(lastNbsp).toBeGreaterThan(-1);
      expect(step.line.slice(lastNbsp + 1)).not.toContain(' ');
    }
  });

  it('the alignment guard passes for the shipped arrays', () => {
    expect(() => assertLoopTextAligned()).not.toThrow();
  });
});
