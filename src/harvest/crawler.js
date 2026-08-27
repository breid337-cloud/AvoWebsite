import { parseHtml, qsa, attr } from '../util/html.js';
import { absolutize, canonicalize, sameOrigin, isAssetUrl, depth, toUrl } from '../util/url.js';
import { log } from '../util/log.js';

// Paths that never contain business content worth rebuilding.
const SKIP_PATH = /\/(wp-admin|wp-login|wp-json|xmlrpc|feed|rss|atom|comments|trackback|cart|checkout|my-account|login|register|signin|signup|search|tag|author|category\/page|page\/\d+|\d{4}\/\d{2}|wp-content\/uploads)\b|\.(xml|json|txt|css|js)$/i;
const SKIP_QUERY = /replytocom|add-to-cart|orderby|s=|paged=/i;

// Pages we always want if they exist, in priority order.
const PRIORITY = [
  { re: /^\/?$/, score: 100, kind: 'home' },
  { re: /about|our-story|who-we-are|history|company/i, score: 90, kind: 'about' },
  { re: /service|what-we-do|treatment|solutions|offerings/i, score: 88, kind: 'services' },
  { re: /contact|get-in-touch|locations?|directions/i, score: 86, kind: 'contact' },
  { re: /testimonial|review|feedback/i, score: 80, kind: 'testimonials' },
  { re: /gallery|portfolio|projects|our-work|photos/i, score: 78, kind: 'gallery' },
  { re: /faq|questions/i, score: 76, kind: 'faq' },
  { re: /team|staff|our-people|doctors|attorneys/i, score: 74, kind: 'team' },
  { re: /pricing|rates|packages|menu/i, score: 72, kind: 'pricing' },
  { re: /area|service-area|coverage|neighborhoods/i, score: 60, kind: 'area' },
];

export function classifyUrl(url) {
  const path = toUrl(url)?.pathname ?? '/';
  for (const entry of PRIORITY) {
    if (entry.re.test(path)) return entry;
  }
  return { score: 40 - depth(url) * 5, kind: 'page' };
}

const classify = classifyUrl;

/** Discover URLs from sitemap.xml (and nested sitemap indexes). */
export async function readSitemap(fetcher, origin, { limit = 200 } = {}) {
  const urls = [];
  const queue = [new URL('/sitemap.xml', origin).toString()];
  const seen = new Set();

  while (queue.length && urls.length < limit) {
    const sitemapUrl = queue.shift();
    if (seen.has(sitemapUrl)) continue;
    seen.add(sitemapUrl);
    const xml = await fetcher.text(sitemapUrl);
    if (!xml) continue;
    const isIndex = /<sitemapindex/i.test(xml);
    for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
      const loc = m[1].trim();
      if (isIndex) { if (seen.size < 10) queue.push(loc); }
      else if (sameOrigin(loc, origin)) urls.push(loc);
      if (urls.length >= limit) break;
    }
  }
  return urls;
}

/**
 * Breadth-first same-origin crawl, ordered so the pages that matter most for a
 * rebuild (home, about, services, contact) are fetched first.
 */
export async function crawl(fetcher, startUrl, { maxPages = 25, robots = null, onPage = null } = {}) {
  const start = canonicalize(startUrl);
  const origin = toUrl(start)?.origin ?? start;
  const seen = new Set([start]);
  const contentSeen = new Set();
  const skipped = [];
  const pages = [];

  // Seed the frontier with the start page plus anything the sitemap advertises.
  const frontier = [{ url: start, ...classify(start) }];
  try {
    for (const url of await readSitemap(fetcher, origin, { limit: 150 })) {
      const canon = canonicalize(url);
      if (seen.has(canon) || isAssetUrl(canon) || SKIP_PATH.test(canon)) continue;
      seen.add(canon);
      frontier.push({ url: canon, ...classify(canon) });
    }
    log.debug(`sitemap seeded ${frontier.length - 1} URLs`);
  } catch (err) {
    log.debug(`sitemap read failed: ${err.message}`);
  }

  while (frontier.length && pages.length < maxPages) {
    frontier.sort((a, b) => b.score - a.score);
    const next = frontier.shift();

    if (robots && !robots.isAllowed(next.url)) {
      skipped.push({ url: next.url, reason: 'robots.txt disallow' });
      continue;
    }

    const result = await fetcher.html(next.url);
    if (!result.ok) {
      skipped.push({ url: next.url, reason: result.error });
      continue;
    }

    // "/" and "/index.html" are the same page; fetch once, keep the first.
    const fingerprint = `${result.html.length}:${result.html.slice(0, 2000)}`;
    if (contentSeen.has(fingerprint)) {
      skipped.push({ url: next.url, reason: 'duplicate of an already-crawled page' });
      continue;
    }
    contentSeen.add(fingerprint);

    const doc = parseHtml(result.html);
    const page = { url: result.url, requestedUrl: next.url, kind: next.kind, html: result.html, doc, bytes: result.html.length };
    pages.push(page);
    if (onPage) onPage(page, pages.length, maxPages);

    // Queue links found on this page.
    for (const a of qsa(doc, 'a')) {
      const href = absolutize(attr(a, 'href'), result.url);
      if (!href) continue;
      const canon = canonicalize(href);
      if (seen.has(canon)) continue;
      if (!sameOrigin(canon, origin)) continue;
      if (isAssetUrl(canon) || SKIP_PATH.test(canon)) continue;
      const query = toUrl(canon)?.search ?? '';
      if (query && SKIP_QUERY.test(query)) continue;
      if (depth(canon) > 4) continue;
      seen.add(canon);
      frontier.push({ url: canon, ...classify(canon) });
    }
  }

  return { pages, skipped, discovered: seen.size };
}
