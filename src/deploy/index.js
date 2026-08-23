import path from 'node:path';
import fsp from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { exists, walk, ensureDir, copyDir, dirSize, formatBytes } from '../util/fs.js';
import { log, AvoError } from '../util/log.js';

/** Deploy a built site. Targets are pluggable; each returns a short summary. */
export async function deploy(distDir, target, config = {}, { dryRun = false } = {}) {
  if (!exists(path.join(distDir, 'index.html'))) {
    throw new AvoError(`No built site at ${distDir}`, 'Run `avo build <client>` first.');
  }
  const handler = TARGETS[target];
  if (!handler) {
    throw new AvoError(`Unknown deploy target "${target}"`, `Available: ${Object.keys(TARGETS).join(', ')}`);
  }
  const files = await walk(distDir);
  const bytes = await dirSize(distDir);
  log.info(`${files.length} files, ${formatBytes(bytes)}`);
  if (dryRun) {
    log.warn('Dry run — nothing was uploaded.');
    return { target, files: files.length, bytes, dryRun: true };
  }
  return handler(distDir, config, { files, bytes });
}

const TARGETS = {
  /** Copy into a local or mounted directory. */
  async folder(distDir, config) {
    if (!config.path) throw new AvoError('folder target needs a "path"');
    await ensureDir(config.path);
    const copied = await copyDir(distDir, config.path);
    log.ok(`Copied ${copied} files to ${config.path}`);
    return { target: 'folder', destination: config.path, files: copied };
  },

  /** Zip the build for manual upload — works on any host with a file manager. */
  async zip(distDir, config) {
    const out = path.resolve(config.path || `${config.name || path.basename(path.dirname(distDir))}-site.zip`);
    await fsp.rm(out, { force: true });
    const ok = await run('zip', ['-r', '-q', out, '.'], { cwd: distDir });
    if (!ok) {
      throw new AvoError(
        'The `zip` command is not available.',
        'Install zip (apt install zip / brew install zip), or use `--target folder` and archive it yourself.',
      );
    }
    const { size } = await fsp.stat(out);
    log.ok(`Wrote ${out} (${formatBytes(size)})`);
    return { target: 'zip', archive: out, bytes: size };
  },

  /** rsync over SSH — the fastest option for a VPS. */
  async rsync(distDir, config) {
    if (!config.destination) throw new AvoError('rsync target needs a "destination" (user@host:/path)');
    const args = ['-az', '--delete', ...(config.args ?? []), `${distDir.replace(/\/?$/, '/')}`, config.destination];
    log.step(`rsync ${args.join(' ')}`);
    const ok = await run('rsync', args, { stdio: 'inherit' });
    if (!ok) throw new AvoError('rsync failed', 'Check SSH access and that rsync is installed on both ends.');
    log.ok(`Synced to ${config.destination}`);
    return { target: 'rsync', destination: config.destination };
  },

  /** Plain FTP — still what most cheap shared hosting offers. */
  async ftp(distDir, config) {
    const ftp = await optional('basic-ftp', 'npm install basic-ftp');
    const client = new ftp.Client(config.timeout ?? 30000);
    client.ftp.verbose = !!config.verbose;
    try {
      await client.access({
        host: required(config, 'host'),
        user: required(config, 'user'),
        password: required(config, 'password'),
        port: config.port ?? 21,
        secure: config.secure ?? false,
      });
      const remote = config.remoteDir || '/';
      log.step(`Uploading to ${config.host}${remote}`);
      await client.ensureDir(remote);
      await client.clearWorkingDir();
      await client.uploadFromDir(distDir);
      log.ok(`Uploaded to ftp://${config.host}${remote}`);
      return { target: 'ftp', host: config.host, remoteDir: remote };
    } finally {
      client.close();
    }
  },

  /** SFTP over SSH. */
  async sftp(distDir, config) {
    const Mod = await optional('ssh2-sftp-client', 'npm install ssh2-sftp-client');
    const Client = Mod.default ?? Mod;
    const client = new Client();
    try {
      await client.connect({
        host: required(config, 'host'),
        username: required(config, 'user'),
        port: config.port ?? 22,
        password: config.password,
        privateKey: config.privateKeyPath ? await fsp.readFile(config.privateKeyPath) : undefined,
        passphrase: config.passphrase,
      });
      const remote = required(config, 'remoteDir');
      log.step(`Uploading to ${config.host}:${remote}`);
      await client.uploadDir(distDir, remote);
      log.ok(`Uploaded to sftp://${config.host}${remote}`);
      return { target: 'sftp', host: config.host, remoteDir: remote };
    } finally {
      await client.end().catch(() => {});
    }
  },

  /** Hand off to the Netlify CLI if the user has it. */
  async netlify(distDir, config) {
    const args = ['deploy', '--dir', distDir, ...(config.prod === false ? [] : ['--prod'])];
    if (config.site) args.push('--site', config.site);
    const ok = await run('netlify', args, { stdio: 'inherit' });
    if (!ok) throw new AvoError('The Netlify CLI is not available', 'npm install -g netlify-cli, then `netlify login`.');
    return { target: 'netlify', site: config.site ?? '(default)' };
  },
};

export const DEPLOY_TARGETS = Object.keys(TARGETS);

function required(config, key) {
  if (!config[key]) throw new AvoError(`Deploy config is missing "${key}"`);
  return config[key];
}

async function optional(pkg, hint) {
  try {
    return await import(pkg);
  } catch {
    throw new AvoError(`This target needs the optional "${pkg}" package.`, hint);
  }
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { ...opts, shell: false });
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
}
