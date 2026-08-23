import { escapeHtml, truncate } from '../util/text.js';
import { telHref } from '../profile/normalize.js';
import { SOCIAL_NETWORKS, DAYS } from '../profile/schema.js';

/** Map a free-text business category to the closest schema.org type. */
export function schemaType(category = '') {
  const c = String(category).toLowerCase();
  const map = [
    [/hvac|heating|air condition/, 'HVACBusiness'],
    [/plumb/, 'Plumber'],
    [/electric/, 'Electrician'],
    [/roof/, 'RoofingContractor'],
    [/contractor|construct|remodel|builder/, 'GeneralContractor'],
    [/landscap|lawn|garden/, 'Landscaper'],
    [/clean|maid|janitor/, 'HousePainter'],
    [/pest|exterminat/, 'PestControlService'],
    [/lock/, 'Locksmith'],
    [/mov(ing|er)/, 'MovingCompany'],
    [/auto|mechanic|car repair|collision|tire/, 'AutoRepair'],
    [/dent(ist|al)/, 'Dentist'],
    [/doctor|physician|medical|clinic/, 'MedicalBusiness'],
    [/veterinar|animal hospital/, 'VeterinaryCare'],
    [/chiropract/, 'Chiropractic'],
    [/optometr|optician|eye/, 'Optician'],
    [/law|attorney|legal|solicitor/, 'Attorney'],
    [/account|cpa|bookkeep|tax/, 'AccountingService'],
    [/insurance/, 'InsuranceAgency'],
    [/real estate|realtor/, 'RealEstateAgent'],
    [/restaurant|bistro|diner|grill/, 'Restaurant'],
    [/cafe|coffee/, 'CafeOrCoffeeShop'],
    [/bakery|baker/, 'Bakery'],
    [/bar\b|pub|brewery|taproom/, 'BarOrPub'],
    [/caterer|catering/, 'FoodEstablishment'],
    [/salon|hair|barber/, 'HairSalon'],
    [/nail/, 'NailSalon'],
    [/spa|massage/, 'DaySpa'],
    [/gym|fitness|crossfit|yoga|pilates/, 'ExerciseGym'],
    [/florist|flower/, 'Florist'],
    [/photograph/, 'Photograph'],
    [/child care|childcare|daycare|nursery/, 'ChildCare'],
    [/storage/, 'SelfStorage'],
    [/travel/, 'TravelAgency'],
    [/pharmac/, 'Pharmacy'],
    [/store|shop|boutique|retail/, 'Store'],
  ];
  for (const [re, type] of map) if (re.test(c)) return type;
  return 'LocalBusiness';
}

/** "5:30 PM" → "17:30" for schema.org openingHoursSpecification. */
export function to24h(value) {
  const m = /^(\d{1,2}):?(\d{2})?\s*(am|pm)?$/i.exec(String(value ?? '').trim());
  if (!m) return '';
  let hour = Number(m[1]);
  const minute = m[2] ?? '00';
  const period = (m[3] ?? '').toLowerCase();
  if (period === 'pm' && hour !== 12) hour += 12;
  if (period === 'am' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

const abs = (siteUrl, path = '') => {
  if (!siteUrl) return path;
  try {
    return new URL(path, siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`).toString();
  } catch {
    return path;
  }
};

/** JSON-LD graph for a page: the business, the site, breadcrumbs, FAQs. */
export function buildJsonLd(profile, page, { siteUrl = '', pages = [] } = {}) {
  const graph = [];
  const businessId = abs(siteUrl, '#business');
  const address = profile.contact.address;

  const business = {
    '@type': schemaType(profile.business.category),
    '@id': businessId,
    name: profile.business.name,
    url: siteUrl || undefined,
    description: profile.business.description || undefined,
    telephone: profile.contact.phone ? telHref(profile.contact.phone) : undefined,
    email: profile.contact.email || undefined,
    priceRange: profile.business.priceRange || undefined,
    foundingDate: profile.business.founded || undefined,
    image: profile.content.hero.image ? abs(siteUrl, profile.content.hero.image) : undefined,
    logo: profile.brand.logo ? abs(siteUrl, profile.brand.logo) : undefined,
  };

  if (address.street || address.city) {
    business.address = {
      '@type': 'PostalAddress',
      streetAddress: [address.street, address.street2].filter(Boolean).join(', ') || undefined,
      addressLocality: address.city || undefined,
      addressRegion: address.region || undefined,
      postalCode: address.postalCode || undefined,
      addressCountry: address.country || undefined,
    };
  }
  if (profile.contact.geo?.lat && profile.contact.geo?.lng) {
    business.geo = { '@type': 'GeoCoordinates', latitude: profile.contact.geo.lat, longitude: profile.contact.geo.lng };
  }
  if (profile.business.serviceArea.length) {
    business.areaServed = profile.business.serviceArea.map((a) => ({ '@type': 'Place', name: a }));
  }
  if (profile.contact.hours.length) {
    business.openingHoursSpecification = profile.contact.hours
      .filter((h) => !h.closed && to24h(h.open) && to24h(h.close))
      .map((h) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: `https://schema.org/${h.day.charAt(0).toUpperCase()}${h.day.slice(1)}`,
        opens: to24h(h.open),
        closes: to24h(h.close),
      }));
  }
  const sameAs = SOCIAL_NETWORKS.map((n) => profile.social[n.key]).filter(Boolean);
  if (sameAs.length) business.sameAs = sameAs;

  if (profile.services.length) {
    business.hasOfferCatalog = {
      '@type': 'OfferCatalog',
      name: 'Services',
      itemListElement: profile.services.map((s) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: s.name, description: s.summary || undefined },
      })),
    };
  }

  const rated = profile.testimonials.filter((t) => t.rating);
  if (rated.length >= 2) {
    business.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: (rated.reduce((sum, t) => sum + t.rating, 0) / rated.length).toFixed(1),
      reviewCount: rated.length,
    };
  }

  graph.push(business);

  if (siteUrl) {
    graph.push({ '@type': 'WebSite', '@id': abs(siteUrl, '#website'), url: siteUrl, name: profile.business.name, publisher: { '@id': businessId } });
  }

  if (page.slug !== 'home' && !page.noindex) {
    const crumbs = [{ name: 'Home', url: abs(siteUrl, '') }];
    const parent = page.parent ? pages.find((p) => p.slug === page.parent) : null;
    if (parent) crumbs.push({ name: parent.navLabel ?? parent.title, url: abs(siteUrl, parent.url) });
    crumbs.push({ name: page.navLabel ?? page.title, url: abs(siteUrl, page.url) });
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
    });
  }

  const showsFaq = page.sections?.some((s) => s.type === 'faq');
  if (showsFaq && profile.faqs.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: profile.faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }

  if (page.service) {
    graph.push({
      '@type': 'Service',
      name: page.service.name,
      description: page.service.summary || undefined,
      provider: { '@id': businessId },
      areaServed: profile.business.serviceArea.map((a) => ({ '@type': 'Place', name: a })),
    });
  }

  return prune({ '@context': 'https://schema.org', '@graph': graph });
}

/** Drop undefined/empty values so the emitted JSON-LD stays clean. */
function prune(value) {
  if (Array.isArray(value)) {
    const arr = value.map(prune).filter((v) => v !== undefined);
    return arr.length ? arr : undefined;
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const cleaned = prune(v);
      if (cleaned !== undefined && cleaned !== '' && !(Array.isArray(cleaned) && !cleaned.length)) out[k] = cleaned;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return value;
}

/** <head> meta tags for a page. */
export function metaTags(profile, page, { siteUrl = '', canonical = '' } = {}) {
  const title = page.title || profile.seo.title || profile.business.name;
  const description = truncate(page.description || profile.seo.description || '', 158);
  const ogImage = profile.seo.ogImage || profile.content.hero.image || profile.brand.logo;
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    description ? `<meta name="description" content="${escapeHtml(description)}">` : '',
    page.noindex ? '<meta name="robots" content="noindex, follow">' : '',
    canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}">` : '',
    `<meta property="og:type" content="${page.slug === 'home' ? 'website' : 'article'}">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    description ? `<meta property="og:description" content="${escapeHtml(description)}">` : '',
    `<meta property="og:site_name" content="${escapeHtml(profile.business.name)}">`,
    canonical ? `<meta property="og:url" content="${escapeHtml(canonical)}">` : '',
    ogImage && siteUrl ? `<meta property="og:image" content="${escapeHtml(abs(siteUrl, ogImage))}">` : '',
    `<meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}">`,
    profile.social.x ? `<meta name="twitter:site" content="@${escapeHtml(profile.social.x.split('/').filter(Boolean).pop())}">` : '',
    profile.contact.address.region ? `<meta name="geo.region" content="${escapeHtml(profile.contact.address.region)}">` : '',
    profile.contact.address.city ? `<meta name="geo.placename" content="${escapeHtml(profile.contact.address.city)}">` : '',
  ];
  return tags.filter(Boolean).join('\n  ');
}

export function sitemapXml(pages, siteUrl) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = pages
    .filter((p) => !p.noindex)
    .map((p) => `  <url>
    <loc>${escapeHtml(abs(siteUrl, p.url))}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.slug === 'home' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${p.slug === 'home' ? '1.0' : p.parent ? '0.6' : '0.8'}</priority>
  </url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function robotsTxt(siteUrl) {
  return `User-agent: *
Allow: /
${siteUrl ? `\nSitemap: ${abs(siteUrl, 'sitemap.xml')}\n` : ''}`;
}

export function webManifest(profile, tokens) {
  return JSON.stringify({
    name: profile.business.name,
    short_name: truncate(profile.business.name, 18, ''),
    description: profile.seo.description || profile.business.description,
    start_url: './',
    display: 'standalone',
    background_color: tokens['--bg'],
    theme_color: tokens['--primary'],
    icons: profile.brand.favicon ? [{ src: profile.brand.favicon, sizes: 'any' }] : [],
  }, null, 2);
}

/** Machine-readable hours for the "open now" badge in the runtime. */
export function hoursJson(profile) {
  const out = {};
  for (const day of DAYS) {
    const entry = profile.contact.hours.find((h) => h.day === day);
    if (!entry) continue;
    if (entry.closed) { out[day] = { closed: true }; continue; }
    const [oh, om] = to24h(entry.open).split(':').map(Number);
    const [ch, cm] = to24h(entry.close).split(':').map(Number);
    if ([oh, om, ch, cm].some((n) => !Number.isFinite(n))) continue;
    out[day] = { closed: false, open: oh * 60 + om, close: ch * 60 + cm, openLabel: entry.open };
  }
  return out;
}
