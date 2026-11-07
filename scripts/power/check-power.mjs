// check-power — keeps the honest-ui Kiro power valid and honest.
//
// It checks that:
//   - power/honest-ui/plugin.json is valid JSON with name, version,
//     description, author.name, keywords, license and repository, and a
//     kebab-case name;
//   - every folder under power/honest-ui/skills/ has a SKILL.md whose
//     frontmatter name equals the folder and whose description is non-empty;
//   - every URL in the review skill's references/patterns.md either appears in
//     some room file under src/rooms/ or is one of the five checked sources for
//     the two planned rooms;
//   - no file under power/ contains the word "illegal" or "unlawful".
//
// Pure logic (parseFrontmatter, checkManifest, checkSkill, checkUrls,
// findForbiddenWord) is exported for the test suite. Only main() and the small
// gather helpers touch the filesystem. All paths derive from import.meta.url,
// so no machine path is ever written anywhere.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const POWER_DIR = resolve(REPO_ROOT, 'power', 'honest-ui');
const SKILLS_DIR = resolve(POWER_DIR, 'skills');
const MANIFEST = resolve(POWER_DIR, 'plugin.json');
const REFERENCES = resolve(SKILLS_DIR, 'dark-pattern-review', 'references', 'patterns.md');
const ROOMS_DIR = resolve(REPO_ROOT, 'src', 'rooms');
const POWER_ROOT = resolve(REPO_ROOT, 'power');

/**
 * The five checked sources for the two rooms still in planning (Disguised ads,
 * Forced action). A URL in references/patterns.md that is not in any room file
 * must be one of these.
 */
export const CHECKED_SOURCES = Object.freeze([
  'https://www.ftc.gov/system/files/documents/public_statements/896923/151222deceptiveenforcement.pdf',
  'https://eur-lex.europa.eu/eli/dir/2005/29/oj',
  'https://eur-lex.europa.eu/eli/reg/2022/2065/oj',
  'https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312/section-312.7',
  'https://eur-lex.europa.eu/eli/reg/2016/679/oj',
]);

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FORBIDDEN = ['illegal', 'unlawful'];

/**
 * Parse the small frontmatter shape used by SKILL.md: a leading `---` fence,
 * `key: value` scalar lines, a closing `---`. Returns { name, description } (and
 * any other scalar keys) or null when there is no closed frontmatter.
 * @param {string} text
 * @returns {{ [k: string]: string } | null}
 */
export function parseFrontmatter(text) {
  if (typeof text !== 'string') return null;
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) return null;
  const rest = normalized.slice(4);
  const end = rest.indexOf('\n---');
  if (end === -1) return null;
  const yaml = rest.slice(0, end);
  const out = {};
  for (const line of yaml.split('\n')) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const m = line.match(/^([A-Za-z0-9_]+):(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    out[m[1]] = value;
  }
  return out;
}

/**
 * Check the parsed manifest. Returns an array of problem strings (empty = ok).
 * @param {*} manifest
 * @returns {string[]}
 */
export function checkManifest(manifest) {
  const problems = [];
  if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return ['plugin.json is not a JSON object'];
  }

  if (typeof manifest.name !== 'string' || manifest.name.trim() === '') {
    problems.push('name is missing or empty');
  } else if (!KEBAB.test(manifest.name)) {
    problems.push(`name "${manifest.name}" is not kebab-case`);
  }

  if (typeof manifest.version !== 'string' || manifest.version.trim() === '') {
    problems.push('version is missing or empty');
  }
  if (typeof manifest.description !== 'string' || manifest.description.trim() === '') {
    problems.push('description is missing or empty');
  }

  const author = manifest.author;
  if (author === null || typeof author !== 'object' || Array.isArray(author)) {
    problems.push('author is missing or is not an object');
  } else if (typeof author.name !== 'string' || author.name.trim() === '') {
    problems.push('author.name is missing or empty');
  }

  if (!Array.isArray(manifest.keywords) || manifest.keywords.length === 0) {
    problems.push('keywords is missing or empty');
  } else if (!manifest.keywords.every((k) => typeof k === 'string' && k.trim() !== '')) {
    problems.push('keywords must all be non-empty strings');
  }

  if (typeof manifest.license !== 'string' || manifest.license.trim() === '') {
    problems.push('license is missing or empty');
  }
  if (typeof manifest.repository !== 'string' || manifest.repository.trim() === '') {
    problems.push('repository is missing or empty');
  }

  return problems;
}

/**
 * Check one skill's SKILL.md text against its folder name.
 * @param {string} folderName
 * @param {string} skillText
 * @returns {string[]}
 */
export function checkSkill(folderName, skillText) {
  const problems = [];
  const fm = parseFrontmatter(skillText);
  if (fm === null) {
    problems.push(`${folderName}/SKILL.md has no closed YAML frontmatter`);
    return problems;
  }
  if (fm.name !== folderName) {
    problems.push(
      `${folderName}/SKILL.md frontmatter name "${fm.name ?? ''}" does not match folder "${folderName}"`,
    );
  }
  if (typeof fm.description !== 'string' || fm.description.trim() === '') {
    problems.push(`${folderName}/SKILL.md has a missing or empty description`);
  }
  return problems;
}

/**
 * Extract every http(s) URL from a block of text, trimmed of trailing quotes,
 * commas, parentheses, semicolons and full stops.
 * @param {string} text
 * @returns {string[]}
 */
export function extractUrls(text) {
  if (typeof text !== 'string') return [];
  const found = text.match(/https?:\/\/[^\s)'"<>]+/g) || [];
  return found.map((u) => u.replace(/[.,;)'"]+$/, ''));
}

/**
 * Check every URL in the references text. A URL is allowed if it is in
 * `roomUrls` or in `checkedSources`.
 * @param {string} referencesText
 * @param {Iterable<string>} roomUrls
 * @param {Iterable<string>} checkedSources
 * @returns {string[]}
 */
export function checkUrls(referencesText, roomUrls, checkedSources) {
  const allowed = new Set([...roomUrls, ...checkedSources]);
  const problems = [];
  for (const url of new Set(extractUrls(referencesText))) {
    if (!allowed.has(url)) {
      problems.push(`URL not in any room or checked source: ${url}`);
    }
  }
  return problems;
}

/**
 * Return the first forbidden word ("illegal" / "unlawful") found in the text,
 * case-insensitive and whole-word, or null.
 * @param {string} text
 * @returns {string | null}
 */
export function findForbiddenWord(text) {
  if (typeof text !== 'string') return null;
  for (const word of FORBIDDEN) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(text)) return word;
  }
  return null;
}

// --- filesystem glue (not exported) --------------------------------------

/** Recursively list every file under a directory. */
function walkFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = resolve(dir, entry);
    if (statSync(p).isDirectory()) {
      out.push(...walkFiles(p));
    } else {
      out.push(p);
    }
  }
  return out;
}

/** Gather every http(s) URL used across the room files under src/rooms/. */
function gatherRoomUrls() {
  const urls = new Set();
  let dirs;
  try {
    dirs = readdirSync(ROOMS_DIR);
  } catch {
    return urls;
  }
  for (const slug of dirs) {
    const roomFile = resolve(ROOMS_DIR, slug, 'room.ts');
    let text;
    try {
      text = readFileSync(roomFile, 'utf8');
    } catch {
      continue;
    }
    for (const u of extractUrls(text)) urls.add(u);
  }
  return urls;
}

/** Relative-from-repo-root label for a path (POSIX slashes), for stable output. */
function rel(p) {
  return p.slice(REPO_ROOT.length + 1).split('\\').join('/');
}

async function main() {
  const problems = [];

  // 1. Manifest.
  let manifest = null;
  try {
    manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  } catch (err) {
    problems.push(`plugin.json did not parse as JSON: ${err && err.message}`);
  }
  if (manifest !== null) {
    for (const p of checkManifest(manifest)) problems.push(p);
  }

  // 2. Skills.
  let skillFolders = [];
  try {
    skillFolders = readdirSync(SKILLS_DIR).filter((name) =>
      statSync(resolve(SKILLS_DIR, name)).isDirectory(),
    );
  } catch {
    problems.push('power/honest-ui/skills directory is missing');
  }
  if (skillFolders.length === 0) {
    problems.push('no skill folders found under power/honest-ui/skills');
  }
  for (const folder of skillFolders) {
    const skillFile = resolve(SKILLS_DIR, folder, 'SKILL.md');
    let text;
    try {
      text = readFileSync(skillFile, 'utf8');
    } catch {
      problems.push(`${folder}/SKILL.md is missing`);
      continue;
    }
    for (const p of checkSkill(folder, text)) problems.push(p);
  }

  // 3. URLs in references/patterns.md.
  let referencesText = '';
  try {
    referencesText = readFileSync(REFERENCES, 'utf8');
  } catch {
    problems.push('references/patterns.md is missing');
  }
  if (referencesText) {
    const roomUrls = gatherRoomUrls();
    for (const p of checkUrls(referencesText, roomUrls, CHECKED_SOURCES)) problems.push(p);
  }

  // 4. Forbidden words anywhere under power/.
  let powerFiles = [];
  try {
    powerFiles = walkFiles(POWER_ROOT);
  } catch {
    problems.push('power/ directory is missing');
  }
  for (const file of powerFiles) {
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const word = findForbiddenWord(text);
    if (word) problems.push(`${rel(file)} contains the forbidden word "${word}"`);
  }

  if (problems.length > 0) {
    for (const p of problems) console.error(`check:power: ${p}`);
    console.error('check:power: FAIL');
    return 1;
  }
  console.log(
    `check:power: OK — manifest, ${skillFolders.length} skill(s), references URLs and no forbidden words`,
  );
  return 0;
}

const isMain = resolve(process.argv[1] || '') === fileURLToPath(import.meta.url);
if (isMain) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(`check:power: ${err && err.message ? err.message : err}`);
      process.exit(1);
    });
}
