import { useEffect, useRef } from 'preact/hooks';
import { CHECKLIST, WANDERING } from './checklist';
import './classroom.css';

/**
 * The teaching page, reached at `#/teach`. A plain document for teachers who
 * want to use Dark Pattern Manor in a lesson: what the game is, who it is for,
 * why it matters, a 45-minute lesson plan, six discussion questions, the
 * printable fourteen-rule checklist, the wandering ghosts, and a sources list.
 *
 * It is reachable without finishing the game (it is for the teacher, who may
 * not play all fourteen rooms first), so it is never gated on progress. The
 * checklist lines and the wandering ghosts come from the shared `./checklist`
 * module, the same data the ending uses, so the two never drift.
 *
 * A "Print this page" button calls `window.print()`; the print stylesheet in
 * `classroom.css` turns the page to ink on white with no backdrop, candles or
 * motion, starts the checklist on a new page, and prints each external link's
 * URL after it.
 */

/** One external reading: its full citation and the link's URL. */
interface Source {
  cite: string;
  url: string;
}

const SOURCES: ReadonlyArray<Source> = [
  {
    cite:
      'Mathur, A. et al. (2019). Dark Patterns at Scale: Findings from a Crawl of 11K Shopping Websites. Proc. ACM Human-Computer Interaction (CSCW).',
    url: 'https://arxiv.org/abs/1907.07032',
  },
  {
    cite: 'US Federal Trade Commission (2022). Bringing Dark Patterns to Light. Staff report.',
    url: 'https://www.ftc.gov/reports/bringing-dark-patterns-light',
  },
  {
    cite: 'Regulation (EU) 2022/2065, the Digital Services Act, Article 25.',
    url: 'https://eur-lex.europa.eu/eli/reg/2022/2065/oj',
  },
  {
    cite:
      'European Data Protection Board (2023). Report of the work undertaken by the Cookie Banner Taskforce.',
    url: 'https://www.edpb.europa.eu/system/files/documents/2023-01/edpb_20230118_report_cookie_banner_taskforce_en.pdf',
  },
  {
    cite: 'Deceptive Patterns (formerly darkpatterns.org), a public catalogue of examples.',
    url: 'https://www.deceptive.design/',
  },
];

/** The six discussion questions. Each has a bold lead-in and the rest of the line. */
interface Question {
  lead: string;
  rest: string;
}

const QUESTIONS: ReadonlyArray<Question> = [
  {
    lead: 'Spot it in the wild.',
    rest: 'Which room reminded you of a website or app you use? What exactly did that page do, and which ghost was it?',
  },
  {
    lead: 'Who benefits?',
    rest: 'For one pattern, who gains from it, who pays, and how much might it be worth to the company over a million users?',
  },
  {
    lead: 'Persuasion or manipulation?',
    rest: 'A big, bright "Buy" button is normal design. Where is the line between persuading someone and tricking them? Use two rooms as examples.',
  },
  {
    lead: 'The honest twin.',
    rest: 'The honest pages still sell things. What did they change, and would you trust that company more? Would it sell less?',
  },
  {
    lead: 'Rules and responsibility.',
    rest: 'Some of these patterns are banned in some places. Should they be banned everywhere? Who should be responsible: the designer, the manager who asked for it, the company, or the shopper?',
  },
  {
    lead: 'Design it honestly.',
    rest: 'Take one pattern and design the honest version for a real product you know. What would you have to give up?',
  },
];

/** The 45-minute lesson's four timetable rows. */
interface LessonRow {
  time: string;
  lead: string;
  rest: string;
}

const LESSON: ReadonlyArray<LessonRow> = [
  {
    time: '5 min',
    lead: 'Warm-up.',
    rest: 'Ask: "Have you ever clicked something you did not mean to? Paid for something you did not notice? Struggled to cancel?" Collect two or three stories without naming any pattern yet.',
  },
  {
    time: '20 min',
    lead: 'Play in pairs.',
    rest: 'Each pair plays the first three rooms together, then picks any three more. One student drives, the other reads the page aloud; swap after each room. Ask them to say out loud what made them suspicious before they open the lantern.',
  },
  {
    time: '10 min',
    lead: 'Name it.',
    rest: 'Pairs choose one room and explain to another pair: the trick, its name, and what the honest page did differently. Write the fourteen names on the board as they come up.',
  },
  {
    time: '10 min',
    lead: 'Discuss.',
    rest: 'Pick two or three questions below. End with the checklist: each student circles the two lines they will use this week.',
  },
];

export default function ClassroomPage() {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the page heading on entry, matching the room and ending
  // pattern.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const wanderingLine = WANDERING.map((g) => g.name.toLowerCase()).join(', ');

  return (
    <div class="room-scene classroom">
      <div class="room" aria-hidden="true">
        <div class="room-wall"></div>
      </div>

      <div class="manor-frame classroom-card">
        <h1 class="classroom-title" tabIndex={-1} ref={headingRef}>
          Teaching with Dark Pattern Manor
        </h1>

        <button type="button" class="classroom-print" data-print-hide onClick={() => window.print()}>
          Print this page
        </button>

        <p class="classroom-lead">
          <strong>A free browser game for one class period.</strong> Fourteen haunted rooms, each a
          familiar web page with one ghost in it: a real dark pattern. Students spot the trick, name
          it, and set the page free — the page turns honest beside its haunted twin, and they finish
          the task on the honest page. Stuck on a room? The lantern lights the trick. No sign-up, no
          ads, no tracking; progress is kept only in the student's own browser. It works on school
          laptops, tablets and phones, by mouse, touch, keyboard or screen reader.
        </p>

        <p class="classroom-para">
          <strong>Good for:</strong> digital literacy and media education, consumer and citizenship
          education, UX and interaction design, human-computer interaction and design ethics
          courses. Ages 13 and up.
        </p>

        <p class="classroom-para">
          <strong>Why it matters:</strong> dark patterns are interface designs that steer people
          into choices they would not otherwise make. They are common: a study of about 11,000
          shopping websites found 1,818 instances (Mathur et al., 2019). Regulators act against
          them: the US Federal Trade Commission described the practice in a 2022 staff report, and
          the EU's Digital Services Act bans many of them on online platforms (Article 25). Naming a
          trick is the first step to resisting it, and naming is the hard part.
        </p>

        <section class="classroom-section" aria-labelledby="classroom-lesson-heading">
          <h2 id="classroom-lesson-heading" class="classroom-heading">
            A 45-minute lesson
          </h2>
          <div class="classroom-table-wrap">
            <table class="classroom-table">
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">What happens</th>
                </tr>
              </thead>
              <tbody>
                {LESSON.map((row) => (
                  <tr key={row.time}>
                    <th scope="row" class="classroom-table-time">
                      {row.time}
                    </th>
                    <td>
                      <strong>{row.lead}</strong> {row.rest}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p class="classroom-para">
            <strong>Shorter (20 min):</strong> play rooms 1, 5 and 11 together on the projector;
            discuss one question.
          </p>
          <p class="classroom-para">
            <strong>Longer (two lessons):</strong> second lesson, students bring a screenshot of a
            real page that worried them and test it against the checklist; then redesign it honestly
            on paper.
          </p>
        </section>

        <section class="classroom-section" aria-labelledby="classroom-questions-heading">
          <h2 id="classroom-questions-heading" class="classroom-heading">
            Six questions for discussion
          </h2>
          <ol class="classroom-questions">
            {QUESTIONS.map((q) => (
              <li key={q.lead} class="classroom-question">
                <strong>{q.lead}</strong> {q.rest}
              </li>
            ))}
          </ol>
        </section>

        <section
          class="classroom-section classroom-checklist-section"
          aria-labelledby="classroom-checklist-heading"
        >
          <h2 id="classroom-checklist-heading" class="classroom-heading">
            Fourteen rules for the real web (printable)
          </h2>
          <p class="classroom-sub">
            <em>The same checklist players earn at the end of the manor. One line per room.</em>
          </p>
          <ol class="classroom-checklist">
            {CHECKLIST.map((item) => (
              <li key={item.room} class="classroom-checklist-item">
                {item.line}{' '}
                <span class="classroom-checklist-room">
                  ({item.title}: {item.pattern})
                </span>
              </li>
            ))}
          </ol>
          <p class="classroom-para">
            <strong>More ghosts to watch for:</strong> {wanderingLine}.
          </p>
        </section>

        <section class="classroom-section" aria-labelledby="classroom-sources-heading">
          <h2 id="classroom-sources-heading" class="classroom-heading">
            Sources and further reading
          </h2>
          <ul class="classroom-sources">
            {SOURCES.map((s) => (
              <li key={s.url} class="classroom-source">
                {s.cite}{' '}
                <a
                  class="classroom-link"
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {s.url}
                </a>
              </li>
            ))}
          </ul>
          <p class="classroom-closing">
            <em>
              Every brand in the manor is invented. The game and this page are open source under the{' '}
              <a
                class="classroom-link"
                href="https://github.com/tahaexe/dark-pattern-manor/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
              >
                MIT License
              </a>
              : copy and adapt them for your class, keeping the licence notice.
            </em>
          </p>
        </section>

        <p class="classroom-back">
          <a href="#/">Back to the door</a>
        </p>
      </div>
    </div>
  );
}
