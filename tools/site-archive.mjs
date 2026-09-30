/**
 * Capture what a site looks like before it changes.
 *
 *   node tools/site-archive.mjs <url> <slug> [--pages 40]
 *
 * The harvester captures what a site *says*; this captures what it *looked
 * like* — full-page screenshots at desktop and phone width, the served HTML,
 * and the response time per page. Written for sites that are about to be
 * redirected away, where there is no second chance to look.
 *
 * Output: clients/<slug>/archive/{desktop,mobile,html}/ and index.json.
 * Needs playwright, which is an optional dependency — it says so and stops if
 * it is missing rather than failing halfway through a capture.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [url, slug] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const max = Number(process.argv[process.argv.indexOf('--pages') + 1]) || 40;
if (!url || !slug) {
  console.error('usage: node tools/site-archive.mjs <url> <slug> [--pages 40]');
  process.exit(1);
}

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { console.error('playwright is not installed. Run `npm i -D playwright` first.'); process.exit(1); }

const OUT = join('clients', slug, 'archive');
const origin = new URL(url).origin;

/** Every page the site itself admits to, from its sitemap. */
async function sitemapUrls(base) {
  const seen = new Set();
  const queue = [`${base}/sitemap_index.xml`, `${base}/sitemap.xml`];
  const pages = [];
  while (queue.length && pages.length < max) {
    const at = queue.shift();
    if (seen.has(at)) continue;
    seen.add(at);
    let xml;
    try {
      const res = await fetch(at, { redirect: 'follow' });
      if (!res.ok) continue;
      xml = await res.text();
    } catch { continue; }
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
    // A sitemap index points at more sitemaps; a sitemap points at pages.
    if (/<sitemapindex/i.test(xml)) queue.push(...locs);
    else for (const l of locs) if (!pages.includes(l) && pages.length < max) pages.push(l);
  }
  return pages.length ? pages : [base + '/'];
}

const urls = await sitemapUrls(origin);
console.log(`archiving ${urls.length} page(s) from ${origin}\n`);

const name = (u) => {
  const p = new URL(u).pathname.replace(/^\/|\/$/g, '');
  return (p === '' ? 'home' : p.replace(/\//g, '-')).slice(0, 80);
};

for (const d of ['desktop', 'mobile', 'html']) mkdirSync(join(OUT, d), { recursive: true });

const browser = await chromium.launch();
const index = [];

for (const [width, height, dir] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    isMobile: dir === 'mobile',
    hasTouch: dir === 'mobile',
  });
  for (const at of urls) {
    const page = await ctx.newPage();
    const started = Date.now();
    let status = null;
    try {
      status = (await page.goto(at, { waitUntil: 'networkidle', timeout: 90000 }))?.status() ?? null;
    } catch {
      // networkidle never settles where something polls; a plain load will do.
      try { status = (await page.goto(at, { waitUntil: 'load', timeout: 60000 }))?.status() ?? null; }
      catch (err) { console.log('FAILED  ', dir, at, String(err.message).split('\n')[0]); await page.close(); continue; }
    }
    // Scroll the length of the page so lazy-loaded images actually load before
    // the shot; otherwise the archive is a page full of empty placeholders.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(OUT, dir, `${name(at)}.png`), fullPage: true });
    const ms = Date.now() - started;
    if (dir === 'desktop') {
      writeFileSync(join(OUT, 'html', `${name(at)}.html`), await page.content(), 'utf8');
      index.push({ url: at, status, ms, title: await page.title() });
    }
    console.log(dir.padEnd(8), String(status).padEnd(4), `${String(ms).padStart(6)}ms`, at);
    await page.close();
  }
  await ctx.close();
}

await browser.close();
writeFileSync(join(OUT, 'index.json'), JSON.stringify({ source: origin, captured: new Date().toISOString(), pages: index }, null, 2) + '\n');
console.log(`\narchived ${index.length} page(s) -> ${OUT}`);
