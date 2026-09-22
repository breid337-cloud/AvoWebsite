import { escapeHtml } from '../util/text.js';
import { metaTags, buildJsonLd, hoursJson } from './seo.js';
import { googleFontsHref } from '../themes/tokens.js';
import { renderSection } from '../shell/sections/index.js';
import { renderHeader } from '../shell/sections/header.js';
import { renderFooter } from '../shell/sections/footer.js';
import { icon } from '../shell/icons.js';
import { consentRequired } from '../profile/schema.js';

/** Full HTML document for one page. */
export function renderDocument(ctx) {
  const { profile, theme, page, pages, siteUrl, cssPath, jsPath, tokens, options } = ctx;

  const canonical = siteUrl ? new URL(page.url, siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`).toString() : '';
  const fonts = googleFontsHref(theme);
  const lang = options.lang || 'en';
  const jsonLd = buildJsonLd(profile, page, { siteUrl, pages });
  const hours = hoursJson(profile);

  const body = page.sections.map((spec) => renderSection(ctx, spec)).filter(Boolean).join('\n\n');

  // When consent is required the GA4 tag is NOT emitted. Its id is handed to the
  // runtime as inert JSON instead, and site.js injects the script only after the
  // visitor agrees — so no cookie is set before that, which is what UK PECR and
  // the GDPR actually require. A banner that merely announces cookies already
  // being set would not comply.
  const gated = consentRequired(profile);
  const ga4 = profile.site.analytics?.ga4 ?? '';
  const analytics = [
    // Plausible is cookieless, so it loads regardless of the banner.
    profile.site.analytics?.plausible
      ? `<script defer data-domain="${escapeHtml(profile.site.analytics.plausible)}" src="https://plausible.io/js/script.js"></script>`
      : '',
    ga4 && !gated
      ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${escapeHtml(ga4)}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${escapeHtml(ga4)}');</script>`
      : '',
    gated
      ? `<script type="application/json" id="avo-consent">${JSON.stringify({ ga4, policyUrl: profile.site.consent?.policyUrl || '' })}</script>`
      : '',
  ].filter(Boolean).join('\n  ');

  const consentBanner = gated ? renderConsentBanner(profile, ctx) : '';

  const themeToggle = options.themeToggle
    ? `<button class="btn btn--ghost theme-toggle" type="button" data-theme-toggle aria-pressed="false" aria-label="Switch colour scheme">${icon('sparkle')}</button>`
    : '';

  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${metaTags(profile, page, { siteUrl, canonical })}
  <meta name="theme-color" content="${escapeHtml(tokens['--primary'])}">
  <meta name="generator" content="Avo Website Builder">
${fonts ? `  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="${escapeHtml(fonts)}">` : ''}
  <link rel="stylesheet" href="${escapeHtml(cssPath)}">
  <link rel="icon" href="${escapeHtml(ctx.link('favicon.svg'))}" type="image/svg+xml">
  <link rel="manifest" href="${escapeHtml(ctx.link('site.webmanifest'))}">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
${Object.keys(hours).length ? `  <script type="application/json" id="avo-hours">${JSON.stringify(hours)}</script>` : ''}
  <script>try{var t=localStorage.getItem('avo-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}</script>
  ${analytics}
</head>
<body class="page page--${escapeHtml(page.slug)} theme-${escapeHtml(theme.id)}">
  <a class="skip-link" href="#main">Skip to content</a>
${renderHeader(ctx)}
  <main id="main">
${body}
  </main>
${renderFooter(ctx)}
  ${themeToggle}
${consentBanner}
  <script src="${escapeHtml(jsPath)}" defer></script>
</body>
</html>
`;
}

/**
 * Cookie consent banner. Ships hidden and is revealed by site.js only when no
 * choice is stored, so a returning visitor never sees it again and a visitor
 * with JS disabled sees nothing — correctly, since without JS the tag never
 * loads either.
 *
 * Accept and Decline are the same size, side by side, one tap each. Regulators
 * treat a hard-to-find refusal as no consent at all, so the two must stay
 * equally easy to press.
 */
function renderConsentBanner(profile, ctx) {
  const policy = profile.site.consent?.policyUrl || '';
  const link = policy
    ? ` <a class="consent__link" href="${escapeHtml(policy)}">Privacy policy</a>`
    : '';
  return `  <div class="consent" id="avo-consent-banner" role="dialog" aria-modal="false" aria-labelledby="avo-consent-title" hidden>
    <div class="consent__inner">
      <div class="consent__copy">
        <h2 class="consent__title" id="avo-consent-title">Cookies</h2>
        <p class="consent__text">We would like to use Google Analytics to see how people find and use this site. It sets cookies, so we only switch it on if you agree. Nothing is loaded until you choose.${link}</p>
      </div>
      <div class="consent__actions">
        <button type="button" class="btn btn--primary consent__btn" data-consent="accept">Accept</button>
        <button type="button" class="btn btn--ghost consent__btn" data-consent="decline">Decline</button>
      </div>
    </div>
  </div>`;
}

/** A generated SVG favicon so every site ships one, logo or not. */
export function faviconSvg(profile, tokens) {
  const initials = (profile.business.name || 'A')
    .split(/\s+/)
    .filter((w) => /[a-z0-9]/i.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${escapeHtml(profile.business.name)}">
  <rect width="64" height="64" rx="12" fill="${escapeHtml(tokens['--primary'])}"/>
  <text x="50%" y="50%" dy=".35em" text-anchor="middle"
        font-family="system-ui, -apple-system, 'Segoe UI', sans-serif"
        font-size="${initials.length > 1 ? 28 : 34}" font-weight="700"
        fill="${escapeHtml(tokens['--on-primary'])}">${escapeHtml(initials)}</text>
</svg>
`;
}
