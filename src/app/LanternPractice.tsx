import { useEffect, useRef, useState } from 'preact/hooks';
import { runBundle } from './runBundle';
import './lantern-practice.css';

/**
 * The Ghost Lantern practice page, reached at `#/lantern-practice`. A made-up
 * shop, "Hollowmere Goods" (every name fictional), with each of the seven v1
 * patterns planted once beside its honest twin — the false-alarm check: the
 * lantern should mark the haunted side and leave the honest side alone.
 *
 * "Try the lantern here" runs the same built `dist/lantern.js` the bookmarklet
 * runs (fetched from our own site), so the practice exercises the real bundle.
 *
 * No real company, product, person or price appears anywhere on this page.
 */
export default function LanternPractice() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [seconds, setSeconds] = useState(4 * 60 + 59);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // A self-owned countdown so the urgency detector sees a changing value. This
  // is the page's timer, not the lantern's.
  useEffect(() => {
    const id = window.setInterval(() => {
      setSeconds((s) => (s <= 0 ? 4 * 60 + 59 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div class="room-scene lantern-practice">
      <div class="room" aria-hidden="true">
        <div class="room-wall"></div>
      </div>

      <div class="manor-frame practice-card">
        <h1 class="practice-title" tabIndex={-1} ref={headingRef}>
          Hollowmere Goods — practice shop
        </h1>
        <p class="practice-lead">
          A made-up shop with seven tricks planted once each, beside the honest version of each.
          Light the lantern and see what it marks. Nothing here is a real company.
        </p>

        <p class="practice-actions">
          <button type="button" class="practice-try" onClick={() => void runBundle()}>
            Try the lantern here
          </button>{' '}
          <a class="practice-back" href="#/">
            Back to the door
          </a>
        </p>

        {/* 1. Preselection */}
        <section class="practice-pattern" aria-label="Preselection">
          <h2 class="practice-pattern-name">Preselection</h2>
          <div class="practice-pair">
            <div class="practice-side practice-haunted">
              <p class="practice-tag">Haunted</p>
              <label class="practice-check">
                <input type="checkbox" checked /> Yes, send me offers and partner newsletters
              </label>
            </div>
            <div class="practice-side practice-honest">
              <p class="practice-tag">Honest</p>
              <label class="practice-check">
                <input type="checkbox" /> Email me offers from Hollowmere
              </label>
            </div>
          </div>
        </section>

        {/* 2. Visual interference (cookie box) */}
        <section class="practice-pattern" aria-label="Visual interference">
          <h2 class="practice-pattern-name">Visual interference</h2>
          <div class="practice-pair">
            <div class="practice-side practice-haunted">
              <p class="practice-tag">Haunted</p>
              <div class="practice-cookie">
                <p>We value your privacy. We and our partners use cookies.</p>
                <button type="button" class="practice-cookie-accept">
                  Accept all
                </button>{' '}
                <a href="#practice-no" class="practice-cookie-reject">
                  reject
                </a>
              </div>
            </div>
            <div class="practice-side practice-honest">
              <p class="practice-tag">Honest</p>
              <div class="practice-cookie">
                <p>We use cookies. Your privacy matters.</p>
                <button type="button" class="practice-cookie-accept">
                  Accept all
                </button>{' '}
                <button type="button" class="practice-cookie-accept">
                  Reject all
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Fake urgency */}
        <section class="practice-pattern" aria-label="Fake urgency">
          <h2 class="practice-pattern-name">Fake urgency</h2>
          <div class="practice-pair">
            <div class="practice-side practice-haunted">
              <p class="practice-tag">Haunted</p>
              <p class="practice-urgency">
                Offer ends in{' '}
                <span class="practice-countdown">
                  {mm}:{ss}
                </span>
              </p>
            </div>
            <div class="practice-side practice-honest">
              <p class="practice-tag">Honest</p>
              <p class="practice-urgency">Ships in 2–3 working days.</p>
            </div>
          </div>
        </section>

        {/* 4. Fake scarcity */}
        <section class="practice-pattern" aria-label="Fake scarcity">
          <h2 class="practice-pattern-name">Fake scarcity</h2>
          <div class="practice-pair">
            <div class="practice-side practice-haunted">
              <p class="practice-tag">Haunted</p>
              <p class="practice-stock">Only 2 left!</p>
            </div>
            <div class="practice-side practice-honest">
              <p class="practice-tag">Honest</p>
              <p class="practice-stock">In stock.</p>
            </div>
          </div>
        </section>

        {/* 5. Fake social proof */}
        <section class="practice-pattern" aria-label="Fake social proof">
          <h2 class="practice-pattern-name">Fake social proof</h2>
          <div class="practice-pair">
            <div class="practice-side practice-haunted">
              <p class="practice-tag">Haunted</p>
              <p class="practice-watchers">17 people are viewing this right now</p>
            </div>
            <div class="practice-side practice-honest">
              <p class="practice-tag">Honest</p>
              <p class="practice-watchers">Rated 4.5 from 86 reviews since 2022.</p>
            </div>
          </div>
        </section>

        {/* 6. Confirmshaming */}
        <section class="practice-pattern" aria-label="Confirmshaming">
          <h2 class="practice-pattern-name">Confirmshaming</h2>
          <div class="practice-pair">
            <div class="practice-side practice-haunted">
              <p class="practice-tag">Haunted</p>
              <button type="button" class="practice-decline">
                No thanks, I like paying full price
              </button>
            </div>
            <div class="practice-side practice-honest">
              <p class="practice-tag">Honest</p>
              <button type="button" class="practice-decline">
                No thanks
              </button>
            </div>
          </div>
        </section>

        {/* 7. Trick wording */}
        <section class="practice-pattern" aria-label="Trick wording">
          <h2 class="practice-pattern-name">Trick wording</h2>
          <div class="practice-pair">
            <div class="practice-side practice-haunted">
              <p class="practice-tag">Haunted</p>
              <label class="practice-check">
                <input type="checkbox" /> Untick this box if you do not want to not receive offers
              </label>
            </div>
            <div class="practice-side practice-honest">
              <p class="practice-tag">Honest</p>
              <label class="practice-check">
                <input type="checkbox" /> Email me offers
              </label>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
