import path from 'node:path';
import { startPreview } from '../../preview/index.js';
import { log, color, AvoError } from '../../util/log.js';
import { loadProfile } from './check.js';
import { clientDirFor } from '../config.js';

export const usage = `avo preview <client> [options]

Serve the built site locally with a theme switcher for client demos.

Options:
  --theme <id>   Which built theme to open
  --port <n>     Port (default: 4173)
  --host <h>     Host (default: 127.0.0.1)
  --compare      Add a link to the original site for before/after`;

export async function run({ positional, flags, config, root }) {
  const slug = positional[0];
  if (!slug) throw new AvoError('Which client?', usage);

  const clientDir = clientDirFor(config, root, slug);
  let compareUrl = '';
  if (flags.compare) {
    try {
      const { profile } = await loadProfile(config, root, slug);
      compareUrl = profile.source?.url ?? '';
    } catch { /* preview should still work without a profile */ }
  }

  const { url, activeTheme, available } = await startPreview({
    clientDir,
    distDir: path.join(clientDir, 'dist'),
    theme: flags.theme ?? null,
    port: flags.port ?? 4173,
    host: flags.host ?? '127.0.0.1',
    compareUrl,
  });

  log.blank();
  log.ok(`Preview running at ${color.bold(url)}`);
  if (available.length > 1) log.info(`themes built: ${available.join(', ')} — switch with the bar at the bottom`);
  else if (activeTheme) log.info(`showing "${activeTheme}" — run \`avo build ${slug} --all-themes\` to compare all six`);
  log.info('Ctrl+C to stop');

  await new Promise(() => {});
}
