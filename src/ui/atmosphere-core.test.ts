import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  BREATH_MAX,
  BREATH_MIN,
  FRAME_MS,
  MAX_DPR,
  MAX_MOTES,
  MIN_MOTES,
  backingScale,
  breath,
  buildFog,
  buildMotes,
  exhaleProgress,
  fogBands,
  moteCount,
  moteGlow,
  renderPlan,
  shouldDraw,
} from './atmosphere-core';

/** A small deterministic rng for the field builders. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('shouldDraw — the 30 fps cap (P1)', () => {
  it('does not draw just before a frame interval has passed', () => {
    expect(shouldDraw(FRAME_MS - 0.01, 0)).toBe(false);
  });

  it('draws at exactly one frame interval and beyond', () => {
    expect(shouldDraw(FRAME_MS, 0)).toBe(true);
    expect(shouldDraw(FRAME_MS * 2, 0)).toBe(true);
  });

  it('never allows a rate above 30 fps for any clock', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 100000, noNaN: true }), (last) => {
        // A paint at `last + d` with d < FRAME_MS must be refused.
        const justUnder = last + FRAME_MS - 0.001;
        expect(shouldDraw(justUnder, last)).toBe(false);
      }),
    );
  });
});

describe('moteCount and fogBands — bounds (P2)', () => {
  it('mote count is always within [30, 60] over a grid of sizes', () => {
    for (const w of [320, 412, 768, 1024, 1280, 1920, 2560]) {
      for (const h of [480, 720, 900, 1080, 1440]) {
        const n = moteCount(w, h);
        expect(n).toBeGreaterThanOrEqual(MIN_MOTES);
        expect(n).toBeLessThanOrEqual(MAX_MOTES);
      }
    }
  });

  it('property: mote count stays within [30, 60] for any viewport', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 8000 }),
        fc.integer({ min: 0, max: 8000 }),
        (w, h) => {
          const n = moteCount(w, h);
          expect(n).toBeGreaterThanOrEqual(MIN_MOTES);
          expect(n).toBeLessThanOrEqual(MAX_MOTES);
        },
      ),
    );
  });

  it('a large viewport reaches more motes than a small one', () => {
    expect(moteCount(1920, 1080)).toBeGreaterThan(moteCount(360, 640));
  });

  it('fog bands is 2 or 3, 3 only on a roomy scene', () => {
    expect(fogBands(1280, 720)).toBe(3);
    expect(fogBands(360, 640)).toBe(2);
    expect(fogBands(1280, 400)).toBe(2);
    for (const w of [320, 700, 1280, 1920]) {
      for (const h of [400, 500, 900]) {
        expect([2, 3]).toContain(fogBands(w, h));
      }
    }
  });
});

describe('backingScale — device pixel ratio capped at 2 (P2)', () => {
  it('is min(max(1, dpr), 2)', () => {
    expect(backingScale(1)).toBe(1);
    expect(backingScale(1.5)).toBe(1.5);
    expect(backingScale(2)).toBe(2);
    expect(backingScale(3)).toBe(MAX_DPR);
    expect(backingScale(0.5)).toBe(1);
    expect(backingScale(0)).toBe(1);
    expect(backingScale(Number.NaN)).toBe(1);
  });
});

describe('breath — the ≤2 Hz glow between 0.85 and 1 (P3)', () => {
  it('stays within [0.85, 1] over a one-second sweep', () => {
    for (let t = 0; t <= 2000; t += 7) {
      const v = breath(t);
      expect(v).toBeGreaterThanOrEqual(BREATH_MIN - 1e-9);
      expect(v).toBeLessThanOrEqual(BREATH_MAX + 1e-9);
    }
  });

  it('peaks at t=0 and returns to peak after a full period (0.5 s)', () => {
    expect(breath(0)).toBeCloseTo(BREATH_MAX, 6);
    expect(breath(500)).toBeCloseTo(BREATH_MAX, 6); // 2 Hz → period 0.5 s
    // A quarter period reaches the midpoint 0.925.
    expect(breath(125)).toBeCloseTo(0.925, 3);
  });
});

describe('renderPlan — the reduced-motion still-frame decision (P4)', () => {
  it('draws once under reduced motion and animates otherwise', () => {
    expect(renderPlan(true)).toBe('draw-once');
    expect(renderPlan(false)).toBe('animate');
  });
});

describe('exhaleProgress — eased and clamped', () => {
  it('is 0 at the start, rises, and clamps to 1 after a second', () => {
    expect(exhaleProgress(0)).toBe(0);
    expect(exhaleProgress(-50)).toBe(0);
    expect(exhaleProgress(500)).toBeGreaterThan(0);
    expect(exhaleProgress(500)).toBeLessThan(1);
    expect(exhaleProgress(1000)).toBe(1);
    expect(exhaleProgress(5000)).toBe(1);
  });

  it('is monotonic over the exhale', () => {
    let prev = -1;
    for (let t = 0; t <= 1000; t += 50) {
      const p = exhaleProgress(t);
      expect(p).toBeGreaterThanOrEqual(prev);
      prev = p;
    }
  });
});

describe('moteGlow — brighter near the candlelight, calmer in the dark', () => {
  it('is 1 at the glow centre and eases to the floor at/beyond the edge', () => {
    // At the centre the multiplier is full brightness.
    expect(moteGlow(100, 100, 100, 100, 200)).toBeCloseTo(1, 6);
    // At the edge it reaches the floor (default 0.55).
    expect(moteGlow(300, 100, 100, 100, 200)).toBeCloseTo(0.55, 6);
    // Beyond the edge it never drops below the floor.
    expect(moteGlow(1000, 1000, 100, 100, 200)).toBeCloseTo(0.55, 6);
  });

  it('a mote nearer the centre is brighter than one farther out', () => {
    const near = moteGlow(140, 100, 100, 100, 300);
    const far = moteGlow(360, 100, 100, 100, 300);
    expect(near).toBeGreaterThan(far);
  });

  it('stays within [floor, 1] for any point and respects a custom floor', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -2000, max: 2000, noNaN: true }),
        fc.double({ min: -2000, max: 2000, noNaN: true }),
        (x, y) => {
          const v = moteGlow(x, y, 0, 0, 500, 0.4);
          expect(v).toBeGreaterThanOrEqual(0.4 - 1e-9);
          expect(v).toBeLessThanOrEqual(1 + 1e-9);
        },
      ),
    );
  });

  it('is a safe 1 when the radius is not positive', () => {
    expect(moteGlow(10, 10, 0, 0, 0)).toBe(1);
    expect(moteGlow(10, 10, 0, 0, -5)).toBe(1);
  });
});

describe('buildMotes / buildFog — field shape', () => {
  it('builds the requested number of motes within the viewport', () => {
    const rng = mulberry32(1);
    const motes = buildMotes(moteCount(1280, 720), 1280, 720, rng);
    expect(motes.length).toBe(moteCount(1280, 720));
    for (const m of motes) {
      expect(m.x).toBeGreaterThanOrEqual(0);
      expect(m.x).toBeLessThanOrEqual(1280);
      expect(m.y).toBeGreaterThanOrEqual(0);
      expect(m.y).toBeLessThanOrEqual(720);
      expect(m.a).toBeGreaterThan(0);
      expect(m.a).toBeLessThanOrEqual(1);
    }
  });

  it('motes are visible but calm: radius 1.0–3.2 px, alpha 0.28–0.72', () => {
    const rng = mulberry32(7);
    const motes = buildMotes(60, 1920, 1080, rng);
    for (const m of motes) {
      expect(m.r).toBeGreaterThanOrEqual(1.0 - 1e-9);
      expect(m.r).toBeLessThanOrEqual(3.2 + 1e-9);
      expect(m.a).toBeGreaterThanOrEqual(0.28 - 1e-9);
      expect(m.a).toBeLessThanOrEqual(0.72 + 1e-9);
    }
  });

  it('builds the requested number of fog bands', () => {
    const rng = mulberry32(2);
    const bands = buildFog(3, 1280, 720, rng);
    expect(bands.length).toBe(3);
    for (const b of bands) {
      // Readable fog on the dark room, yet never heavy: alpha 0.10–0.20.
      expect(b.a).toBeGreaterThanOrEqual(0.1 - 1e-9);
      expect(b.a).toBeLessThanOrEqual(0.2 + 1e-9);
    }
  });

  it('fog drifts slowly: speed magnitude 3–7 px/s, either direction', () => {
    const rng = mulberry32(3);
    const bands = buildFog(3, 1280, 720, rng);
    for (const b of bands) {
      const mag = Math.abs(b.speed);
      expect(mag).toBeGreaterThanOrEqual(3 - 1e-9);
      expect(mag).toBeLessThanOrEqual(7 + 1e-9);
    }
  });
});
