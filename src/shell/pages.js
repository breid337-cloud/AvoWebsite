import { slugify } from '../util/text.js';

/**
 * The default website shell: which pages exist, and which sections each is
 * built from. Everything is conditional on the profile actually having the
 * content, so a thin client still gets a coherent site rather than empty bands.
 */
export function planPages(profile, { theme } = {}) {
  const has = {
    services: profile.services.length > 0,
    servicePages: profile.services.filter((s) => s.summary || s.description?.length).length >= 2,
    gallery: profile.gallery.length >= 3,
    testimonials: profile.testimonials.length > 0,
    team: profile.team.length > 0,
    faqs: profile.faqs.length > 0,
    about: profile.content.about.body.length > 0,
    hours: profile.contact.hours.length > 0,
    valueProps: profile.content.valueProps.length > 0,
    stats: profile.content.stats.length > 0,
  };

  const pages = [];

  pages.push({
    slug: 'home',
    url: '',
    outPath: 'index.html',
    title: profile.seo.title || profile.business.name,
    description: profile.seo.description,
    navLabel: 'Home',
    inNav: true,
    sections: [
      { type: 'hero' },
      has.valueProps || has.stats ? { type: 'trustbar' } : null,
      has.services ? { type: 'services', limit: 6, preview: true } : null,
      has.about ? { type: 'about', preview: true } : null,
      has.gallery ? { type: 'gallery', limit: 6, preview: true } : null,
      has.testimonials ? { type: 'testimonials', limit: 3 } : null,
      has.faqs ? { type: 'faq', limit: 4, preview: true } : null,
      { type: 'cta' },
      { type: 'contact', compact: true },
    ].filter(Boolean),
  });

  if (has.about || has.team) {
    pages.push({
      slug: 'about',
      url: 'about/',
      outPath: 'about/index.html',
      title: `About ${profile.business.name}`,
      description: profile.business.description || profile.content.about.body[0] || '',
      navLabel: 'About',
      inNav: true,
      sections: [
        { type: 'pageHeader', title: profile.content.about.heading || `About ${profile.business.name}`, intro: profile.business.tagline },
        has.about ? { type: 'about' } : null,
        has.stats ? { type: 'trustbar' } : null,
        has.team ? { type: 'team' } : null,
        has.testimonials ? { type: 'testimonials', limit: 3 } : null,
        { type: 'cta' },
      ].filter(Boolean),
    });
  }

  if (has.services) {
    pages.push({
      slug: 'services',
      url: 'services/',
      outPath: 'services/index.html',
      title: `Services | ${profile.business.name}`,
      description: `What ${profile.business.name} offers${profile.contact.address.city ? ` in ${profile.contact.address.city}` : ''}.`,
      navLabel: 'Services',
      inNav: true,
      sections: [
        { type: 'pageHeader', title: 'Our services', intro: profile.business.tagline },
        { type: 'services' },
        has.faqs ? { type: 'faq' } : null,
        { type: 'cta' },
      ].filter(Boolean),
    });

    if (has.servicePages) {
      for (const service of profile.services) {
        const slug = slugify(service.slug || service.name);
        pages.push({
          slug: `service-${slug}`,
          url: `services/${slug}/`,
          outPath: `services/${slug}/index.html`,
          title: `${service.name} | ${profile.business.name}`,
          description: service.summary || `${service.name} from ${profile.business.name}.`,
          inNav: false,
          parent: 'services',
          service,
          sections: [
            { type: 'pageHeader', title: service.name, intro: service.summary, breadcrumb: true },
            { type: 'serviceDetail', service },
            { type: 'services', limit: 4, exclude: slug, heading: 'Other services' },
            { type: 'cta' },
          ],
        });
      }
    }
  }

  if (has.gallery) {
    pages.push({
      slug: 'gallery',
      url: 'gallery/',
      outPath: 'gallery/index.html',
      title: `Gallery | ${profile.business.name}`,
      description: `Recent work from ${profile.business.name}.`,
      navLabel: 'Gallery',
      inNav: true,
      sections: [
        { type: 'pageHeader', title: 'Our work' },
        { type: 'gallery' },
        { type: 'cta' },
      ],
    });
  }

  pages.push({
    slug: 'contact',
    url: 'contact/',
    outPath: 'contact/index.html',
    title: `Contact | ${profile.business.name}`,
    description: `Get in touch with ${profile.business.name}${profile.contact.phone ? ` on ${profile.contact.phone}` : ''}.`,
    navLabel: 'Contact',
    inNav: true,
    sections: [
      { type: 'pageHeader', title: 'Get in touch', intro: profile.content.closingCta?.text || '' },
      { type: 'contact' },
    ],
  });

  pages.push({
    slug: '404',
    url: '404.html',
    outPath: '404.html',
    title: `Page not found | ${profile.business.name}`,
    description: '',
    inNav: false,
    noindex: true,
    sections: [
      { type: 'notFound' },
      { type: 'cta' },
    ],
  });

  return pages;
}

/**
 * Relative href from one page URL to another, so the output works served from
 * a domain root, a subdirectory, or opened straight off disk.
 */
export function relativeUrl(fromUrl, toUrl) {
  const fromParts = String(fromUrl).split('/').filter(Boolean);
  const toParts = String(toUrl).split('/').filter(Boolean);
  // A page URL of "about/" sits one directory deep; "404.html" does not.
  const fromDepth = String(fromUrl).endsWith('/') || fromUrl === '' ? fromParts.length : fromParts.length - 1;
  const up = '../'.repeat(Math.max(0, fromDepth));
  const target = toParts.join('/') + (String(toUrl).endsWith('/') || toUrl === '' ? '/' : '');
  const href = up + (target === '/' ? '' : target);
  return href === '' ? './' : href;
}

/** Nav entries for a given page. */
export function navFor(pages, currentPage) {
  return pages
    .filter((p) => p.inNav)
    .map((p) => ({
      label: p.navLabel ?? p.title,
      href: relativeUrl(currentPage.url, p.url),
      current: p.slug === currentPage.slug || p.slug === currentPage.parent,
    }));
}
