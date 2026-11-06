import type { GuideEntry } from '../engine/types';

export interface GuideCardProps {
  /** The room's pattern name, used as the guide title. */
  pattern: string;
  guide: GuideEntry;
  onClose?: () => void;
}

/**
 * The Ghost Guide card. Renders only `RoomData.guide` plus the pattern name:
 * a two-sentence definition, where you meet it, a US line and an EU line each
 * with a real https source link, and one protection tip. Hard-codes nothing
 * brand- or pattern-specific.
 */
export default function GuideCard({ pattern, guide, onClose }: GuideCardProps) {
  return (
    <div class="guide-card">
      {onClose ? (
        <button class="guide-close" onClick={() => onClose()} aria-label="Close guide" type="button">
          ×
        </button>
      ) : null}

      <h2 class="guide-title">{pattern}</h2>

      <p class="guide-definition">{guide.definition}</p>

      <div class="guide-section">
        <p class="guide-label">Where you meet it</p>
        <p class="guide-definition">{guide.whereYouMeetIt}</p>
      </div>

      <div class="guide-section">
        <p class="guide-label">United States</p>
        <p class="guide-source">
          <a href={guide.us.url} target="_blank" rel="noopener noreferrer">
            {guide.us.sourceLabel}
          </a>
        </p>
      </div>

      <div class="guide-section">
        <p class="guide-label">European Union</p>
        <p class="guide-source">
          <a href={guide.eu.url} target="_blank" rel="noopener noreferrer">
            {guide.eu.sourceLabel}
          </a>
        </p>
      </div>

      <p class="guide-tip">
        <strong>Tip:</strong> {guide.tip}
      </p>
    </div>
  );
}
