import { escapeHtml } from '../util/text.js';
import { icon } from './icons.js';

/** Build an attribute string, skipping null/undefined/false values. */
export function attrs(map = {}) {
  return Object.entries(map)
    .filter(([, v]) => v !== null && v !== undefined && v !== false && v !== '')
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${escapeHtml(String(v))}"`))
    .join('');
}

export const cx = (...classes) => classes.filter(Boolean).join(' ');

/** Join HTML fragments, dropping empties. */
export const join = (parts, separator = '\n') => parts.filter(Boolean).join(separator);

export function button(cta, { variant = 'primary', className = '', iconName = null } = {}) {
  if (!cta || !cta.label) return '';
  const isExternal = /^https?:\/\//i.test(cta.href ?? '') ;
  return `<a class="${cx('btn', `btn--${variant}`, className)}"${attrs({
    href: cta.href || '#contact',
    target: isExternal ? '_blank' : null,
    rel: isExternal ? 'noopener' : null,
    'data-cta': cta.track ?? null,
  })}>${escapeHtml(cta.label)}${iconName ? icon(iconName, 'btn__icon') : ''}</a>`;
}

/**
 * Responsive image. `sizes` describes layout width so the browser can pick from
 * the srcset the asset pipeline generates.
 */
export function image(src, alt, { className = '', sizes = '100vw', loading = 'lazy', width = null, height = null, variants = null, fetchpriority = null } = {}) {
  if (!src) return '';
  const srcset = variants?.length
    ? variants.map((v) => `${v.src} ${v.width}w`).join(', ')
    : null;
  return `<img${attrs({
    src,
    srcset,
    sizes: srcset ? sizes : null,
    alt: alt ?? '',
    class: className || null,
    loading,
    decoding: 'async',
    fetchpriority,
    width,
    height,
  })}>`;
}

/** A <section> with a consistent id/class/container contract. */
export function section({ id, className, children, container = true, tone = null, label = null, labelledBy = null }) {
  const inner = container ? `<div class="container">\n${children}\n</div>` : children;
  return `<section${attrs({
    id: id || null,
    class: cx('section', className, tone && `tone--${tone}`),
    'aria-label': label,
    'aria-labelledby': labelledBy,
  })}>\n${inner}\n</section>`;
}

/** Eyebrow + heading + optional intro, used at the top of most sections. */
export function sectionHeader({ eyebrow, title, intro, align = 'start', id = null, level = 2 }) {
  if (!title && !eyebrow && !intro) return '';
  return `<header class="${cx('section-head', align === 'center' && 'section-head--center')}">
${eyebrow ? `  <p class="eyebrow">${escapeHtml(eyebrow)}</p>` : ''}
${title ? `  <h${level}${attrs({ id, class: 'section-title' })}>${escapeHtml(title)}</h${level}>` : ''}
${intro ? `  <p class="section-intro">${escapeHtml(intro)}</p>` : ''}
</header>`;
}

export function ratingStars(rating) {
  if (!rating) return '';
  const rounded = Math.round(rating);
  const stars = Array.from({ length: 5 }, (_, i) => icon('star', cx('star', i < rounded && 'star--on'))).join('');
  return `<p class="rating" role="img" aria-label="${rating} out of 5 stars">${stars}</p>`;
}

/** Fallback wordmark when the client has no usable logo file. */
/**
 * Site logo. When the profile supplies both a light-background and a
 * dark-background master, emit both and let CSS pick — matching the colour
 * scheme *and* the manual theme toggle, which a <picture media> cannot do.
 */
export function brandLogo(profile, asset, { className = '', loading = 'lazy', fetchpriority = null } = {}) {
  const { logo, logoDark } = profile.brand;
  if (!logo) return wordmark(profile.business.name);
  const alt = `${profile.business.name} logo`;
  const cls = (extra) => ['logo__img', className, extra].filter(Boolean).join(' ');
  const light = image(asset(logo), alt, { className: cls(logoDark && 'logo__img--light'), loading, fetchpriority });
  if (!logoDark) return light;
  // The second copy is decorative: the first already carries the accessible name.
  return light + image(asset(logoDark), '', { className: cls('logo__img--dark'), loading, fetchpriority });
}

export function wordmark(name) {
  const initials = name
    .split(/\s+/)
    .filter((w) => /[a-z0-9]/i.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
  return `<span class="wordmark"><span class="wordmark__mark" aria-hidden="true">${escapeHtml(initials)}</span><span class="wordmark__text">${escapeHtml(name)}</span></span>`;
}
