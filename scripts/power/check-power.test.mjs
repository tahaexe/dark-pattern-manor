// Tests for check-power. Pure logic only — no filesystem, no spawn — mirroring
// how the check-agents suite keeps the live round-trip out of CI. The real
// power on disk is checked by `npm run check:power`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseFrontmatter,
  checkManifest,
  checkSkill,
  extractUrls,
  checkUrls,
  findForbiddenWord,
  CHECKED_SOURCES,
} from './check-power.mjs';

/** A well-formed manifest; overrides mutate one field. */
function manifest(overrides = {}) {
  return {
    name: 'honest-ui',
    version: '1.0.0',
    description: 'Review your own interface for dark patterns.',
    author: { name: 'Dark Pattern Manor' },
    keywords: ['dark pattern', 'consent'],
    license: 'MIT',
    repository: 'https://github.com/tahaexe/dark-pattern-manor',
    ...overrides,
  };
}

/** A well-formed SKILL.md text for a given folder name. */
function skillFile(name = 'honest-twin', description = 'Rewrite a flagged screen. Use after a review.') {
  return `---\nname: ${name}\ndescription: ${description}\n---\n# ${name}\n\nbody\n`;
}

// --- parseFrontmatter -----------------------------------------------------

test('parseFrontmatter reads name and description', () => {
  const fm = parseFrontmatter(skillFile('honest-twin', 'does a thing'));
  assert.equal(fm.name, 'honest-twin');
  assert.equal(fm.description, 'does a thing');
});

test('parseFrontmatter returns null without a closed fence', () => {
  assert.equal(parseFrontmatter('# no frontmatter\n\nbody\n'), null);
  assert.equal(parseFrontmatter('---\nname: x\n\nno close\n'), null);
});

test('parseFrontmatter tolerates CRLF line endings', () => {
  const fm = parseFrontmatter('---\r\nname: honest-twin\r\ndescription: y\r\n---\r\nbody\r\n');
  assert.equal(fm.name, 'honest-twin');
  assert.equal(fm.description, 'y');
});

// --- checkManifest --------------------------------------------------------

test('a well-formed manifest passes', () => {
  assert.deepEqual(checkManifest(manifest()), []);
});

test('a non-kebab-case name fails', () => {
  const problems = checkManifest(manifest({ name: 'Honest_UI' }));
  assert.ok(problems.some((p) => /kebab-case/.test(p)));
});

test('a missing author fails', () => {
  const problems = checkManifest(manifest({ author: undefined }));
  assert.ok(problems.some((p) => /author/.test(p)));
});

test('an author without a name fails', () => {
  const problems = checkManifest(manifest({ author: {} }));
  assert.ok(problems.some((p) => /author\.name/.test(p)));
});

test('missing keywords fails', () => {
  const problems = checkManifest(manifest({ keywords: [] }));
  assert.ok(problems.some((p) => /keywords/.test(p)));
});

test('a missing repository fails', () => {
  const problems = checkManifest(manifest({ repository: '' }));
  assert.ok(problems.some((p) => /repository/.test(p)));
});

// --- checkSkill -----------------------------------------------------------

test('a well-formed skill passes', () => {
  assert.deepEqual(checkSkill('honest-twin', skillFile('honest-twin')), []);
});

test('a skill whose name does not match its folder fails', () => {
  const problems = checkSkill('honest-twin', skillFile('something-else'));
  assert.ok(problems.some((p) => /does not match folder/.test(p)));
});

test('a skill with an empty description fails', () => {
  const problems = checkSkill('honest-twin', skillFile('honest-twin', ''));
  assert.ok(problems.some((p) => /description/.test(p)));
});

test('a skill with no frontmatter fails', () => {
  const problems = checkSkill('honest-twin', '# honest-twin\n\nbody\n');
  assert.ok(problems.some((p) => /frontmatter/.test(p)));
});

// --- extractUrls / checkUrls ---------------------------------------------

test('extractUrls strips trailing punctuation and quotes', () => {
  const urls = extractUrls("see url: 'https://example.com/a'), and (https://example.com/b).");
  assert.deepEqual(urls, ['https://example.com/a', 'https://example.com/b']);
});

test('a room URL and a checked source both pass', () => {
  const roomUrls = ['https://example.com/room-source'];
  const text = `US ${roomUrls[0]}\nEU ${CHECKED_SOURCES[0]}\n`;
  assert.deepEqual(checkUrls(text, roomUrls, CHECKED_SOURCES), []);
});

test('a URL that is neither a room URL nor a checked source fails', () => {
  const problems = checkUrls('see https://example.com/not-sourced here', [], CHECKED_SOURCES);
  assert.ok(problems.some((p) => /not-sourced/.test(p)));
});

test('every checked source is accepted on its own', () => {
  for (const src of CHECKED_SOURCES) {
    assert.deepEqual(checkUrls(`x ${src} y`, [], CHECKED_SOURCES), []);
  }
});

// --- findForbiddenWord ----------------------------------------------------

test('findForbiddenWord finds illegal and unlawful', () => {
  assert.equal(findForbiddenWord('this is Illegal here'), 'illegal');
  assert.equal(findForbiddenWord('an unlawful act'), 'unlawful');
});

test('findForbiddenWord returns null on clean text', () => {
  assert.equal(findForbiddenWord('may be a dark pattern; check'), null);
});

test('findForbiddenWord matches whole words only, not substrings', () => {
  // "illegality" extends past "illegal" with no word boundary, so it must not match.
  assert.equal(findForbiddenWord('the word illegality on its own'), null);
});
