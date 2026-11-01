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

This project is built with Kiro, an AI-powered development environment. Steering documents in `.kiro/steering` guide development decisions; specs in `.kiro/specs` break features into requirements, design, and tasks; hooks in `.kiro/hooks` automate workflow tasks like command validation and testing. A guard hook ensures all shell commands stay within the repository.

## Assets

- The foyer behind the room was painted with a local image model (FLUX.2 [klein] 4B, Apache-2.0); it is the only raster image.
- Fonts: Cormorant Garamond and Atkinson Hyperlegible Next, SIL Open Font License 1.1, self-hosted through Fontsource.
- Everything else (the frame, the ghost, the spell-card symbols, the candles) is CSS and inline SVG written for this project.

## License

MIT. Copyright (c) 2026 MUHAMMED TAHA AKTAŞ
