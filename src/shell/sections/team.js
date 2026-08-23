import { escapeHtml } from '../../util/text.js';
import { image, section, sectionHeader } from '../components.js';
import { icon } from '../icons.js';
import { telHref } from '../../profile/normalize.js';

export function renderTeam(ctx, config = {}) {
  const { profile, asset } = ctx;
  const items = config.limit ? profile.team.slice(0, config.limit) : profile.team;
  if (!items.length) return '';

  return section({
    id: 'team',
    className: 'team',
    labelledBy: 'team-title',
    children: `${sectionHeader({ eyebrow: 'The people', title: config.heading ?? 'Meet the team', id: 'team-title' })}
<ul class="card-grid card-grid--team">
${items.map((m) => `  <li class="card card--person">
    ${m.photo ? `<div class="card__media card__media--portrait">${image(asset(m.photo), m.name, { className: 'card__img', sizes: '(min-width: 900px) 25vw, 50vw' })}</div>` : `<span class="card__icon">${icon('users')}</span>`}
    <div class="card__body">
      <h3 class="card__title">${escapeHtml(m.name)}</h3>
      ${m.role ? `<p class="card__role">${escapeHtml(m.role)}</p>` : ''}
      ${m.bio ? `<p class="card__text">${escapeHtml(m.bio)}</p>` : ''}
      ${m.email || m.phone ? `<p class="card__contact">
        ${m.email ? `<a href="mailto:${escapeHtml(m.email)}">${icon('mail')}<span class="visually-hidden">Email ${escapeHtml(m.name)}</span></a>` : ''}
        ${m.phone ? `<a href="tel:${escapeHtml(telHref(m.phone))}">${icon('phone')}<span class="visually-hidden">Call ${escapeHtml(m.name)}</span></a>` : ''}
      </p>` : ''}
    </div>
  </li>`).join('\n')}
</ul>`,
  });
}
