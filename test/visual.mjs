/**
 * Visual and responsive regression sweep.
 *
 * Renders every theme across four viewports in both colour schemes with
 * headless Chromium and fails on the things that unit tests cannot see:
 * horizontal overflow, JavaScript errors, missing or duplicated <h1>, and
 * content left invisible by the scroll-reveal.
 *
 *   npm run test:visual
 *   npm run test:visual -- --client brannigan --theme forge --shots ./shots
 *
 * Needs the one devDependency (playwright). Everything else in this repo runs
 * without it.
 */
import path from 'node:path';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { buildSite } from '../src/render/index.js';
import { normalizeProfile } from '../src/profile/normalize.js';
import { createStaticServer, listen } from '../src/preview/static-server.js';
import { THEME_IDS } from '../src/themes/index.js';
import { parseArgs } from '../src/cli/args.js';

const { flags } = parseArgs(process.argv.slice(2), { booleans: ['help', 'quick'] });

if (flags.help) {
  console.log(`Usage: node test/visual.mjs [--client <slug>] [--theme <id>] [--shots <dir>] [--quick]

  --quick   Only the viewport extremes (320 and 1440) on the key pages. Much
            faster, and still catches the overflow class of bug.`);
  process.exit(0);
}

const root = path.resolve(import.meta.dirname, '..');
const slug = flags.client ?? 'brannigan';
const clientDir = path.join(root, 'clients', slug);
const themes = flags.theme ? [flags.theme] : THEME_IDS;
const shotDir = flags.shots ? path.resolve(root, flags.shots) : null;

const profilePath = existsSync(path.join(clientDir, 'profile.json'))
  ? path.join(clientDir, 'profile.json')
  : path.join(clientDir, 'profile.draft.json');

if (!existsSync(profilePath)) {
  console.error(`No profile for "${slug}". Run \`avo harvest\` first, or pass --client.`);
  process.exit(1);
}

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('playwright is not installed. Run `npm install` (it is a devDependency).');
  process.exit(1);
}

const CHROMIUM_PATHS = [
  process.env.CHROMIUM_PATH,
  '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
].filter(Boolean);
const executablePath = CHROMIUM_PATHS.find((p) => existsSync(p));

const ALL_PAGES = ['/', '/services/', '/contact/', '/about/', '/gallery/', '/404.html'];
const ALL_VIEWPORTS = [
  ['narrow', { width: 320, height: 720 }],
  ['phone', { width: 390, height: 844 }],
  ['tablet', { width: 768, height: 1024 }],
  ['desktop', { width: 1440, height: 1000 }],
];

// Overflow surfaces at the extremes, so --quick keeps 320 and 1440 and drops
// the middle. Headless Chromium is slow enough that the distinction matters.
const PAGES = flags.quick ? ['/', '/services/', '/contact/'] : ALL_PAGES;
const VIEWPORTS = flags.quick ? [ALL_VIEWPORTS[0], ALL_VIEWPORTS[3]] : ALL_VIEWPORTS;
const SCHEMES = flags.quick ? ['light'] : ['light', 'dark'];

const profile = normalizeProfile(JSON.parse(await readFile(profilePath, 'utf8')));
if (shotDir) await mkdir(shotDir, { recursive: true });

console.log(`Building ${themes.length} theme(s) for "${slug}"…`);
for (const id of themes) {
  await buildSite(profile, {
    themeId: id, clientDir,
    outDir: path.join(clientDir, 'dist', id),
    siteUrl: profile.site.domain, minify: false,
  });
}

const browser = await chromium.launch(executablePath ? { executablePath } : {});
const issues = [];
let renders = 0;

for (const id of themes) {
  const server = createStaticServer(path.join(clientDir, 'dist', id));
  const { port } = await listen(server, 0);
  try {
    for (const [label, viewport] of VIEWPORTS) {
      for (const scheme of SCHEMES) {
        const page = await browser.newPage({ viewport, colorScheme: scheme });
        page.on('pageerror', (e) => issues.push(`${id}/${label}/${scheme}: JS error — ${e.message}`));

        for (const route of PAGES) {
          const res = await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'domcontentloaded' });
          renders++;
          if (!res || res.status() >= 400) {
            issues.push(`${id} ${route}: HTTP ${res ? res.status() : 'no response'}`);
            continue;
          }
          const audit = await page.evaluate(() => {
            const vw = document.documentElement.clientWidth;
            const wide = [];
            for (const el of document.querySelectorAll('*')) {
              const r = el.getBoundingClientRect();
              if (r.width > 0 && (r.right > vw + 1 || r.left < -1)) {
                const cls = String(el.className?.baseVal ?? el.className ?? '').split(' ')[0];
                wide.push(el.tagName.toLowerCase() + (cls ? '.' + cls : ''));
              }
            }
            // A <dialog> or overlay that is visible on load covers the whole
            // page. This has happened once; it must never ship again.
            const overlays = [...document.querySelectorAll('dialog, .lightbox')]
              .filter((el) => {
                const st = getComputedStyle(el);
                if (st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') return false;
                const r = el.getBoundingClientRect();
                return r.width > vw * 0.5 && r.height > window.innerHeight * 0.5;
              }).length;
            return {
              overflow: document.documentElement.scrollWidth - vw,
              culprits: [...new Set(wide)].slice(0, 4),
              h1: document.querySelectorAll('h1').length,
              untitled: !document.title,
              overlays,
            };
          });
          if (audit.overflow > 1) issues.push(`${id}/${label}/${scheme} ${route}: ${audit.overflow}px horizontal overflow [${audit.culprits.join(', ')}]`);
          if (audit.h1 !== 1) issues.push(`${id} ${route}: ${audit.h1} <h1> elements, expected 1`);
          if (audit.untitled) issues.push(`${id} ${route}: empty <title>`);
          if (audit.overlays) issues.push(`${id} ${route}: ${audit.overlays} full-screen overlay(s) visible on load`);
        }

        // Scroll-reveal must never leave content permanently invisible.
        if (scheme === 'light' && (label === 'desktop' || label === 'phone')) {
          // Not 'load': a blocked webfont request would stall the navigation
          // until the network timeout. The explicit wait covers the reveal
          // failsafe, which is what this check is actually about.
          await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(3200);
          const hidden = await page.evaluate(
            () => [...document.querySelectorAll('[data-reveal]')].filter((e) => !e.classList.contains('is-visible')).length,
          );
          if (hidden) issues.push(`${id}/${label}: ${hidden} element(s) still hidden after the reveal failsafe`);
          if (shotDir) {
            await page.screenshot({
              path: path.join(shotDir, `${id}-${label}.png`),
              fullPage: label === 'desktop',
            });
          }
        }
        await page.close();
      }
    }
  } finally {
    server.close();
  }
}
await browser.close();

console.log(`\n${renders} page renders across ${themes.length} theme(s), ${VIEWPORTS.length} viewport(s), ${SCHEMES.join(' + ')}.`);
if (issues.length) {
  console.error(`\n${issues.length} issue(s):`);
  for (const issue of issues) console.error(`  ✗ ${issue}`);
  process.exit(1);
}
console.log('✓ no overflow, no JS errors, one <h1> per page, no hidden content');
if (shotDir) console.log(`  screenshots: ${shotDir}`);
