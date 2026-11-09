/**
 * Fetch the built Ghost Lantern bundle from the game's own site and run it,
 * exactly as clicking the bookmarklet would. This is the app's code, not the
 * lantern's: the lantern bundle itself makes no network request; this one
 * same-origin fetch of our own `./lantern.js` is the app fetching its own file
 * so the practice button and the ending-page link run the real bundle.
 *
 * The bundle is run through a `<script>` element whose textContent is the
 * fetched source (removed immediately after it runs), so no new URL is loaded
 * and the practice run matches the bookmarklet's "whole program is the text"
 * model.
 */

let cached: Promise<string> | null = null;

/** Fetch `./lantern.js` once, relative to the current page. */
export function fetchBundle(): Promise<string> {
  if (!cached) {
    cached = fetch('./lantern.js').then((r) => {
      if (!r.ok) throw new Error(`lantern bundle ${r.status}`);
      return r.text();
    });
  }
  return cached;
}

/** Drop the cached fetch (tests only). */
export function __resetBundleCacheForTests(): void {
  cached = null;
}

/** The bookmarklet string for a bundle's source. */
export function bookmarkletFor(source: string): string {
  return 'javascript:' + encodeURIComponent(source);
}

/** Run a bundle's source once in the current page. */
export function runBundleSource(source: string): void {
  const script = document.createElement('script');
  script.textContent = source;
  document.body.appendChild(script);
  // The IIFE has run synchronously on append; remove the node so no lantern
  // script tag lingers.
  script.remove();
}

/** Fetch and run the bundle (the practice "Try the lantern here" action). */
export async function runBundle(): Promise<void> {
  const source = await fetchBundle();
  runBundleSource(source);
}
