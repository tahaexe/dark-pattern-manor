/**
 * The three steps of play, in one place. The room route's "?" popover
 * (`HowToPlay`) renders the fuller `HOW_TO_PLAY` bodies; the title screen draws
 * the three steps with the terse `TITLE_STEPS` lines. Both are keyed by the
 * same three titles, in the same order, so the words can never drift between
 * the door and the "?" — a guard (`assertLoopTextAligned`) enforces it and a
 * unit test runs the guard.
 *
 * The loop is always described the same way across the whole game: spot/tap the
 * trick, name it (pick the card), set the page free (compare and finish the
 * task); the lantern is the hint — "Stuck? The lantern lights the trick."
 */
export interface HowToStep {
  title: string;
  body: string;
}

export const HOW_TO_PLAY: ReadonlyArray<HowToStep> = [
  {
    title: 'Spot the trick',
    body: 'Each room is a web page with one trick in it. Tap the part that\u2019s tricking you. Stuck? The lantern lights the trick.',
  },
  {
    title: 'Name it',
    body: 'Pick the card that names the trick. A wrong card costs nothing.',
  },
  {
    title: 'Set the page free',
    body: 'Drag the line to compare it with the honest page, then do the task there.',
  },
];

/** One title step for the door: the title and a terse one-liner under its ink drawing. */
export interface TitleStep {
  title: string;
  line: string;
}

/**
 * The three steps as drawn on the title screen, above "Enter the manor". The
 * titles match `HOW_TO_PLAY` one for one; the lines are terser than the "?"
 * bodies so the door stays uncluttered while saying the same loop.
 *
 * Each line joins its last word with a non-breaking space (\u00A0) so a line
 * that wraps never leaves that final word stranded alone on a second line
 * (a widow): "Tap it.", "the trick.", "your task." stay with the word before
 * them. The words are otherwise identical to the spoken loop.
 */
export const TITLE_STEPS: ReadonlyArray<TitleStep> = [
  { title: 'Spot the trick', line: 'One part of the page is haunted. Tap\u00A0it.' },
  { title: 'Name it', line: 'Pick the card that names the\u00A0trick.' },
  { title: 'Set the page free', line: 'See the honest page and finish your\u00A0task.' },
];

/**
 * Keep the title steps and the "?" steps describing the same loop: the same
 * three titles, in the same order. Throws if they ever diverge, so a careless
 * edit to one array is caught by the unit test that runs this.
 */
export function assertLoopTextAligned(): void {
  if (HOW_TO_PLAY.length !== TITLE_STEPS.length) {
    throw new Error('Loop text drift: HOW_TO_PLAY and TITLE_STEPS have different lengths.');
  }
  for (let i = 0; i < HOW_TO_PLAY.length; i++) {
    if (HOW_TO_PLAY[i].title !== TITLE_STEPS[i].title) {
      throw new Error(
        `Loop text drift at step ${i}: "${HOW_TO_PLAY[i].title}" vs "${TITLE_STEPS[i].title}".`,
      );
    }
  }
}
