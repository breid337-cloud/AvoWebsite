import path from 'node:path';
import { existsSync } from 'node:fs';
import { harvestSite, saveHarvest } from '../../harvest/index.js';
import { harvestArchives } from '../../harvest/archive.js';
import { renderHarvestReport } from '../../harvest/report.js';
import { renderBrief } from '../../brief/index.js';
import { writeText, ensureDir } from '../../util/fs.js';
import { log, color, table } from '../../util/log.js';
import { describeScore, scoreProfile } from '../../profile/validate.js';
import { suggestTheme } from '../../themes/index.js';
import { slugify } from '../../util/text.js';
import { clientDirFor } from '../config.js';

export const usage = `avo harvest <url|file...> [options]

Crawl an existing website (and its linked social profiles) and turn everything
it knows into a draft client profile.

You can also pass one or more saved .mht/.mhtml archives instead of a URL. In
Chrome or Edge: Save page as -> "Webpage, Single File". That captures the
rendered page plus its images, so it works for sites that block crawlers, sit
behind a login, or build their content with JavaScript — and a client can do it
themselves in two clicks.

  avo harvest home.mht contact.mht gallery.mht --slug their-business

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

  // Any positional argument that exists on disk switches to archive mode.
  // Note the explicit alternation: /\.mhtml?$/ would only make the final "l"
  // optional, matching .mhtm and .mhtml but never .mht.
  const files = positional.filter((p) => /\.(mht|mhtml)$/i.test(p) && existsSync(p));
  if (files.length) {
    log.step(`Reading ${files.length} saved archive(s)`);
    const result = await harvestArchives(files, {
      clientDir: clientDirFor(config, root, slug ?? 'tmp'),
      slug,
      downloadAssets: flags.assets !== false,
    });
    return finish(result, { slug, config, root, flags, sourceLabel: `${files.length} saved archive(s)` });
  }

  const { raw, draft } = await harvestSite(url, {
    maxPages: flags.pages ?? config.defaults.maxPages,
    downloadAssets: flags.assets !== false,
    social: flags.social !== false,
    ignoreRobots: !!flags.ignoreRobots,
    delay: flags.delay ?? 300,
    clientDir: clientDirFor(config, root, slug ?? 'tmp'),
  });

  return finish({ raw, draft }, { slug, config, root, flags, sourceLabel: `${raw.stats.pagesCrawled} page(s)` });
}

async function finish({ raw, draft }, { slug, config, root, flags, sourceLabel }) {
  const finalSlug = slug ?? raw.slug;
  const clientDir = clientDirFor(config, root, finalSlug);

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
  log.ok(`Harvested ${sourceLabel} into ${color.bold(clientDir)}`);
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
