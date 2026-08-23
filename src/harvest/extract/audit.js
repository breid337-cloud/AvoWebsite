import { qs, qsa, attr, cleanText } from '../../util/html.js';

const PLATFORM_HINTS = [
  { name: 'WordPress', test: (h, m) => /wp-content|wp-includes/i.test(h) || /wordpress/i.test(m.generator) },
  { name: 'Wix', test: (h) => /wix\.com|wixstatic|parastorage/i.test(h) },
  { name: 'Squarespace', test: (h) => /squarespace/i.test(h) },
  { name: 'Weebly', test: (h) => /weebly/i.test(h) },
  { name: 'GoDaddy Website Builder', test: (h) => /godaddy|websitebuilder\.godaddy/i.test(h) },
  { name: 'Shopify', test: (h) => /cdn\.shopify|shopify\.com/i.test(h) },
  { name: 'Joomla', test: (h, m) => /joomla/i.test(h) || /joomla/i.test(m.generator) },
  { name: 'Drupal', test: (h, m) => /drupal/i.test(h) || /drupal/i.test(m.generator) },
  { name: 'Duda', test: (h) => /dudamobile|duda\.co/i.test(h) },
  { name: 'HubSpot CMS', test: (h) => /hs-sites|hubspot/i.test(h) },
  { name: 'Adobe Muse', test: (h, m) => /muse\.adobe/i.test(m.generator) },
  { name: 'Microsoft FrontPage', test: (h, m) => /frontpage/i.test(m.generator) },
  { name: 'Dreamweaver', test: (h, m) => /dreamweaver/i.test(m.generator) },
];

/**
 * Evidence that the existing site needs replacing. This is the sales artifact:
 * every finding is something you can show the business owner.
 */
export function auditPage(doc, html, meta, url) {
  const images = qsa(doc, 'img');
  const imagesNoAlt = images.filter((img) => !(attr(img, 'alt') || '').trim()).length;
  const inlineStyled = qsa(doc, '[style]').length;
  const tables = qsa(doc, 'table');
  const layoutTables = tables.filter((t) => {
    const role = (attr(t, 'role') || '').toLowerCase();
    if (role === 'presentation') return true;
    // A table with no headers and nested tables is almost certainly layout.
    return qsa(t, 'th').length === 0 && qsa(t, 'table').length > 0;
  }).length;

  const platform = PLATFORM_HINTS.find((p) => p.test(html, meta))?.name ?? '';
  const scripts = qsa(doc, 'script').length;
  const stylesheets = qsa(doc, 'link[rel=stylesheet]').length;
  const h1s = qsa(doc, 'h1');

  const flags = [];
  if (!meta.viewport) flags.push('No viewport meta tag — the page does not adapt to phones.');
  if (!url.startsWith('https:')) flags.push('Served over HTTP, so browsers show a "Not secure" warning.');
  if (!meta.description) flags.push('No meta description — Google invents its own snippet.');
  if (!meta.title) flags.push('No page title.');
  else if (meta.title.length > 65) flags.push(`Page title is ${meta.title.length} characters and gets truncated in search results.`);
  if (h1s.length === 0) flags.push('No `<h1>` heading — weakens search relevance.');
  if (h1s.length > 1) flags.push(`${h1s.length} \`<h1>\` headings on one page.`);
  if (imagesNoAlt > 0) flags.push(`${imagesNoAlt} of ${images.length} images have no alt text (accessibility + SEO).`);
  if (layoutTables > 0) flags.push(`${layoutTables} table(s) used for page layout — a pre-2010 technique.`);
  if (qsa(doc, 'font, center, marquee, blink').length) flags.push('Uses deprecated `<font>` / `<center>` / `<marquee>` tags.');
  if (/\.swf|shockwave-flash/i.test(html)) flags.push('References Adobe Flash, which no browser has supported since 2020.');
  if (qsa(doc, 'frameset, frame').length) flags.push('Built with HTML frames.');
  if (inlineStyled > 30) flags.push(`${inlineStyled} elements carry inline styles, making restyling expensive.`);
  if (qs(doc, 'meta[http-equiv=refresh]')) flags.push('Uses a meta-refresh redirect.');
  if (!qs(doc, 'script[type="application/ld+json"]')) flags.push('No structured data (schema.org) — no rich results in Google.');
  if (html.length > 400_000) flags.push(`HTML document is ${Math.round(html.length / 1024)} KB before images load.`);

  return {
    url,
    platform,
    bytes: html.length,
    counts: {
      images: images.length,
      imagesNoAlt,
      scripts,
      stylesheets,
      inlineStyled,
      tables: tables.length,
      layoutTables,
      words: cleanText(qs(doc, 'body') ?? doc).split(' ').filter(Boolean).length,
      h1: h1s.length,
    },
    hasViewport: !!meta.viewport,
    hasStructuredData: !!qs(doc, 'script[type="application/ld+json"]'),
    hasHttps: url.startsWith('https:'),
    flags,
  };
}

/** Merge per-page audits into one site-level verdict. */
export function summarizeAudit(pageAudits) {
  if (!pageAudits.length) return { flags: [], platform: '', pages: 0 };
  const flagCounts = new Map();
  for (const audit of pageAudits) {
    for (const flag of audit.flags) {
      // Collapse per-page numbers into a generic statement when it recurs.
      const key = flag.replace(/^\d+/, 'N').replace(/\b\d+\b/g, 'N');
      const entry = flagCounts.get(key) ?? { text: flag, pages: 0 };
      entry.pages++;
      flagCounts.set(key, entry);
    }
  }
  const platform = pageAudits.map((a) => a.platform).find(Boolean) ?? '';
  const totals = pageAudits.reduce(
    (acc, a) => ({
      images: acc.images + a.counts.images,
      imagesNoAlt: acc.imagesNoAlt + a.counts.imagesNoAlt,
      words: acc.words + a.counts.words,
      bytes: acc.bytes + a.bytes,
    }),
    { images: 0, imagesNoAlt: 0, words: 0, bytes: 0 },
  );
  return {
    pages: pageAudits.length,
    platform,
    mobileFriendly: pageAudits.every((a) => a.hasViewport),
    https: pageAudits.every((a) => a.hasHttps),
    structuredData: pageAudits.some((a) => a.hasStructuredData),
    totals,
    flags: [...flagCounts.values()].sort((a, b) => b.pages - a.pages),
  };
}
