import { useState } from 'preact/hooks';
import '../styles/manor.css';

export default function LookPage() {
  const [sliderValue, setSliderValue] = useState(50);
  const [selectedCard, setSelectedCard] = useState<'correct' | 'wrong' | 'different' | null>('correct');
  const [showGuide, setShowGuide] = useState(true);

  const candleIcon = (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2v6M12 8c1.5 0 2.5 1 2.5 2.5v3c0 1-0.5 2-1.5 2h-2c-1 0-1.5-1-1.5-2v-3c0-1.5 1-2.5 2.5-2.5Z" />
      <ellipse cx="12" cy="15.5" rx="2.5" ry="2" />
    </svg>
  );

  const eyeIcon = (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 5C7 5 2.73 8.11 1 12.46c1.73 4.35 6 7.54 11 7.54s9.27-3.19 11-7.54C21.27 8.11 17 5 12 5Zm0 10c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3Zm0-5c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2Z" />
    </svg>
  );

  const quillIcon = (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Z" />
      <path d="M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z" />
    </svg>
  );

  const bellIcon = (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8Zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5Zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11Zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5Z" />
    </svg>
  );

  return (
    <div class="look-page">
      <div class="task-bar">
        <h1 class="task-bar-title">The Foyer</h1>
        <span class="task-bar-task">Reject the cookies</span>
        <button class="task-bar-lantern" aria-label="Lantern">
          {candleIcon}
          <span class="task-bar-hint">L</span>
        </button>
      </div>

      <div class="manor-frame">
        <div class="gazette-header">
          <p class="gazette-address">gravemoor-gazette.manor</p>
          <h2 class="gazette-masthead">The Gravemoor Gazette</h2>
        </div>

        <article class="gazette-content">
          <h3>Fog rolls in over the moor</h3>
          <p>
            Lamplighters report the thickest fog in forty years. The ferry to Hollow Point will run at half speed until Thursday, and the night editor asks readers to keep a candle in the window.
          </p>
        </article>

        <div class="cookie-banner">
          <div class="cookie-text">
            <p class="cookie-title">We value your privacy</p>
            <p class="cookie-description">We and our 1,312 partners use cookies to personalise your experience.</p>
          </div>
          <div class="cookie-buttons">
            <button class="cookie-accept">Accept all</button>
            <button class="cookie-reject possessed">
              Reject all
              <svg class="cookie-ghost" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 2c-3 0-5 2-5 4v2c0 1.5.5 3 2 3.5m6-9.5c3 0 5 2 5 4v2c0 1.5-.5 3-2 3.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div class="spell-cards">
        <div 
          class={`spell-card ${selectedCard === 'correct' ? 'is-focused' : ''} is-right`}
          onClick={() => setSelectedCard('correct')}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setSelectedCard('correct');
            }
          }}
        >
          <svg class="spell-card-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            {eyeIcon}
          </svg>
          <p class="spell-card-name">Visual interference</p>
        </div>

        <div 
          class={`spell-card ${selectedCard === 'wrong' ? 'is-focused' : ''} is-wrong`}
          onClick={() => setSelectedCard('wrong')}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setSelectedCard('wrong');
            }
          }}
        >
          <svg class="spell-card-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            {quillIcon}
          </svg>
          <p class="spell-card-name">Trick wording</p>
          {selectedCard === 'wrong' && (
            <p class="spell-card-whisper">Close, but the words here are plain. It's the look that lies.</p>
          )}
        </div>

        <div 
          class={`spell-card ${selectedCard === 'different' ? 'is-focused' : ''}`}
          onClick={() => setSelectedCard('different')}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setSelectedCard('different');
            }
          }}
        >
          <svg class="spell-card-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            {bellIcon}
          </svg>
          <p class="spell-card-name">Nagging</p>
        </div>
      </div>

      <div class="split">
        <div class="split-side haunted">
          <span class="split-label">Haunted</span>
          <div class="cookie-banner-split">
            <p class="cookie-title">We value your privacy</p>
            <p class="cookie-description">We and our 1,312 partners use cookies to personalise your experience.</p>
            <div class="split-buttons">
              <button class="cookie-accept-split">Accept all</button>
              <button class="cookie-reject-split">Reject all</button>
            </div>
          </div>
        </div>
        <div class="split-side honest">
          <span class="split-label">Honest</span>
          <div class="cookie-banner-split">
            <p class="cookie-title">We value your privacy</p>
            <p class="cookie-description">We and our 1,312 partners use cookies to personalise your experience.</p>
            <div class="split-buttons-equal">
              <button class="cookie-button-equal">Reject all</button>
              <button class="cookie-button-equal">Accept all</button>
              <a href="#" class="cookie-settings">Settings</a>
            </div>
          </div>
        </div>
      </div>

      <div class="split-control">
        <label class="split-label-text">Haunted</label>
        <input 
          type="range" 
          class="split-range" 
          min="0" 
          max="100" 
          value={sliderValue}
          onInput={(e) => setSliderValue(Number((e.target as HTMLInputElement).value))}
          aria-label="Before and After slider"
        />
        <label class="split-label-text">Honest</label>
      </div>

      {showGuide && (
        <div class="guide-card">
          <button 
            class="guide-close"
            onClick={() => setShowGuide(false)}
            aria-label="Close guide"
          >
            ×
          </button>
          
          <h2 class="guide-title">Visual interference</h2>
          
          <p class="guide-definition">
            The choice the company wants is big and bright; the one you may want is faded, tiny or hidden in plain sight. Nothing is missing, it's just made hard to see.
          </p>

          <div class="guide-section">
            <p class="guide-label">Where you meet it</p>
            <p class="guide-definition">
              Cookie banners, cancel screens, upgrade prompts, unsubscribe pages.
            </p>
          </div>

          <div class="guide-section">
            <p class="guide-label">🇺🇸 United States</p>
            <p class="guide-source">
              The FTC's 2022 staff report lists a bold Accept beside a greyed-out, small Reject as subverting privacy choices.
            </p>
            <p class="guide-source" style="margin-top: 0.5rem;">
              <a href="https://www.ftc.gov/system/files/ftc_gov/pdf/P214800%20Dark%20Patterns%20Report%209.14.2022%20-%20FINAL.pdf" target="_blank" rel="noopener noreferrer">
                Source: FTC, Bringing Dark Patterns to Light (2022)
              </a>
            </p>
          </div>

          <div class="guide-section">
            <p class="guide-label">🇪🇺 European Union</p>
            <p class="guide-source">
              EU data protection authorities said a banner must not clearly push you to accept, and that a reject button too faded to read can be misleading.
            </p>
            <p class="guide-source" style="margin-top: 0.5rem;">
              <a href="https://www.edpb.europa.eu/system/files/documents/2023-01/edpb_20230118_report_cookie_banner_taskforce_en.pdf" target="_blank" rel="noopener noreferrer">
                Source: EDPB cookie banner taskforce report (2023)
              </a>
            </p>
          </div>

          <p class="guide-tip">
            <strong>Tip:</strong> Find the quiet option before you click the loud one.
          </p>
        </div>
      )}

      <div class="candles" role="status" aria-label="Progress: 0 of 12 rooms completed">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} class="candle" />
        ))}
      </div>
    </div>
  );
}
