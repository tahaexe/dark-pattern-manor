import { useState } from 'preact/hooks';
import type { HonestProps } from '../../engine/types';
import './room.css';

/**
 * Dirgewell, honest. "Download free sheet" downloads the free sheet at once —
 * no account, no gate — and shows a visible "Downloaded" state (no real file is
 * needed for the lesson). Beside it, saving to an account is offered as a
 * quiet, clearly optional control (the real best practice, no Forced action),
 * so downloading the free song sheet takes one click.
 *
 * The download button comes first among the honest controls, so a keyboard or
 * pointer walk that activates the honest controls in order completes the task
 * on the first one; the optional "save" control never gates or precedes it.
 */
export default function Honest({ onCompleteTask }: HonestProps) {
  const [downloaded, setDownloaded] = useState(false);
  const [saved, setSaved] = useState(false);

  const onDownload = () => {
    setDownloaded(true);
    onCompleteTask();
  };

  return (
    <div class="dirgewell dirgewell-honest">
      <div class="dirgewell-header">
        <p class="dirgewell-address">dirgewell.manor</p>
        <h2 class="dirgewell-masthead">Dirgewell</h2>
        <p class="dirgewell-tagline">Sheet music for the small hours</p>
      </div>

      <div class="dirgewell-song">
        <p class="dirgewell-song-title">"Lament for a Cold Hearth"</p>
        <p class="dirgewell-song-meta">Traditional · arranged for piano · free</p>
      </div>

      <div class="dirgewell-download-row">
        <button class="dirgewell-download" type="button" onClick={onDownload}>
          {downloaded ? 'Downloaded' : 'Download free sheet'}
        </button>
        {/* The account is a quiet, clearly optional extra — never a gate. */}
        <button
          class="dirgewell-optional"
          type="button"
          aria-pressed={saved}
          onClick={() => setSaved(true)}
        >
          {saved ? 'Saved to an account' : 'Save it to an account (optional)'}
        </button>
      </div>
    </div>
  );
}
