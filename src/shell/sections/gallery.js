import { escapeHtml } from '../../util/text.js';
import { attrs, image, section, sectionHeader, button } from '../components.js';

/** Photo grid with an accessible lightbox. Variants: grid, masonry. */
export function renderGallery(ctx, config = {}) {
  const { profile, link, variant, asset } = ctx;
  const style = variant('gallery');
  const items = config.limit ? profile.gallery.slice(0, config.limit) : profile.gallery;
  if (!items.length) return '';

  const head = sectionHeader({
    eyebrow: config.preview ? ctx.copy('galleryEyebrow', 'Recent work') : null,
    title: config.heading ?? ctx.copy('galleryHeading', 'Our work'),
    align: 'start',
    id: 'gallery-title',
  });

  const figures = items.map((item, i) => {
    const src = asset(item.src);
    const alt = item.alt || `${profile.business.name} work, photo ${i + 1}`;
    return `  <figure class="gallery__item">
    <button class="gallery__trigger" type="button"${attrs({ 'data-lightbox': src, 'data-caption': item.caption || alt })}>
      ${image(src, alt, { className: 'gallery__img', sizes: '(min-width: 900px) 33vw, 50vw', variants: ctx.variantsFor?.(item.src) })}
      <span class="visually-hidden">View larger: ${escapeHtml(alt)}</span>
    </button>
${item.caption ? `    <figcaption>${escapeHtml(item.caption)}</figcaption>` : ''}
  </figure>`;
  }).join('\n');

  const more = config.preview && profile.gallery.length > items.length
    ? `<div class="section-foot">${button({ label: 'See the full gallery', href: link('gallery/') }, { variant: 'ghost', iconName: 'arrow' })}</div>`
    : '';

  return section({
    id: 'gallery',
    className: `gallery gallery--${style}`,
    labelledBy: 'gallery-title',
    children: `${head}
<div class="gallery__grid">
${figures}
</div>
${more}`,
  });
}
