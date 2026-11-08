import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  ADAPTIVE_FPS_FLOOR,
  ADAPTIVE_MEDIAN_FRAME_MS,
  adaptiveStillEngages,
  averageFps,
  BREATH_MAX,
  BREATH_MIN,
  FRAME_MS,
  MAX_FPS,
  MAX_MOTES,
  MIN_MOTES,
  MOTES_DPR,
  breath,
  buildFog,
  buildMotes,
  exhaleProgress,
  fogBands,
  meanLateness,
  median,
  moteCount,
  moteGlow,
  shouldDraw,
  stillPose,
  type AdaptiveSample,
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

describe('shouldDraw — the 24 fps cap (P1)', () => {
  it('the cap is 24 fps', () => {
    expect(MAX_FPS).toBe(24);
    expect(FRAME_MS).toBeCloseTo(1000 / 24, 6);
  });

  it('does not draw just before a frame interval has passed', () => {
    expect(shouldDraw(FRAME_MS - 0.01, 0)).toBe(false);
  });

  it('draws at exactly one frame interval and beyond', () => {
    expect(shouldDraw(FRAME_MS, 0)).toBe(true);
    expect(shouldDraw(FRAME_MS * 2, 0)).toBe(true);
  });

  it('never allows a rate above 24 fps for any clock', () => {
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
      fc.property(fc.integer({ min: 0, max: 8000 }), fc.integer({ min: 0, max: 8000 }), (w, h) => {
        const n = moteCount(w, h);
        expect(n).toBeGreaterThanOrEqual(MIN_MOTES);
        expect(n).toBeLessThanOrEqual(MAX_MOTES);
      }),
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

describe('MOTES_DPR — the motes canvas is drawn at device-pixel-ratio 1 (P2)', () => {
  it('is exactly 1', () => {
    expect(MOTES_DPR).toBe(1);
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

describe('stillPose — the still-vs-animate decision (P4)', () => {
  it('animates only when nothing asks for stillness', () => {
    expect(stillPose({})).toBe('animate');
    expect(stillPose({ reducedMotion: false, honest: false, adaptiveStill: false })).toBe(
      'animate',
    );
  });

  it('is still under reduced motion', () => {
    expect(stillPose({ reducedMotion: true })).toBe('still');
  });

  it('is still once the room is honest', () => {
    expect(stillPose({ honest: true })).toBe('still');
  });

  it('is still once adaptive still has engaged', () => {
    expect(stillPose({ adaptiveStill: true })).toBe('still');
  });

  it('property: still exactly when any flag is set', () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), fc.boolean(), (rm, honest, adaptive) => {
        const want = rm || honest || adaptive ? 'still' : 'animate';
        expect(stillPose({ reducedMotion: rm, honest, adaptiveStill: adaptive })).toBe(want);
      }),
    );
  });
});

describe('averageFps — frames over a window', () => {
  it('is frames * 1000 / elapsed', () => {
    expect(averageFps(48, 2000)).toBeCloseTo(24, 6);
    expect(averageFps(20, 2000)).toBeCloseTo(10, 6);
    expect(averageFps(60, 1000)).toBeCloseTo(60, 6);
  });

  it('is 0 for a non-positive window or bad input', () => {
    expect(averageFps(10, 0)).toBe(0);
    expect(averageFps(10, -5)).toBe(0);
    expect(averageFps(-1, 1000)).toBe(0);
  });
});

describe('median — the middle value', () => {
  it('is 0 for an empty list', () => {
    expect(median([])).toBe(0);
  });

  it('is the middle of an odd-length sorted list', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([9])).toBe(9);
  });

  it('is the mean of the two middles of an even-length list', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('ignores non-finite values', () => {
    expect(median([Number.NaN, 1, 3])).toBe(2);
  });
});

describe('meanLateness — how far ticks overshoot the expected interval', () => {
  it('is ~0 for ticks that arrive on time', () => {
    // A healthy loop wakes every ~interval, so lateness is ~0.
    expect(meanLateness([42, 42, 42, 42], FRAME_MS)).toBeLessThan(1);
  });

  it('never counts an early or on-time tick as negative', () => {
    // Gaps shorter than the interval contribute 0, not a negative.
    expect(meanLateness([10, 10, 10], FRAME_MS)).toBe(0);
  });

  it('climbs with late ticks', () => {
    // A congested loop wakes far late: each gap overshoots the interval.
    const late = meanLateness([120, 130, 140], FRAME_MS);
    expect(late).toBeGreaterThan(FRAME_MS); // well over half the interval
  });

  it('is 0 for an empty list', () => {
    expect(meanLateness([], FRAME_MS)).toBe(0);
  });
});

describe('adaptiveStillEngages — measured on the timer ticks, not the capped count (P5)', () => {
  it('the floor is a measured-on-ticks 12 fps, well under the 24 cap', () => {
    expect(ADAPTIVE_FPS_FLOOR).toBe(12);
    expect(ADAPTIVE_MEDIAN_FRAME_MS).toBe(50);
  });

  it('a fast desktop at the cap does NOT engage (the cap must not trip it)', () => {
    // The capped loop wakes every ~FRAME_MS and paints in well under a ms, so
    // ~47 ticks over 2 s (~23.5 fps measured on ticks). None of the three
    // conditions fire: on-time wakes, sub-ms frames, well above the 12 fps floor.
    const gaps = Array.from({ length: 46 }, () => FRAME_MS + 0.3);
    const frameDurations = Array.from({ length: 47 }, () => 0.4);
    const sample: AdaptiveSample = { gaps, frameDurations, ticks: 47, elapsedMs: 2000 };
    expect(adaptiveStillEngages(sample)).toBe(false);
  });

  it('a jittery-but-fine desktop (one slow first frame) does NOT engage', () => {
    // A single slow frame on page load must not trip it — the bug this fixes.
    const gaps = Array.from({ length: 46 }, () => FRAME_MS + 0.3);
    const frameDurations = [120, ...Array.from({ length: 46 }, () => 0.4)];
    const sample: AdaptiveSample = { gaps, frameDurations, ticks: 47, elapsedMs: 2000 };
    expect(adaptiveStillEngages(sample)).toBe(false);
  });

  it('engages when wakes arrive late by more than half the interval', () => {
    // A throttled event loop: every wake overshoots the interval by ~60 ms,
    // well over half of ~41.7 ms.
    const gaps = Array.from({ length: 18 }, () => FRAME_MS + 60);
    const frameDurations = Array.from({ length: 18 }, () => 2);
    const sample: AdaptiveSample = { gaps, frameDurations, ticks: 18, elapsedMs: 2000 };
    expect(adaptiveStillEngages(sample)).toBe(true);
  });

  it('engages when the median frame takes longer than 50 ms', () => {
    // 4x CPU: frames are slow even if wakes are roughly on time.
    const gaps = Array.from({ length: 20 }, () => FRAME_MS + 5);
    const frameDurations = Array.from({ length: 20 }, () => 70);
    const sample: AdaptiveSample = { gaps, frameDurations, ticks: 20, elapsedMs: 2000 };
    expect(adaptiveStillEngages(sample)).toBe(true);
  });

  it('engages when the measured tick rate falls below 12 fps', () => {
    // Only ~10 ticks over 2 s = 5 fps measured on the timer's own ticks.
    const gaps = Array.from({ length: 9 }, () => 200);
    const frameDurations = Array.from({ length: 10 }, () => 3);
    const sample: AdaptiveSample = { gaps, frameDurations, ticks: 10, elapsedMs: 2000 };
    expect(adaptiveStillEngages(sample)).toBe(true);
  });

  it('does not engage on an empty sample (no evidence of a slow device)', () => {
    expect(adaptiveStillEngages({ gaps: [], frameDurations: [], ticks: 0, elapsedMs: 0 })).toBe(
      false,
    );
  });

  it('honours custom thresholds', () => {
    // A healthy tick rate (~45 ticks over 2 s) so the fps floor stays clear;
    // wakes 10 ms late (< ~20.8 half-interval) and 30 ms frames (< 50 ms).
    const sample: AdaptiveSample = {
      gaps: Array.from({ length: 44 }, () => FRAME_MS + 10),
      frameDurations: Array.from({ length: 45 }, () => 30),
      ticks: 45,
      elapsedMs: 2000,
    };
    // Default thresholds: nothing crosses, so it does not engage.
    expect(adaptiveStillEngages(sample)).toBe(false);
    // A stricter median-frame threshold trips it.
    expect(adaptiveStillEngages(sample, { medianFrameMs: 20 })).toBe(true);
    // A stricter lateness factor trips it (10 ms > 0.2 * ~41.7 = ~8.3).
    expect(adaptiveStillEngages(sample, { lateFactor: 0.2 })).toBe(true);
  });

  it('property: a desktop-cadence sample never engages', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 2, noNaN: true }),
        fc.double({ min: 0, max: 1.5, noNaN: true }),
        (jitter, frameMs) => {
          // Desktop: wakes within ~2 ms of the interval, sub-ms frames,
          // a healthy ~47-tick / 2 s cadence.
          const gaps = Array.from({ length: 46 }, () => FRAME_MS + jitter);
          const frameDurations = Array.from({ length: 47 }, () => frameMs);
          const ok: AdaptiveSample = { gaps, frameDurations, ticks: 47, elapsedMs: 2000 };
          expect(adaptiveStillEngages(ok)).toBe(false);
        },
      ),
    );
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
