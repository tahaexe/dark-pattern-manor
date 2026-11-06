import { render } from 'preact';
import './styles/fonts.css';
import App from './app/App';
import './styles/tokens.css';
import './styles/base.css';
import './styles/look.css';

// Preload the two main font files so they are fetched as early as possible.
// Vite rewrites these to hashed, same-origin URLs; font-display: optional in
// fonts.css then avoids any font-swap layout shift.
import bodyFontUrl from '@fontsource/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-400-normal.woff2?url';
import displayFontUrl from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-700-normal.woff2?url';

function preloadFont(href: string) {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'font';
  link.type = 'font/woff2';
  link.href = href;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}

preloadFont(bodyFontUrl);
preloadFont(displayFontUrl);

render(<App />, document.getElementById('app')!);
