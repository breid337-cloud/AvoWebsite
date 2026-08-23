import { escapeHtml } from '../../util/text.js';
import { section } from '../components.js';
import { icon } from '../icons.js';

/** Stats and/or value propositions — the "why us" strip under the hero. */
export function renderTrustbar(ctx) {
  const { profile } = ctx;
  const stats = profile.content.stats;
  const props = profile.content.valueProps;
  if (!stats.length && !props.length) return '';

  const statsHtml = stats.length
    ? `<ul class="stats">
${stats.map((s) => `  <li class="stat"><span class="stat__value">${escapeHtml(s.value)}</span><span class="stat__label">${escapeHtml(s.label)}</span></li>`).join('\n')}
</ul>`
    : '';

  const propsHtml = props.length
    ? `<ul class="value-props">
${props.map((p) => `  <li class="value-prop">
    <span class="value-prop__icon">${icon(p.icon || 'checkCircle')}</span>
    <div>
      ${p.title ? `<h3 class="value-prop__title">${escapeHtml(p.title)}</h3>` : ''}
      ${p.text ? `<p class="value-prop__text">${escapeHtml(p.text)}</p>` : ''}
    </div>
  </li>`).join('\n')}
</ul>`
    : '';

  return section({
    className: 'trustbar',
    tone: 'surface',
    label: 'Why choose us',
    children: [statsHtml, propsHtml].filter(Boolean).join('\n'),
  });
}
