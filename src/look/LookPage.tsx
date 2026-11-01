import { useState } from 'preact/hooks';
import '../styles/manor.css';

export default function LookPage() {
  const [sliderValue, setSliderValue] = useState(50);
  const [selectedCard, setSelectedCard] = useState<'correct' | 'wrong' | 'different' | null>(null);
  const [showGuide, setShowGuide] = useState(true);

  // Ghost SVG: sheet ghost with eyes, smile, wavy hem (64 x 72)
  const ghostSvg = (
    <svg viewBox="0 0 64 72" xmlns="http://www.w3.org/2000/svg" className="ghost" aria-hidden="true">
      {/* Main sheet body */}
      <ellipse cx="32" cy="36" rx="22" ry="28" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      {/* Left eye - filled dot */}
      <circle cx="26" cy="30" r="2" fill="currentColor"/>
      {/* Right eye - filled dot */}
      <circle cx="38" cy="30" r="2" fill="currentColor"/>
      {/* Wavy hem */}
      <path d="M 20 58 Q 24 54 28 58 Q 32 54 36 58 Q 40 54 44 58" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Candle flame SVG for lantern button (24 x 24)
  const candleIcon = (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      {/* Candle body */}
      <rect x="9" y="12" width="6" height="10" stroke="currentColor" strokeWidth="2" fill="none"/>
      {/* Wick */}
      <line x1="12" y1="10" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5"/>
      {/* Flame */}
      <path d="M12 4 Q10 8 12 10 Q14 8 12 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  );

  // Half-closed eye icon for Visual interference card
  const eyeIcon = (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 7 Q6 7 2 12 Q6 17 12 17 Q18 17 22 12 Q18 7 12 7Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M6 12 L18 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
    </svg>
  );

  // Quill/feather icon for Trick wording card
  const quillIcon = (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 20 L8 6 L12 4 L16 6 L20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 18 L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="10" r="1" fill="currentColor"/>
    </svg>
  );

  // Bell icon for Nagging card
  const bellIcon = (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2 C9 2 7 4 7 7 L7 14 C7 15 6 16 5 17 L19 17 C18 16 17 15 17 14 L17 7 C17 4 15 2 12 2Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 17 Q9 20 12 20 Q15 20 15 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="20" r="0.5" fill="currentColor"/>
    </svg>
  );

  return (
    <>
      <div class="room-scene">
        <div class="room" aria-hidden="true">
          <div class="room-wall"></div>
        </div>

        <div class="task-bar">
          <h1 class="task-bar-title">The Foyer</h1>
          <span class="task-bar-task">Reject the cookies</span>
          <button class="task-bar-lantern" aria-label="Lantern (L)">
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
              <button class="cookie-reject possessed" aria-label="Reject all">
                <span>Reject all</span>
                <span class="mist mist-left" aria-hidden="true"></span>
                <span class="mist mist-above" aria-hidden="true"></span>
                <span class="mist mist-below" aria-hidden="true"></span>
                <div style="position: absolute; right: -44px; bottom: 55%; z-index: 2; width: 64px; height: 72px;">
                  {ghostSvg}
                </div>
              </button>
            </div>
          </div>
        </div>

        <div class="spell-cards">
          <button 
            class={`spell-card ${selectedCard === 'correct' ? 'is-focused' : ''} is-right`}
            onClick={() => setSelectedCard('correct')}
            aria-pressed={selectedCard === 'correct'}
          >
            {eyeIcon}
            <p class="spell-card-name">Visual interference</p>
          </button>

          <button 
            class={`spell-card ${selectedCard === 'wrong' ? 'is-focused' : ''} is-wrong`}
            onClick={() => setSelectedCard('wrong')}
            aria-pressed={selectedCard === 'wrong'}
          >
            {quillIcon}
            <p class="spell-card-name">Trick wording</p>
          </button>

          <button 
            class={`spell-card ${selectedCard === 'different' ? 'is-focused' : ''}`}
            onClick={() => setSelectedCard('different')}
            aria-pressed={selectedCard === 'different'}
          >
            {bellIcon}
            <p class="spell-card-name">Nagging</p>
          </button>
        </div>

        <div 
          role="status" 
          aria-live="polite" 
          className="spell-card-whisper-region"
          aria-label="Spell card feedback"
        >
          <p class="spell-card-whisper">Close, but the words here are plain. It's the look that lies.</p>
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
          <div class="cookie-banner-honest">
            <p class="cookie-title-honest">We value your privacy</p>
            <p class="cookie-description-honest">We and our 1,312 partners use cookies to personalise your experience.</p>
            <div class="split-buttons-equal">
              <button class="cookie-button-equal">Reject all</button>
              <button class="cookie-button-equal">Accept all</button>
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
          <svg key={i} class="candle-svg" viewBox="0 0 24 48" xmlns="http://www.w3.org/2000/svg">
            {/* Wax body */}
            <rect x="7" y="16" width="10" height="28" rx="2" fill="none" stroke="var(--parchment-2)" strokeWidth="1.5"/>
            {/* Wax drip down the side */}
            <path d="M 17 22 Q 19 24 18 28" fill="none" stroke="var(--parchment-2)" strokeWidth="1"/>
            {/* Wick */}
            <line x1="12" y1="10" x2="12" y2="16" stroke="var(--parchment-edge)" strokeWidth="2"/>
            {/* Brass holder (unlit) */}
            <ellipse cx="12" cy="46" rx="6" ry="3" fill="none" stroke="var(--gold)" strokeWidth="1.5"/>
          </svg>
        ))}
      </div>
    </>
  );
}
