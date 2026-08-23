import { escapeHtml } from '../../util/text.js';
import { cx, image, button } from '../components.js';
import { icon } from '../icons.js';
import { telHref, formatPhone } from '../../profile/normalize.js';

/**
 * Above-the-fold section. Variants: split, centered, image (full-bleed photo),
 * gradient. All of them keep one primary and one secondary call to action.
 */
export function renderHero(ctx) {
  const { profile, link, variant, asset } = ctx;
  const style = variant('hero');
  const hero = profile.content.hero;
  const phone = profile.contact.phone;

  const headline = hero.headline || profile.business.name;
  const subhead = hero.subhead || profile.business.description || '';
  const eyebrow = profile.business.tagline && profile.business.tagline !== subhead ? profile.business.tagline : profile.business.category;

  const primary = button(
    ctx.cta(hero.primaryCta, { label: 'Get a free quote', href: 'contact/' }),
    { variant: 'primary', className: 'hero__cta' },
  );
  const secondary = phone
    ? button({ label: `Call ${formatPhone(phone)}`, href: `tel:${telHref(phone)}`, track: 'hero-phone' }, { variant: 'ghost' })
    : button(ctx.cta(hero.secondaryCta, { label: 'See our services', href: 'services/' }), { variant: 'ghost' });

  const badges = hero.badges.length
    ? `<ul class="hero__badges">${hero.badges.map((b) => `<li>${icon('checkCircle')}<span>${escapeHtml(b)}</span></li>`).join('')}</ul>`
    : '';

  const media = hero.image
    ? image(asset(hero.image), hero.imageAlt || `${profile.business.name} work`, {
        className: 'hero__img',
        loading: 'eager',
        fetchpriority: 'high',
        sizes: style === 'split' ? '(min-width: 900px) 50vw, 100vw' : '100vw',
        variants: ctx.variantsFor?.(hero.image) ?? null,
      })
    : '';

  const copy = `<div class="hero__copy">
${eyebrow ? `  <p class="eyebrow">${escapeHtml(eyebrow)}</p>` : ''}
  <h1 class="hero__title">${escapeHtml(headline)}</h1>
${subhead ? `  <p class="hero__subtitle">${escapeHtml(subhead)}</p>` : ''}
  <div class="hero__actions">${primary}${secondary}</div>
${badges}
</div>`;

  if (style === 'image') {
    return `<section class="hero hero--image" ${media ? 'data-has-media' : ''}>
  ${media ? `<div class="hero__bg">${media}</div>` : ''}
  <div class="container hero__inner">
    ${copy}
  </div>
</section>`;
  }

  if (style === 'centered' || style === 'gradient') {
    return `<section class="${cx('hero', `hero--${style}`)}">
  <div class="container hero__inner">
    ${copy}
    ${media ? `<div class="hero__media hero__media--wide">${media}</div>` : ''}
  </div>
</section>`;
  }

  return `<section class="hero hero--split">
  <div class="container hero__inner">
    ${copy}
    ${media ? `<div class="hero__media">${media}</div>` : '<div class="hero__media hero__media--empty" aria-hidden="true"></div>'}
  </div>
</section>`;
}
