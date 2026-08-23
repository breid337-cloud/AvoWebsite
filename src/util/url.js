export function toUrl(input, base) {
  try {
    return new URL(input, base);
  } catch {
    return null;
  }
}

/** Absolutize `href` against `base`, dropping fragments and junk protocols. */
export function absolutize(href, base) {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  if (/^(javascript|data|mailto|tel|sms|fax):/i.test(trimmed)) return null;
  const url = toUrl(trimmed, base);
  if (!url) return null;
  if (!/^https?:$/.test(url.protocol)) return null;
  url.hash = '';
  return url.toString();
}

export function sameOrigin(a, b) {
  const ua = toUrl(a);
  const ub = toUrl(b);
  if (!ua || !ub) return false;
  return stripWww(ua.hostname) === stripWww(ub.hostname);
}

export const stripWww = (host = '') => host.replace(/^www\./i, '').toLowerCase();

export function hostname(url) {
  return toUrl(url)?.hostname ?? '';
}

/** Canonical form used for crawl dedupe: no hash, no trailing slash, sorted tracking params removed. */
export function canonicalize(url) {
  const u = toUrl(url);
  if (!u) return url;
  u.hash = '';
  for (const key of [...u.searchParams.keys()]) {
    if (/^(utm_|fbclid|gclid|mc_|ref$|source$)/i.test(key)) u.searchParams.delete(key);
  }
  u.search = u.searchParams.toString() ? `?${u.searchParams.toString()}` : '';
  if (u.pathname !== '/' && u.pathname.endsWith('/')) u.pathname = u.pathname.replace(/\/+$/, '');
  return u.toString();
}

const ASSET_EXT = /\.(pdf|zip|docx?|xlsx?|pptx?|csv|mp4|mp3|avi|mov|wmv|dmg|exe|rar|gz|tgz|svgz)$/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp)$/i;

export const isAssetUrl = (url) => ASSET_EXT.test(toUrl(url)?.pathname ?? '');
export const isImageUrl = (url) => IMAGE_EXT.test(toUrl(url)?.pathname ?? '');

export function extname(url) {
  const match = (toUrl(url)?.pathname ?? '').match(/\.([a-z0-9]+)$/i);
  return match ? `.${match[1].toLowerCase()}` : '';
}

/** Last meaningful path segment, useful for naming downloaded files. */
export function basename(url) {
  const path = toUrl(url)?.pathname ?? '';
  const seg = path.split('/').filter(Boolean).pop() ?? '';
  return decodeURIComponent(seg);
}

/** A rough "how deep in the site" score, used to prioritise crawl order. */
export function depth(url) {
  return (toUrl(url)?.pathname ?? '/').split('/').filter(Boolean).length;
}
