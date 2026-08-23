import { escapeHtml } from '../../util/text.js';
import { button } from '../components.js';

/** Inner-page banner: breadcrumb, title, optional intro. */
export function renderPageHeader(ctx, config = {}) {
  const { profile, page, link, pages } = ctx;
  const parent = config.breadcrumb && page.parent ? pages.find((p) => p.slug === page.parent) : null;

  const crumbs = `<nav class="breadcrumb" aria-label="Breadcrumb">
  <ol>
    <li><a href="${link('')}">Home</a></li>
${parent ? `    <li><a href="${link(parent.url)}">${escapeHtml(parent.navLabel ?? parent.title)}</a></li>` : ''}
    <li><span aria-current="page">${escapeHtml(config.title ?? page.title)}</span></li>
  </ol>
</nav>`;

  return `<section class="page-header">
  <div class="container">
    ${config.breadcrumb || page.parent ? crumbs : ''}
    <h1 class="page-header__title">${escapeHtml(config.title ?? page.title)}</h1>
    ${config.intro ? `<p class="page-header__intro">${escapeHtml(config.intro)}</p>` : ''}
  </div>
</section>`;
}

export function renderNotFound(ctx) {
  const { link, profile } = ctx;
  return `<section class="section notfound">
  <div class="container container--narrow">
    <p class="eyebrow">404</p>
    <h1 class="notfound__title">We can't find that page</h1>
    <p class="notfound__text">The link may be out of date. Try the homepage, or get in touch and ${escapeHtml(profile.business.name)} will point you the right way.</p>
    <div class="hero__actions">
      ${button({ label: 'Back to home', href: link('') }, { variant: 'primary' })}
      ${button({ label: 'Contact us', href: link('contact/') }, { variant: 'ghost' })}
    </div>
  </div>
</section>`;
}
