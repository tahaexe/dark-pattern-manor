# Design — honest-ui-power

## Overview

The power already exists in draft under `power/honest-ui/`: a `plugin.json`, three
skills and the review skill's `references/patterns.md`. This feature brings the
draft up to the layout Kiro documents for a power, adds a power README, and adds
a Node check (with tests) that keeps the power valid and honest. The verified
content — every definition, US and EU line and source URL — is left word for
word; only procedure wording, the signs to look for, and prose documentation may
be improved.

## The power layout

Kiro reads a power from a folder with a manifest at its root and skills in a
`skills/` tree:

```
power/honest-ui/
  plugin.json                 manifest: name, version, description, author,
                              keywords, license, repository
  README.md                   what it does, how to install, example prompt,
                              wording rule
  skills/
    dark-pattern-review/
      SKILL.md                frontmatter { name, description } + procedure
      references/
        patterns.md           the verified pattern data (unchanged content)
    honest-twin/
      SKILL.md
    consent-and-cancel-checklist/
      SKILL.md
```

### plugin.json

Kebab-case `name` (`honest-ui`), `version`, a one-sentence `description`, an
`author` object with a `name`, a non-empty `keywords` array, `license` `MIT`
(matching the repository), and a `repository` URL. The URL is a public GitHub
URL and names no local path. The existing draft already satisfies this; it is
confirmed, not rewritten.

### Skills

Each `SKILL.md` opens with YAML frontmatter:

```yaml
---
name: <folder name>
description: <what it does and when to use it>
---
```

Kiro matches a skill to a request through its `description`, so each description
names the task and the trigger ("Use when…"). The `name` must equal the folder
name so the check can pair them.

- **dark-pattern-review** — the procedure: read the UI (markup, styles, copy,
  and the flow's steps); for each pattern in `references/patterns.md` look for
  its signs, judging equal choices side by side; report each finding as pattern,
  where (file and line, or screen and element), the sign seen, severity (likely,
  possible) and the smallest honest fix (pointing to the honest-twin skill);
  state the wording rule ("may be a dark pattern; check", never "illegal"; name
  no real company); and, if nothing is found, say which flows could not be seen
  (a cancel path, a basket that changes later, a prompt that returns), since
  some patterns only show across steps.
- **honest-twin** — rewrite a flagged screen as a real best practice: equal
  choices, plain words, prices and renewals up front, nothing pre-ticked, a
  cancel path as short as the sign-up, kept usable by keyboard and screen reader
  at WCAG AA contrast.
- **consent-and-cancel-checklist** — the game's twelve-point player checklist
  turned into what to ship, as a pre-release check for any flow that asks for
  consent, money or a commitment.

### references/patterns.md

The verified data file, one entry per pattern. Each entry carries: what it is,
where you meet it, the signs to look for, a US line with a source URL, an EU
line with a source URL, a protection tip, and which room it appears in. Two
entries (Disguised ads, Forced action) are for rooms still in planning; their
legal lines were checked against the primary texts. The legal lines and source
URLs are not changed by this feature.

### README.md

Short prose: what the power does; how to install it — the Kiro CLI
(`kiro-cli powers install ./power/honest-ui`), the IDE ("Import power from a
folder"), and from GitHub; an example prompt that does not name the power (e.g.
asking Kiro to review a checkout flow for dark patterns); and the wording rule
(findings are "may be a dark pattern; check", never "illegal"; no real company
named).

## The check: scripts/power/check-power.mjs

A dependency-free Node script, structured like `scripts/agents/check-agents.mjs`:
pure functions are exported for the test suite, and only `main()` touches the
filesystem. All paths derive from `import.meta.url`, so no machine path is ever
written.

### Pure functions (exported, tested)

- `parseFrontmatter(text)` → `{ name, description }` — reads the small
  frontmatter shape used by `SKILL.md`: a leading `---` fence, `key: value`
  scalar lines, a closing `---`. Returns `null` when there is no closed
  frontmatter.
- `checkManifest(manifest)` → `string[]` — returns a problem per missing or
  malformed field: `name` present and kebab-case
  (`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`), `version` non-empty string, `description`
  non-empty string, `author` an object with a non-empty `name`, `keywords` a
  non-empty array of strings, `license` non-empty string, `repository` a
  non-empty string.
- `checkSkill(folderName, skillText)` → `string[]` — frontmatter parses, its
  `name` equals `folderName`, its `description` is non-empty.
- `checkUrls(referencesText, roomUrls, checkedSources)` → `string[]` — extracts
  every `http(s)` URL from the references text and returns a problem for each
  URL that is neither in `roomUrls` nor in `checkedSources`.
- `findForbiddenWord(text)` → `string | null` — returns `"illegal"` or
  `"unlawful"` (whichever is found first, case-insensitive, whole word) or
  `null`.

The five checked sources are a frozen constant in the module, equal to the list
in Requirement 4.4.

### Filesystem glue (main)

`main()`:

1. Reads `power/honest-ui/plugin.json`, parses JSON (a parse error is a
   problem), runs `checkManifest`.
2. Lists `power/honest-ui/skills/`; for each folder reads its `SKILL.md`
   (missing file is a problem) and runs `checkSkill`.
3. Collects every URL from every `src/rooms/*/room.ts` (`roomUrls`), reads
   `references/patterns.md`, runs `checkUrls` against `roomUrls` and the frozen
   checked sources.
4. Walks every file under `power/` and runs `findForbiddenWord`; any hit is a
   problem naming the file and the word.
5. Prints one line per problem and returns a non-zero exit code if there were
   any, else prints an OK summary and returns 0.

Room URLs are gathered by a regex over each `room.ts`'s text (`/https?:\/\/\S+/`
trimmed of trailing quotes/punctuation), matching the URLs the grep over the
rooms already confirmed.

### Tests: scripts/power/check-power.test.mjs

`node:test`, pure logic only (no filesystem, no spawn), mirroring the
check-agents suite:

- a well-formed manifest passes `checkManifest`;
- a non-kebab-case name fails;
- a missing field (e.g. no `author`) fails;
- a well-formed skill passes `checkSkill`;
- a skill whose frontmatter name ≠ folder fails;
- a skill with an empty description fails;
- a URL that is neither in the rooms nor in the five checked sources fails
  `checkUrls`, while a room URL and a checked source pass;
- `findForbiddenWord` finds "illegal" and "unlawful" and returns `null` on clean
  text.

## Wiring

`package.json`:

- add `"check:power": "node scripts/power/check-power.mjs"`;
- add `"test:power": "node --test scripts/power/*.test.mjs"`;
- chain `&& npm run test:power` into the `test` script.

## Repository README

Add a short "Kiro power: honest-ui" section linking `power/honest-ui/README.md`,
stating in one or two sentences that the power reviews your own interface for
dark patterns from the game's Ghost Guide, and that findings are "may be a dark
pattern; check", never "illegal".

## Safety

- Work only inside the repository; every path in every script derives from
  `import.meta.url`.
- No file written carries a local user or machine path.
- The verified legal lines and source URLs in `references/patterns.md` are not
  changed.
- Nothing is committed or pushed.
