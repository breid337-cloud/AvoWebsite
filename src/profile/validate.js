import { FIELDS, getPath, isFilled, PROFILE_VERSION } from './schema.js';
import { wordCount } from '../util/text.js';
import { contrast } from '../util/color.js';

/**
 * Validate a normalized profile.
 * `errors` block a build; `warnings` are quality problems worth fixing first.
 */
export function validateProfile(profile) {
  const errors = [];
  const warnings = [];
  const notes = [];

  if (profile?.$schema !== PROFILE_VERSION) {
    warnings.push(`Profile schema is "${profile?.$schema ?? 'missing'}", expected "${PROFILE_VERSION}".`);
  }

  for (const field of FIELDS) {
    if (field.required && !isFilled(getPath(profile, field.path))) {
      errors.push(`Missing required field: ${field.path} (${field.label}).`);
    }
  }

  const hasContact = isFilled(profile?.contact?.phone) || isFilled(profile?.contact?.email) || isFilled(profile?.site?.form?.action);
  if (!hasContact) {
    errors.push('No way for a customer to make contact: set contact.phone, contact.email, or site.form.action.');
  }

  // Content quality
  const headline = profile?.content?.hero?.headline ?? '';
  if (headline && wordCount(headline) > 14) {
    warnings.push(`Hero headline is ${wordCount(headline)} words — aim for 10 or fewer so it reads at a glance.`);
  }
  if (headline && /^welcome to /i.test(headline)) {
    warnings.push('Hero headline starts with "Welcome to" — replace it with a benefit-led line.');
  }
  const desc = profile?.seo?.description ?? '';
  if (desc && (desc.length < 70 || desc.length > 160)) {
    warnings.push(`SEO description is ${desc.length} characters — target 140–160.`);
  }
  if ((profile?.seo?.title ?? '').length > 65) {
    warnings.push('SEO title is over 65 characters and will be truncated in search results.');
  }

  const services = profile?.services ?? [];
  if (services.length === 0) warnings.push('No services listed — the services section and per-service pages will be skipped.');
  const thinServices = services.filter((s) => !s.summary).map((s) => s.name);
  if (thinServices.length) warnings.push(`Services with no summary: ${thinServices.join(', ')}.`);

  if ((profile?.testimonials ?? []).length === 0) {
    notes.push('No testimonials. Ask the client for three — social proof is the single biggest conversion lift on these rebuilds.');
  }
  const galleryNoAlt = (profile?.gallery ?? []).filter((g) => !g.alt).length;
  if (galleryNoAlt) warnings.push(`${galleryNoAlt} gallery image(s) have no alt text (accessibility + SEO).`);

  if (!isFilled(profile?.contact?.address?.city) && !isFilled(profile?.business?.serviceArea)) {
    warnings.push('No city or service area — local SEO markup will be weak.');
  }
  if (!isFilled(profile?.brand?.logo)) notes.push('No logo. The header will fall back to a styled wordmark.');

  // Brand colour usability against both light and dark surfaces.
  const primary = profile?.brand?.colors?.primary;
  if (primary) {
    const onWhite = contrast(primary, '#ffffff');
    if (onWhite < 3) {
      warnings.push(`Brand primary ${primary} has only ${onWhite.toFixed(1)}:1 contrast on white; the theme will darken it for text use.`);
    }
  }

  const form = profile?.site?.form ?? {};
  // Netlify Forms posts back to the page itself, so it legitimately has no action.
  const SELF_POSTING = new Set(['netlify']);
  if (form.provider && form.provider !== 'none' && !form.action && !SELF_POSTING.has(form.provider)) {
    errors.push(`site.form.provider is "${form.provider}" but site.form.action is empty.`);
  }

  return { ok: errors.length === 0, errors, warnings, notes };
}

/** Weighted completeness score plus the specific gaps behind it. */
export function scoreProfile(profile) {
  let earned = 0;
  let total = 0;
  const missing = [];
  for (const field of FIELDS) {
    total += field.weight;
    if (isFilled(getPath(profile, field.path))) earned += field.weight;
    else missing.push({ path: field.path, label: field.label, weight: field.weight, hint: field.hint ?? '', required: !!field.required });
  }
  missing.sort((a, b) => b.weight - a.weight);
  return {
    percent: total === 0 ? 0 : Math.round((earned / total) * 100),
    earned,
    total,
    missing,
  };
}

/** Human-readable summary used by the CLI and the brief. */
export function describeScore(score) {
  const bar = (pct) => {
    const filled = Math.round(pct / 5);
    return '█'.repeat(filled) + '░'.repeat(20 - filled);
  };
  return `${bar(score.percent)} ${score.percent}% complete`;
}
