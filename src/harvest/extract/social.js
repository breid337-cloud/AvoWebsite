import { qsa, attr } from '../../util/html.js';
import { SOCIAL_NETWORKS } from '../../profile/schema.js';
import { absolutize } from '../../util/url.js';

// Profile links only — skip share widgets, which point at the current page.
const SHARE_PATTERN = /\/(sharer|share|intent|dialog|plugins|tr\?|widgets?)\b|[?&](u|url|text)=/i;

export function classifySocial(url) {
  if (!url) return null;
  if (SHARE_PATTERN.test(url)) return null;
  const network = SOCIAL_NETWORKS.find((n) => n.match.test(url));
  return network ? network.key : null;
}

/** Collect social profile URLs from anchors anywhere in the document. */
export function extractSocial(doc, baseUrl) {
  const found = {};
  for (const a of qsa(doc, 'a')) {
    const href = attr(a, 'href');
    if (!href) continue;
    const abs = absolutize(href, baseUrl);
    if (!abs) continue;
    const key = classifySocial(abs);
    if (!key) continue;
    // Prefer the shortest URL per network — usually the canonical profile page.
    if (!found[key] || abs.length < found[key].length) found[key] = abs;
  }
  return found;
}

/** Fold loose sameAs URLs (from JSON-LD) into keyed networks. */
export function foldSocialUrls(socialObj) {
  const out = {};
  for (const [key, url] of Object.entries(socialObj ?? {})) {
    if (!url) continue;
    if (key.startsWith('_url_')) {
      const network = classifySocial(url);
      if (network && !out[network]) out[network] = url;
      continue;
    }
    out[key] = url;
  }
  return out;
}
