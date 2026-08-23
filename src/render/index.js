import path from 'node:path';
import { getTheme } from '../themes/index.js';
import { compileTokens } from '../themes/tokens.js';
import { buildStylesheet, minifyCss } from './css.js';
import { RUNTIME_JS, minifyJs } from './js.js';
import { renderDocument, faviconSvg } from './html.js';
import { sitemapXml, robotsTxt, webManifest } from './seo.js';
import { processAssets } from './assets.js';
import { planPages, relativeUrl, navFor } from '../shell/pages.js';
import { validateProfile, scoreProfile } from '../profile/validate.js';
import { writeText, ensureDir, rimraf, dirSize, formatBytes, walk } from '../util/fs.js';
import { log } from '../util/log.js';

/**
 * Build a complete static site from a profile.
 *
 * Output is plain HTML/CSS/JS with relative links, so it works served from a
 * domain root, a subdirectory, or opened directly off disk.
 */
export async function buildSite(profile, options = {}) {
  const {
    themeId = profile.site?.theme || 'meridian',
    mode = profile.site?.mode || 'light',
    outDir,
    clientDir,
    siteUrl = profile.site?.domain || '',
    minify = true,
    clean = true,
    responsive = true,
    darkMode = 'auto',
    themeToggle = false,
    lang = 'en',
  } = options;

  const theme = getTheme(themeId);
  const validation = validateProfile(profile);
  if (!validation.ok) {
    const err = new Error(`Profile is not buildable:\n  - ${validation.errors.join('\n  - ')}`);
    err.validation = validation;
    throw err;
  }

  if (clean) await rimraf(outDir);
  await ensureDir(outDir);

  // ── Assets first: srcset variants feed into the markup ─────────────
  const { copied, variants, sharp } = clientDir
    ? await processAssets(clientDir, outDir, { responsive })
    : { copied: 0, variants: new Map(), sharp: false };

  const { vars: tokens } = compileTokens(theme, { brand: profile.brand, mode });
  const { css, warnings: cssWarnings } = buildStylesheet(theme, { brand: profile.brand, mode, darkMode });

  const pages = planPages(profile, { theme });
  const hasServicePages = pages.some((p) => p.parent === 'services');

  const written = [];
  for (const page of pages) {
    const link = (to) => relativeUrl(page.url, to);
    // Profile-authored hrefs are site-relative ("contact/"); resolve them
    // against the current page so deep pages do not link to ./contact/contact/.
    const href = (value) => {
      if (!value) return null;
      if (/^(https?:|mailto:|tel:|sms:|#|\.\/|\.\.\/)/i.test(value)) return value;
      return link(String(value).replace(/^\//, ''));
    };
    const ctx = {
      profile,
      theme,
      page,
      pages,
      nav: navFor(pages, page),
      siteUrl,
      tokens,
      hasServicePages,
      options: { themeToggle, lang },
      link,
      href,
      cta: (value, fallback = null) => {
        const source = value?.label ? value : fallback;
        return source ? { ...source, href: href(source.href) ?? link('contact/') } : null;
      },
      asset: (p) => (p && !/^(https?:)?\/\//i.test(p) ? link(p) : p),
      variant: (name) => theme.sections[name] ?? 'cards',
      variantsFor: (src) => variants.get(src) ?? null,
      cssPath: link('styles.css'),
      jsPath: link('site.js'),
    };
    const html = renderDocument(ctx);
    await writeText(path.join(outDir, page.outPath), html);
    written.push(page.outPath);
  }

  // ── Shared files ───────────────────────────────────────────────────
  await writeText(path.join(outDir, 'styles.css'), minify ? minifyCss(css) : css);
  await writeText(path.join(outDir, 'site.js'), minify ? minifyJs(RUNTIME_JS) : RUNTIME_JS);
  await writeText(path.join(outDir, 'favicon.svg'), faviconSvg(profile, tokens));
  await writeText(path.join(outDir, 'site.webmanifest'), webManifest(profile, tokens));
  if (siteUrl) {
    await writeText(path.join(outDir, 'sitemap.xml'), sitemapXml(pages, siteUrl));
    await writeText(path.join(outDir, 'robots.txt'), robotsTxt(siteUrl));
  } else {
    await writeText(path.join(outDir, 'robots.txt'), 'User-agent: *\nAllow: /\n');
  }

  const warnings = [...validation.warnings, ...cssWarnings];
  if (!siteUrl) warnings.push('No site.domain set — sitemap.xml and absolute OpenGraph URLs were skipped. Set it before going live.');
  const form = profile.site.form ?? {};
  if (!form.action && !profile.contact.email) {
    warnings.push('The contact form has no endpoint and no fallback email address, so submissions will go nowhere.');
  } else if (!form.action) {
    warnings.push(`The contact form falls back to a mailto: link (${profile.contact.email}). Set site.form.action to a real endpoint before launch.`);
  }
  if (responsive && !sharp) {
    warnings.push('sharp is not installed, so no responsive image variants were generated. Run `npm i sharp` for smaller images.');
  }

  const bytes = await dirSize(outDir);
  const files = await walk(outDir);

  return {
    outDir,
    theme: theme.id,
    themeName: theme.name,
    mode,
    pages: pages.map((p) => ({ slug: p.slug, url: p.url, outPath: p.outPath, title: p.title })),
    files: files.length,
    assetsCopied: copied,
    bytes,
    size: formatBytes(bytes),
    warnings,
    notes: validation.notes,
    score: scoreProfile(profile),
  };
}

/** Build the same profile in every theme, into sibling folders. */
export async function buildAllThemes(profile, options = {}) {
  const { THEME_IDS } = await import('../themes/index.js');
  const results = [];
  for (const id of THEME_IDS) {
    const outDir = path.join(options.baseOutDir, id);
    log.step(`Building ${id}`);
    results.push(await buildSite(profile, { ...options, themeId: id, outDir }));
  }
  return results;
}
