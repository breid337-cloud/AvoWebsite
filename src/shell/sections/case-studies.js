import { escapeHtml } from '../../util/text.js';
import { image, section, sectionHeader, button } from '../components.js';

/**
 * Client case studies: what was wrong, what changed, and the numbers that
 * moved. Variants: split (image beside the story), stack (story only).
 *
 * `metrics` renders as a before → after table rather than prose because a
 * claim a reader can check is worth more than an adjective they cannot.
 */
export function renderCaseStudies(ctx, config = {}) {
  const { profile, link, variant, asset } = ctx;
  const style = variant('caseStudies');
  const all = profile.caseStudies ?? [];
  const items = config.limit ? all.slice(0, config.limit) : all;
  if (!items.length) return '';

  const head = sectionHeader({
    eyebrow: config.preview ? 'Selected work' : null,
    title: config.heading ?? 'Case studies',
    intro: config.intro ?? '',
    align: 'start',
    id: 'case-studies-title',
  });

  const card = (study) => {
    // A table is right for the full list and wrong for the headline: someone
    // who has never heard of Lighthouse reads "8.7s → 1.8s" and understands
    // it. Highlighted rows are lifted out; the rest stay in the table, so
    // nothing is said twice.
    const headline = study.metrics.filter((m) => m.highlight);
    const rest = study.metrics.filter((m) => !m.highlight);

    const deltas = headline.length
      ? `      <ul class="stats case-study__deltas">
${headline.map((m) => `        <li class="stat stat--delta">
          <span class="stat__value"><span class="stat__before">${escapeHtml(m.before)}</span><span class="stat__arrow" aria-hidden="true">→</span><span class="visually-hidden">improved to</span><span class="stat__after">${escapeHtml(m.after)}</span></span>
          <span class="stat__label">${escapeHtml(m.label)}</span>
        </li>`).join('\n')}
      </ul>`
      : '';

    const metrics = rest.length
      ? `      <table class="case-study__metrics">
        <caption class="visually-hidden">Measured before and after the rebuild</caption>
        <thead><tr><th scope="col">Measure</th><th scope="col">Before</th><th scope="col">After</th></tr></thead>
        <tbody>
${rest.map((m) => `          <tr><th scope="row">${escapeHtml(m.label)}</th><td>${escapeHtml(m.before)}</td><td>${escapeHtml(m.after)}</td></tr>`).join('\n')}
        </tbody>
      </table>`
      : '';

    const quote = study.quote
      ? `      <blockquote class="case-study__quote">
        <p>${escapeHtml(study.quote.text)}</p>
${study.quote.author ? `        <footer>${escapeHtml(study.quote.author)}${study.quote.role ? `, ${escapeHtml(study.quote.role)}` : ''}</footer>` : ''}
      </blockquote>`
      : '';

    const links = [
      study.liveUrl ? `<a href="${escapeHtml(study.liveUrl)}" rel="noopener" target="_blank">Visit the site</a>` : '',
      study.archiveUrl ? `<a href="${escapeHtml(study.archiveUrl)}" rel="noopener nofollow" target="_blank">See it before</a>` : '',
    ].filter(Boolean);

    return `  <article class="case-study">
${study.image ? `    <div class="case-study__media">${image(asset(study.image), `${study.client} website`, { className: 'rounded' })}</div>` : ''}
    <div class="case-study__body">
${study.sector ? `      <p class="eyebrow">${escapeHtml(study.sector)}</p>` : ''}
      <h3 class="case-study__title">${escapeHtml(study.client)}</h3>
${study.summary ? `      <p class="case-study__summary">${escapeHtml(study.summary)}</p>` : ''}
${deltas}
${study.before.length ? `      <h4>Where they started</h4>
${study.before.map((p) => `      <p>${escapeHtml(p)}</p>`).join('\n')}` : ''}
${study.after.length ? `      <h4>What changed</h4>
${study.after.map((p) => `      <p>${escapeHtml(p)}</p>`).join('\n')}` : ''}
${metrics}
${quote}
${links.length ? `      <p class="case-study__links">${links.join(' <span aria-hidden="true">·</span> ')}</p>` : ''}
    </div>
  </article>`;
  };

  const more = config.preview && all.length > items.length
    ? `<div class="section-foot">${button({ label: 'See all case studies', href: link('work/') }, { variant: 'ghost', iconName: 'arrow' })}</div>`
    : '';

  return section({
    id: 'case-studies',
    className: `case-studies case-studies--${style}`,
    labelledBy: 'case-studies-title',
    children: `${head}
<div class="case-studies__list">
${items.map(card).join('\n')}
</div>
${more}`,
  });
}
