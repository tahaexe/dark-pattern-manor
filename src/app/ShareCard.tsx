import { useState } from 'preact/hooks';

/** The share sentence and title. Product copy, carried word for word. */
const SHARE_TITLE = 'Dark Pattern Manor';
const SHARE_TEXT = 'I named all twelve ghosts of Dark Pattern Manor.';

/**
 * The game's own address: the page's origin joined with the application base
 * path (`/dark-pattern-manor/` in the build, `/` in tests). Derived from the
 * page's own location so no host is ever hard-coded.
 */
export function siteUrl(): string {
  const base = (import.meta.env?.BASE_URL as string) || '/';
  return new URL(base, window.location.origin).href;
}

/**
 * The share card, in the manor's look. One sentence, the site address, and a
 * single "Share" button. The button uses the Web Share API when the browser
 * has it; otherwise it copies the text and URL to the clipboard and announces
 * "Copied" in a polite live region. Nothing is sent anywhere else: no tracking,
 * no third-party script.
 *
 * The sentence doubles as a link to the teaching page (`#/teach`), so a reader
 * of the card can reach the lesson materials. The shared text that is actually
 * shared (`SHARE_TEXT`) is unchanged — only the rendered heading gains the
 * in-page link.
 */
export default function ShareCard() {
  const [copied, setCopied] = useState(false);
  const url = siteUrl();

  const onShare = async () => {
    const nav = navigator as Navigator & {
      share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
    };
    if (typeof nav.share === 'function') {
      try {
        await nav.share({ title: SHARE_TITLE, text: SHARE_TEXT, url });
      } catch {
        // The player cancelled the share sheet. Nothing is sent, nothing is
        // tracked, and we do not fall back to the clipboard.
      }
      return;
    }
    // No Web Share API: copy the text and URL to the clipboard instead.
    try {
      await navigator.clipboard?.writeText(`${SHARE_TEXT} ${url}`);
    } catch {
      // Even if the copy is refused, tell the player plainly; nothing leaves
      // the page either way.
    }
    setCopied(true);
  };

  return (
    <section class="share-card" aria-labelledby="share-card-heading">
      <h2 id="share-card-heading" class="share-card-heading">
        <a class="share-card-link" href="#/teach">
          {SHARE_TEXT}
        </a>
      </h2>
      <p class="share-card-url">{url}</p>
      <button type="button" class="share-card-button" onClick={onShare}>
        Share
      </button>
      <p class="share-card-status" role="status" aria-live="polite">
        {copied ? 'Copied' : ''}
      </p>
    </section>
  );
}
