/**
 * The three steps of play, in one place. The room route's "?" popover
 * (`HowToPlay`) renders these now, and a later title-screen change imports the
 * same array, so the words can never drift between the two.
 */
export interface HowToStep {
  title: string;
  body: string;
}

export const HOW_TO_PLAY: ReadonlyArray<HowToStep> = [
  {
    title: 'Spot the trick',
    body: 'Each room is a web page with one trick in it. Tap the part that\u2019s tricking you. Stuck? Light the lantern.',
  },
  {
    title: 'Name it',
    body: 'Pick the card that names the trick.',
  },
  {
    title: 'Set the page free',
    body: 'Drag the line to compare it with the honest page, then do the task there.',
  },
];
