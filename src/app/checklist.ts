/**
 * The one source of the end-of-manor checklist and the six wandering ghosts.
 *
 * Both the ending (`EndingPage`) and the teaching page (`ClassroomPage`) import
 * these arrays, so the two pages can never drift: the line texts, the room
 * each line recaps, and the six wandering ghosts are defined exactly once here.
 *
 * The line texts are product copy, carried word for word. Each checklist item
 * also names the room's dark pattern, so the teaching page can print the
 * bracket `(The Foyer: visual interference)` from the same data rather than
 * repeating the pattern name by hand. The ending renders only `line`, `room`
 * and `title`, so the added `pattern` field leaves its output unchanged.
 */

/**
 * One checklist line: a practical self-check, the room it recaps, that room's
 * display title, and the room's dark-pattern name.
 */
export interface ChecklistItem {
  line: string;
  room: number;
  title: string;
  pattern: string;
}

export const CHECKLIST: ReadonlyArray<ChecklistItem> = [
  {
    line: 'On a cookie banner, find "Reject all" before you click anything.',
    room: 1,
    title: 'The Foyer',
    pattern: 'visual interference',
  },
  {
    line: 'Read every checkbox sentence twice: what happens if I leave it alone?',
    room: 2,
    title: 'The Library',
    pattern: 'trick wording',
  },
  {
    line: 'When the "no" button insults you, click it anyway.',
    room: 3,
    title: 'The Dining Room',
    pattern: 'confirmshaming',
  },
  {
    line: 'Before a free trial: the price after, the start date, the way to cancel.',
    room: 4,
    title: 'The Parlour',
    pattern: 'hidden subscription',
  },
  {
    line: 'A countdown that resets is a costume. Reload and see.',
    room: 5,
    title: 'The Conservatory',
    pattern: 'fake urgency',
  },
  {
    line: '"Only 1 left" on everything means nothing.',
    room: 6,
    title: 'The Ballroom',
    pattern: 'fake scarcity',
  },
  {
    line: 'Trust dated, verified reviews; ignore "people are looking".',
    room: 7,
    title: 'The Portrait Gallery',
    pattern: 'fake social proof',
  },
  {
    line: 'Read the basket line by line before paying.',
    room: 8,
    title: 'The Pantry',
    pattern: 'sneaking',
  },
  {
    line: 'Compare final totals, never "from" prices.',
    room: 9,
    title: 'The Study',
    pattern: 'hidden costs',
  },
  {
    line: 'Find "Don\'t ask again", or switch the prompt off in settings.',
    room: 10,
    title: 'The Nursery',
    pattern: 'nagging',
  },
  {
    line: "Untick every box you didn't tick.",
    room: 11,
    title: 'The Attic',
    pattern: 'preselection',
  },
  {
    line: 'Find the cancel path before you subscribe; keep the confirmation.',
    room: 12,
    title: 'The Cellar',
    pattern: 'hard to cancel',
  },
];

/** The six patterns that only ever lived in the Guide. Name and one line. */
export interface WanderingGhost {
  name: string;
  desc: string;
}

export const WANDERING: ReadonlyArray<WanderingGhost> = [
  { name: 'Disguised ads', desc: 'ads dressed as news, reviews or neutral rankings.' },
  {
    name: 'Forced action',
    desc: 'you must create an account or share data to finish a simple task.',
  },
  { name: 'Obstruction', desc: 'the path you want is made long and tiring on purpose.' },
  {
    name: 'Comparison prevention',
    desc: 'bundles, odd units or per-week prices that make prices hard to compare.',
  },
  { name: 'Addictive design', desc: 'endless feeds, autoplay and streaks that keep you there.' },
  { name: 'Currency confusion', desc: 'gems and coins that hide the real price.' },
];
