# Dark Pattern Manor

A browser game where you spot and name dark patterns to set pages free. "Every trick is a ghost. Name it to set the page free."

## Play it

Play online at: https://tahaexe.github.io/dark-pattern-manor/

## How to play

Each room is a web page with one trick in it — a real dark pattern. The loop is the same three steps every time:

1. **Spot the trick** — one part of the page is haunted. Tap it. Stuck? The lantern lights the trick.
2. **Name it** — pick the card that names the trick. A wrong card costs nothing.
3. **Set the page free** — drag the line to compare the haunted page with its honest twin, then finish your task on the honest page.

There is no fail state and nothing to install. The first room is a short tutorial, and the title screen shows the three steps before you enter.

## The Ghost Lantern

The Ghost Lantern carries the manor's lesson to the real web. It is a bookmarklet — one link you keep on your bookmarks bar. On any page, one click lights it: it reads the page in your browser, outlines the parts that show a clear sign of a dark pattern in the manor's candle style, and opens a small panel naming each one, the sign it saw, and a link to the manor room that teaches it. One more click, or Escape, puts it out and removes everything it added. It gives hints, not verdicts.

**The four promises:**

- **Local only, nothing sent.** The whole program is inside the bookmarklet. It loads no script, style, font or image from anywhere; it never calls the network (`fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`) and never opens a window; the only link it adds is the plain "Learn it in the manor" anchor you choose to click, carrying only a room number. It uses no cookies, no `localStorage`, no `sessionStorage` and no IndexedDB.
- **Hints, not verdicts.** Every label reads "Possible: &lt;pattern&gt;". The panel opens with plain words: these are hints, not proof — the lantern reads only what is on the screen and it can be wrong, so look for yourself before you decide. There is no score, no grade, and no word like "illegal" or "scam".
- **Runs only when asked.** Nothing runs before you click. When you put it out, no node, listener, timer or observer it added is left behind, and your keyboard focus returns to where it was.
- **No real company shown marked.** Every demo, test and text uses the fictional practice page or the manor's own pages, never a real site.

**What it marks (v1):** the seven clear signs — Preselection, Visual interference, Fake urgency, Fake scarcity, Fake social proof, Confirmshaming and Trick wording. Five patterns that only show in a flow — sneaking, hidden costs, hidden subscription, nagging and hard to cancel — are not marked; the panel says so when it finds nothing.

**How to install:** finish the manor (or open the ending at `#/end`) and drag the "Ghost Lantern" link to your bookmarks bar, then click it on any page. There is a safe practice page at `#/lantern-practice` — a made-up shop, "Hollowmere Goods", with every trick planted once beside its honest twin — and a "Try the lantern here" button that runs the same bundle.

**Its limits (measured on the build in headless Chrome):**

- **Strict security policies.** On a page served with a strict Content Security Policy (`require-trusted-types-for 'script'`, no inline script), the lantern still renders: it builds every node with `createElement`/`textContent` (no `innerHTML`) and puts its styles into a closed shadow root through a constructed stylesheet, with a `<style>` fallback. Measured under `default-src 'self'; script-src 'self'; style-src 'self'; require-trusted-types-for 'script'`, the marks kept their dashed candle outline and the panel kept its parchment background, with no console error. A policy that also forbids the bookmarklet's own `javascript:` navigation would stop the lantern from starting at all — there is nothing a bookmarklet can do about that.
- **Cross-origin frames.** The lantern reads only the page it runs in. It cannot read inside a cross-origin iframe (an embedded checkout or consent frame from another site), so a trick living only in such a frame is not marked.
- **Other languages.** The phrase lists are English in v1, so a page in another language may show no marks even where a trick is present.

## Run it locally

```bash
npm install
npm run dev
npm test
npm run build
```

`npm run build` builds the app and, as a second step, the lantern bookmarklet bundle `dist/lantern.js`. `npm run check:lantern` checks that bundle: it exists, is small (at most 30 KB minified), contains none of the network or storage calls above, and the bookmarklet string stays well under the browser URL limit.

## How it is built with Kiro

This project is built with Kiro, an AI-powered development environment. Steering documents in `.kiro/steering` guide development decisions; specs in `.kiro/specs` break features into requirements, design, and tasks; hooks in `.kiro/hooks` automate workflow tasks like command validation and testing.

- **command-guard** (`PreToolUse`): blocks any shell command outside the repository's allow-list before it runs.
- **room-checks** (`PostToolUse`): after a file under `src/rooms/` is written, runs the room-data checks (the same validation as `npm run check:rooms`) and prints one line per room.
- **gates-on-stop** (`Stop`): when the agent finishes its turn, runs `npm test`, `npm run build` and `npm run check:size` in order and prints a one-line summary per gate.

## Real-browser QA (manor-qa)

`scripts/mcp/manor-qa.mjs` is a Model Context Protocol server (stdio, JSON-RPC 2.0, no new dependency) that gives Kiro a real headless-browser check of the game while it builds rooms. A test DOM has no layout, stacking or pixels, so faults a sighted, keyboard player would meet — a whisper painted under the backdrop, a slider that reveals nothing, ink text on a dark gradient — slip past jsdom and axe-on-jsdom. The server serves the built site from `dist/` to a locally launched Chrome (`CHROME_PATH`, else the usual install path) and exposes four tools:

- **check_rooms** — runs the room-data checks (the same validation as `npm run check:rooms`) and returns one line per room plus the overall result. No browser needed.
- **walk_rooms** `{ rooms: "1-12", width: 1280, height: 720 }` — walks each room by keyboard: the instruction, the lantern, the possessed element reachable by Tab, the three cards and each wrong card's whisper, the right card, the comparison box, the slider really changing what is on top, every point haunted at 0 and honest at 100, the focused honest control, the one-press task, the Ghost Guide and the continue link; for room 1 it also checks the tutorial coach marks are visible, do not cover their target, and that "Skip the tips" hides them; then the ending's twelve checklist lines. Returns JSON of the checks and any console errors.
- **contrast_scan** `{ rooms: "1-12", width: 1280, height: 720 }` — for each room's comparison at 0 (haunted) and 100 (honest), screenshots the comparison box, reads its pixels from a canvas, and reports the WCAG contrast (70th percentile over each text box) of every visible text node, flagging anything below 4.5:1 (3:1 for large text). Returns JSON flags.
- **walk_lantern** `{ width: 1280, height: 720 }` — runs the Ghost Lantern on the practice page (`#/lantern-practice`): runs the built bundle as the "Try the lantern here" button does, confirms the panel opens with the planted count, every mark sits over its element, Escape closes, focus returns and no lantern node remains; then serves the same page under a strict CSP and reports whether the marks and panel still got their styles and whether any console error appeared. Returns JSON.

Build first (`npm run build`), then Kiro calls the tools through the `manor-qa` entry in `.kiro/settings/mcp.json`. The server speaks only to `127.0.0.1`, writes no file, and sends no project data anywhere. Its protocol and contrast maths are tested by `npm run test:qa` (part of `npm test`). `npm run qa:full` runs all the browser tools over all twelve rooms, with and without reduced motion, plus the Ghost Lantern step and the strict-CSP measurement, and fails on any problem.

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
