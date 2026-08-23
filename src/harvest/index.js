import path from 'node:path';
import { Fetcher, Robots } from './fetcher.js';
import { crawl } from './crawler.js';
import { harvestSocial, socialGaps } from './social.js';
import { extractMeta } from './extract/meta.js';
import { collectJsonLd, jsonLdToProfile } from './extract/jsonld.js';
import { extractContact } from './extract/contact.js';
import { extractSocial, foldSocialUrls } from './extract/social.js';
import { extractImages, findLogo, findHero, pickGallery } from './extract/media.js';
import { extractColors, extractFonts, inlineCss, stylesheetUrls } from './extract/brand.js';
import { auditPage, summarizeAudit } from './extract/audit.js';
import {
  extractServices, extractTestimonials, extractFaqs, extractTeam,
  extractNav, extractHeadings, extractParagraphs,
} from './extract/content.js';
import { merge, normalizeProfile } from '../profile/normalize.js';
import { log } from '../util/log.js';
import { ensureDir, writeJson } from '../util/fs.js';
import { slugify, uniqueBy, squash, humanizeHeading } from '../util/text.js';
import { basename, extname, hostname, stripWww, toUrl } from '../util/url.js';

/**
 * Crawl an existing site and everything it links to, and reduce it to one raw
 * harvest record plus a deterministic draft profile.
 */
export async function harvestSite(startUrl, options = {}) {
  const {
    maxPages = 20,
    clientDir,
    downloadAssets = true,
    maxAssets = 40,
    ignoreRobots = false,
    delay = 300,
    social = true,
  } = options;

  const normalizedStart = /^https?:\/\//i.test(startUrl) ? startUrl : `https://${startUrl}`;
  const origin = toUrl(normalizedStart)?.origin;
  if (!origin) throw new Error(`Not a usable URL: ${startUrl}`);

  const fetcher = new Fetcher({ delay });
  const slug = slugify(stripWww(hostname(normalizedStart)).split('.')[0] || 'client');

  log.step(`Reading robots.txt for ${origin}`);
  const robots = await Robots.load(fetcher, origin);
  if (robots.crawlDelay) {
    fetcher.delay = Math.max(delay, robots.crawlDelay * 1000);
    log.info(`robots.txt requests a ${robots.crawlDelay}s crawl delay — honouring it.`);
  }
  if (ignoreRobots) log.warn('Ignoring robots.txt at your request.');

  log.step(`Crawling up to ${maxPages} pages`);
  const { pages, skipped, discovered } = await crawl(fetcher, normalizedStart, {
    maxPages,
    robots: ignoreRobots ? null : robots,
    onPage: (page, n, total) => log.info(`[${String(n).padStart(2)}/${total}] ${page.kind.padEnd(12)} ${page.url}`),
  });

  if (!pages.length) {
    throw new Error(`Could not read any pages from ${normalizedStart}. ${skipped[0]?.reason ?? ''}`);
  }

  // ── Per-page extraction ────────────────────────────────────────────
  const perPage = [];
  for (const page of pages) {
    const meta = extractMeta(page.doc, page.url);
    perPage.push({
      url: page.url,
      kind: page.kind,
      meta,
      jsonld: collectJsonLd(page.doc),
      contact: extractContact(page.doc),
      social: extractSocial(page.doc, page.url),
      images: extractImages(page.doc, page.url),
      services: extractServices(page.doc, page.url),
      testimonials: extractTestimonials(page.doc),
      faqs: extractFaqs(page.doc),
      team: extractTeam(page.doc),
      nav: extractNav(page.doc, page.url),
      headings: extractHeadings(page.doc),
      paragraphs: extractParagraphs(page.doc),
      audit: auditPage(page.doc, page.html, meta, page.url),
      inlineCss: inlineCss(page.doc),
      stylesheets: stylesheetUrls(page.doc, page.url),
    });
  }

  const home = perPage.find((p) => p.kind === 'home') ?? perPage[0];

  // ── Brand: inline CSS from every page plus a few external stylesheets ──
  log.step('Reading stylesheets for brand colours and fonts');
  const sheetUrls = uniqueBy(perPage.flatMap((p) => p.stylesheets), (u) => u)
    .filter((u) => !/fonts\.googleapis|fontawesome|bootstrap(\.min)?\.css/i.test(u))
    .slice(0, 6);
  let cssText = perPage.map((p) => p.inlineCss).join('\n');
  for (const url of sheetUrls) {
    const text = await fetcher.text(url);
    if (text) cssText += '\n' + text.slice(0, 300_000);
  }
  const colors = extractColors(cssText, { themeColor: home.meta.themeColor });
  const fonts = extractFonts(cssText, pages[0].doc, home.url);

  // ── Merge across pages ─────────────────────────────────────────────
  const allImages = uniqueBy(perPage.flatMap((p) => p.images), (i) => i.url);
  const logo = findLogo(pages[0].doc, home.url, allImages);
  const hero = findHero(pages.find((p) => p.kind === 'home')?.doc ?? pages[0].doc, allImages, home.meta.og.image);
  const excluded = new Set([logo?.url, hero?.url].filter(Boolean));
  const gallery = pickGallery(allImages.filter((i) => !excluded.has(i.url)));

  const jsonldPatch = perPage
    .map((p) => jsonLdToProfile(p.jsonld))
    .filter(Boolean)
    .reduce((acc, patch) => merge(acc, patch), {});

  const socialUrls = foldSocialUrls(
    merge(perPage.reduce((acc, p) => merge(acc, p.social), {}), jsonldPatch.social ?? {}),
  );

  const contact = mergeContact(perPage);
  const services = uniqueBy(
    [...(jsonldPatch.services ?? []), ...perPage.flatMap((p) => p.services)],
    (s) => slugify(s.name),
  );
  const testimonials = uniqueBy(
    [...(jsonldPatch.testimonials ?? []), ...perPage.flatMap((p) => p.testimonials)],
    (t) => t.quote.slice(0, 60).toLowerCase(),
  );
  const faqs = uniqueBy([...(jsonldPatch.faqs ?? []), ...perPage.flatMap((p) => p.faqs)], (f) => f.question.toLowerCase());
  const team = uniqueBy([...(jsonldPatch.team ?? []), ...perPage.flatMap((p) => p.team)], (m) => m.name.toLowerCase());

  // ── Social profiles ────────────────────────────────────────────────
  let socialResults = [];
  if (social && Object.keys(socialUrls).length) {
    log.step(`Checking ${Object.keys(socialUrls).length} social profile(s)`);
    socialResults = await harvestSocial(fetcher, socialUrls);
    for (const r of socialResults) {
      log.info(`${r.label.padEnd(16)} ${r.status}${r.data?.followers ? ` · ${r.data.followers} followers` : ''}`);
    }
  }

  // ── Assets ─────────────────────────────────────────────────────────
  const assets = [];
  if (downloadAssets && clientDir) {
    const assetDir = path.join(clientDir, 'assets', 'harvested');
    await ensureDir(assetDir);
    const wanted = uniqueBy(
      [
        ...(logo ? [{ ...logo, role: 'logo' }] : []),
        ...(hero ? [{ ...hero, role: 'hero' }] : []),
        ...gallery.map((g) => ({ url: g.src, alt: g.alt, role: 'gallery' })),
        ...allImages.filter((i) => i.role === 'team').map((i) => ({ ...i, role: 'team' })),
      ],
      (i) => i.url,
    ).slice(0, maxAssets);

    log.step(`Downloading ${wanted.length} image(s)`);
    let index = 0;
    for (const item of wanted) {
      index++;
      const ext = extname(item.url) || '.jpg';
      const stem = slugify(basename(item.url).replace(/\.[a-z0-9]+$/i, '') || `${item.role}-${index}`, `${item.role}-${index}`);
      const filename = `${item.role}-${String(index).padStart(2, '0')}-${stem}${ext}`;
      const saved = await fetcher.download(item.url, path.join(assetDir, filename));
      if (saved) {
        assets.push({
          role: item.role,
          sourceUrl: item.url,
          file: path.posix.join('assets', 'harvested', filename),
          alt: item.alt ?? '',
          bytes: saved.bytes,
          contentType: saved.contentType,
        });
      }
    }
    log.info(`saved ${assets.length}/${wanted.length}`);
  }

  const audit = summarizeAudit(perPage.map((p) => p.audit));

  const raw = {
    harvestedAt: new Date().toISOString(),
    startUrl: normalizedStart,
    origin,
    slug,
    stats: { pagesCrawled: pages.length, urlsDiscovered: discovered, requests: fetcher.stats.requests, bytes: fetcher.stats.bytes },
    robots: { present: !robots.missing, crawlDelay: robots.crawlDelay, sitemaps: robots.sitemaps, honoured: !ignoreRobots },
    pages: perPage.map((p) => ({
      url: p.url, kind: p.kind, title: p.meta.title, description: p.meta.description,
      headings: p.headings, paragraphs: p.paragraphs.slice(0, 25), nav: p.nav,
      audit: p.audit,
    })),
    skipped,
    meta: home.meta,
    jsonld: { found: perPage.reduce((n, p) => n + p.jsonld.length, 0), patch: jsonldPatch },
    contact,
    brand: { colors, fonts, logo: logo?.url ?? '', hero: hero?.url ?? '' },
    social: { urls: socialUrls, profiles: socialResults, gaps: socialGaps(socialResults) },
    content: { services, testimonials, faqs, team, gallery },
    images: allImages,
    assets,
    audit,
  };

  const draft = buildDraftProfile(raw);
  return { raw, draft, fetcher };
}

/** Highest-confidence contact details, preferring the contact page. */
function mergeContact(perPage) {
  const ordered = [...perPage].sort((a, b) => {
    const rank = (p) => (p.kind === 'contact' ? 0 : p.kind === 'home' ? 1 : 2);
    return rank(a) - rank(b);
  });

  const phones = uniqueBy(ordered.flatMap((p) => p.contact.phones), (p) => p.value.replace(/\D/g, '').slice(-10));
  const emails = uniqueBy(ordered.flatMap((p) => p.contact.emails), (e) => e.value);
  const address = ordered.map((p) => p.contact.address).find(Boolean) ?? null;
  const hours = ordered.map((p) => p.contact.hours).find(Boolean) ?? null;
  return { phones, emails, address, hours };
}

/**
 * Deterministic raw → profile mapping. Produces a buildable site with no AI
 * involvement; the Claude Code enrichment pass then rewrites the copy.
 */
export function buildDraftProfile(raw) {
  const jp = raw.jsonld.patch ?? {};
  const home = raw.pages.find((p) => p.kind === 'home') ?? raw.pages[0] ?? {};
  const siteName =
    jp.business?.name ||
    raw.meta.og.siteName ||
    squash((home.title ?? '').split(/[|–—-]/)[0]) ||
    stripWww(hostname(raw.startUrl)).split('.')[0];

  const heroHeadline = humanizeHeading(
    (home.headings ?? []).find((h) => h.level === 1)?.text || raw.meta.og.title || siteName,
  );
  const assetFor = (role) => raw.assets.find((a) => a.role === role)?.file ?? '';
  const galleryAssets = raw.assets.filter((a) => a.role === 'gallery');

  const longestParagraphs = (home.paragraphs ?? [])
    .concat(raw.pages.filter((p) => p.kind === 'about').flatMap((p) => p.paragraphs ?? []))
    .sort((a, b) => b.length - a.length)
    .slice(0, 4);

  const profile = normalizeProfile({
    slug: raw.slug,
    source: {
      url: raw.startUrl,
      harvestedAt: raw.harvestedAt,
      pagesCrawled: raw.stats.pagesCrawled,
      socialSources: (raw.social.profiles ?? []).map((p) => `${p.label}: ${p.status}`),
      notes: 'Draft generated by `avo harvest`. Copy is lifted verbatim from the old site — run the enrichment pass before building for a client.',
    },
    business: {
      name: humanizeHeading(siteName),
      legalName: jp.business?.legalName ?? '',
      tagline: squash(raw.meta.og.description || raw.meta.description || '').split(/[.!]/)[0] ?? '',
      category: jp.business?.category ?? '',
      description: squash(raw.meta.description || raw.meta.og.description || ''),
      founded: jp.business?.founded ?? '',
      priceRange: jp.business?.priceRange ?? '',
      serviceArea: jp.business?.serviceArea ?? [],
    },
    contact: {
      phone: raw.contact.phones[0]?.value ?? jp.contact?.phone ?? '',
      phones: raw.contact.phones.map((p) => p.value),
      email: raw.contact.emails[0]?.value ?? jp.contact?.email ?? '',
      emails: raw.contact.emails.map((e) => e.value),
      address: raw.contact.address?.address ?? jp.contact?.address ?? {},
      geo: jp.contact?.geo ?? {},
      hours: raw.contact.hours?.hours ?? jp.contact?.hours ?? [],
    },
    brand: {
      logo: assetFor('logo') || raw.brand.logo,
      colors: {
        primary: raw.brand.colors.primary,
        secondary: raw.brand.colors.secondary,
        accent: raw.brand.colors.accent,
      },
      fonts: { heading: raw.brand.fonts.heading, body: raw.brand.fonts.body },
    },
    social: raw.social.urls,
    content: {
      hero: {
        headline: heroHeadline,
        subhead: squash(raw.meta.og.description || raw.meta.description || (home.paragraphs ?? [])[0] || ''),
        image: assetFor('hero') || raw.brand.hero,
      },
      about: {
        heading: `About ${humanizeHeading(siteName)}`,
        body: longestParagraphs,
      },
    },
    services: (raw.content.services ?? []).map((s) => ({
      name: s.name,
      summary: s.summary,
      sourceUrl: s.sourceUrl,
    })),
    gallery: galleryAssets.map((a) => ({ src: a.file, alt: a.alt })),
    testimonials: raw.content.testimonials ?? [],
    team: (raw.content.team ?? []).map((m) => ({ ...m, photo: '' })),
    faqs: raw.content.faqs ?? [],
    seo: {
      title: raw.meta.title,
      description: raw.meta.description,
      keywords: raw.meta.keywords,
    },
    _meta: {
      enriched: false,
      gaps: (raw.social.gaps ?? []).map((g) => `${g.network}: ${g.ask}`),
      todo: [],
    },
  });

  return profile;
}

export async function saveHarvest(clientDir, raw, draft) {
  await writeJson(path.join(clientDir, 'harvest', 'raw.json'), raw);
  await writeJson(path.join(clientDir, 'profile.draft.json'), draft);
  return { rawPath: path.join(clientDir, 'harvest', 'raw.json'), draftPath: path.join(clientDir, 'profile.draft.json') };
}
