import { emptyProfile, DAYS, SOCIAL_NETWORKS, PROFILE_VERSION } from './schema.js';
import { squash, slugify, truncate, humanizeHeading, uniqueBy } from '../util/text.js';
import { parseColor, toHex } from '../util/color.js';

/** Deep-merge `patch` onto `base`, treating arrays as replacements. */
export function merge(base, patch) {
  if (patch === undefined || patch === null) return base;
  if (Array.isArray(patch) || typeof patch !== 'object') return patch;
  const out = Array.isArray(base) || typeof base !== 'object' || base === null ? {} : { ...base };
  for (const [key, value] of Object.entries(patch)) {
    out[key] = merge(out[key], value);
  }
  return out;
}

const str = (v) => (typeof v === 'string' ? squash(v) : v == null ? '' : squash(String(v)));
const arr = (v) => (Array.isArray(v) ? v : v == null || v === '' ? [] : [v]);

/** Format a raw phone string for display, keeping international prefixes intact. */
export function formatPhone(raw) {
  const cleaned = String(raw ?? '').trim();
  if (!cleaned) return '';
  const digits = cleaned.replace(/[^\d+]/g, '');
  const national = digits.replace(/^\+?1/, '');
  if (/^\+/.test(digits) && !/^\+1/.test(digits)) return cleaned;
  if (national.length === 10) return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
  return cleaned;
}

/** tel: href form — digits only, with country code when we can infer one. */
export function telHref(raw) {
  const digits = String(raw ?? '').replace(/[^\d+]/g, '');
  if (!digits) return '';
  if (digits.startsWith('+')) return digits;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return digits;
}

/** Single-line postal address for display and reports. */
export function formatAddress(address) {
  if (!address) return '';
  const line1 = [address.street, address.street2].filter(Boolean).join(', ');
  const line2 = [address.city, [address.region, address.postalCode].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  return [line1, line2].filter(Boolean).join(', ');
}

function normalizeHours(hours) {
  const list = arr(hours)
    .map((entry) => {
      if (!entry) return null;
      if (typeof entry === 'string') return null;
      const day = String(entry.day ?? '').toLowerCase().slice(0, 3);
      const full = DAYS.find((d) => d.startsWith(day));
      if (!full) return null;
      const closed = entry.closed === true || /closed/i.test(String(entry.open ?? ''));
      return {
        day: full,
        closed,
        open: closed ? '' : str(entry.open),
        close: closed ? '' : str(entry.close),
        note: str(entry.note),
      };
    })
    .filter(Boolean);
  const byDay = new Map(list.map((h) => [h.day, h]));
  return DAYS.filter((d) => byDay.has(d)).map((d) => byDay.get(d));
}

function normalizeService(service, index) {
  const name = humanizeHeading(str(service?.name ?? service?.title ?? ''));
  return {
    slug: slugify(service?.slug || name, `service-${index + 1}`),
    name,
    summary: str(service?.summary ?? service?.excerpt ?? ''),
    strapline: str(service?.strapline),
    description: typeof service?.description === 'string' ? squash(service.description) : arr(service?.description).map(str).filter(Boolean),
    image: str(service?.image),
    icon: str(service?.icon),
    price: str(service?.price),
    priceNote: str(service?.priceNote),
    features: arr(service?.features).map(str).filter(Boolean),
    featured: service?.featured === true,
    sourceUrl: str(service?.sourceUrl),
  };
}

function normalizeSocial(social) {
  const out = {};
  for (const [key, value] of Object.entries(social ?? {})) {
    const url = str(value);
    if (!url) continue;
    const known = SOCIAL_NETWORKS.find((n) => n.key === key);
    out[known ? known.key : key] = /^https?:\/\//i.test(url) ? url : `https://${url.replace(/^\/+/, '')}`;
  }
  return out;
}

function normalizeColor(value) {
  const parsed = parseColor(value);
  return parsed ? toHex(parsed) : '';
}

/** Coerce any profile-shaped object into a complete, well-typed profile. */
export function normalizeProfile(input = {}, { slug } = {}) {
  const base = emptyProfile(slug || input.slug || 'client');
  const p = merge(base, input);
  p.$schema = PROFILE_VERSION;
  p.slug = slugify(slug || p.slug || p.business?.name || 'client');

  p.business.name = str(p.business.name);
  p.business.legalName = str(p.business.legalName);
  p.business.tagline = str(p.business.tagline);
  p.business.category = str(p.business.category);
  p.business.description = str(p.business.description);
  p.business.serviceArea = uniqueBy(arr(p.business.serviceArea).map(str).filter(Boolean), (s) => s.toLowerCase());
  p.business.licenses = arr(p.business.licenses).map(str).filter(Boolean);
  p.business.languages = arr(p.business.languages).map(str).filter(Boolean);
  p.business.founded = str(p.business.founded);

  p.contact.phones = uniqueBy(
    [...arr(p.contact.phones), p.contact.phone].map(str).filter(Boolean),
    (v) => telHref(v),
  );
  p.contact.phone = p.contact.phone ? str(p.contact.phone) : (p.contact.phones[0] ?? '');
  p.contact.emails = uniqueBy(
    [...arr(p.contact.emails), p.contact.email].map((e) => str(e).toLowerCase()).filter((e) => e.includes('@')),
    (v) => v,
  );
  p.contact.email = p.contact.email ? str(p.contact.email).toLowerCase() : (p.contact.emails[0] ?? '');
  for (const key of Object.keys(p.contact.address)) p.contact.address[key] = str(p.contact.address[key]);
  p.contact.hours = normalizeHours(p.contact.hours);

  p.brand.colors.primary = normalizeColor(p.brand.colors.primary);
  p.brand.colors.secondary = normalizeColor(p.brand.colors.secondary);
  p.brand.colors.accent = normalizeColor(p.brand.colors.accent);

  p.social = normalizeSocial(p.social);

  p.content.hero.headline = humanizeHeading(str(p.content.hero.headline));
  p.content.hero.subhead = str(p.content.hero.subhead);
  p.content.hero.badges = arr(p.content.hero.badges).map(str).filter(Boolean);
  p.content.about.body = arr(p.content.about.body).map(str).filter(Boolean);
  p.content.about.highlights = arr(p.content.about.highlights).map(str).filter(Boolean);
  p.content.valueProps = arr(p.content.valueProps)
    .map((v) => ({ icon: str(v?.icon), title: humanizeHeading(str(v?.title)), text: str(v?.text) }))
    .filter((v) => v.title || v.text);
  p.content.stats = arr(p.content.stats)
    .map((s) => ({ value: str(s?.value), label: str(s?.label) }))
    .filter((s) => s.value && s.label);

  p.services = uniqueBy(arr(p.services).map(normalizeService).filter((s) => s.name), (s) => s.slug);
  p.gallery = uniqueBy(
    arr(p.gallery)
      .map((g) => (typeof g === 'string' ? { src: g } : g))
      .map((g) => ({ src: str(g?.src), alt: str(g?.alt), caption: str(g?.caption), category: str(g?.category) }))
      .filter((g) => g.src),
    (g) => g.src,
  );
  p.testimonials = arr(p.testimonials)
    .map((t) => ({
      quote: str(t?.quote ?? t?.text),
      author: str(t?.author ?? t?.name),
      role: str(t?.role),
      location: str(t?.location),
      rating: Number.isFinite(Number(t?.rating)) && t?.rating ? Math.min(5, Math.max(1, Number(t.rating))) : null,
      source: str(t?.source),
      date: str(t?.date),
    }))
    .filter((t) => t.quote);
  p.team = arr(p.team)
    .map((m) => ({ name: str(m?.name), role: str(m?.role), bio: str(m?.bio), photo: str(m?.photo), email: str(m?.email), phone: str(m?.phone) }))
    .filter((m) => m.name);
  p.faqs = arr(p.faqs)
    .map((f) => ({ question: str(f?.question ?? f?.q), answer: str(f?.answer ?? f?.a) }))
    .filter((f) => f.question && f.answer);

  // SEO falls back to business content so a build never ships empty meta tags.
  const town = p.contact.address.city || p.business.serviceArea[0] || '';
  p.seo.title = truncate(str(p.seo.title) || [p.business.name, p.business.tagline || p.business.category, town].filter(Boolean).join(' | '), 65, '');
  p.seo.description = truncate(str(p.seo.description) || p.business.description || p.content.hero.subhead || '', 158);
  p.seo.keywords = arr(p.seo.keywords).map(str).filter(Boolean);

  return p;
}
