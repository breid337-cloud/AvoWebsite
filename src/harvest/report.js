import { formatBytes } from '../util/fs.js';
import { scoreProfile, describeScore, validateProfile } from '../profile/validate.js';
import { pluralize } from '../util/text.js';
import { formatAddress } from '../profile/normalize.js';

const yesNo = (v) => (v ? 'yes' : 'no');

/**
 * Human-readable harvest report. The "Case for a rebuild" section is written to
 * be shown to the business owner as-is.
 */
export function renderHarvestReport(raw, profile) {
  const score = scoreProfile(profile);
  const validation = validateProfile(profile);
  const L = [];

  L.push(`# Harvest report — ${profile.business.name || raw.slug}`);
  L.push('');
  L.push(`**Source:** ${raw.startUrl}  `);
  L.push(`**Harvested:** ${new Date(raw.harvestedAt).toUTCString()}  `);
  L.push(`**Pages read:** ${raw.stats.pagesCrawled} of ${raw.stats.urlsDiscovered} discovered  `);
  L.push(`**Data transferred:** ${formatBytes(raw.stats.bytes)} over ${raw.stats.requests} requests`);
  L.push('');

  L.push('## Profile completeness');
  L.push('');
  L.push('```');
  L.push(describeScore(score));
  L.push('```');
  L.push('');
  if (score.missing.length) {
    L.push('Biggest gaps, highest impact first:');
    L.push('');
    L.push('| Field | Weight | Why it matters |');
    L.push('| --- | --- | --- |');
    for (const gap of score.missing.slice(0, 10)) {
      L.push(`| ${gap.label}${gap.required ? ' **(required)**' : ''} | ${gap.weight} | ${gap.hint || '—'} |`);
    }
    L.push('');
  }

  L.push('## The case for a rebuild');
  L.push('');
  L.push('Findings from the existing site — safe to put in front of the owner:');
  L.push('');
  if (raw.audit.platform) L.push(`- Built on **${raw.audit.platform}**.`);
  L.push(`- Mobile friendly: **${yesNo(raw.audit.mobileFriendly)}**`);
  L.push(`- Secure (HTTPS) throughout: **${yesNo(raw.audit.https)}**`);
  L.push(`- Structured data for Google: **${yesNo(raw.audit.structuredData)}**`);
  if (raw.audit.totals.images) {
    L.push(`- ${raw.audit.totals.imagesNoAlt} of ${raw.audit.totals.images} images have no alt text`);
  }
  L.push('');
  if (raw.audit.flags.length) {
    L.push('| Issue | Pages affected |');
    L.push('| --- | --- |');
    for (const flag of raw.audit.flags) L.push(`| ${flag.text} | ${flag.pages} |`);
    L.push('');
  }

  L.push('## What we found');
  L.push('');
  L.push('| Item | Result |');
  L.push('| --- | --- |');
  L.push(`| Business name | ${profile.business.name || '—'} |`);
  L.push(`| Phone | ${profile.contact.phone || '—'} |`);
  L.push(`| Email | ${profile.contact.email || '—'} |`);
  L.push(`| Address | ${formatAddress(profile.contact.address) || '—'} |`);
  L.push(`| Opening hours | ${profile.contact.hours.length ? pluralize(profile.contact.hours.length, 'day') : '—'} |`);
  L.push(`| Services | ${profile.services.length || '—'} |`);
  L.push(`| Testimonials | ${profile.testimonials.length || '—'} |`);
  L.push(`| FAQs | ${profile.faqs.length || '—'} |`);
  L.push(`| Team members | ${profile.team.length || '—'} |`);
  L.push(`| Images downloaded | ${raw.assets.length} |`);
  L.push(`| schema.org blocks | ${raw.jsonld.found} |`);
  L.push('');

  if (profile.services.length) {
    L.push('### Services detected');
    L.push('');
    for (const s of profile.services) L.push(`- **${s.name}**${s.summary ? ` — ${s.summary}` : ' _(no description found)_'}`);
    L.push('');
  }

  L.push('### Brand');
  L.push('');
  const c = raw.brand.colors;
  L.push(`- Primary: ${swatch(c.primary)} · Secondary: ${swatch(c.secondary)} · Accent: ${swatch(c.accent)}`);
  if (c.palette?.length) L.push(`- Full palette: ${c.palette.map((p) => p.hex).join(', ')}`);
  L.push(`- Fonts: heading \`${raw.brand.fonts.heading || '—'}\`, body \`${raw.brand.fonts.body || '—'}\``);
  L.push(`- Logo: ${raw.brand.logo || '_not found_'}`);
  L.push('');

  L.push('### Social profiles');
  L.push('');
  if (!raw.social.profiles?.length) {
    L.push('_No social profiles linked from the site._');
  } else {
    L.push('| Network | Status | URL | Notes |');
    L.push('| --- | --- | --- | --- |');
    for (const p of raw.social.profiles) {
      const extra = [p.data?.followers && `${p.data.followers} followers`, p.data?.rating && `rated ${p.data.rating}`]
        .filter(Boolean).join(', ');
      L.push(`| ${p.label} | ${p.status} | ${p.url} | ${extra || p.notes[0] || ''} |`);
    }
  }
  L.push('');

  if (raw.social.gaps?.length) {
    L.push('> **Manual step required.** These networks refuse anonymous requests, so nothing was invented for them:');
    L.push('>');
    for (const gap of raw.social.gaps) L.push(`> - **${gap.network}** — ${gap.ask}`);
    L.push('');
  }

  L.push('## Pages read');
  L.push('');
  L.push('| Page | Type | Title |');
  L.push('| --- | --- | --- |');
  for (const page of raw.pages) L.push(`| ${page.url} | ${page.kind} | ${(page.title || '—').slice(0, 60)} |`);
  L.push('');
  if (raw.skipped.length) {
    L.push(`<details><summary>${raw.skipped.length} URL(s) skipped</summary>`);
    L.push('');
    for (const s of raw.skipped.slice(0, 40)) L.push(`- \`${s.url}\` — ${s.reason}`);
    L.push('');
    L.push('</details>');
    L.push('');
  }

  if (validation.warnings.length || validation.notes.length) {
    L.push('## Quality warnings');
    L.push('');
    for (const w of validation.warnings) L.push(`- ⚠️ ${w}`);
    for (const n of validation.notes) L.push(`- ℹ️ ${n}`);
    L.push('');
  }

  L.push('## Next step');
  L.push('');
  L.push('```bash');
  L.push(`avo brief ${raw.slug}     # write the enrichment brief for a Claude Code session`);
  L.push(`avo build ${raw.slug} --theme meridian --all-themes`);
  L.push('```');
  L.push('');

  return L.join('\n');
}

function swatch(hex) {
  return hex ? `\`${hex}\`` : '_none_';
}
