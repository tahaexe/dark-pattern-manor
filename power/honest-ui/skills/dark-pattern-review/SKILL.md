---
name: dark-pattern-review
description: Review a page, component or user flow for dark patterns (deceptive design) and report each finding with its evidence, the pattern's name and severity, and the honest alternative. Use when asked whether a UI is manipulative, before shipping a consent, checkout, subscription, free-trial or cancel flow, or when reviewing UI copy for manipulation.
---
# Dark pattern review

Work through the UI once, then report. Keep to what you can see; name what you cannot.

## 1. Read the UI

Read the markup, the styles that decide how each choice looks (size, colour, weight, placement) and the copy word for word. If the flow spans more than one screen, list its steps — some patterns only appear across steps (a basket that changes later, a prompt that returns, a cancel path far longer than the sign-up).

## 2. Look for each pattern's signs

For each pattern in `references/patterns.md`, check the page against its "signs to look for". Judge choices side by side: two equal choices must look equal and read equal. A choice that is quieter, longer, pre-made for you, or written to shame you is the tell.

## 3. Report each finding

Report every finding as:

- **Pattern** — its name from `references/patterns.md`.
- **Where** — the file and line, or the screen and element.
- **Sign** — the exact thing you saw (the faded reject link, the pre-ticked box, the countdown that resets).
- **Severity** — `likely` (the sign is clearly there) or `possible` (it depends on data or a path you could not see).
- **Honest fix** — the smallest change that makes it honest (use the honest-twin skill).

Point to the US and EU lines in `references/patterns.md` as context, not as legal advice.

## 4. Wording rule

Phrase each finding as "may be a dark pattern; check". Never say a flow breaks the law. Name no real company. The goal is to help the reader fix the flow, not to judge anyone.

## 5. Name what you could not see

If you found nothing, or could only see part of the flow, say which flows you could not check — a cancel path, a basket that changes at checkout, a prompt that returns after "Not now" — since those patterns only show across steps.
