import { escapeHtml, truncate } from '../../util/text.js';
import { image, section, sectionHeader, button } from '../components.js';
import { icon, iconForService } from '../icons.js';

/**
 * Services listing. Variants: cards, numbered (trades), features (icon-led),
 * menu (price list), list.
 */
export function renderServices(ctx, config = {}) {
  const { profile, link, variant, asset, hasServicePages } = ctx;
  const style = variant('services');
  let services = profile.services;
  if (config.exclude) services = services.filter((s) => s.slug !== config.exclude);
  if (config.limit) services = services.slice(0, config.limit);
  if (!services.length) return '';

  const head = sectionHeader({
    eyebrow: config.preview ? 'What we do' : null,
    title: config.heading ?? 'Our services',
    intro: config.intro ?? (config.preview ? profile.business.tagline : ''),
    align: style === 'features' || style === 'menu' ? 'center' : 'start',
    id: 'services-title',
  });

  const href = (service) => (hasServicePages ? link(`services/${service.slug}/`) : link('contact/'));

  const body = {
    numbered: () => `<ol class="service-list service-list--numbered">
${services.map((s, i) => `  <li class="service-row">
    <span class="service-number" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
    <div class="service-row__body">
      <h3 class="service-row__title"><a href="${href(s)}">${escapeHtml(s.name)}</a></h3>
      ${s.summary ? `<p>${escapeHtml(s.summary)}</p>` : ''}
      ${s.price ? `<p class="service-row__price">${escapeHtml(s.price)}</p>` : ''}
    </div>
  </li>`).join('\n')}
</ol>`,

    menu: () => `<div class="menu-list">
${services.map((s) => `  <article class="menu-item">
    <div>
      <h3 class="menu-item__name"><a href="${href(s)}">${escapeHtml(s.name)}</a></h3>
      ${s.summary ? `<p class="menu-item__desc">${escapeHtml(s.summary)}</p>` : ''}
    </div>
    ${s.price ? `<p class="menu-item__price">${escapeHtml(s.price)}</p>` : ''}
  </article>`).join('\n')}
</div>`,

    features: () => `<ul class="feature-grid">
${services.map((s) => `  <li class="feature">
    <span class="feature__icon">${icon(s.icon || iconForService(s.name))}</span>
    <h3 class="feature__title"><a href="${href(s)}">${escapeHtml(s.name)}</a></h3>
    ${s.summary ? `<p class="feature__text">${escapeHtml(truncate(s.summary, 150))}</p>` : ''}
  </li>`).join('\n')}
</ul>`,

    list: () => `<ul class="service-list">
${services.map((s) => `  <li class="service-row">
    <div class="service-row__body">
      <h3 class="service-row__title"><a href="${href(s)}">${escapeHtml(s.name)}</a></h3>
      ${s.summary ? `<p>${escapeHtml(s.summary)}</p>` : ''}
    </div>
    ${icon('arrow', 'icon service-row__arrow')}
  </li>`).join('\n')}
</ul>`,

    cards: () => `<ul class="card-grid">
${services.map((s) => `  <li class="card card--service">
    ${s.image ? `<div class="card__media">${image(asset(s.image), s.name, { className: 'card__img', sizes: '(min-width: 900px) 33vw, 100vw', variants: ctx.variantsFor?.(s.image) })}</div>` : `<span class="card__icon">${icon(s.icon || iconForService(s.name))}</span>`}
    <div class="card__body">
      <h3 class="card__title"><a class="stretched" href="${href(s)}">${escapeHtml(s.name)}</a></h3>
      ${s.summary ? `<p class="card__text">${escapeHtml(truncate(s.summary, 160))}</p>` : ''}
      ${s.price ? `<p class="card__price">${escapeHtml(s.price)}</p>` : ''}
      ${s.features?.length ? `<ul class="tick-list">${s.features.slice(0, 4).map((f) => `<li>${icon('check')}<span>${escapeHtml(f)}</span></li>`).join('')}</ul>` : ''}
    </div>
  </li>`).join('\n')}
</ul>`,
  }[style] ?? (() => '');

  const more = config.preview && profile.services.length > services.length
    ? `<div class="section-foot">${button({ label: 'See all services', href: link('services/') }, { variant: 'ghost', iconName: 'arrow' })}</div>`
    : '';

  return section({
    id: 'services',
    className: `services services--${style}`,
    labelledBy: 'services-title',
    children: [head, body(), more].filter(Boolean).join('\n'),
  });
}

/** Long-form body of an individual service page. */
export function renderServiceDetail(ctx, config = {}) {
  const { profile, link, asset } = ctx;
  const service = config.service;
  if (!service) return '';

  const paragraphs = Array.isArray(service.description)
    ? service.description
    : service.description ? [service.description] : (service.summary ? [service.summary] : []);

  return section({
    className: 'service-detail',
    children: `<div class="prose-layout">
  <div class="prose">
${paragraphs.map((p) => `    <p>${escapeHtml(p)}</p>`).join('\n')}
${service.features?.length ? `    <h2>What's included</h2>
    <ul class="tick-list tick-list--lg">${service.features.map((f) => `<li>${icon('check')}<span>${escapeHtml(f)}</span></li>`).join('')}</ul>` : ''}
  </div>
  <aside class="prose-aside">
    <div class="sticky-card">
      <h2 class="sticky-card__title">${escapeHtml(service.name)}</h2>
      ${service.price ? `<p class="sticky-card__price">${escapeHtml(service.price)}${service.priceNote ? `<span>${escapeHtml(service.priceNote)}</span>` : ''}</p>` : ''}
      <p>${escapeHtml(profile.business.tagline || `Talk to ${profile.business.name} about your ${service.name.toLowerCase()}.`)}</p>
      ${button({ label: ctx.copy('ctaPrimary', 'Request a quote'), href: link('contact/') }, { variant: 'primary', className: 'btn--block' })}
    </div>
  </aside>
</div>${service.image ? `\n<div class="service-detail__media">${image(asset(service.image), service.name, { className: 'rounded', variants: ctx.variantsFor?.(service.image) })}</div>` : ''}`,
  });
}
