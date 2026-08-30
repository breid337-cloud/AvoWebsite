export const PROFILE_VERSION = 'avo-profile/1';

export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export const SOCIAL_NETWORKS = [
  { key: 'facebook', label: 'Facebook', match: /facebook\.com|fb\.com|fb\.me/i, icon: 'facebook' },
  { key: 'instagram', label: 'Instagram', match: /instagram\.com|instagr\.am/i, icon: 'instagram' },
  { key: 'x', label: 'X', match: /twitter\.com|(^|\/\/)x\.com/i, icon: 'x' },
  { key: 'linkedin', label: 'LinkedIn', match: /linkedin\.com/i, icon: 'linkedin' },
  { key: 'youtube', label: 'YouTube', match: /youtube\.com|youtu\.be/i, icon: 'youtube' },
  { key: 'tiktok', label: 'TikTok', match: /tiktok\.com/i, icon: 'tiktok' },
  { key: 'pinterest', label: 'Pinterest', match: /pinterest\./i, icon: 'pinterest' },
  { key: 'yelp', label: 'Yelp', match: /yelp\.com/i, icon: 'yelp' },
  { key: 'google', label: 'Google Business', match: /google\.com\/maps|g\.page|goo\.gl\/maps/i, icon: 'google' },
  { key: 'nextdoor', label: 'Nextdoor', match: /nextdoor\./i, icon: 'nextdoor' },
];

/**
 * Declarative field spec. Drives validation, the completeness score, and the
 * Claude Code brief — one place to change when the contract evolves.
 */
export const FIELDS = [
  { path: 'business.name', label: 'Business name', weight: 10, required: true, hint: 'Exact trading name as customers know it.' },
  { path: 'business.tagline', label: 'Tagline', weight: 4, hint: 'Six to ten words. What they do and for whom.' },
  { path: 'business.category', label: 'Category', weight: 3, hint: 'e.g. "HVAC contractor", "family dentist". Drives schema.org type.' },
  { path: 'business.description', label: 'Short description', weight: 6, hint: '1–2 sentences, used for meta description and cards.' },
  { path: 'business.serviceArea', label: 'Service area', weight: 4, kind: 'array', hint: 'Towns/regions served — big local SEO win.' },
  { path: 'business.founded', label: 'Year founded', weight: 2, hint: 'Powers "Serving the area since ____".' },

  { path: 'contact.phone', label: 'Phone', weight: 8, hint: 'Primary number, E.164 or local format.' },
  { path: 'contact.email', label: 'Email', weight: 5 },
  { path: 'contact.address.city', label: 'City', weight: 6, hint: 'Required for local SEO markup.' },
  { path: 'contact.address.street', label: 'Street address', weight: 3, hint: 'Omit for service-area businesses with no storefront.' },
  { path: 'contact.hours', label: 'Opening hours', weight: 5, kind: 'array' },

  { path: 'brand.logo', label: 'Logo', weight: 5, hint: 'Local path under assets/, or a URL to download.' },
  { path: 'brand.colors.primary', label: 'Primary brand colour', weight: 3, hint: 'Leave blank to inherit the theme default.' },

  { path: 'content.hero.headline', label: 'Hero headline', weight: 9, required: true, hint: 'The single most important line on the site. Benefit, not slogan.' },
  { path: 'content.hero.subhead', label: 'Hero subheadline', weight: 5 },
  { path: 'content.hero.image', label: 'Hero image', weight: 5 },
  { path: 'content.about.body', label: 'About copy', weight: 6, kind: 'array' },
  { path: 'content.valueProps', label: 'Value propositions', weight: 5, kind: 'array', hint: 'Three or four reasons to choose them.' },

  { path: 'services', label: 'Services', weight: 10, kind: 'array', hint: 'Each needs name + summary at minimum.' },
  { path: 'gallery', label: 'Gallery images', weight: 4, kind: 'array' },
  { path: 'testimonials', label: 'Testimonials', weight: 6, kind: 'array', hint: 'Real quotes only — never invent these.' },
  { path: 'faqs', label: 'FAQs', weight: 4, kind: 'array', hint: 'Powers FAQPage rich results.' },
  { path: 'team', label: 'Team members', weight: 2, kind: 'array' },

  { path: 'social', label: 'Social profiles', weight: 3, kind: 'object' },
  { path: 'seo.title', label: 'SEO title', weight: 4, hint: 'Under 60 characters, includes the town.' },
  { path: 'seo.description', label: 'SEO description', weight: 4, hint: '140–160 characters.' },
];

export function getPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

export function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  let target = obj;
  for (const key of keys) {
    if (typeof target[key] !== 'object' || target[key] === null) target[key] = {};
    target = target[key];
  }
  target[last] = value;
  return obj;
}

/** True when a field holds real content (empty strings/arrays/objects do not count). */
export function isFilled(value) {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.values(value).some(isFilled);
  return true;
}

export function emptyProfile(slug = 'client') {
  return {
    $schema: PROFILE_VERSION,
    slug,
    source: { url: '', harvestedAt: null, pagesCrawled: 0, socialSources: [], notes: '' },
    business: {
      name: '', legalName: '', tagline: '', category: '', description: '', longDescription: '',
      founded: '', employees: '', priceRange: '', licenses: [], serviceArea: [], languages: [],
    },
    contact: {
      phone: '', phones: [], email: '', emails: [],
      address: { street: '', street2: '', city: '', region: '', postalCode: '', country: '' },
      geo: { lat: null, lng: null },
      hours: [], hoursNote: '', bookingUrl: '', mapsUrl: '', emergency: '',
    },
    brand: {
      logo: '', logoDark: '', favicon: '',
      colors: { primary: '', secondary: '', accent: '' },
      fonts: { heading: '', body: '' },
      voice: '',
    },
    social: {},
    content: {
      hero: { headline: '', subhead: '', image: '', primaryCta: null, secondaryCta: null, badges: [] },
      about: { heading: '', body: [], image: '', highlights: [] },
      valueProps: [],
      stats: [],
      closingCta: { heading: '', text: '', primaryCta: null },
    },
    services: [],
    gallery: [],
    testimonials: [],
    team: [],
    faqs: [],
    caseStudies: [],
    seo: { title: '', description: '', keywords: [], ogImage: '', canonical: '' },
    site: {
      theme: 'meridian', mode: 'light', domain: '', pages: null,
      form: { action: '', method: 'POST', provider: 'none' },
      analytics: { plausible: '', ga4: '' },
      showPrices: true,
    },
    _meta: { confidence: {}, gaps: [], todo: [], enriched: false },
  };
}
