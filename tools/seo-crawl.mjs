#!/usr/bin/env node
/**
 * On-page SEO crawl across the client estate.
 *
 *   node tools/seo-crawl.mjs            # crawl every site in the sitemap
 *   node tools/seo-crawl.mjs jackson    # crawl one, by slug
 *
 * Read-only, like the health scan: it fetches published pages through the same
 * robots-respecting Fetcher the harvester uses, and writes tools/seo-crawl.json.
 * It never edits a site.
 *
 * What it looks for is deliberately narrow: the on-page things that decide
 * whether a page can rank for the term it was written to rank for. It does not
 * try to be an all-purpose auditor — src/harvest/extract/audit.js already does
 * that job, and it is aimed at proving an *old* site is bad. These sites are
 * technically clean, so the interesting failures are different: two pages
 * fighting over one title, a page nobody links to, a service page that never
 * names the town it serves.
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Fetcher } from '../src/harvest/fetcher.js';
import { parseHtml, qs, qsa, attr, cleanText, rawText } from '../src/util/html.js';

const HERE = dirname(fileURLToPath(import.meta.url));

const SITES = [
  {
    slug: 'jackson',
    name: "Jackson's Stonemasonry",
    origin: 'https://jacksonstonemasonry.com',
    sitemap: '/sitemap.xml',
    // The towns the business actually serves, from its own site.json.
    places: ['Winchcombe', 'Cheltenham', 'Gloucester', 'Tewkesbury', 'Broadway',
             'Stow-on-the-Wold', 'Cirencester', 'Cotswold'],
  },
  {
    slug: 'k9',
    name: 'Basingstoke K9 Companions',
    origin: 'https://basingstokek9companions.co.uk',
    sitemap: '/sitemap-index.xml',
    places: ['Basingstoke', 'Kempshott', 'Hampshire'],
  },
  {
    slug: 'avo',
    name: 'AvoSolution',
    origin: 'https://avosolution.co.uk',
    sitemap: '/sitemap.xml',
    places: [],   // deliberately not a local-search business
  },
];

/* Google truncates around these; they are guides, not laws. */
const TITLE_MAX = 60, TITLE_MIN = 15;
const DESC_MAX = 160, DESC_MIN = 70;
const THIN_WORDS = 150;

async function sitemapUrls(fetcher, origin, path) {
  const urls = [];
  const queue = [new URL(path, origin).toString()];
  const seen = new Set();
  while (queue.length && urls.length < 300) {
    const next = queue.shift();
    if (seen.has(next)) continue;
    seen.add(next);
    const xml = await fetcher.text(next);
    if (!xml) continue;
    const isIndex = /<sitemapindex/i.test(xml);
    for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
      const loc = m[1].trim();
      if (isIndex) queue.push(loc);
      else if (loc.startsWith(origin)) urls.push(loc);
    }
  }
  return [...new Set(urls)];
}

function readPage(url, html, origin) {
  const doc = parseHtml(html);
  const title = cleanText(qs(doc, 'title')) || '';
  const desc = attr(qs(doc, 'meta[name=description]'), 'content') || '';
  const canonical = attr(qs(doc, 'link[rel=canonical]'), 'href') || '';
  const h1s = qsa(doc, 'h1').map((h) => cleanText(h)).filter(Boolean);

  const main = qs(doc, 'main') || qs(doc, 'body') || doc;
  const words = cleanText(main).split(/\s+/).filter(Boolean).length;

  const images = qsa(doc, 'img');
  // alt="" is a deliberate statement that an image is decorative, and this site
  // uses it correctly on logos and card thumbnails that sit beside their own
  // text. Flagging it produced a page of noise and one retracted claim. A
  // missing alt attribute is the actual error, so that is what gets counted.
  const noAlt = images.filter((i) => attr(i, 'alt') === null || attr(i, 'alt') === undefined).length;

  const schema = [];
  for (const s of qsa(doc, 'script[type="application/ld+json"]')) {
    try {
      // cleanText() renders text, and a <script> renders as nothing — its body
      // has to be read raw or every page looks like it has no structured data.
      const parsed = JSON.parse(rawText(s) || '{}');
      for (const node of [].concat(parsed['@graph'] ?? parsed)) {
        if (node && node['@type']) schema.push(...[].concat(node['@type']));
      }
    } catch { schema.push('(unparseable)'); }
  }

  const links = qsa(doc, 'a')
    .map((a) => attr(a, 'href') || '')
    .filter(Boolean)
    .map((h) => { try { return new URL(h, url).toString().split('#')[0]; } catch { return ''; } })
    .filter((h) => h.startsWith(origin));

  return {
    url, title, titleLen: title.length, desc, descLen: desc.length, canonical,
    h1s, words, images: images.length, noAlt, schema: [...new Set(schema)],
    linksOut: [...new Set(links)].filter((l) => l !== url),
    text: cleanText(main).toLowerCase(),
  };
}

/** Everything worth telling a human, derived from the whole set of pages. */
function analyse(site, pages) {
  const findings = [];
  const add = (level, what, where = []) => findings.push({ level, what, where });
  const rel = (u) => u.replace(site.origin, '') || '/';

  const byTitle = new Map(), byDesc = new Map();
  for (const p of pages) {
    if (p.title) byTitle.set(p.title, [...(byTitle.get(p.title) ?? []), p.url]);
    if (p.desc) byDesc.set(p.desc, [...(byDesc.get(p.desc) ?? []), p.url]);
  }
  for (const [title, urls] of byTitle) {
    if (urls.length > 1) add('high', `${urls.length} pages share the title "${title}" — they compete with each other`, urls.map(rel));
  }
  for (const [, urls] of byDesc) {
    if (urls.length > 1) add('medium', `${urls.length} pages share one meta description`, urls.map(rel));
  }

  for (const p of pages) {
    if (!p.title) add('high', 'No page title', [rel(p.url)]);
    else if (p.titleLen > TITLE_MAX) add(p.titleLen > 75 ? 'medium' : 'low', `Title is ${p.titleLen} characters — Google shows about ${TITLE_MAX}, so the end is cut off`, [rel(p.url)]);
    else if (p.titleLen < TITLE_MIN) add('medium', `Title is only ${p.titleLen} characters — too little to rank on`, [rel(p.url)]);
    if (!p.desc) add('high', 'No meta description — Google writes its own snippet', [rel(p.url)]);
    else if (p.descLen > DESC_MAX) add('low', `Meta description is ${p.descLen} characters and gets truncated`, [rel(p.url)]);
    else if (p.descLen < DESC_MIN) add('low', `Meta description is only ${p.descLen} characters`, [rel(p.url)]);
    if (p.h1s.length === 0) add('high', 'No H1 heading', [rel(p.url)]);
    else if (p.h1s.length > 1) add('medium', `${p.h1s.length} H1 headings on one page`, [rel(p.url)]);
    if (!p.canonical) add('medium', 'No canonical URL', [rel(p.url)]);
    else if (p.canonical.split('#')[0].replace(/\/$/, '') !== p.url.replace(/\/$/, '')) {
      add('high', `Canonical points elsewhere: ${p.canonical}`, [rel(p.url)]);
    }
    if (p.words < THIN_WORDS) add('medium', `Only ${p.words} words of copy — too thin to rank`, [rel(p.url)]);
    if (p.noAlt > 0) add('medium', `${p.noAlt} of ${p.images} images have no alt attribute at all`, [rel(p.url)]);
    if (!p.schema.length) add('medium', 'No structured data on the page', [rel(p.url)]);
  }

  // A page in the sitemap that nothing links to is a page Google will struggle
  // to value, however good it is.
  const linkedTo = new Set(pages.flatMap((p) => p.linksOut));
  const orphans = pages.filter((p) => !linkedTo.has(p.url) && !linkedTo.has(p.url.replace(/\/$/, '')) && p.url !== site.origin + '/');
  if (orphans.length) add('high', `${orphans.length} pages are in the sitemap but linked from nowhere on the site`, orphans.map((p) => rel(p.url)));

  // Local search is won by naming the place. A service page that never says
  // the town cannot rank for "service + town", which is what people type.
  if (site.places.length) {
    const missing = pages.filter((p) => !site.places.some((pl) => p.text.includes(pl.toLowerCase())));
    if (missing.length) add('medium', `${missing.length} pages never mention any town the business serves`, missing.map((p) => rel(p.url)));
  }

  return findings;
}

const only = process.argv[2];
// 400ms was impolite enough to draw 502s out of a live client site on the
// third run of the evening. This crawls our own customers' sites; it can wait.
const fetcher = new Fetcher({ delay: 1200, retries: 3 });
const results = [];

for (const site of SITES.filter((s) => !only || s.slug === only)) {
  const urls = await sitemapUrls(fetcher, site.origin, site.sitemap);
  const pages = [];
  for (const url of urls) {
    const r = await fetcher.html(url);
    if (!r.ok) { pages.push({ url, error: r.error }); continue; }
    pages.push(readPage(url, r.html, site.origin));
  }
  const good = pages.filter((p) => !p.error);
  const findings = analyse(site, good);
  const counts = findings.reduce((m, f) => ({ ...m, [f.level]: (m[f.level] || 0) + 1 }), {});
  results.push({
    name: site.name, slug: site.slug, origin: site.origin,
    ranAt: new Date().toISOString(),
    pagesInSitemap: urls.length, pagesRead: good.length,
    failed: pages.filter((p) => p.error).map((p) => ({ url: p.url, error: p.error })),
    counts, findings,
    pages: good.map(({ text, linksOut, ...keep }) => keep),
  });
  console.log(`${site.name}: ${good.length}/${urls.length} pages, ${findings.length} findings ${JSON.stringify(counts)}`);
}

/**
 * Crawling one site must not delete the other two. Writing only this run's
 * results did exactly that, and the weekly report then showed a single site
 * with nothing to say it was missing the rest — a quiet wrong answer, which is
 * the worst kind. Sites not crawled this time keep their previous record, and
 * each record carries the date it was actually collected.
 */
const OUT = join(HERE, 'seo-crawl.json');
const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')).sites ?? [] : [];
const merged = SITES.map((s) =>
  results.find((r) => r.slug === s.slug) ?? previous.find((p) => p.slug === s.slug)
).filter(Boolean);

writeFileSync(OUT, JSON.stringify({ ranAt: new Date().toISOString(), sites: merged }, null, 2));
console.log(`\nwrote ${OUT}`);
for (const s of merged) {
  if (!results.some((r) => r.slug === s.slug)) console.log(`  ${s.name}: kept from ${s.ranAt ?? 'an earlier run'}`);
}
