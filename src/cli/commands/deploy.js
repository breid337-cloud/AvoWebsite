import path from 'node:path';
import { deploy, DEPLOY_TARGETS } from '../../deploy/index.js';
import { log, AvoError } from '../../util/log.js';
import { exists } from '../../util/fs.js';
import { loadProfile } from './check.js';
import { clientDirFor, SECRETS_FILE } from '../config.js';

export const usage = `avo deploy <client> [options]

Publish a built site.

Options:
  --target <t>   ${DEPLOY_TARGETS.join(', ')}
  --theme <id>   Which built theme to publish
  --dir <path>   Publish this folder instead of the client's dist
  --dry-run      Report what would be uploaded, upload nothing

Credentials live in ${SECRETS_FILE} (gitignored):

  { "deploy": { "<client>": {
      "target": "ftp", "host": "ftp.example.com",
      "user": "u", "password": "p", "remoteDir": "/public_html"
  } } }`;

export async function run({ positional, flags, config, root }) {
  const slug = positional[0];
  if (!slug) throw new AvoError('Which client?', usage);

  const clientDir = clientDirFor(config, root, slug);
  const settings = config.deploy?.[slug] ?? {};
  const target = flags.target ?? settings.target;
  if (!target) {
    throw new AvoError(`No deploy target for "${slug}"`, `Pass --target, or add deploy.${slug}.target to ${SECRETS_FILE}.\n\n${usage}`);
  }

  let distDir = flags.dir ? path.resolve(root, flags.dir) : null;
  if (!distDir) {
    const themeId = flags.theme ?? (await loadProfile(config, root, slug)).profile.site.theme;
    const themed = path.join(clientDir, 'dist', themeId);
    distDir = exists(path.join(themed, 'index.html')) ? themed : path.join(clientDir, 'dist');
  }

  log.step(`Deploying ${slug} via ${target}`);
  log.info(distDir);
  const result = await deploy(distDir, target, { name: slug, ...settings }, { dryRun: !!flags.dryRun });
  log.blank();
  log.ok(`Done: ${JSON.stringify(result)}`);
}
