import { escapeHtml } from '../../util/text.js';
import { section } from '../components.js';

/**
 * A plain prose page: privacy policy, terms, cookie policy. Deliberately dumb —
 * it renders whatever headings and paragraphs the profile carries, because the
 * content of a legal page is the client's to write, not ours to generate.
 */
export function renderLegal(ctx, config = {}) {
  const page = (ctx.profile.legal ?? []).find((l) => l.slug === config.slug);
  if (!page) return '';

  const body = page.sections
    .map((sec) => [
      sec.heading ? `    <h2>${escapeHtml(sec.heading)}</h2>` : '',
      ...sec.body.map((para) => `    <p>${escapeHtml(para)}</p>`),
    ].filter(Boolean).join('\n'))
    .join('\n');

  return section({
    className: 'legal',
    children: `<div class="prose-layout">
  <div class="prose">
${page.updated ? `    <p class="legal__updated">Last updated ${escapeHtml(page.updated)}</p>` : ''}
${body}
  </div>
</div>`,
  });
}
