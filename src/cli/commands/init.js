import path from 'node:path';
import { DEFAULT_CONFIG, CONFIG_FILE, SECRETS_FILE, writeConfig, clientDirFor } from '../config.js';
import { exists, writeJson, ensureDir, writeText } from '../../util/fs.js';
import { emptyProfile } from '../../profile/schema.js';
import { log, color } from '../../util/log.js';
import { slugify } from '../../util/text.js';

export const usage = `avo init                Create avo.config.json in the current directory
avo new <client>        Start a client from scratch, with no site to harvest`;

export async function run({ config, root }) {
  const file = path.join(root, CONFIG_FILE);
  if (exists(file)) {
    log.warn(`${CONFIG_FILE} already exists — leaving it alone.`);
  } else {
    await writeConfig(root, DEFAULT_CONFIG);
    log.ok(`Wrote ${file}`);
  }

  const secrets = path.join(root, SECRETS_FILE);
  if (!exists(secrets)) {
    await writeJson(secrets, {
      _comment: 'Deploy credentials. Gitignored — never commit this file.',
      deploy: { 'example-client': { target: 'ftp', host: 'ftp.example.com', user: '', password: '', remoteDir: '/public_html' } },
    });
    log.ok(`Wrote ${secrets} ${color.grey('(gitignored)')}`);
  }

  await ensureDir(path.join(root, config.clientsDir));
  log.blank();
  log.plain(`Start a client:  ${color.cyan('avo harvest https://their-old-site.com')}`);
  log.plain(`Or from scratch: ${color.cyan('avo new their-business')}`);
}

export async function runNew({ positional, config, root }) {
  const slug = slugify(positional[0] ?? '', '');
  if (!slug) {
    log.error('Give the client a slug, e.g. `avo new brannigan-heating`.');
    process.exitCode = 1;
    return;
  }

  const clientDir = clientDirFor(config, root, slug);
  const file = path.join(clientDir, 'profile.json');
  if (exists(file)) {
    log.warn(`${file} already exists.`);
    return;
  }

  const profile = emptyProfile(slug);
  profile.site.theme = config.defaults.theme;
  await writeJson(file, profile);
  await ensureDir(path.join(clientDir, 'assets'));
  await writeText(path.join(clientDir, 'BRIEF.md'), `# ${slug}\n\nNo existing site was harvested for this client. Fill in \`profile.json\` by hand,\nor paste the business's details into a Claude Code session and run \`/avo-enrich ${slug}\`.\n\nRequired before it will build:\n\n- \`business.name\`\n- \`content.hero.headline\`\n- one of \`contact.phone\`, \`contact.email\`, or \`site.form.action\`\n`);

  log.ok(`Created ${clientDir}`);
  log.plain(`\nEdit ${color.bold(file)}, then ${color.cyan(`avo build ${slug}`)}`);
}
