import fsp from 'node:fs/promises';
import path from 'node:path';
import { ensureDir } from '../util/fs.js';
import { log } from '../util/log.js';
import { toUrl } from '../util/url.js';

export const USER_AGENT = 'AvoWebsiteBuilder/0.1 (+site-modernisation; respects robots.txt)';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Polite HTTP client: identifies itself, backs off on failure, rate-limits
 * itself between requests, and refuses to download absurdly large bodies.
 */
export class Fetcher {
  constructor({ timeout = 20000, retries = 2, delay = 300, maxBytes = 5 * 1024 * 1024, userAgent = USER_AGENT } = {}) {
    this.timeout = timeout;
    this.retries = retries;
    this.delay = delay;
    this.maxBytes = maxBytes;
    this.userAgent = userAgent;
    this.lastRequestAt = 0;
    this.stats = { requests: 0, failures: 0, bytes: 0 };
  }

  async #throttle() {
    const since = Date.now() - this.lastRequestAt;
    if (since < this.delay) await sleep(this.delay - since);
    this.lastRequestAt = Date.now();
  }

  async raw(url, { method = 'GET', accept = 'text/html,application/xhtml+xml,*/*;q=0.8', signal } = {}) {
    let lastError = null;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      if (attempt > 0) await sleep(500 * 2 ** (attempt - 1));
      await this.#throttle();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);
      if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });
      try {
        this.stats.requests++;
        const res = await fetch(url, {
          method,
          redirect: 'follow',
          signal: controller.signal,
          headers: { 'user-agent': this.userAgent, accept, 'accept-language': 'en-US,en;q=0.9' },
        });
        clearTimeout(timer);
        if (res.status >= 500 && attempt < this.retries) { lastError = new Error(`HTTP ${res.status}`); continue; }
        return res;
      } catch (err) {
        clearTimeout(timer);
        lastError = err;
        log.debug(`fetch failed (${attempt + 1}/${this.retries + 1}) ${url}: ${err.message}`);
      }
    }
    this.stats.failures++;
    throw lastError ?? new Error(`Could not fetch ${url}`);
  }

  /** Fetch a page as text. Returns null (never throws) when it is not usable HTML. */
  async html(url) {
    let res;
    try {
      res = await this.raw(url);
    } catch (err) {
      return { url, ok: false, status: 0, error: err.message, html: '' };
    }
    const contentType = res.headers.get('content-type') ?? '';
    if (!res.ok) return { url: res.url || url, ok: false, status: res.status, error: `HTTP ${res.status}`, html: '' };
    if (!/text\/html|application\/xhtml|text\/plain|application\/xml/i.test(contentType)) {
      return { url: res.url || url, ok: false, status: res.status, error: `Not HTML (${contentType})`, html: '' };
    }
    const length = Number(res.headers.get('content-length') ?? 0);
    if (length && length > this.maxBytes) {
      return { url: res.url || url, ok: false, status: res.status, error: 'Body too large', html: '' };
    }
    const html = await res.text();
    this.stats.bytes += html.length;
    return { url: res.url || url, ok: true, status: res.status, contentType, html };
  }

  async text(url) {
    try {
      const res = await this.raw(url, { accept: 'text/plain,*/*' });
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }

  /** Download a binary asset to disk. Returns metadata or null on failure. */
  async download(url, destPath) {
    try {
      const res = await this.raw(url, { accept: 'image/*,*/*' });
      if (!res.ok) return null;
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length === 0 || buffer.length > this.maxBytes) return null;
      await ensureDir(path.dirname(destPath));
      await fsp.writeFile(destPath, buffer);
      this.stats.bytes += buffer.length;
      return {
        url,
        path: destPath,
        bytes: buffer.length,
        contentType: res.headers.get('content-type') ?? '',
      };
    } catch (err) {
      log.debug(`download failed ${url}: ${err.message}`);
      return null;
    }
  }
}

/* ── robots.txt ──────────────────────────────────────────────────────── */

/**
 * Minimal robots.txt evaluator covering the directives that matter for a
 * single-site crawl: User-agent grouping, Allow, Disallow, Crawl-delay, Sitemap.
 */
export class Robots {
  constructor(rules = [], { sitemaps = [], crawlDelay = 0, missing = false } = {}) {
    this.rules = rules;
    this.sitemaps = sitemaps;
    this.crawlDelay = crawlDelay;
    this.missing = missing;
  }

  static parse(text, agent = 'avowebsitebuilder') {
    if (!text) return new Robots([], { missing: true });
    const lines = text.split(/\r?\n/);
    const groups = [];
    let current = null;
    const sitemaps = [];

    for (const rawLine of lines) {
      const line = rawLine.replace(/#.*$/, '').trim();
      if (!line) continue;
      const idx = line.indexOf(':');
      if (idx === -1) continue;
      const field = line.slice(0, idx).trim().toLowerCase();
      const value = line.slice(idx + 1).trim();

      if (field === 'user-agent') {
        if (!current || current.rules.length > 0) {
          current = { agents: [], rules: [], crawlDelay: 0 };
          groups.push(current);
        }
        current.agents.push(value.toLowerCase());
      } else if (field === 'sitemap') {
        sitemaps.push(value);
      } else if (current && (field === 'allow' || field === 'disallow')) {
        current.rules.push({ allow: field === 'allow', path: value });
      } else if (current && field === 'crawl-delay') {
        current.crawlDelay = Number(value) || 0;
      }
    }

    const lowerAgent = agent.toLowerCase();
    const specific = groups.find((g) => g.agents.some((a) => a !== '*' && lowerAgent.includes(a)));
    const wildcard = groups.find((g) => g.agents.includes('*'));
    const chosen = specific ?? wildcard;
    return new Robots(chosen?.rules ?? [], {
      sitemaps,
      crawlDelay: chosen?.crawlDelay ?? 0,
    });
  }

  static async load(fetcher, origin, agent = 'avowebsitebuilder') {
    const url = new URL('/robots.txt', origin).toString();
    const text = await fetcher.text(url);
    return Robots.parse(text, agent);
  }

  /** Longest-match wins; ties go to Allow, per the de-facto standard. */
  isAllowed(url) {
    const pathname = (toUrl(url)?.pathname ?? '/') + (toUrl(url)?.search ?? '');
    let best = null;
    for (const rule of this.rules) {
      if (rule.path === '') continue;
      if (!matchesRobotsPattern(pathname, rule.path)) continue;
      const specificity = rule.path.replace(/\*/g, '').length;
      if (!best || specificity > best.specificity || (specificity === best.specificity && rule.allow)) {
        best = { ...rule, specificity };
      }
    }
    // An empty Disallow value means "allow everything", already skipped above.
    return best ? best.allow : true;
  }
}

function matchesRobotsPattern(pathname, pattern) {
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const escaped = body.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  const re = new RegExp('^' + escaped + (anchored ? '$' : ''));
  return re.test(pathname);
}
