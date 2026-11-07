# Dark Pattern Manor

A browser game where you spot and name dark patterns to set pages free. "Every trick is a ghost. Name it to set the page free."

## Play it

Play online at: https://tahaexe.github.io/dark-pattern-manor/

## Run it locally

```bash
npm install
npm run dev
npm test
npm run build
```

## How it is built with Kiro

This project is built with Kiro, an AI-powered development environment. Steering documents in `.kiro/steering` guide development decisions; specs in `.kiro/specs` break features into requirements, design, and tasks; hooks in `.kiro/hooks` automate workflow tasks like command validation and testing.

- **command-guard** (`PreToolUse`): blocks any shell command outside the repository's allow-list before it runs.
- **room-checks** (`PostToolUse`): after a file under `src/rooms/` is written, runs the room-data checks (the same validation as `npm run check:rooms`) and prints one line per room.
- **gates-on-stop** (`Stop`): when the agent finishes its turn, runs `npm test`, `npm run build` and `npm run check:size` in order and prints a one-line summary per gate.

## Real-browser QA (manor-qa)

`scripts/mcp/manor-qa.mjs` is a Model Context Protocol server (stdio, JSON-RPC 2.0, no new dependency) that gives Kiro a real headless-browser check of the game while it builds rooms. A test DOM has no layout, stacking or pixels, so faults a sighted, keyboard player would meet — a whisper painted under the backdrop, a slider that reveals nothing, ink text on a dark gradient — slip past jsdom and axe-on-jsdom. The server serves the built site from `dist/` to a locally launched Chrome (`CHROME_PATH`, else the usual install path) and exposes three tools:

- **check_rooms** — runs the room-data checks (the same validation as `npm run check:rooms`) and returns one line per room plus the overall result. No browser needed.
- **walk_rooms** `{ rooms: "1-12", width: 1280, height: 720 }` — walks each room by keyboard: the instruction, the lantern, the possessed element reachable by Tab, the three cards and each wrong card's whisper, the right card, the comparison box, the slider really changing what is on top, every point haunted at 0 and honest at 100, the focused honest control, the one-press task, the Ghost Guide and the continue link; then the ending's twelve checklist lines. Returns JSON of the checks and any console errors.
- **contrast_scan** `{ rooms: "1-12", width: 1280, height: 720 }` — for each room's comparison at 0 (haunted) and 100 (honest), screenshots the comparison box, reads its pixels from a canvas, and reports the WCAG contrast (70th percentile over each text box) of every visible text node, flagging anything below 4.5:1 (3:1 for large text). Returns JSON flags.

Build first (`npm run build`), then Kiro calls the tools through the `manor-qa` entry in `.kiro/settings/mcp.json`. The server speaks only to `127.0.0.1`, writes no file, and sends no project data anywhere. Its protocol and contrast maths are tested by `npm run test:qa` (part of `npm test`). `npm run qa:full` runs both browser tools over all twelve rooms, with and without reduced motion, and fails on any problem.

## Custom agents

Two Kiro CLI V3 custom agents in `.kiro/agents/` package the room workflow. Each is a Markdown file with YAML frontmatter and a prompt body; both pull in the `manor-qa` MCP server from `.kiro/settings/mcp.json` (`includeMcpJson: true`) and inherit the steering as their default resources.

- **room-builder** — builds or fixes exactly one room end to end: it reads the room's spec (writing it from the room template if the room is new), changes only that room's files, runs `npm run build` then the manor-qa `walk_rooms` and `contrast_scan` tools and fixes every failure, calls the `manor-reviewer` sub-agent and fixes every `must` finding, runs `npm test`, `npm run check:rooms` and `npm run check:size`, and reports. It may read and write inside the repository and use the shell (the command-guard hook still decides which commands run); it has no access outside the repository.
- **manor-reviewer** — reviews exactly one room against the haunted-UI steering rules and the room's spec and changes nothing. It is read-only with no write tool and no shell; it may read files and call the three manor-qa tools, and returns findings, each with the rule, the evidence, a severity (`must`/`should`/`nice`) and the smallest fix.

They use the V3 agent format, so run one from the CLI with `--v3 --agent`:

```bash
kiro-cli chat --v3 --agent room-builder "Build room 2, Inkbone Books"
kiro-cli chat --v3 --agent manor-reviewer "Review room 1"
```

`npm run check:agents` keeps the agent files valid: it parses every file in `.kiro/agents/`, checks each `name` matches its file name and has a description, confirms every manor-qa tool an agent names is one the server really lists (it starts the server and asks `tools/list`), and fails if the reviewer gains a write or shell tool. Its pure logic is tested by `npm run test:agents` (part of `npm test`).

## Kiro power: honest-ui

The game's Ghost Guide is also packaged as an installable Kiro power in [`power/honest-ui`](power/honest-ui/README.md), so anyone can point Kiro at their own interface and get a dark-pattern review, an honest rewrite and a twelve-point pre-release checklist — fourteen patterns with their signs, honest twins and sourced US and EU pointers, straight from the game. Findings are phrased as "may be a dark pattern; check", never "illegal", and no real company is named. `npm run check:power` keeps the power valid and honest (manifest fields and a kebab-case name, each skill's frontmatter name matching its folder, every reference URL traceable to a room or a checked source, and no forbidden wording); its pure logic is tested by `npm run test:power` (part of `npm test`). See [`power/honest-ui/README.md`](power/honest-ui/README.md) for how to install and use it.

## Assets

- Fonts: Cormorant Garamond and Atkinson Hyperlegible Next, SIL Open Font License 1.1, self-hosted through Fontsource.
- The frame, the ghost, the spell-card symbols and the candles are CSS and inline SVG written for this project.
- Sound: a layered haunted ambience — the room tone, wind through the hall, a distant clock, the house settling, and a voice for each room (a draught under the door, a page turning, a clink of cutlery, a low fire, a fast clock, a detuned waltz, wordless murmuring, a jar lid, a pen scratching, a music box, rain, a drip) — with fuller cues for the three haunted moments: a candle gutter under the whisper on a wrong card, the ghost's unwinding sigh into the flee on the right card, and a warm resolved chord on the honest page. All synthesized in code with the Web Audio API: no audio files, no network, every layer subtle and slowly varying, and the game fully playable in silence.

## License

MIT. Copyright (c) 2026 MUHAMMED TAHA AKTAŞ
