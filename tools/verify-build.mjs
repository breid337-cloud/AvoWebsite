/**
 * Check a built site the way a browser sees it.
 *
 *   node tools/verify-build.mjs <base-url> [path ...]
 *
 * CLAUDE.md names the useful assertion: scrollWidth - clientWidth === 0 at
 * 320/390/768/1440 in both colour schemes. This runs that, plus broken images,
 * exactly one h1, console errors and any response of 400 or worse — because a
 * page can pass the overflow check while serving nothing but alt text.
 */
import { chromium } from 'playwright';

const [base, ...rest] = process.argv.slice(2);
if (!base) {
  console.error('usage: node tools/verify-build.mjs <base-url> [path ...]');
  process.exit(1);
}
// Accept "about/" as well as "/about/": Git Bash on Windows rewrites a leading
// slash into a drive path before the script ever sees it.
const paths = (rest.length ? rest : ['/']).map((p) => (p.startsWith('/') ? p : `/${p}`));
const VIEWPORTS = [[320, 720, 'narrow'], [390, 844, 'mobile'], [768, 1024, 'tablet'], [1440, 900, 'desktop']];

const browser = await chromium.launch();
let checked = 0;
let bad = 0;

for (const [width, height, label] of VIEWPORTS) {
  for (const colorScheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width, height }, colorScheme });
    for (const p of paths) {
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
      page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${new URL(r.url()).pathname}`); });

      await page.goto(base.replace(/\/$/, '') + p, { waitUntil: 'networkidle', timeout: 60000 });
      // What we want to know is whether every image the page references
      // actually loads, not whether the lazy loader fires. Scrolling to trigger
      // it is unreliable — scroll faster than the browser reacts and the images
      // below the fold are never requested at all, which reads as a failure.
      // So ask for them directly, then wait for them to finish.
      await page.evaluate(() => {
        for (const i of document.images) if (i.loading === 'lazy') i.loading = 'eager';
      });
      await page.evaluate(async () => {
        // Only images that were given a src are ours to wait for. A lightbox
        // keeps an empty <img> in a closed dialog and fills it on open; that is
        // not a broken image, and counting it reported a fault on every page.
        const real = () => [...document.images].filter((i) => i.getAttribute('src'));
        const pending = () => real().filter((i) => !i.complete);
        const deadline = Date.now() + 15000;
        while (pending().length && Date.now() < deadline) {
          await Promise.race([
            Promise.all(pending().map((i) => i.decode().catch(() => {}))),
            new Promise((r) => setTimeout(r, 500)),
          ]);
        }
      });

      const res = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        // complete && naturalWidth === 0 is the definitive failed-to-load
        // state. Testing !complete instead catches images still arriving.
        broken: [...document.images]
          .filter((i) => i.getAttribute('src') && i.complete && i.naturalWidth === 0)
          .map((i) => i.currentSrc || i.src),
        stillLoading: [...document.images].filter((i) => i.getAttribute('src') && !i.complete).length,
        h1: document.querySelectorAll('h1').length,
      }));

      const problems = [];
      if (res.overflow !== 0) problems.push(`scrolls sideways by ${res.overflow}px`);
      if (res.broken.length) problems.push(`${res.broken.length} image(s) failed to load, e.g. ${res.broken[0]}`);
      if (res.stillLoading) problems.push(`${res.stillLoading} image(s) had not finished after 15s`);
      if (res.h1 !== 1) problems.push(`${res.h1} h1 headings`);
      for (const e of [...new Set(errors)].slice(0, 3)) problems.push(e);

      checked++;
      if (problems.length) {
        bad++;
        console.log(`FAIL  ${label}/${colorScheme} ${p}`);
        for (const x of problems) console.log(`        ${x}`);
      }
      await page.close();
    }
    await ctx.close();
  }
}

await browser.close();
console.log(bad === 0
  ? `\nOK — ${checked} page/viewport/scheme combinations clean`
  : `\n${bad} of ${checked} combinations have problems`);
process.exit(bad === 0 ? 0 : 1);
