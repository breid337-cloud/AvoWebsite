import path from 'node:path';
import { bundleSite } from '../../render/bundle.js';
import { writeText, formatBytes, exists } from '../../util/fs.js';
import { log, color, AvoError } from '../../util/log.js';
import { loadProfile } from './check.js';
import { clientDirFor } from '../config.js';

export const usage = `avo bundle <client> [options]

Fold a built site into a single self-contained HTML file — every page, style and
photograph inlined, with no external requests. Email it to a client, open it off
a USB stick, or view it anywhere a browser runs.

Options:
  --theme <id>     Which built theme to bundle
  --out <file>     Output path (default: clients/<client>/<client>-preview.html)
  --width <px>     Image width to embed (default: 800)
  --banner <text>  Ribbon across the top, for marking it as a draft
  --no-banner      Omit the ribbon`;

export async function run({ positional, flags, config, root }) {
  const slug = positional[0];
  if (!slug) throw new AvoError('Which client?', usage);

  const clientDir = clientDirFor(config, root, slug);
  const { profile } = await loadProfile(config, root, slug);
  const themeId = flags.theme ?? profile.site.theme;
  const distDir = path.join(clientDir, 'dist', themeId);
  if (!exists(path.join(distDir, 'index.html'))) {
    throw new AvoError(`No build at ${distDir}`, `Run \`avo build ${slug}\` first.`);
  }

  const banner = flags.banner === false
    ? null
    : (typeof flags.banner === 'string' ? flags.banner : defaultBanner(profile));

  log.step(`Bundling ${themeId}`);
  const result = await bundleSite(distDir, {
    imageWidth: flags.width ?? 800,
    banner,
    title: flags.title ?? null,
  });

  const out = flags.out ? path.resolve(root, flags.out) : path.join(clientDir, `${slug}-preview.html`);
  await writeText(out, result.html);

  log.blank();
  log.ok(`Wrote ${color.bold(out)}`);
  log.info(`${result.pages} pages, ${result.images} images, ${formatBytes(result.bytes)} — one file, no external requests`);
  return out;
}

function defaultBanner(profile) {
  const name = profile.business.name || 'this business';
  return `<strong>Preview</strong><span>Design concept for ${name} — not the live site.</span>`;
}
