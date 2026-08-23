import process from 'node:process';
import { parseArgs } from './args.js';
import { loadConfig } from './config.js';
import { log, color, setVerbose, AvoError } from '../util/log.js';
import { THEME_IDS } from '../themes/index.js';
import { DEPLOY_TARGETS } from '../deploy/index.js';

const BOOLEANS = [
  'all-themes', 'dry-run', 'verbose', 'help', 'version', 'compare',
  'ignore-robots', 'theme-toggle', 'quiet',
];
const ALIASES = { t: 'theme', p: 'port', v: 'verbose', h: 'help', o: 'out' };

const COMMANDS = {
  init: () => import('./commands/init.js').then((m) => ({ ...m, run: m.run })),
  new: () => import('./commands/init.js').then((m) => ({ ...m, run: m.runNew })),
  harvest: () => import('./commands/harvest.js'),
  brief: () => import('./commands/brief.js'),
  check: () => import('./commands/check.js'),
  build: () => import('./commands/build.js'),
  preview: () => import('./commands/preview.js'),
  deploy: () => import('./commands/deploy.js'),
  themes: () => import('./commands/themes.js'),
  doctor: () => import('./commands/doctor.js'),
};

const HELP = `${color.bold('avo')} — point it at a tired small-business website, get a modern one back.

${color.bold('Usage')}
  avo <command> [options]

${color.bold('The workflow')}
  ${color.cyan('avo harvest <url>')}        Crawl the old site + socials into a draft profile
  ${color.cyan('/avo-enrich <client>')}     (in Claude Code) rewrite the copy properly
  ${color.cyan('avo build <client>')}       Generate the static site
  ${color.cyan('avo preview <client>')}     Show it locally, with a theme switcher
  ${color.cyan('avo deploy <client>')}      Publish it

${color.bold('Commands')}
  init                    Create avo.config.json here
  new <client>            Start a client with no existing site
  harvest <url>           Crawl a site and build a draft profile
  brief <client>          Regenerate the Claude Code enrichment brief
  check <client>          Validate a profile and score its completeness
  build <client>          Build the static site
  preview <client>        Serve the build locally
  deploy <client>         Publish the build
  themes [client]         List themes, or see which suits a client
  doctor                  Check the environment and self-test the themes

${color.bold('Common options')}
  --theme <id>            ${THEME_IDS.join(', ')}
  --all-themes            Build every theme so the client can choose
  --url <url>             Final site URL (needed for sitemap + OG tags)
  --target <t>            ${DEPLOY_TARGETS.join(', ')}
  -v, --verbose           Verbose logging
  -h, --help              Help for a command

${color.grey('Run `avo <command> --help` for details on any command.')}`;

export async function main(argv = process.argv.slice(2)) {
  const { flags, positional } = parseArgs(argv, { booleans: BOOLEANS, aliases: ALIASES });
  setVerbose(!!flags.verbose);

  const [name, ...rest] = positional;

  if (flags.version) {
    const { readJson } = await import('../util/fs.js');
    const url = new URL('../../package.json', import.meta.url);
    const pkg = await readJson(url.pathname, { version: '0.0.0' });
    log.plain(pkg.version);
    return;
  }

  if (!name || (flags.help && !name)) {
    log.plain(HELP);
    return;
  }

  const loader = COMMANDS[name];
  if (!loader) {
    log.error(`Unknown command "${name}".`);
    log.plain(`\nAvailable: ${Object.keys(COMMANDS).join(', ')}`);
    process.exitCode = 1;
    return;
  }

  const mod = await loader();
  if (flags.help) {
    log.plain(mod.usage ?? `No help available for "${name}".`);
    return;
  }

  const root = process.cwd();
  const config = await loadConfig(root);

  try {
    await mod.run({ positional: rest, flags, config, root });
  } catch (err) {
    if (err instanceof AvoError || err.name === 'AvoError') {
      log.error(err.message);
      if (err.hint) log.plain(`\n${err.hint}`);
    } else {
      log.error(err.message);
      if (flags.verbose && err.stack) log.plain(color.grey(err.stack));
      else log.info('Re-run with --verbose for the full stack trace.');
    }
    process.exitCode = 1;
  }
}
