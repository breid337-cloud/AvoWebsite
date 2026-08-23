import http from 'node:http';
import fsp from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.pdf': 'application/pdf', '.webmanifest': 'application/manifest+json',
};

export const mimeFor = (file) => MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';

/**
 * Minimal static file server used for previewing generated sites and for tests.
 * `transform` lets the preview command inject its theme-switcher bar.
 */
export function createStaticServer(root, { transform = null, onRequest = null } = {}) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let pathname = decodeURIComponent(url.pathname);
      if (onRequest) {
        const handled = await onRequest(req, res, pathname, url);
        if (handled) return;
      }

      let filePath = path.join(root, pathname);
      // Block traversal outside the served root.
      if (!path.resolve(filePath).startsWith(path.resolve(root))) {
        res.writeHead(403).end('Forbidden');
        return;
      }

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        const candidates = [
          path.join(filePath, 'index.html'),
          `${filePath}.html`,
          filePath.replace(/\/$/, '') + '/index.html',
        ];
        filePath = candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile()) ?? filePath;
      }

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        const notFound = path.join(root, '404.html');
        if (fs.existsSync(notFound)) {
          res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
          res.end(await fsp.readFile(notFound));
          return;
        }
        res.writeHead(404, { 'content-type': 'text/plain' }).end(`Not found: ${pathname}`);
        return;
      }

      const type = mimeFor(filePath);
      let body = await fsp.readFile(filePath);
      if (transform && type.startsWith('text/html')) {
        body = Buffer.from(await transform(body.toString('utf8'), pathname));
      }
      res.writeHead(200, {
        'content-type': type,
        'content-length': body.length,
        'cache-control': 'no-cache',
      });
      res.end(body);
    } catch (err) {
      res.writeHead(500, { 'content-type': 'text/plain' }).end(`Server error: ${err.message}`);
    }
  });
}

export function listen(server, port, host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve(server.address()));
  });
}
