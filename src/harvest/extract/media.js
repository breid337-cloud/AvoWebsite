import { qs, qsa, attr, classList } from '../../util/html.js';
import { squash, uniqueBy } from '../../util/text.js';
import { absolutize, basename, isImageUrl } from '../../util/url.js';

const TRACKING_HOSTS = /doubleclick|google-analytics|googletagmanager|facebook\.com\/tr|scorecardresearch|quantserve|hotjar|pixel|beacon/i;
const JUNK_NAME = /^(spacer|blank|clear|pixel|1x1|dot|shim|transparent|loading|placeholder|arrow|bullet|divider|separator|bg-?\d*)\.(gif|png|jpe?g)$/i;
// Embedded map tiles and share badges are not photographs of the business.
const JUNK_URL = /staticmap|maps\.googleapis|mapservice|google.*static|badge|qr-?code|captcha/i;

/** Pick the largest candidate out of a srcset string. */
function fromSrcset(value) {
  if (!value) return '';
  const candidates = value.split(',').map((part) => {
    const [url, descriptor = ''] = part.trim().split(/\s+/);
    const width = /(\d+)w/.exec(descriptor)?.[1];
    const density = /([\d.]+)x/.exec(descriptor)?.[1];
    return { url, score: Number(width ?? 0) || Number(density ?? 1) * 1000 };
  });
  return candidates.sort((a, b) => b.score - a.score)[0]?.url ?? '';
}

/** All usable images on the page, de-duplicated and classified. */
export function extractImages(doc, baseUrl) {
  const out = [];

  for (const img of qsa(doc, 'img')) {
    // Lazy-loading attributes are extremely common on the sites we harvest.
    const raw =
      attr(img, 'src') ||
      attr(img, 'data-src') ||
      attr(img, 'data-lazy-src') ||
      attr(img, 'data-original') ||
      fromSrcset(attr(img, 'srcset') || attr(img, 'data-srcset'));
    if (!raw || raw.startsWith('data:')) continue;
    const url = absolutize(raw, baseUrl);
    if (!url || TRACKING_HOSTS.test(url)) continue;
    if (JUNK_NAME.test(basename(url)) || JUNK_URL.test(url)) continue;

    const width = Number(attr(img, 'width')) || null;
    const height = Number(attr(img, 'height')) || null;
    if ((width && width <= 2) || (height && height <= 2)) continue;

    out.push({
      url,
      alt: squash(attr(img, 'alt') || ''),
      title: squash(attr(img, 'title') || ''),
      width,
      height,
      classes: classList(img),
      role: classifyImage(img, url, width, height),
    });
  }

  // CSS background images on hero/banner containers.
  for (const el of qsa(doc, '[style*=background]')) {
    const style = attr(el, 'style') || '';
    const m = /background(?:-image)?\s*:[^;]*url\((['"]?)([^'")]+)\1\)/i.exec(style);
    if (!m) continue;
    const url = absolutize(m[2], baseUrl);
    if (!url || !isImageUrl(url) || TRACKING_HOSTS.test(url)) continue;
    const cls = classList(el).join(' ').toLowerCase();
    out.push({
      url,
      alt: '',
      width: null,
      height: null,
      classes: classList(el),
      role: /hero|banner|jumbotron|masthead|slide/.test(cls) ? 'hero' : 'background',
    });
  }

  return uniqueBy(out, (i) => i.url);
}

function classifyImage(img, url, width, height) {
  const haystack = [attr(img, 'alt') || '', attr(img, 'class') || '', attr(img, 'id') || '', url].join(' ').toLowerCase();
  if (/logo|brand(mark)?|wordmark/.test(haystack)) return 'logo';
  if (/icon|sprite|badge|award|cert|seal|star|social|facebook|instagram|twitter/.test(haystack)) return 'icon';
  if (/hero|banner|slide|masthead|header-image|jumbotron/.test(haystack)) return 'hero';
  if (/team|staff|headshot|portrait|profile|avatar/.test(haystack)) return 'team';
  if (/gallery|portfolio|project|work|before|after|photo/.test(haystack)) return 'gallery';
  if (width && height && width <= 64 && height <= 64) return 'icon';
  return 'content';
}

/** Best-guess logo: an explicit logo image, else the first image in the header. */
export function findLogo(doc, baseUrl, images) {
  const tagged = images.find((i) => i.role === 'logo');
  if (tagged) return tagged;

  const header = qs(doc, 'header') || qs(doc, '.header, #header, .site-header, .navbar');
  if (header) {
    const img = qs(header, 'img');
    const raw = attr(img, 'src') || attr(img, 'data-src') || '';
    const url = absolutize(raw, baseUrl);
    if (url) return images.find((i) => i.url === url) ?? { url, alt: squash(attr(img, 'alt') || ''), role: 'logo' };
  }

  const homeLink = qs(doc, 'a[href="/"] img, a[rel=home] img');
  if (homeLink) {
    const url = absolutize(attr(homeLink, 'src') || '', baseUrl);
    if (url) return { url, alt: squash(attr(homeLink, 'alt') || ''), role: 'logo' };
  }
  return null;
}

/** Best-guess hero image: explicit hero, else the biggest non-logo image near the top. */
export function findHero(doc, images, ogImage) {
  const explicit = images.find((i) => i.role === 'hero');
  if (explicit) return explicit;
  if (ogImage) {
    const match = images.find((i) => i.url === ogImage);
    if (match) return match;
    return { url: ogImage, alt: '', role: 'hero' };
  }
  const candidates = images.filter((i) => !['logo', 'icon'].includes(i.role));
  const sized = candidates.filter((i) => (i.width ?? 0) >= 600);
  return sized[0] ?? candidates[0] ?? null;
}

/** Images worth putting in a gallery, largest/most-meaningful first. */
export function pickGallery(images, { limit = 24 } = {}) {
  return images
    .filter((i) => !['logo', 'icon', 'background'].includes(i.role))
    .filter((i) => !i.width || i.width >= 300)
    .slice(0, limit)
    .map((i) => ({ src: i.url, alt: i.alt, caption: i.title, category: i.role === 'team' ? 'team' : '' }));
}

/**
 * Background images referenced from stylesheets rather than <img> tags.
 * Page builders (Elementor, Divi, WPBakery) put most photography here, so
 * without this a visually rich site looks like it has one image on it.
 */
export function cssBackgroundImages(cssText, baseUrl) {
  const out = [];
  const seen = new Set();
  for (const m of String(cssText).matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi)) {
    const raw = m[2].trim();
    if (!raw || raw.startsWith('data:')) continue;
    const url = absolutize(raw, baseUrl);
    if (!url || !isImageUrl(url) || TRACKING_HOSTS.test(url)) continue;
    if (JUNK_NAME.test(basename(url)) || JUNK_URL.test(url) || seen.has(url)) continue;
    seen.add(url);
    out.push({ url, alt: '', width: null, height: null, classes: [], role: 'background' });
  }
  return out;
}
