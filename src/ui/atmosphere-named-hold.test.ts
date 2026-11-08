import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// The shared common-moment stylesheet, read as text (the same way the room
// tests read their room.css).
const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, '../styles/atmosphere.css'), 'utf8');

describe('atmosphere.css — the shared named hold freezes the possessed element', () => {
  it('stops the possessed element\u2019s own transitions and animations during data-moment=right', () => {
    // One shared rule covers the ten rooms whose possessed element carries a
    // hover transition (e.g. `transition: background`), which the walk\u2019s
    // named-hold check caught running mid-way when the hold\u2019s timing lined up
    // with an in-flight hover. The rule targets `.possessed` so every room is
    // covered without a per-room fix.
    const rule = css.match(/\.room-scene\[data-moment='right'\]\s*\.possessed\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    const body = rule![1];
    expect(body).toMatch(/transition:\s*none/);
    expect(body).toMatch(/animation:\s*none/);
  });

  it('does not touch the shared flee on .ghost-wrap (that owns the exit)', () => {
    // The flee lives on .ghost-wrap; the named-hold freeze must not name it.
    expect(css).not.toMatch(
      /\.room-scene\[data-moment='right'\]\s*\.possessed\s*\{[^}]*\}\s*[\s\S]*\.ghost-wrap[^{]*transition:\s*none/,
    );
    // The shared unwind/flee declarations on .ghost-wrap are still present.
    expect(css).toMatch(/\.room-scene\[data-fleeing='true'\]\s*\.ghost-wrap/);
  });

  it('only freezes during the right moment, no other moment', () => {
    // The freeze selector names data-moment='right' and no other moment.
    expect(css).not.toMatch(/\.room-scene\[data-moment='haunted'\]\s*\.possessed/);
    expect(css).not.toMatch(/\.room-scene\[data-moment='inspecting'\]\s*\.possessed/);
    expect(css).not.toMatch(/\.room-scene\[data-moment='honest'\]\s*\.possessed/);
    expect(css).not.toMatch(/\.room-scene\[data-moment='done'\]\s*\.possessed/);
  });
});
