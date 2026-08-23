import path from 'node:path';
import { readJson, exists, writeJson } from '../util/fs.js';
import { merge } from '../profile/normalize.js';

export const CONFIG_FILE = 'avo.config.json';
export const SECRETS_FILE = 'avo.secrets.json';

export const DEFAULT_CONFIG = {
  clientsDir: 'clients',
  defaults: {
    theme: 'meridian',
    mode: 'light',
    maxPages: 20,
    minify: true,
    darkMode: 'auto',
    themeToggle: false,
    lang: 'en',
  },
  deploy: {},
};

/** Load avo.config.json, overlaying gitignored avo.secrets.json if present. */
export async function loadConfig(root = process.cwd()) {
  const config = merge(DEFAULT_CONFIG, await readJson(path.join(root, CONFIG_FILE), {}));
  const secretsPath = path.join(root, SECRETS_FILE);
  if (exists(secretsPath)) {
    return merge(config, await readJson(secretsPath, {}));
  }
  return config;
}

export async function writeConfig(root, config) {
  return writeJson(path.join(root, CONFIG_FILE), config);
}

export const clientDirFor = (config, root, slug) => path.join(root, config.clientsDir, slug);
