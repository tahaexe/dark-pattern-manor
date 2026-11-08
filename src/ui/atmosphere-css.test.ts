import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// The atmosphere stylesheet, read as text (the same way the room tests read
// their room.css). These assertions pin the compositor-cost rules that jsdom
// cannot run but can read: the glow breath and the fog drift carry a steps(...)
// timing so headless Chrome's software compositor updates them at most a couple
// of dozen times a second (the breath only ~12/s now, a slow breath); the fog
// layer is no wider than the scene plus its drift; the tab-hidden state pauses
// both; and the two big layers are promoted (`will-change`) ONLY while they
// move, so an idle/still room does not keep a large promoted layer.
const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, '../styles/atmosphere.css'), 'utf8');

/** The body of the first rule whose selector matches `selectorRe`. */
function ruleBody(selectorRe: RegExp): string | null {
  const re = new RegExp(selectorRe.source + '\\s*\\{([^}]*)\\}');
  const m = css.match(re);
  return m ? m[1] : null;
}

describe('atmosphere.css — the glow breath is stepped (~12 compositor updates/s)', () => {
  it('uses a steps() timing on the breath animation', () => {
    const body = ruleBody(/\.atmosphere-glow/);
    expect(body).not.toBeNull();
    // The breath animation names atmosphere-breath with a steps(...) timing.
    expect(body!).toMatch(/animation:[^;]*atmosphere-breath/);
    const steps = body!.match(/steps\(\s*(\d+)/);
    expect(steps).not.toBeNull();
    // 500 ms per half-cycle: at most 6 steps keeps opacity changes to ~12/s (a
    // slow breath), comfortably under the 24/s ceiling.
    const n = Number(steps![1]);
    expect(n).toBeGreaterThan(0);
    // 6 steps / 0.5 s = 12 updates per second.
    expect(n).toBeLessThanOrEqual(6);
  });

  it('keeps the 500 ms period so the breath is slow (<= 2 Hz)', () => {
    const body = ruleBody(/\.atmosphere-glow/);
    expect(body!).toMatch(/animation:[^;]*\b500ms\b/);
  });

  it('does not promote the glow with a will-change declaration in its base rule', () => {
    // The base rule must NOT carry a will-change declaration; promotion is gated
    // on data-moving so an idle/still room keeps no promoted layer.
    const body = ruleBody(/\.atmosphere-glow/);
    expect(body!).not.toMatch(/will-change\s*:/);
  });
});

describe('atmosphere.css — the fog drift is stepped and the layer is small', () => {
  it('uses a steps() timing on the fog drift', () => {
    const body = ruleBody(/\.atmosphere-fog/);
    expect(body).not.toBeNull();
    expect(body!).toMatch(/animation:[^;]*atmosphere-fog-drift/);
    expect(body!).toMatch(/steps\(\s*\d+/);
  });

  it('the fog layer is no wider than the scene plus its drift (not 200%)', () => {
    const body = ruleBody(/\.atmosphere-fog/);
    const width = body!.match(/width:\s*(\d+)%/);
    expect(width).not.toBeNull();
    const w = Number(width![1]);
    // The old layer was 200% wide; the new one only needs the scene plus a
    // little margin for its small drift. Keep it well under 1.5x the scene.
    expect(w).toBeGreaterThanOrEqual(100);
    expect(w).toBeLessThanOrEqual(130);
    // The old 200% / -50% pair is gone.
    expect(css).not.toMatch(/\.atmosphere-fog\s*\{[^}]*width:\s*200%/);
  });

  it('the fog drift transform stays within the layer margin', () => {
    const drift = css.match(/@keyframes atmosphere-fog-drift\s*\{([\s\S]*?)\}\s*\}/);
    // The drift is a translateX in percent; it must be small (a few percent).
    const translate = css.match(/@keyframes atmosphere-fog-drift[\s\S]*?translateX\((-?\d+)%\)/);
    expect(drift || translate).not.toBeNull();
    if (translate) {
      expect(Math.abs(Number(translate![1]))).toBeLessThanOrEqual(10);
    }
  });

  it('does not promote the fog with a will-change declaration in its base rule', () => {
    const body = ruleBody(/\.atmosphere-fog/);
    expect(body!).not.toMatch(/will-change\s*:/);
  });
});

describe('atmosphere.css — layers are promoted only while moving', () => {
  it('data-moving adds will-change to the glow and the fog', () => {
    // The glow gets will-change: opacity only under data-moving.
    expect(css).toMatch(
      /\.atmosphere\[data-moving='true'\]\s*\.atmosphere-glow\s*\{[^}]*will-change:\s*opacity/,
    );
    // The fog gets will-change: transform only under data-moving.
    expect(css).toMatch(
      /\.atmosphere\[data-moving='true'\]\s*\.atmosphere-fog\s*\{[^}]*will-change:\s*transform/,
    );
  });

  it('every will-change declaration is scoped to the data-moving rules', () => {
    // Count will-change DECLARATIONS (the colon form), not prose mentions, so
    // no idle/still/honest/hidden layer stays promoted.
    const declarations = css.match(/will-change\s*:/g) ?? [];
    const scoped = css.match(/\.atmosphere\[data-moving='true'\][^}]*will-change\s*:/g) ?? [];
    expect(declarations.length).toBe(scoped.length);
    expect(declarations.length).toBe(2);
  });
});

describe('atmosphere.css — hidden tab pauses the glow and fog', () => {
  it('data-hidden pauses both CSS layers', () => {
    // One rule names data-hidden and pauses the animation for the glow/fog.
    const m = css.match(
      /\.atmosphere\[data-hidden='true'\][\s\S]*?\{([^}]*animation-play-state:\s*paused[^}]*)\}/,
    );
    expect(m).not.toBeNull();
    // The selector reaches the glow and the fog.
    const sel = css.match(/([^}]*)\{[^}]*animation-play-state:\s*paused/);
    expect(sel).not.toBeNull();
    expect(sel![1]).toMatch(/\.atmosphere\[data-hidden='true'\]\s*\.atmosphere-glow/);
    expect(sel![1]).toMatch(/\.atmosphere\[data-hidden='true'\]\s*\.atmosphere-fog/);
  });
});
