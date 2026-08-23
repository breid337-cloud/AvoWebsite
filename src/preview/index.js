import path from 'node:path';
import { createStaticServer, listen } from './static-server.js';
import { exists } from '../util/fs.js';
import { THEME_IDS, getTheme } from '../themes/index.js';

/**
 * Preview server with a floating theme switcher, so you can flip between
 * builds live in front of a client. Requires `avo build --all-themes`.
 */
export async function startPreview({ clientDir, distDir, theme = null, port = 4173, host = '127.0.0.1', compareUrl = '' }) {
  const themesDir = path.join(clientDir, 'dist');
  const available = THEME_IDS.filter((id) => exists(path.join(themesDir, id, 'index.html')));

  // Serve a specific theme folder, the requested dist, or the first built theme.
  let root = distDir;
  let activeTheme = theme;
  if (theme && exists(path.join(themesDir, theme))) {
    root = path.join(themesDir, theme);
  } else if (!exists(path.join(root, 'index.html')) && available.length) {
    activeTheme = available[0];
    root = path.join(themesDir, activeTheme);
  }

  if (!exists(path.join(root, 'index.html'))) {
    throw new Error(`Nothing to preview in ${root}. Run \`avo build\` first.`);
  }

  const bar = buildBar(available, activeTheme, compareUrl);

  const server = createStaticServer(root, {
    transform: (html) => (html.includes('</body>') ? html.replace('</body>', `${bar}\n</body>`) : html),
    onRequest: async (req, res, pathname) => {
      // /_theme/<id>/... serves a sibling theme build so the switcher can hop
      // between them without restarting the server.
      const match = /^\/_theme\/([a-z-]+)(\/.*)?$/.exec(pathname);
      if (!match) return false;
      const id = match[1];
      if (!available.includes(id)) {
        res.writeHead(404).end('Theme not built');
        return true;
      }
      res.writeHead(302, { location: `/?theme=${id}` });
      res.end();
      return true;
    },
  });

  const address = await listen(server, port, host);
  return { server, url: `http://${host}:${address.port}`, root, activeTheme, available };
}

function buildBar(available, activeTheme, compareUrl) {
  const options = available
    .map((id) => {
      const t = getTheme(id);
      return `<option value="${id}"${id === activeTheme ? ' selected' : ''}>${t.name} — ${t.tagline}</option>`;
    })
    .join('');

  return `
<div id="avo-bar" data-avo-preview>
  <style>
    #avo-bar { position: fixed; z-index: 9999; left: 50%; bottom: 16px; transform: translateX(-50%);
      display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 999px;
      background: rgba(18,20,26,.92); color: #fff; box-shadow: 0 12px 40px rgba(0,0,0,.35);
      font: 500 13px/1.2 system-ui, -apple-system, "Segoe UI", sans-serif; backdrop-filter: blur(10px);
      max-width: calc(100vw - 24px); }
    #avo-bar.is-hidden { transform: translateX(-50%) translateY(150%); }
    #avo-bar select, #avo-bar button, #avo-bar a { font: inherit; color: #fff; }
    #avo-bar select { background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.18);
      border-radius: 999px; padding: 6px 12px; cursor: pointer; max-width: 46vw; }
    #avo-bar select option { color: #111; }
    #avo-bar button, #avo-bar a { background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.18);
      border-radius: 999px; padding: 6px 12px; cursor: pointer; text-decoration: none; white-space: nowrap; }
    #avo-bar button:hover, #avo-bar a:hover { background: rgba(255,255,255,.22); }
    #avo-bar .avo-tag { opacity: .6; padding-left: 4px; }
    @media print { #avo-bar { display: none; } }
  </style>
  <span class="avo-tag">avo</span>
  <select id="avo-theme" aria-label="Preview theme">${options}</select>
  <button type="button" id="avo-mode" title="Toggle light/dark">◐</button>
  ${compareUrl ? `<a href="${compareUrl}" target="_blank" rel="noopener" title="Open the old site">old site</a>` : ''}
  <button type="button" id="avo-hide" title="Hide this bar">×</button>
  <script>
  (function () {
    var bar = document.getElementById('avo-bar');
    var sel = document.getElementById('avo-theme');
    if (sel) sel.addEventListener('change', function () {
      var p = location.pathname.replace(/^\\/_theme\\/[a-z-]+/, '');
      location.href = '/_theme/' + sel.value + (p || '/');
    });
    document.getElementById('avo-mode').addEventListener('click', function () {
      var el = document.documentElement;
      var now = el.getAttribute('data-theme');
      var dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      el.setAttribute('data-theme', now ? (now === 'dark' ? 'light' : 'dark') : (dark ? 'light' : 'dark'));
    });
    document.getElementById('avo-hide').addEventListener('click', function () {
      bar.classList.add('is-hidden');
      setTimeout(function () { bar.remove(); }, 300);
    });
  })();
  </script>
</div>`;
}
