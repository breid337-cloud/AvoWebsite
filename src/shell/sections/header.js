import { escapeHtml } from '../../util/text.js';
import { attrs, cx, brandLogo, button } from '../components.js';
import { icon } from '../icons.js';
import { telHref, formatPhone } from '../../profile/normalize.js';

/**
 * Sticky site header with a real mobile drawer. Variants:
 *   standard – logo left, nav right, CTA button
 *   bar      – adds a contact strip above the nav (trades: phone always visible)
 *   centered – stacked logo over centred nav (boutique/wellness)
 */
export function renderHeader(ctx) {
  const { profile, nav, link, variant } = ctx;
  const style = variant('header');
  const name = profile.business.name;
  const phone = profile.contact.phone;

  const logo = brandLogo(profile, ctx.asset, { loading: 'eager', fetchpriority: 'high' });

  const brand = `<a class="brand" href="${link('')}"${attrs({ 'aria-label': `${name} — home` })}>${logo}</a>`;

  const navList = `<ul class="nav__list">
${nav.map((item) => `    <li><a${attrs({
    class: cx('nav__link', item.current && 'is-current'),
    href: item.href,
    'aria-current': item.current ? 'page' : null,
  })}>${escapeHtml(item.label)}</a></li>`).join('\n')}
  </ul>`;

  const phoneLink = phone
    ? `<a class="header__phone" href="tel:${escapeHtml(telHref(phone))}" data-cta="header-phone">${icon('phone')}<span>${escapeHtml(formatPhone(phone))}</span></a>`
    : '';

  const cta = button(
    profile.content.hero.primaryCta?.label
      ? { ...profile.content.hero.primaryCta, href: link('contact/'), track: 'header-cta' }
      : { label: 'Get a quote', href: link('contact/'), track: 'header-cta' },
    { variant: 'primary', className: 'header__cta' },
  );

  const topBar = style === 'bar'
    ? `<div class="header__topbar">
  <div class="container header__topbar-inner">
    <p class="header__tagline">${escapeHtml(profile.business.tagline || profile.business.category || '')}</p>
    <div class="header__topbar-actions">
      ${phone ? `<a href="tel:${escapeHtml(telHref(phone))}" data-cta="topbar-phone">${icon('phone')} ${escapeHtml(formatPhone(phone))}</a>` : ''}
      ${profile.contact.hours.length ? `<span class="header__hours-hint" data-hours-hint>${icon('clock')} <span data-open-status>Opening hours</span></span>` : ''}
    </div>
  </div>
</div>`
    : '';

  return `${topBar}
<header class="${cx('site-header', `site-header--${style}`)}" data-header>
  <div class="container site-header__inner">
    ${brand}
    <nav class="nav" aria-label="Main">
      ${navList}
    </nav>
    <div class="header__actions">
      ${style !== 'bar' ? phoneLink : ''}
      ${cta}
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="mobile-nav" data-nav-toggle>
        <span class="visually-hidden">Menu</span>
        ${icon('menu', 'icon nav-toggle__open')}${icon('close', 'icon nav-toggle__close')}
      </button>
    </div>
  </div>
</header>
<div class="mobile-nav" id="mobile-nav" hidden data-mobile-nav>
  <nav aria-label="Mobile">
    <ul class="mobile-nav__list">
${nav.map((item) => `      <li><a${attrs({ class: cx('mobile-nav__link', item.current && 'is-current'), href: item.href, 'aria-current': item.current ? 'page' : null })}>${escapeHtml(item.label)}</a></li>`).join('\n')}
    </ul>
    <div class="mobile-nav__actions">
      ${phone ? `<a class="btn btn--primary btn--block" href="tel:${escapeHtml(telHref(phone))}" data-cta="mobile-phone">${icon('phone')} ${escapeHtml(formatPhone(phone))}</a>` : ''}
      <a class="btn btn--ghost btn--block" href="${link('contact/')}">Contact us</a>
    </div>
  </nav>
</div>`;
}
