import { escapeHtml } from '../../util/text.js';
import { image, section, sectionHeader, button } from '../components.js';
import { icon } from '../icons.js';

export function renderAbout(ctx, config = {}) {
  const { profile, link, asset } = ctx;
  const about = profile.content.about;
  const body = config.preview ? about.body.slice(0, 2) : about.body;
  if (!body.length && !about.image) return '';

  const highlights = about.highlights.length
    ? `<ul class="tick-list tick-list--lg">${about.highlights.map((h) => `<li>${icon('check')}<span>${escapeHtml(h)}</span></li>`).join('')}</ul>`
    : '';

  const more = config.preview && about.body.length > body.length
    ? button({ label: `About ${profile.business.name}`, href: link('about/') }, { variant: 'ghost', iconName: 'arrow' })
    : '';

  const copy = `<div class="about__copy">
${sectionHeader({ eyebrow: config.preview ? 'Who we are' : null, title: about.heading || `About ${profile.business.name}`, id: 'about-title' })}
${body.map((p) => `  <p>${escapeHtml(p)}</p>`).join('\n')}
${highlights}
${more ? `<div class="section-foot">${more}</div>` : ''}
</div>`;

  const media = about.image
    ? `<div class="about__media">${image(asset(about.image), `${profile.business.name} team`, { className: 'rounded', sizes: '(min-width: 900px) 45vw, 100vw', variants: ctx.variantsFor?.(about.image) })}</div>`
    : '';

  return section({
    id: 'about',
    className: 'about',
    tone: config.preview ? null : 'surface',
    labelledBy: 'about-title',
    children: `<div class="about__grid${media ? '' : ' about__grid--single'}">
${copy}
${media}
</div>`,
  });
}
