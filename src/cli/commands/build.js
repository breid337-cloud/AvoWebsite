import path from 'node:path';
import { buildSite, buildAllThemes } from '../../render/index.js';
import { THEME_IDS, suggestTheme } from '../../themes/index.js';
import { log, color, table, AvoError } from '../../util/log.js';
import { loadProfile } from './check.js';

export const usage = `avo build <client> [options]

Generate the static site into clients/<client>/dist/.

Options:
  --theme <id>     ${THEME_IDS.join(', ')}
  --all-themes     Build every theme into dist/<theme>/ for a client to choose
  --mode <m>       light | dark (default from the profile)
  --url <url>      Site URL — needed for sitemap.xml and absolute OG tags
  --out <dir>      Output directory
  --no-minify      Readable CSS/JS output
  --theme-toggle   Add a light/dark switch to the page
  --dark-mode <m>  auto | off  (default: auto)`;

export async function run({ positional, flags, config, root }) {
  const slug = positional[0];
  if (!slug) throw new AvoError('Which client?', usage);

  const { profile, clientDir, isDraft } = await loadProfile(config, root, slug);
  if (isDraft) {
    log.warn('Building from profile.draft.json — the copy is still the old site\'s. Run the enrichment pass before sending this to a client.');
  }

  const themeId = flags.theme ?? profile.site.theme ?? config.defaults.theme;
  const shared = {
    clientDir,
    mode: flags.mode ?? profile.site.mode ?? config.defaults.mode,
    siteUrl: flags.url ?? profile.site.domain ?? '',
    minify: flags.minify !== false && config.defaults.minify !== false,
    darkMode: flags.darkMode ?? config.defaults.darkMode,
    themeToggle: flags.themeToggle ?? config.defaults.themeToggle,
    lang: flags.lang ?? config.defaults.lang,
    responsive: flags.responsive !== false,
  };

  if (flags.allThemes) {
    const baseOutDir = flags.out ? path.resolve(root, flags.out) : path.join(clientDir, 'dist');
    const results = await buildAllThemes(profile, { ...shared, baseOutDir });
    log.blank();
    log.ok(`Built ${results.length} themes into ${color.bold(baseOutDir)}`);
    table(results.map((r) => [r.themeName, `${r.pages.length} pages · ${r.size}`]));
    log.blank();
    log.plain(`Compare them: ${color.cyan(`avo preview ${slug}`)}`);
    return;
  }

  const outDir = flags.out ? path.resolve(root, flags.out) : path.join(clientDir, 'dist', themeId);
  const result = await buildSite(profile, { ...shared, themeId, outDir });

  log.blank();
  log.ok(`Built ${color.bold(result.themeName)} → ${color.bold(outDir)}`);
  log.blank();
  table([
    ['Pages', result.pages.length],
    ['Files', result.files],
    ['Size', result.size],
    ['Images', result.assetsCopied],
    ['Completeness', `${result.score.percent}%`],
  ]);

  if (result.warnings.length) {
    log.blank();
    for (const w of result.warnings) log.warn(w);
  }
  if (!flags.theme && suggestTheme(profile).theme !== themeId) {
    log.blank();
    log.info(`Theme "${suggestTheme(profile).theme}" may suit this business better — try --theme ${suggestTheme(profile).theme}`);
  }
  log.blank();
  log.plain(`Preview: ${color.cyan(`avo preview ${slug}`)}`);
}
