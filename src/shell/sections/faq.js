import { escapeHtml } from '../../util/text.js';
import { attrs, section, sectionHeader, button } from '../components.js';
import { icon } from '../icons.js';

/** Native <details> accordion — keyboard accessible with no JavaScript needed. */
export function renderFaq(ctx, config = {}) {
  const { profile, link } = ctx;
  const items = config.limit ? profile.faqs.slice(0, config.limit) : profile.faqs;
  if (!items.length) return '';

  const more = config.preview && profile.faqs.length > items.length
    ? `<div class="section-foot">${button({ label: 'All questions', href: link('services/') }, { variant: 'ghost', iconName: 'arrow' })}</div>`
    : '';

  return section({
    id: 'faq',
    className: 'faq',
    labelledBy: 'faq-title',
    children: `${sectionHeader({ eyebrow: 'Good to know', title: config.heading ?? 'Frequently asked questions', id: 'faq-title' })}
<div class="faq__list">
${items.map((f, i) => `  <details class="faq__item"${attrs({ name: 'faq', open: i === 0 && !config.preview })}>
    <summary class="faq__q">
      <span>${escapeHtml(f.question)}</span>
      ${icon('chevron', 'icon faq__chevron')}
    </summary>
    <div class="faq__a"><p>${escapeHtml(f.answer)}</p></div>
  </details>`).join('\n')}
</div>
${more}`,
  });
}
