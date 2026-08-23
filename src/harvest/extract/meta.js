import { qs, qsa, attr, cleanText } from '../../util/html.js';
import { squash } from '../../util/text.js';
import { absolutize } from '../../util/url.js';

/** Title, description, canonical, OpenGraph/Twitter cards, favicon, language. */
export function extractMeta(doc, baseUrl) {
  const metaByName = {};
  for (const tag of qsa(doc, 'meta')) {
    const key = (attr(tag, 'name') || attr(tag, 'property') || attr(tag, 'itemprop') || '').toLowerCase();
    const content = attr(tag, 'content');
    if (!key || !content) continue;
    if (!metaByName[key]) metaByName[key] = squash(content);
  }

  const html = qs(doc, 'html');
  const iconLink = qs(doc, 'link[rel*=icon]');

  return {
    title: squash(cleanText(qs(doc, 'title'))),
    description: metaByName.description ?? '',
    keywords: (metaByName.keywords ?? '').split(',').map((k) => squash(k)).filter(Boolean),
    canonical: absolutize(attr(qs(doc, 'link[rel=canonical]'), 'href'), baseUrl),
    lang: (attr(html, 'lang') || '').slice(0, 5),
    robots: metaByName.robots ?? '',
    generator: metaByName.generator ?? '',
    viewport: metaByName.viewport ?? '',
    themeColor: metaByName['theme-color'] ?? '',
    favicon: absolutize(attr(iconLink, 'href'), baseUrl),
    og: {
      title: metaByName['og:title'] ?? '',
      description: metaByName['og:description'] ?? '',
      image: absolutize(metaByName['og:image'], baseUrl),
      siteName: metaByName['og:site_name'] ?? '',
      type: metaByName['og:type'] ?? '',
      url: metaByName['og:url'] ?? '',
    },
    twitter: {
      title: metaByName['twitter:title'] ?? '',
      description: metaByName['twitter:description'] ?? '',
      image: absolutize(metaByName['twitter:image'], baseUrl),
      site: metaByName['twitter:site'] ?? '',
    },
    all: metaByName,
  };
}
