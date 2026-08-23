import { parseHtml, qsa, attr, cleanText, qs } from '../util/html.js';
import { squash } from '../util/text.js';
import { SOCIAL_NETWORKS } from '../profile/schema.js';

/**
 * Facebook and Instagram serve a login wall to unauthenticated clients, so this
 * reads only what a public request legitimately returns: OpenGraph metadata and
 * whatever renders without a session. Anything blocked is reported as blocked
 * rather than guessed at, so the brief can ask the client for it directly.
 */
export async function harvestSocial(fetcher, socialUrls, { networks = null } = {}) {
  const results = [];

  for (const [key, url] of Object.entries(socialUrls ?? {})) {
    if (!url) continue;
    if (networks && !networks.includes(key)) continue;
    const label = SOCIAL_NETWORKS.find((n) => n.key === key)?.label ?? key;
    const result = { network: key, label, url, status: 'unknown', data: {}, notes: [] };

    const page = await fetcher.html(url);
    if (!page.ok) {
      result.status = 'unreachable';
      result.notes.push(`Could not fetch (${page.error}).`);
      results.push(result);
      continue;
    }

    const doc = parseHtml(page.html);
    const meta = {};
    for (const tag of qsa(doc, 'meta')) {
      const name = (attr(tag, 'property') || attr(tag, 'name') || '').toLowerCase();
      const content = attr(tag, 'content');
      if (name && content) meta[name] = squash(content);
    }

    const title = meta['og:title'] || squash(cleanText(qs(doc, 'title')));
    const description = meta['og:description'] || meta.description || '';
    const image = meta['og:image'] || '';

    const loginWalled =
      /log in|login|sign up to see|content isn't available|page isn't available|restricted/i.test(title + ' ' + description) ||
      (!title && !description);

    result.data = {
      title,
      description,
      image,
      ...parseSocialStats(description),
    };
    result.status = loginWalled ? 'login-walled' : 'ok';
    if (loginWalled) {
      result.notes.push(`${label} returned a login wall to an anonymous request. Ask the client for access, or copy the bio, recent posts and photos manually.`);
    }
    results.push(result);
  }

  return results;
}

/** Facebook/Instagram put follower and rating counts in og:description. */
function parseSocialStats(description = '') {
  const stats = {};
  const followers = /([\d,.]+[KMB]?)\s*(?:followers|likes|people like this)/i.exec(description);
  if (followers) stats.followers = followers[1];
  const rating = /([\d.]+)\s*(?:out of|\/)\s*5|rated\s*([\d.]+)/i.exec(description);
  if (rating) stats.rating = rating[1] ?? rating[2];
  const reviews = /([\d,]+)\s*reviews?/i.exec(description);
  if (reviews) stats.reviewCount = reviews[1];
  return stats;
}

/** A short instruction block for whatever we could not read automatically. */
export function socialGaps(results) {
  const gaps = [];
  for (const r of results) {
    if (r.status === 'ok') continue;
    gaps.push({
      network: r.label,
      url: r.url,
      ask: `Open ${r.url} while signed in and copy: the bio/about text, the 6–10 best photos, any recent posts worth featuring, and the review score if there is one.`,
    });
  }
  return gaps;
}
