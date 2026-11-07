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

Build first (`npm run build`), then Kiro calls the tools through the `manor-qa` entry in `.kiro/settings/mcp.json`. The server speaks only to `127.0.0.1`, writes no file, and sends no project data anywhere. Its protocol and contrast maths are tested by `npm run test:qa` (part of `npm test`).

## Assets

- Fonts: Cormorant Garamond and Atkinson Hyperlegible Next, SIL Open Font License 1.1, self-hosted through Fontsource.
- The frame, the ghost, the spell-card symbols and the candles are CSS and inline SVG written for this project.

## License

MIT. Copyright (c) 2026 MUHAMMED TAHA AKTAŞ
