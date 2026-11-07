# honest-ui

A Kiro power that reviews your own interface for dark patterns and shows you the honest alternative. It carries fourteen patterns — cookie-banner visual interference, trick wording, confirmshaming, hidden subscriptions, fake urgency and scarcity, fake social proof, sneaking, hidden costs, nagging, preselection, hard-to-cancel, disguised ads and forced action — each with the signs to look for, its honest twin, and sourced US and EU pointers. The content is the Ghost Guide from the browser game Dark Pattern Manor, word for word.

## What you get

Three skills Kiro loads when they fit the request:

- **dark-pattern-review** — review a page, component or flow and report each finding with its evidence, the pattern's name, a severity and the honest fix.
- **honest-twin** — rewrite a flagged screen as a real best practice: equal choices, plain words, prices and renewals up front, nothing pre-ticked, a cancel path as short as the sign-up.
- **consent-and-cancel-checklist** — a twelve-point pre-release check for any flow that asks for consent, money or a commitment.

## Install

**Kiro CLI**

```bash
kiro-cli powers install ./power/honest-ui
```

**Kiro IDE** — run "Import power from a folder" and choose `power/honest-ui`.

**From GitHub** — install it straight from the repository `tahaexe/dark-pattern-manor`, pointing at the `power/honest-ui` folder, with the same CLI command or the IDE's import-from-GitHub flow.

## Use it

Once installed, just describe the screen or flow you want looked at — you do not need to name the power. For example:

> Review this checkout page for dark patterns and show me the honest version of anything you flag.

Kiro loads the review skill, reports each finding with where it is and why, and can rewrite the screen with the honest-twin skill or run the flow past the twelve-point checklist.

## Wording

Findings are phrased as "may be a dark pattern; check" — never as a claim that a flow breaks the law. The US and EU pointers are context, not legal advice, and no real company is ever named. It is a design review that helps you fix a flow, not a verdict on anyone.

## License

MIT. Part of the Dark Pattern Manor project.
