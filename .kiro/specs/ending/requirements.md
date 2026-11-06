# Requirements Document

## Introduction

Dark Pattern Manor is a browser game in which each of 12 rooms is a fictional brand's website possessed by one real dark pattern; the player names the trick and the page turns honest. This document specifies the **Ending**: the page the player reaches after the twelfth room.

The product steering states: "After 12 rooms: a 12-line 'Ghost hunt in your own browser' checklist and a share card." The Ending delivers exactly that — a quiet closing room that recaps the twelve named ghosts as a practical checklist (each line linking back to its room), names the six wandering ghosts that lived only in the Guide, and offers a privacy-respecting share card. It also adds link-preview metadata to the page shell so the shared URL previews well.

The Ending is a new route, `#/end`, reached from the twelfth room's honest step the way each room reaches the next, and from the title page once all twelve rooms are complete. Before completion, `#/end` is gated: it shows a short line and a way back, never the checklist. Like a room, the Ending is loaded on demand so the initial bundle stays within budget.

## Glossary

- **Ending**: The subsystem rendered at the `#/end` route after the twelfth room: the heading, the checklist, the wandering-ghosts list, and the share card.
- **checklist**: The ordered list titled "Ghost hunt in your own browser" of exactly twelve lines, one per room, each a practical self-check that links to its room.
- **wandering ghosts**: The six dark patterns that live only in the Ghost Guide and never had a room: Disguised ads, Forced action, Obstruction, Comparison prevention, Addictive design, Currency confusion.
- **share card**: A card in the manor's look carrying the sentence "I named all twelve ghosts of Dark Pattern Manor.", the site's own address, and one "Share" button.
- **Web Share API**: The browser's `navigator.share` method; when present the share button invokes it with a title, text, and the site URL.
- **clipboard fallback**: When `navigator.share` is absent, the share button copies the share text and site URL to the clipboard and announces "Copied" in a polite live region.
- **site URL**: The game's own address, derived from the page's own `location` (origin + base path), never a hard-coded host.
- **completion gate**: The rule that `#/end` shows the full Ending only when all twelve rooms are complete; otherwise it shows a short gate line and a link back to the title.
- **link-preview metadata**: The Open Graph and Twitter card `<meta>` tags in `index.html` that control how the shared link previews on other platforms.
- **completed count**: The number of completed rooms reported by the progress store (`doneCount()`), which is twelve when every room is done.

## Requirements

### Requirement 1: The `#/end` route and its gate

**User Story:** As a player who has finished the manor, I want a closing page I can reach the same way I moved between rooms and from the title once I'm done, so that the game has a clear end; and if I open the end early, I want to be told to finish first rather than shown a spoiler.

#### Acceptance Criteria

1. THE app SHALL recognise the hash `#/end` as a distinct route and render the Ending subsystem for it.
2. WHEN the player completes the twelfth room's honest task, THE app SHALL offer, from that room's honest step, the same continue affordance every room uses to reach the next, and that affordance SHALL lead to `#/end`.
3. WHEN the player is on the title page AND the completed count is twelve, THE app SHALL offer a link to `#/end`.
4. WHILE the completed count is fewer than twelve, WHEN the player opens `#/end`, THE Ending SHALL display the line "Name all twelve ghosts first" and a link back to the title, and SHALL NOT display the checklist, the wandering-ghosts list, or the share card.
5. WHILE the completed count is twelve, WHEN the player opens `#/end`, THE Ending SHALL display the heading, the checklist, the wandering-ghosts list, and the share card.
6. THE Ending SHALL be loaded on demand through a dynamic import, so that the initial application bundle does not include the Ending's code, and SHALL be excluded from the initial-bundle size gate's entry total.

### Requirement 2: The heading and the checklist

**User Story:** As a player, I want a short, warm closing and a practical checklist that ties each lesson back to its room, so that I leave with something I can use in my own browser.

#### Acceptance Criteria

1. WHILE the Ending is shown past the gate, THE Ending SHALL render exactly one `h1` with the text "The manor is quiet" and one line with the text "You named all twelve ghosts."
2. THE Ending SHALL render the checklist under a heading with the text "Ghost hunt in your own browser" as an ordered list of exactly twelve list items, in order, with these texts word for word:
   1. On a cookie banner, find "Reject all" before you click anything.
   2. Read every checkbox sentence twice: what happens if I leave it alone?
   3. When the "no" button insults you, click it anyway.
   4. Before a free trial: the price after, the start date, the way to cancel.
   5. A countdown that resets is a costume. Reload and see.
   6. "Only 1 left" on everything means nothing.
   7. Trust dated, verified reviews; ignore "people are looking".
   8. Read the basket line by line before paying.
   9. Compare final totals, never "from" prices.
   10. Find "Don't ask again", or switch the prompt off in settings.
   11. Untick every box you didn't tick.
   12. Find the cancel path before you subscribe; keep the confirmation.
3. THE Ending SHALL render each checklist line's room link as a hyperlink to that line's room at `#/room/N`, where N is the line's one-based position, so that line 1 links to `#/room/1` and line 12 to `#/room/12`.
4. THE Ending SHALL give each checklist room link an accessible description that is that room's display title, so that assistive technology announces which room the link leads to.
5. THE Ending SHALL maintain a correct heading outline with exactly one `h1`, the remaining headings in order beneath it, and no skipped levels.

### Requirement 3: The wandering ghosts

**User Story:** As a player, I want to learn the six patterns that never had a room, so that my picture of dark patterns is complete.

#### Acceptance Criteria

1. THE Ending SHALL render a section headed "Six ghosts still wander".
2. THE Ending SHALL render, within that section, exactly these six lines word for word, each naming one wandering ghost and its one-line description:
   - Disguised ads: ads dressed as news, reviews or neutral rankings.
   - Forced action: you must create an account or share data to finish a simple task.
   - Obstruction: the path you want is made long and tiring on purpose.
   - Comparison prevention: bundles, odd units or per-week prices that make prices hard to compare.
   - Addictive design: endless feeds, autoplay and streaks that keep you there.
   - Currency confusion: gems and coins that hide the real price.

### Requirement 4: The share card

**User Story:** As a player, I want to share that I finished the manor without being tracked, so that I can tell others while the game stays private.

#### Acceptance Criteria

1. THE share card SHALL render, in the manor's look, the sentence "I named all twelve ghosts of Dark Pattern Manor.", the site URL, and one button labelled "Share".
2. THE Ending SHALL derive the site URL from the page's own `location` as the origin joined with the application base path, and SHALL NOT embed a hard-coded host.
3. WHEN the player activates the Share button AND `navigator.share` is a function, THE share card SHALL call `navigator.share` with a title, a text, and the site URL, and SHALL NOT use the clipboard fallback.
4. WHEN the player activates the Share button AND `navigator.share` is not available, THE share card SHALL write the share text and the site URL to the clipboard and SHALL announce "Copied" in a polite live region.
5. THE share card SHALL make no third-party network request, load no third-party script, and send the player's data to no destination other than the share or clipboard target the player invoked.

### Requirement 5: Link-preview metadata

**User Story:** As someone who receives a shared link, I want the link to preview with a clear title, description, and image, so that I understand what the game is before I open it.

#### Acceptance Criteria

1. THE page shell `index.html` SHALL include Open Graph tags: `og:title` with the content "Dark Pattern Manor"; `og:description` with the content "Twelve haunted web pages, one dark pattern each: name the ghost, free the honest twin."; `og:type` with the content "website"; and `og:image`.
2. THE `og:image` tag's content SHALL point to `og-card.png` under the application base path, and the shell SHALL also declare the image's width as 1200, its height as 630, and a non-empty `og:image:alt`.
3. THE page shell SHALL include a `twitter:card` tag with the content "summary_large_image".
4. THE repository SHALL NOT contain a placeholder `public/og-card.png`; the image is supplied separately.
5. THE repository SHALL include an automated test asserting that the Open Graph and Twitter tags of Requirement 5.1–5.3 exist in `index.html` and that the `og:image` content ends with `og-card.png`.

### Requirement 6: Look and accessibility

**User Story:** As a player on any screen, with or without reduced motion, I want the ending to look like the manor and stay readable and operable, so that the close matches the game and excludes no one.

#### Acceptance Criteria

1. THE Ending SHALL use only the manor's frame, design tokens, and fonts, and SHALL introduce no new raster image.
2. THE Ending SHALL fit a 1920 × 1080 viewport without the checklist being cramped, where laying the checklist out in two columns above 1000 px of width is acceptable.
3. THE Ending SHALL remain readable at 412 px of width with no horizontal overflow.
4. WHERE prefers-reduced-motion is active, THE Ending SHALL run no animation or transition.
5. THE Ending SHALL meet WCAG AA contrast for all text and SHALL report zero axe-core violations.

### Requirement 7: Testing

**User Story:** As a developer, I want the ending's rules covered by tests, so that the closing page and its share behaviour stay correct.

#### Acceptance Criteria

1. THE Ending SHALL ship with tests, passing under the project test command, asserting that the twelve checklist lines and the six wandering-ghost lines render word for word.
2. THE Ending SHALL ship with a test, passing under the project test command, asserting that `#/end` before completion shows the gate line "Name all twelve ghosts first" and does not show the checklist.
3. THE Ending SHALL ship with tests, passing under the project test command, asserting that the Share button calls `navigator.share` when it is present, and otherwise writes to the clipboard and announces "Copied".
4. THE repository SHALL ship with the `index.html` metadata test of Requirement 5.5.
5. THE Ending SHALL ship with an axe-core test, passing under the project test command, reporting zero violations for the completed Ending.
