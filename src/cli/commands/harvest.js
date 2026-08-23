import path from 'node:path';
import { harvestSite, saveHarvest } from '../../harvest/index.js';
import { renderHarvestReport } from '../../harvest/report.js';
import { renderBrief } from '../../brief/index.js';
import { writeText, ensureDir } from '../../util/fs.js';
import { log, color, table } from '../../util/log.js';
import { describeScore, scoreProfile } from '../../profile/validate.js';
import { suggestTheme } from '../../themes/index.js';
import { slugify } from '../../util/text.js';
import { clientDirFor } from '../config.js';

export const usage = `avo harvest <url> [options]

Crawl an existing website (and its linked social profiles) and turn everything
it knows into a draft client profile.

Options:
  --slug <name>     Client folder name (default: derived from the domain)
  --pages <n>       Maximum pages to crawl (default: 20)
  --no-assets       Skip downloading images
  --no-social       Skip checking social profiles
  --delay <ms>      Politeness delay between requests (default: 300)
  --ignore-robots   Crawl pages robots.txt disallows (use only with permission)
  --no-brief        Skip writing BRIEF.md`;

export async function run({ positional, flags, config, root }) {
  const url = positional[0];
  if (!url) {
    log.error('Give me a URL to harvest.');
    log.plain(`\n${usage}`);
    process.exitCode = 1;
    return;
  }

  const slug = slugify(flags.slug ?? '', '') || undefined;
  const { raw, draft } = await harvestSite(url, {
    maxPages: flags.pages ?? config.defaults.maxPages,
    downloadAssets: flags.assets !== false,
    social: flags.social !== false,
    ignoreRobots: !!flags.ignoreRobots,
    delay: flags.delay ?? 300,
    clientDir: clientDirFor(config, root, slug ?? 'tmp'),
  });

  const finalSlug = slug ?? raw.slug;
  const clientDir = clientDirFor(config, root, finalSlug);

  // Assets were written under the provisional slug; re-run cleanly if it moved.
  if (slug && slug !== raw.slug) draft.slug = slug;
  raw.slug = finalSlug;
  draft.slug = finalSlug;

  await ensureDir(clientDir);
  await saveHarvest(clientDir, raw, draft);
  await writeText(path.join(clientDir, 'harvest', 'report.md'), renderHarvestReport(raw, draft));
  if (flags.brief !== false) {
    await writeText(path.join(clientDir, 'BRIEF.md'), renderBrief(raw, draft, { clientSlug: finalSlug }));
  }

  const score = scoreProfile(draft);
  const suggestion = suggestTheme(draft);

  log.blank();
  log.ok(`Harvested ${raw.stats.pagesCrawled} page(s) into ${color.bold(clientDir)}`);
  log.blank();
  table([
    ['Business', draft.business.name || '—'],
    ['Phone', draft.contact.phone || '—'],
    ['Services', draft.services.length],
    ['Testimonials', draft.testimonials.length],
    ['FAQs', draft.faqs.length],
    ['Images', raw.assets.length],
    ['Old platform', raw.audit.platform || 'unknown'],
    ['Rebuild flags', raw.audit.flags.length],
    ['Completeness', describeScore(score)],
    ['Suggested theme', suggestion.theme + (suggestion.confident ? '' : ' (low confidence)')],
  ]);
  log.blank();
  log.plain(`  ${color.grey('report')}  ${path.join(clientDir, 'harvest', 'report.md')}`);
  if (flags.brief !== false) log.plain(`  ${color.grey('brief ')}  ${path.join(clientDir, 'BRIEF.md')}`);
  log.blank();
  log.plain(`Next: ${color.cyan(`write the copy with Claude Code (/avo-enrich ${finalSlug}), then \`avo build ${finalSlug}\``)}`);
}
