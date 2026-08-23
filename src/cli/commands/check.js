import path from 'node:path';
import { readJson, exists } from '../../util/fs.js';
import { normalizeProfile } from '../../profile/normalize.js';
import { validateProfile, scoreProfile, describeScore } from '../../profile/validate.js';
import { suggestTheme } from '../../themes/index.js';
import { log, color, table, AvoError } from '../../util/log.js';
import { clientDirFor } from '../config.js';

export const usage = `avo check <client>

Validate a client profile and report its completeness score.`;

export async function loadProfile(config, root, slug) {
  const clientDir = clientDirFor(config, root, slug);
  const enriched = path.join(clientDir, 'profile.json');
  const draft = path.join(clientDir, 'profile.draft.json');
  const file = exists(enriched) ? enriched : draft;
  if (!exists(file)) {
    throw new AvoError(`No profile for "${slug}"`, `Expected ${enriched} or ${draft}. Run \`avo harvest\` or \`avo new ${slug}\`.`);
  }
  return { profile: normalizeProfile(await readJson(file)), file, clientDir, isDraft: file === draft };
}

export async function run({ positional, config, root }) {
  const slug = positional[0];
  if (!slug) throw new AvoError('Which client?', usage);

  const { profile, file, isDraft } = await loadProfile(config, root, slug);
  const validation = validateProfile(profile);
  const score = scoreProfile(profile);

  log.title(`${profile.business.name || slug}`);
  log.plain(`${color.grey(file)}${isDraft ? color.yellow('  (draft — not yet enriched)') : ''}`);
  log.blank();
  log.plain(`  ${describeScore(score)}`);
  log.blank();

  table([
    ['Services', profile.services.length],
    ['Testimonials', profile.testimonials.length],
    ['FAQs', profile.faqs.length],
    ['Gallery', profile.gallery.length],
    ['Team', profile.team.length],
    ['Theme', profile.site.theme + color.grey(`  (suggested: ${suggestTheme(profile).theme})`)],
    ['Domain', profile.site.domain || color.yellow('not set')],
  ]);

  if (validation.errors.length) {
    log.blank();
    log.plain(color.red('  Errors — these block a build:'));
    for (const e of validation.errors) log.plain(`    ${color.red('✗')} ${e}`);
  }
  if (validation.warnings.length) {
    log.blank();
    log.plain(color.yellow('  Warnings:'));
    for (const w of validation.warnings) log.plain(`    ${color.yellow('!')} ${w}`);
  }
  if (validation.notes.length) {
    log.blank();
    log.plain(color.grey('  Notes:'));
    for (const n of validation.notes) log.plain(`    ${color.grey('·')} ${n}`);
  }
  if (score.missing.length) {
    log.blank();
    log.plain(color.grey('  Biggest gaps:'));
    for (const gap of score.missing.slice(0, 6)) {
      log.plain(`    ${color.grey('·')} ${gap.label} ${color.grey(`(${gap.path})`)}`);
    }
  }
  if (profile._meta?.todo?.length) {
    log.blank();
    log.plain(color.cyan('  Questions for the client:'));
    for (const t of profile._meta.todo) log.plain(`    ${color.cyan('?')} ${t}`);
  }

  log.blank();
  if (!validation.ok) {
    log.error('Not buildable yet.');
    process.exitCode = 1;
  } else {
    log.ok('Buildable.');
  }
}
