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

## Assets

- Fonts: Cormorant Garamond and Atkinson Hyperlegible Next, SIL Open Font License 1.1, self-hosted through Fontsource.
- The frame, the ghost, the spell-card symbols and the candles are CSS and inline SVG written for this project.

## License

MIT. Copyright (c) 2026 MUHAMMED TAHA AKTAŞ
