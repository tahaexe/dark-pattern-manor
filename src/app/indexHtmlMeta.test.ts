import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * Read the shipped page shell as text (not a rendered DOM) so this test checks
 * the file that actually deploys. Resolved relative to this test file, so no
 * machine-specific path is baked in: src/app -> repo root -> index.html.
 */
function readIndexHtml(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const indexPath = resolve(here, '..', '..', 'index.html');
  return readFileSync(indexPath, 'utf8');
}

/** Find a <meta> tag's content by its property/name attribute. */
function metaContent(html: string, attr: 'property' | 'name', key: string): string | null {
  // Match <meta ... property="key" ... content="VALUE" ...> in either attr order.
  const patterns = [
    new RegExp(`<meta[^>]*\\b${attr}=["']${escapeRe(key)}["'][^>]*\\bcontent=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]*\\bcontent=["']([^"']*)["'][^>]*\\b${attr}=["']${escapeRe(key)}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  return null;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('index.html link-preview metadata', () => {
  const html = readIndexHtml();

  it('has the Open Graph title, description, and type', () => {
    expect(metaContent(html, 'property', 'og:title')).toBe('Dark Pattern Manor');
    expect(metaContent(html, 'property', 'og:description')).toBe(
      'Twelve haunted web pages, one dark pattern each: name the ghost, free the honest twin.',
    );
    expect(metaContent(html, 'property', 'og:type')).toBe('website');
  });

  it('has an og:image under the base path ending in og-card.png, with size and alt', () => {
    const image = metaContent(html, 'property', 'og:image');
    expect(image).not.toBeNull();
    expect(image!.endsWith('og-card.png')).toBe(true);
    // 7 Nov: link-preview scrapers (Facebook, LinkedIn, X) need an absolute URL
    expect(image!.startsWith('https://')).toBe(true);
    expect(metaContent(html, 'property', 'og:image:width')).toBe('1200');
    expect(metaContent(html, 'property', 'og:image:height')).toBe('630');
    const alt = metaContent(html, 'property', 'og:image:alt');
    expect(alt).not.toBeNull();
    expect((alt as string).trim().length).toBeGreaterThan(0);
  });

  it('has the Twitter summary_large_image card', () => {
    expect(metaContent(html, 'name', 'twitter:card')).toBe('summary_large_image');
  });
});
