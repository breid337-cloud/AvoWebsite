import path from 'node:path';
import fsp from 'node:fs/promises';
import { parseMhtml, extensionFor } from './mhtml.js';
import { classifyUrl } from './crawler.js';
import { parseHtml } from '../util/html.js';
import { extractMeta } from './extract/meta.js';
import { collectJsonLd, jsonLdToProfile } from './extract/jsonld.js';
import { extractContact } from './extract/contact.js';
import { extractSocial, foldSocialUrls } from './extract/social.js';
import { extractImages, findLogo, findHero, pickGallery, cssBackgroundImages } from './extract/media.js';
import { extractColors, extractFonts } from './extract/brand.js';
import { auditPage, summarizeAudit } from './extract/audit.js';
import {
  extractServices, extractTestimonials, extractFaqs, extractTeam,
  extractNav, extractHeadings, extractParagraphs,
} from './extract/content.js';
import { merge } from '../profile/normalize.js';
import { buildDraftProfile } from './index.js';
import { ensureDir } from '../util/fs.js';
import { log } from '../util/log.js';
import { slugify, uniqueBy } from '../util/text.js';
import { hostname, stripWww, toUrl, basename } from '../util/url.js';

/**
 * Harvest from saved MHTML archives instead of crawling.
 *
 * A browser's "Save page as → single file" captures the rendered DOM plus every
 * image and stylesheet. That makes this the reliable route for sites that block
 * crawlers, sit behind a login, or build their content with JavaScript — and it
 * is something a client can do themselves in two clicks.
 */
export async function harvestArchives(files, { clientDir, slug: slugOverride, downloadAssets = true, maxAssets = 60 } = {}) {
  if (!files.length) throw new Error('No archive files given.');

  const archives = [];
  for (const file of files) {
    const buf = await fsp.readFile(file);
    let archive;
    try {
      archive = parseMhtml(buf);
    } catch (err) {
      throw new Error(`${path.basename(file)}: ${err.message}`);
    }
    if (!archive.html) throw new Error(`${path.basename(file)} contains no HTML part.`);
    archives.push({ file, ...archive });
  }

  const startUrl = archives[0].url || '';
  const origin = toUrl(startUrl)?.origin ?? '';
  const slug = slugify(slugOverride || stripWww(hostname(startUrl)).split('.')[0] || 'client');

  // ── Per-page extraction ────────────────────────────────────────────
  const perPage = [];
  const imageParts = new Map();
  for (const archive of archives) {
    const url = archive.url;
    const doc = parseHtml(archive.html);
    const meta = extractMeta(doc, url);
    const kind = classifyUrl(url).kind;
    log.info(`${kind.padEnd(12)} ${path.basename(archive.file)}`);

    for (const img of archive.images) {
      if (img.location && !imageParts.has(img.location)) imageParts.set(img.location, img);
    }

    perPage.push({
      url,
      kind,
      meta,
      jsonld: collectJsonLd(doc),
      contact: extractContact(doc),
      social: extractSocial(doc, url),
      // Page builders reference most photography from CSS, not <img>.
      // Page builders reference most photography from CSS, not <img>. On those
      // sites a CSS background IS the content photo, so it is promoted out of
      // the decorative "background" role and into the gallery pool.
      // Page builders reference most photography from CSS rather than <img>,
      // both inline and in stylesheets. In an archive every asset present was
      // actually loaded by the page, so a "background" here is a real photo and
      // is promoted into the gallery pool rather than treated as decoration.
      images: uniqueBy(
        [
          ...extractImages(doc, url),
          ...cssBackgroundImages(archive.stylesheets.join('\n'), url),
        ].map((i) => (i.role === 'background' ? { ...i, role: 'content' } : i)),
        (i) => i.url,
      ),
      services: extractServices(doc, url),
      testimonials: extractTestimonials(doc),
      faqs: extractFaqs(doc),
      team: extractTeam(doc),
      nav: extractNav(doc, url),
      headings: extractHeadings(doc),
      paragraphs: extractParagraphs(doc),
      audit: auditPage(doc, archive.html, meta, url),
      css: archive.stylesheets.join('\n'),
      doc,
      bytes: archive.html.length,
    });
  }

  const home = perPage.find((p) => p.kind === 'home') ?? perPage[0];
  const cssText = perPage.map((p) => p.css).join('\n');
  const colors = extractColors(cssText, { themeColor: home.meta.themeColor });
  const fonts = extractFonts(cssText, home.doc, home.url);

  // ── Merge across pages ─────────────────────────────────────────────
  const allImages = uniqueBy(perPage.flatMap((p) => p.images), (i) => i.url);
  const logo = findLogo(home.doc, home.url, allImages);
  const hero = findHero(home.doc, allImages, home.meta.og.image);
  const excluded = new Set([logo?.url, hero?.url].filter(Boolean));

  // The archive only contains assets the page actually loaded, so every image
  // part is a real, used image — a more reliable list than parsing alone.
  const known = new Set(allImages.map((i) => i.url));
  const fromParts = [...imageParts.values()]
    .filter((part) => !known.has(part.location) && part.data.length > 12_000
      && !/staticmap|mapservice|logo|icon|favicon|sprite/i.test(part.location))
    .map((part) => ({ url: part.location, alt: '', width: null, height: null, classes: [], role: 'content' }));
  const everyImage = [...allImages, ...fromParts];

  const gallery = pickGallery(
    everyImage.filter((i) => !excluded.has(i.url) && !/logo|icon|favicon|sprite/i.test(i.url)),
    { limit: 40 },
  );

  const jsonldPatch = perPage.map((p) => jsonLdToProfile(p.jsonld)).filter(Boolean)
    .reduce((acc, patch) => merge(acc, patch), {});
  const socialUrls = foldSocialUrls(
    merge(perPage.reduce((acc, p) => merge(acc, p.social), {}), jsonldPatch.social ?? {}),
  );
  const contact = mergeContact(perPage);
  const services = uniqueBy([...(jsonldPatch.services ?? []), ...perPage.flatMap((p) => p.services)], (s) => slugify(s.name));
  const testimonials = uniqueBy(
    [...(jsonldPatch.testimonials ?? []), ...perPage.flatMap((p) => p.testimonials)],
    (t) => t.quote.slice(0, 60).toLowerCase(),
  );
  const faqs = uniqueBy([...(jsonldPatch.faqs ?? []), ...perPage.flatMap((p) => p.faqs)], (f) => f.question.toLowerCase());
  const team = uniqueBy([...(jsonldPatch.team ?? []), ...perPage.flatMap((p) => p.team)], (m) => m.name.toLowerCase());

  // ── Assets straight out of the archives ────────────────────────────
  const assets = [];
  if (downloadAssets && clientDir) {
    const assetDir = path.join(clientDir, 'assets', 'harvested');
    await ensureDir(assetDir);
    const wanted = uniqueBy(
      [
        ...(logo ? [{ url: logo.url, alt: logo.alt, role: 'logo' }] : []),
        ...(hero ? [{ url: hero.url, alt: hero.alt, role: 'hero' }] : []),
        ...gallery.map((g) => ({ url: g.src, alt: g.alt, role: 'gallery' })),
        ...everyImage.filter((i) => i.role === 'team').map((i) => ({ url: i.url, alt: i.alt, role: 'team' })),
      ],
      (i) => i.url,
    ).slice(0, maxAssets);

    let index = 0;
    for (const item of wanted) {
      const part = imageParts.get(item.url);
      if (!part) continue;
      index++;
      const ext = extensionFor(part.contentType) || path.extname(basename(item.url)) || '.jpg';
      const stem = slugify(basename(item.url).replace(/\.[a-z0-9]+$/i, ''), `${item.role}-${index}`);
      const filename = `${item.role}-${String(index).padStart(2, '0')}-${stem}${ext}`;
      await fsp.writeFile(path.join(assetDir, filename), part.data);
      assets.push({
        role: item.role,
        sourceUrl: item.url,
        file: path.posix.join('assets', 'harvested', filename),
        alt: item.alt ?? '',
        bytes: part.data.length,
        contentType: part.contentType,
      });
    }
    log.info(`saved ${assets.length} image(s) from the archives`);
  }

  const raw = {
    harvestedAt: new Date().toISOString(),
    startUrl,
    origin,
    slug,
    source: 'mhtml-archive',
    archives: archives.map((a) => ({ file: path.basename(a.file), url: a.url, savedAt: a.savedAt })),
    stats: {
      pagesCrawled: perPage.length,
      urlsDiscovered: perPage.length,
      requests: 0,
      bytes: perPage.reduce((n, p) => n + p.bytes, 0),
    },
    robots: { present: false, crawlDelay: 0, sitemaps: [], honoured: true, note: 'Read from saved archives; no crawling took place.' },
    pages: perPage.map((p) => ({
      url: p.url, kind: p.kind, title: p.meta.title, description: p.meta.description,
      headings: p.headings, paragraphs: p.paragraphs.slice(0, 40), nav: p.nav, audit: p.audit,
    })),
    skipped: [],
    meta: home.meta,
    jsonld: { found: perPage.reduce((n, p) => n + p.jsonld.length, 0), patch: jsonldPatch },
    contact,
    brand: { colors, fonts, logo: logo?.url ?? '', hero: hero?.url ?? '' },
    social: { urls: socialUrls, profiles: [], gaps: [] },
    content: { services, testimonials, faqs, team, gallery },
    images: everyImage,
    assets,
    audit: summarizeAudit(perPage.map((p) => p.audit)),
  };

  return { raw, draft: buildDraftProfile(raw) };
}

function mergeContact(perPage) {
  const ordered = [...perPage].sort((a, b) => {
    const rank = (p) => (p.kind === 'contact' ? 0 : p.kind === 'home' ? 1 : 2);
    return rank(a) - rank(b);
  });
  return {
    phones: uniqueBy(ordered.flatMap((p) => p.contact.phones), (p) => p.value.replace(/\D/g, '').slice(-10)),
    emails: uniqueBy(ordered.flatMap((p) => p.contact.emails), (e) => e.value),
    address: ordered.map((p) => p.contact.address).find(Boolean) ?? null,
    hours: ordered.map((p) => p.contact.hours).find(Boolean) ?? null,
  };
}
