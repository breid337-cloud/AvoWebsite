import { escapeHtml } from '../../util/text.js';
import { section, sectionHeader, ratingStars } from '../components.js';
import { icon } from '../icons.js';

/** Social proof. Variants: cards (grid) and quote (single large pull-quote). */
export function renderTestimonials(ctx, config = {}) {
  const { profile, variant } = ctx;
  const style = variant('testimonials');
  const items = config.limit ? profile.testimonials.slice(0, config.limit) : profile.testimonials;
  if (!items.length) return '';

  const head = sectionHeader({
    eyebrow: 'Reviews',
    title: config.heading ?? 'What our customers say',
    align: style === 'quote' ? 'center' : 'start',
    id: 'testimonials-title',
  });

  const attribution = (t) => {
    const meta = [t.role, t.location].filter(Boolean).join(', ');
    return `<footer class="testimonial__by">
      <cite>${escapeHtml(t.author || 'Verified customer')}</cite>
      ${meta ? `<span class="testimonial__meta">${escapeHtml(meta)}</span>` : ''}
      ${t.source ? `<span class="testimonial__source">via ${escapeHtml(t.source)}</span>` : ''}
    </footer>`;
  };

  const body = style === 'quote'
    ? `<div class="quote-stack">
${items.map((t) => `  <blockquote class="testimonial testimonial--quote">
    ${ratingStars(t.rating)}
    <p class="testimonial__quote">${escapeHtml(t.quote)}</p>
    ${attribution(t)}
  </blockquote>`).join('\n')}
</div>`
    : `<ul class="card-grid card-grid--testimonials">
${items.map((t) => `  <li class="card testimonial">
    <span class="testimonial__mark" aria-hidden="true">${icon('quote')}</span>
    ${ratingStars(t.rating)}
    <blockquote class="testimonial__quote">${escapeHtml(t.quote)}</blockquote>
    ${attribution(t)}
  </li>`).join('\n')}
</ul>`;

  return section({
    id: 'testimonials',
    className: `testimonials testimonials--${style}`,
    tone: 'surface',
    labelledBy: 'testimonials-title',
    children: `${head}\n${body}`,
  });
}
