import { escapeHtml } from '../../util/text.js';
import { cx, button, section } from '../components.js';
import { telHref, formatPhone } from '../../profile/normalize.js';

/** Closing conversion band. Variants: band (full-width), boxed, split. */
export function renderCta(ctx, config = {}) {
  const { profile, link, variant } = ctx;
  const style = variant('cta');
  const cta = profile.content.closingCta ?? {};
  const phone = profile.contact.phone;

  const heading = config.heading || cta.heading || `Ready to get started?`;
  const text = config.text || cta.text ||
    (profile.contact.address.city
      ? `Talk to ${profile.business.name} about your project in ${profile.contact.address.city}.`
      : `Talk to ${profile.business.name} about what you need.`);

  const primary = button(
    ctx.cta(cta.primaryCta, { label: ctx.copy('ctaPrimary', 'Request a quote'), href: 'contact/', track: 'cta-primary' }),
    { variant: 'invert' },
  );
  const secondary = phone
    ? button({ label: `Call ${formatPhone(phone)}`, href: `tel:${telHref(phone)}`, track: 'cta-phone' }, { variant: 'invert-ghost' })
    : '';

  const inner = `<div class="${cx('cta__inner', style === 'split' && 'cta__inner--split')}">
  <div>
    <h2 class="cta__title">${escapeHtml(heading)}</h2>
    <p class="cta__text">${escapeHtml(text)}</p>
  </div>
  <div class="cta__actions">${primary}${secondary}</div>
</div>`;

  if (style === 'boxed') {
    return `<section class="section cta cta--boxed"><div class="container"><div class="cta__box">${inner}</div></div></section>`;
  }
  return `<section class="section cta cta--${style}"><div class="container">${inner}</div></section>`;
}
