import path from 'node:path';
import fsp from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { parseHtml, qs, qsa, attr, serialize, cleanText, rawText } from '../util/html.js';
import { escapeHtml } from '../util/text.js';
import { walk, formatBytes } from '../util/fs.js';

const MIME = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.avif': 'image/avif' };

/**
 * Fold a built site into one self-contained HTML file.
 *
 * Every page, stylesheet and photograph ends up in a single document with no
 * external requests, so it can be emailed to a client, opened off a USB stick,
 * or viewed anywhere a browser runs. Images are held in one keyed map so a photo
 * shared between pages is embedded exactly once.
 */
export async function bundleSite(distDir, { imageWidth = 800, banner = null, title = null } = {}) {
  const files = (await walk(distDir)).filter((f) => f.endsWith('.html') && !f.startsWith('404'));
  if (!files.length) throw new Error(`No pages found in ${distDir}`);

  // Page key is the directory-style URL: '' for home, 'about/' and so on.
  const keyFor = (rel) => rel.replace(/index\.html$/, '').split(path.sep).join('/');
  const pages = [];
  for (const rel of files) {
    const html = await fsp.readFile(path.join(distDir, rel), 'utf8');
    pages.push({ key: keyFor(rel), rel, doc: parseHtml(html) });
  }
  pages.sort((a, b) => a.key.length - b.key.length || a.key.localeCompare(b.key));
  const keys = new Set(pages.map((p) => p.key));

  const images = new Map();
  const embed = async (distRelative) => {
    if (images.has(distRelative)) return images.get(distRelative);
    const file = path.join(distDir, distRelative);
    if (!existsSync(file)) return null;
    const buf = await fsp.readFile(file);
    const id = `i${images.size}`;
    images.set(distRelative, { id, uri: `data:${MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream'};base64,${buf.toString('base64')}` });
    return images.get(distRelative);
  };

  // Prefer a mid-size variant so a 4000px original never gets base64'd.
  const preferVariant = (rel) => {
    const m = /^(.*)-(\d+)\.webp$/.exec(rel);
    if (!m) return rel;
    const candidate = `${m[1]}-${imageWidth}.webp`;
    return existsSync(path.join(distDir, candidate)) ? candidate : rel;
  };

  const resolve = (pageKey, href) => {
    try {
      const base = new URL(pageKey || '', 'http://b/');
      const url = new URL(href, base);
      return decodeURIComponent(url.pathname.replace(/^\//, '')) + (url.hash || '');
    } catch { return null; }
  };

  const home = pages.find((p) => p.key === '');
  const header = qs(home.doc, 'header.site-header');
  const topbar = qs(home.doc, '.header__topbar');
  const drawer = qs(home.doc, '[data-mobile-nav]');
  const footer = qs(home.doc, 'footer.site-footer');

  const sections = [];
  for (const page of pages) {
    const main = qs(page.doc, 'main');
    if (!main) continue;

    for (const img of qsa(page.doc, 'img')) {
      const src = attr(img, 'src');
      if (!src || src.startsWith('data:')) continue;
      const rel = preferVariant(resolve(page.key, src));
      const entry = rel ? await embed(rel) : null;
      img.attrs.srcset = undefined;
      delete img.attrs.srcset;
      delete img.attrs.sizes;
      if (entry) { img.attrs.src = ''; img.attrs['data-img'] = entry.id; }
    }

    for (const a of qsa(page.doc, 'a')) {
      const href = attr(a, 'href');
      if (!href || /^(https?:|mailto:|tel:|#)/i.test(href)) continue;
      const target = resolve(page.key, href);
      const [pathPart, hash] = String(target).split('#');
      if (keys.has(pathPart)) {
        a.attrs['data-to'] = pathPart + (hash ? `#${hash}` : '');
        a.attrs.href = `#${pathPart || 'home'}`;
      }
    }

    for (const btn of qsa(page.doc, '[data-lightbox]')) {
      const rel = preferVariant(resolve(page.key, attr(btn, 'data-lightbox')));
      const entry = rel ? await embed(rel) : null;
      if (entry) btn.attrs['data-lightbox'] = `#${entry.id}`;
    }

    sections.push({
      key: page.key,
      title: cleanText(qs(page.doc, 'title')),
      label: page.key === '' ? 'Home' : page.key.replace(/\/$/, '').split('/').pop().replace(/-/g, ' '),
      html: serialize(main),
    });
  }

  // Header/footer are taken from home and shared, so their links resolve as-is.
  for (const root of [header, topbar, drawer, footer].filter(Boolean)) {
    for (const a of qsa(root, 'a')) {
      const href = attr(a, 'href');
      if (!href || /^(https?:|mailto:|tel:|#)/i.test(href)) continue;
      const target = resolve('', href);
      if (keys.has(target)) { a.attrs['data-to'] = target; a.attrs.href = `#${target || 'home'}`; }
    }
    for (const img of qsa(root, 'img')) {
      const src = attr(img, 'src');
      if (!src || src.startsWith('data:')) continue;
      const entry = await embed(preferVariant(resolve('', src)));
      delete img.attrs.srcset; delete img.attrs.sizes;
      if (entry) { img.attrs.src = ''; img.attrs['data-img'] = entry.id; }
    }
  }

  const css = await fsp.readFile(path.join(distDir, 'styles.css'), 'utf8');
  const fontLink = qs(home.doc, 'link[href*="fonts.googleapis.com"]');
  const fontHref = fontLink ? attr(fontLink, 'href') : '';
  const docTitle = title || cleanText(qs(home.doc, 'title'));
  const imageMap = Object.fromEntries([...images.values()].map((v) => [v.id, v.uri]));

  const html = `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(docTitle)}</title>
${fontHref ? `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${escapeHtml(fontHref)}">` : ''}
<style>
${css}
${BUNDLE_CSS}
</style>
</head>
<body class="page theme-bundle">
<a class="skip-link" href="#main">Skip to content</a>
${banner ? `<div class="avo-banner" role="note">${banner}</div>` : ''}
${topbar ? serialize(topbar) : ''}
${header ? serialize(header) : ''}
${drawer ? serialize(drawer) : ''}
<div id="main">
${sections.map((s) => `<div class="avo-page" data-key="${escapeHtml(s.key)}" data-title="${escapeHtml(s.title)}" hidden>${s.html}</div>`).join('\n')}
</div>
${footer ? serialize(footer) : ''}
<script id="avo-images" type="application/json">${JSON.stringify(imageMap)}</script>
<script>${BUNDLE_JS}</script>
</body>
</html>
`;

  return { html, pages: sections.length, images: images.size, bytes: Buffer.byteLength(html) };
}

const BUNDLE_CSS = `
/* Single-file preview shell */
.avo-page[hidden] { display: none; }
.avo-banner {
  position: sticky; top: 0; z-index: 60;
  display: flex; gap: .5rem; align-items: center; justify-content: center;
  padding: .5rem 1rem; text-align: center;
  font-family: var(--font-body); font-size: .8125rem; line-height: 1.35;
  background: var(--inverse-bg); color: var(--inverse-text);
  border-bottom: 1px solid color-mix(in srgb, var(--inverse-text) 20%, transparent);
}
.avo-banner strong { font-weight: 700; }
.site-header { top: 0; }
.contact-form[data-preview] { position: relative; }
.avo-formnote {
  margin-top: var(--space-4); padding: var(--space-5);
  border-radius: var(--radius); font-size: var(--step--1);
  background: var(--surface-2); color: var(--text-muted);
}
`;

const BUNDLE_JS = `
(function () {
  var doc = document;
  var imgs = {};
  try { imgs = JSON.parse(doc.getElementById('avo-images').textContent); } catch (e) {}
  doc.querySelectorAll('[data-img]').forEach(function (el) {
    var uri = imgs[el.getAttribute('data-img')];
    if (uri) el.src = uri;
  });

  var pages = [].slice.call(doc.querySelectorAll('.avo-page'));
  function show(key) {
    var found = false;
    pages.forEach(function (p) {
      var match = p.getAttribute('data-key') === key;
      p.hidden = !match;
      if (match) { found = true; doc.title = p.getAttribute('data-title') || doc.title; }
    });
    if (!found && key !== '') return show('');
    doc.querySelectorAll('[data-to]').forEach(function (a) {
      var to = a.getAttribute('data-to').split('#')[0];
      var on = to === key;
      a.classList.toggle('is-current', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    return true;
  }

  doc.addEventListener('click', function (e) {
    var a = e.target.closest('[data-to]');
    if (!a) return;
    e.preventDefault();
    var parts = a.getAttribute('data-to').split('#');
    show(parts[0]);
    var drawer = doc.querySelector('[data-mobile-nav]');
    var toggle = doc.querySelector('[data-nav-toggle]');
    if (drawer && !drawer.hidden) { drawer.hidden = true; doc.body.classList.remove('nav-open'); if (toggle) toggle.setAttribute('aria-expanded', 'false'); }
    if (parts[1]) {
      var t = doc.getElementById(parts[1]);
      if (t) { t.scrollIntoView({ behavior: 'smooth' }); return; }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  show('');

  var toggle = doc.querySelector('[data-nav-toggle]');
  var drawer = doc.querySelector('[data-mobile-nav]');
  if (toggle && drawer) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      drawer.hidden = !open;
      doc.body.classList.toggle('nav-open', open);
    });
  }

  var header = doc.querySelector('[data-header]');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-stuck', window.scrollY > 8); };
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
  }

  if (typeof HTMLDialogElement === 'function') {
    var dlg = doc.createElement('dialog');
    dlg.className = 'lightbox';
    dlg.innerHTML = '<button class="lightbox__close" type="button" aria-label="Close">' +
      '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>' +
      '</button><div><img alt=""><p class="lightbox__caption"></p></div>';
    doc.body.appendChild(dlg);
    var big = dlg.querySelector('img'); var cap = dlg.querySelector('.lightbox__caption');
    doc.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-lightbox]');
      if (!btn) return;
      var key = btn.getAttribute('data-lightbox').replace(/^#/, '');
      big.src = imgs[key] || '';
      big.alt = btn.getAttribute('data-caption') || '';
      cap.textContent = btn.getAttribute('data-caption') || '';
      dlg.showModal();
    });
    dlg.querySelector('.lightbox__close').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  }

  doc.querySelectorAll('.contact-form').forEach(function (form) {
    form.setAttribute('data-preview', '');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = form.querySelector('.avo-formnote');
      if (!note) {
        note = doc.createElement('p');
        note.className = 'avo-formnote';
        note.setAttribute('role', 'status');
        form.appendChild(note);
      }
      note.textContent = 'This is a preview, so the form is not connected. On the live site it sends straight to the bar.';
    });
  });
})();
`;
