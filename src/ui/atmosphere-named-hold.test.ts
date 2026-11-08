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

  it('does not TARGET the shared flee on .ghost-wrap (that owns the exit)', () => {
    // The flee lives on .ghost-wrap; the named-hold freeze must not TARGET it.
    // `.ghost-wrap` may appear inside a :not(...) exclusion (the whole-frame
    // rule excludes it), which is the opposite of freezing it — so we guard
    // only against a rule whose key selector is `.ghost-wrap` itself being
    // given `transition: none` (a rule ending in `.ghost-wrap {`), not one that
    // merely contains `:not(.ghost-wrap)`.
    const freezesGhostWrap = /\.ghost-wrap\s*\{[^}]*transition:\s*none/.test(css);
    expect(freezesGhostWrap).toBe(false);
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

describe('atmosphere.css — the shared named hold stills the WHOLE haunted frame', () => {
  it('freezes every element in the live frame except .ghost-wrap and its children', () => {
    // The possessed-only rule missed controls that are not the possessed
    // element: room 6's `.cloak-size` size buttons carry `transition: all`, and
    // the walk caught one transitioning `background-color` mid-hold because a
    // size button is not the possessed element. One shared rule stills every
    // descendant of the live frame (`.manor-frame`, never a preview) except
    // `.ghost-wrap` and its descendants, which carry the shared unwind/flee.
    const rule = css.match(
      /\.room-scene\[data-moment='right'\]\s*\.manor-frame\s*\*:not\(\.ghost-wrap\):not\(\.ghost-wrap \*\)\s*\{([^}]*)\}/,
    );
    expect(rule).not.toBeNull();
    const body = rule![1];
    expect(body).toMatch(/transition:\s*none/);
    expect(body).toMatch(/animation:\s*none/);
  });

  it('excludes .ghost-wrap and its descendants so the shared flee keeps moving', () => {
    // The selector must carry both :not(.ghost-wrap) (the flee element) and
    // :not(.ghost-wrap *) (everything inside it, e.g. the .ghost and its act).
    const sel = css.match(
      /\.room-scene\[data-moment='right'\]\s*\.manor-frame\s*(\*:not\(\.ghost-wrap\):not\(\.ghost-wrap \*\))/,
    );
    expect(sel).not.toBeNull();
    // The shared flee declaration is untouched and still present.
    expect(css).toMatch(
      /\.room-scene\[data-fleeing='true'\]\s*\.ghost-wrap\s*\{[^}]*animation:[^}]*ghost-flee/,
    );
  });

  it('is scoped to the right moment only (not haunted/inspecting/honest/done)', () => {
    for (const moment of ['haunted', 'inspecting', 'honest', 'done']) {
      const re = new RegExp(
        `\\.room-scene\\[data-moment='${moment}'\\]\\s*\\.manor-frame\\s*\\*:not`,
      );
      expect(css).not.toMatch(re);
    }
  });
});
