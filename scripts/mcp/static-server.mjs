// A small static server that serves the built site from dist/ under the Vite
// base path, on an ephemeral 127.0.0.1 port, for the headless-browser tools.
//
// The path mapper (mapUrlToFile) is pure and exported so its base-path, SPA
// fallback and traversal-guard rules can be unit-tested without a socket.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';

/** The Vite base path the site is built under (vite.config.ts `base`). */
export const BASE_PATH = '/dark-pattern-manor/';

/** File extension → MIME type for the assets the build emits. */
export const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
};

export function contentTypeFor(filePath) {
  return CONTENT_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream';
}

/**
 * Map a request URL path to a file under distDir, following the base-path,
 * SPA-fallback and traversal rules. Pure: it does not read the filesystem
 * except to check a resolved file's existence, which callers pass in via
 * `fileExists` so the mapping can be tested in isolation.
 *
 * @param {string} urlPath  the request path (no query string)
 * @param {{ base?: string, distDir: string, fileExists?: (p: string) => boolean }} opts
 * @returns {{ filePath: string } | { spaFallback: true, filePath: string } | { outside: true }}
 */
export function mapUrlToFile(urlPath, opts) {
  const base = opts.base ?? BASE_PATH;
  const distDir = resolve(opts.distDir);
  const fileExists = opts.fileExists ?? existsSync;
  const indexFile = join(distDir, 'index.html');

  let path = decodePath(urlPath);
  // Strip any query/hash defensively (callers pass the path only, but be safe).
  path = path.split('?')[0].split('#')[0];

  // The root or exactly the base (with or without trailing slash) → index.html.
  const baseNoSlash = base.endsWith('/') ? base.slice(0, -1) : base;
  if (path === '/' || path === '' || path === base || path === baseNoSlash) {
    return { filePath: indexFile };
  }

  // Everything the site serves lives under the base path.
  if (!path.startsWith(base)) {
    return { outside: true };
  }

  const rel = path.slice(base.length);
  const resolved = resolve(distDir, rel);

  // Traversal guard: the resolved path must stay within distDir.
  if (resolved !== distDir && !resolved.startsWith(distDir + sep)) {
    return { outside: true };
  }

  if (fileExists(resolved)) {
    return { filePath: resolved };
  }

  // Unknown path under the base with no file extension → SPA fallback.
  if (extname(resolved) === '') {
    return { spaFallback: true, filePath: indexFile };
  }

  // A missing file that does have an extension is a genuine 404; signal it by
  // returning the resolved path that does not exist, so the server replies 404.
  return { filePath: resolved };
}

function decodePath(urlPath) {
  try {
    return decodeURIComponent(urlPath);
  } catch {
    return urlPath;
  }
}

/**
 * Start the static server bound to 127.0.0.1 on an ephemeral port.
 * @param {{ distDir: string, base?: string }} opts
 * @returns {Promise<{ port: number, origin: string, baseUrl: string, close: () => Promise<void> }>}
 */
export function start({ distDir, base = BASE_PATH }) {
  const dist = resolve(distDir);

  const server = createServer(async (req, res) => {
    try {
      const urlPath = (req.url || '/').split('?')[0];
      const mapped = mapUrlToFile(urlPath, { base, distDir: dist });

      if ('outside' in mapped && mapped.outside) {
        res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('403 Forbidden');
        return;
      }

      const filePath = mapped.filePath;
      if (!existsSync(filePath)) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
      }

      const body = await readFile(filePath);
      res.writeHead(200, {
        'content-type': contentTypeFor(filePath),
        'content-length': body.length,
        'cache-control': 'no-store',
      });
      res.end(body);
    } catch (err) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('500 ' + (err && err.message ? err.message : 'error'));
    }
  });

  return new Promise((resolvePromise, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      const origin = `http://127.0.0.1:${port}`;
      resolvePromise({
        port,
        origin,
        baseUrl: `${origin}${base}`,
        close: () =>
          new Promise((done) => {
            server.close(() => done());
          }),
      });
    });
  });
}
