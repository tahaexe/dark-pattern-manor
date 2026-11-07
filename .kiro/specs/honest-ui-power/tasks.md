# Tasks — honest-ui-power

> Gate: `npm test`, `npm run build`, `npm run check:rooms`, `npm run check:size`
> and `npm run check:power` all pass. Work inside the repo only; never commit or
> push; never write a machine path into any file. Do not add, remove or reword
> any legal line or source URL in `references/patterns.md`.

- [x] 1. Confirm and finish the manifest
  - File: `power/honest-ui/plugin.json`
  - Confirm valid JSON with a kebab-case `name` (`honest-ui`), `version`,
    non-empty `description`, `author` object with a `name`, non-empty `keywords`
    array, `license` `MIT` and a `repository` URL with no machine path. Leave the
    verified wording as is; only correct a field if one is missing or malformed.
  - _Requirements: 1.1–1.5_

- [x] 2. Finish the three skills
  - Files: `power/honest-ui/skills/dark-pattern-review/SKILL.md`,
    `power/honest-ui/skills/honest-twin/SKILL.md`,
    `power/honest-ui/skills/consent-and-cancel-checklist/SKILL.md`
  - Each: frontmatter `name` equal to the folder, a `description` saying what it
    does and when to use it; keep `references/patterns.md` beside the review
    skill. Improve the procedure wording and the signs to look for only; keep the
    wording rule (a finding is "may be a dark pattern; check", never a claim that
    a flow breaks the law; no real company named). Do not touch the legal lines
    or sources in `references/patterns.md`.
  - _Requirements: 2.1–2.5_

- [x] 3. Write the power README
  - File: `power/honest-ui/README.md`
  - What it does; install routes (`kiro-cli powers install ./power/honest-ui`,
    the IDE "Import power from a folder", and from GitHub); an example prompt
    that does not name the power; the wording rule and "no real company named".
  - _Requirements: 3.1–3.4_

- [x] 4. Write the check and its tests
  - Files: `scripts/power/check-power.mjs`, `scripts/power/check-power.test.mjs`
  - `check-power.mjs`: pure `parseFrontmatter`, `checkManifest`, `checkSkill`,
    `checkUrls`, `findForbiddenWord`, with the five checked sources as a frozen
    constant; a `main()` that checks the manifest, every skill folder, every URL
    in `references/patterns.md` against the room URLs and the checked sources,
    and every `power/` file for the forbidden words, printing one line per
    problem and exiting non-zero on any. Paths from `import.meta.url`; no machine
    path in output.
  - `check-power.test.mjs` (`node:test`): well-formed manifest passes;
    non-kebab-case name fails; missing field fails; well-formed skill passes;
    name≠folder fails; empty description fails; a URL neither in a room nor in the
    five sources fails while a room URL and a checked source pass; `illegal` and
    `unlawful` found, clean text returns null.
  - _Requirements: 4.1–4.5, 4.7_

- [x] 5. Wire the scripts
  - File: `package.json`
  - Add `"check:power": "node scripts/power/check-power.mjs"` and
    `"test:power": "node --test scripts/power/*.test.mjs"`; chain
    `&& npm run test:power` into the `test` script.
  - _Requirements: 4.6_

- [x] 6. Link the power from the repository README
  - File: `README.md`
  - Add a short "Kiro power: honest-ui" section linking
    `power/honest-ui/README.md`.
  - _Requirements: 5.1_

- [x] 7. Run every gate and report
  - Run `npm test`, `npm run build`, `npm run check:rooms`, `npm run check:size`
    and `npm run check:power`; report each result, every file created or changed,
    and anything that could not be done or is uncertain.
  - _Requirements: 4.6, 5.2, 5.3, 5.4_
