# Requirements — honest-ui-power

## Introduction

Dark Pattern Manor teaches people to name dark patterns by setting a haunted
page free beside its honest twin. `power/honest-ui/` holds a draft Kiro power
that turns that teaching into a tool: it lets anyone point Kiro at their own
interface and get a dark-pattern review, an honest rewrite, and a pre-release
checklist, all grounded in the game's own Ghost Guide text with sourced US and
EU pointers. This feature finishes that draft into an installable power that
follows the layout Kiro documents, and adds a check (with tests, part of
`npm test` and exposed as `npm run check:power`) that keeps the power valid and
honest.

The power ships three skills and one reference file:

- **dark-pattern-review** reviews a page, component or flow for dark patterns
  and reports each finding with evidence, the pattern's name, a severity and
  the honest fix. Its `references/patterns.md` carries, for each pattern, the
  definition, where you meet it, the signs to look for, a US line and an EU line
  with sources, and a protection tip.
- **honest-twin** rewrites a flagged screen as a real best practice.
- **consent-and-cancel-checklist** is a twelve-point pre-release checklist.

The content is already verified: every definition, US and EU line and source
URL in `references/patterns.md` is the game's own Ghost Guide text word for
word, plus two rooms still in planning whose legal lines were checked against
the primary texts. This feature does not add, remove or reword any legal line
or source. It may improve the skills' procedure wording, the signs to look for
and the README text.

All work stays inside the repository; no file contains a local user or machine
path; nothing is committed or pushed.

## Requirement 1 — The power manifest

**User story:** As someone installing the power, I want a complete manifest, so
that Kiro can identify, describe and attribute the power.

#### Acceptance criteria

1. THE repository SHALL contain `power/honest-ui/plugin.json`, valid JSON with a
   `name`, `version`, `description`, `author`, `keywords`, `license` and
   `repository`.
2. THE `name` SHALL be kebab-case (lowercase letters, digits and single hyphens,
   starting and ending with an alphanumeric).
3. THE `author` SHALL be an object carrying a non-empty `name`.
4. THE `keywords` SHALL be a non-empty array of strings, and the `description`
   SHALL be a non-empty string.
5. THE `license` SHALL be `MIT`, matching the repository, and the `repository`
   SHALL be a URL that names no local or machine path.

## Requirement 2 — The skills

**User story:** As someone using the power, I want each skill self-describing in
the layout Kiro reads, so that Kiro loads the right skill for the request.

#### Acceptance criteria

1. THE power SHALL contain, under `power/honest-ui/skills/`, exactly the three
   skill folders `dark-pattern-review`, `honest-twin` and
   `consent-and-cancel-checklist`, each holding a `SKILL.md`.
2. FOR every skill, THE `SKILL.md` SHALL open with YAML frontmatter whose `name`
   equals the skill's folder name and whose `description` is a non-empty string
   that says what the skill does and when to use it.
3. THE `dark-pattern-review` skill SHALL keep its reference file at
   `power/honest-ui/skills/dark-pattern-review/references/patterns.md`.
4. THE `dark-pattern-review` procedure SHALL tell the reader to read the UI
   (markup, styles and copy, and the flow's steps), look for each pattern's
   signs judging equal choices side by side, report each finding as pattern,
   where, the sign seen, severity and the smallest honest fix, and say which
   flows could not be seen.
5. THE skills SHALL state the wording rule: a finding is "may be a dark pattern;
   check", never "illegal", and no real company is named.

## Requirement 3 — The power README

**User story:** As someone discovering the power, I want a short README, so that
I know what it does, how to install it and how to ask for a review.

#### Acceptance criteria

1. THE power SHALL contain `power/honest-ui/README.md` describing what the power
   does.
2. THE README SHALL give the install routes: the Kiro CLI
   (`kiro-cli powers install ./power/honest-ui`), the IDE ("Import power from a
   folder"), and from GitHub.
3. THE README SHALL give an example prompt that does not name the power.
4. THE README SHALL state the wording rule — findings are "may be a dark
   pattern; check", never "illegal" — and that no real company is named.

## Requirement 4 — The check

**User story:** As a developer, I want a check that keeps the power valid and
honest, so that a broken manifest, a mis-named skill, an unsourced URL or the
word "illegal" fails the build.

#### Acceptance criteria

1. THE repository SHALL contain `scripts/power/check-power.mjs` that, run as a
   Node script, checks the power and exits non-zero if any check fails, printing
   which rule broke.
2. THE check SHALL require `plugin.json` to have every field of Requirement 1
   and a kebab-case `name`.
3. FOR every folder under `power/honest-ui/skills/`, THE check SHALL require a
   `SKILL.md` whose frontmatter `name` equals the folder name and whose
   `description` is non-empty.
4. THE check SHALL require every URL in `references/patterns.md` to either appear
   in some `src/rooms/*/room.ts` or be one of exactly these five checked sources
   for the two planned rooms:
   - `https://www.ftc.gov/system/files/documents/public_statements/896923/151222deceptiveenforcement.pdf`
   - `https://eur-lex.europa.eu/eli/dir/2005/29/oj`
   - `https://eur-lex.europa.eu/eli/reg/2022/2065/oj`
   - `https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312/section-312.7`
   - `https://eur-lex.europa.eu/eli/reg/2016/679/oj`
5. THE check SHALL fail if any file under `power/` contains the word "illegal" or
   the word "unlawful".
6. THE check SHALL be exposed as `npm run check:power` and SHALL be included in
   `npm test`.
7. THE check SHALL have tests using `node:test` that cover: a well-formed power
   passing; a non-kebab-case name failing; a missing manifest field failing; a
   skill whose frontmatter name does not match its folder failing; a skill with
   no description failing; a URL in the references that is neither in a room nor
   in the five checked sources failing; and the word "illegal" in a power file
   failing.

## Requirement 5 — Repository documentation and safety

**User story:** As someone browsing the repository, I want the power linked from
the main README, and the whole feature safe, so that the power is discoverable
and nothing leaks a machine path.

#### Acceptance criteria

1. THE repository README SHALL carry a short "Kiro power: honest-ui" section
   linking `power/honest-ui/README.md`.
2. NO file created or changed by this feature SHALL contain a local user or
   machine path.
3. THE feature SHALL NOT add, remove or reword any legal line or source URL in
   `references/patterns.md`.
4. THE feature SHALL NOT commit and SHALL NOT push.

## Correctness properties

- `plugin.json` is valid JSON with every required field and a kebab-case name
  (Req 1.1–1.5, 4.2).
- Every skill folder has a `SKILL.md` whose frontmatter name equals the folder
  and whose description is non-empty (Req 2.1, 2.2, 4.3).
- Every URL in `references/patterns.md` is in a room file or in the five checked
  sources (Req 4.4).
- No file under `power/` contains "illegal" or "unlawful" (Req 4.5).
- `npm run check:power` passes and is part of `npm test` (Req 4.6).
- No file written by this feature contains a machine path (Req 5.2).
