import { listThemes, suggestTheme } from '../../themes/index.js';
import { log, color } from '../../util/log.js';
import { loadProfile } from './check.js';

export const usage = `avo themes [client]

List the available themes. Pass a client to see which one is recommended.`;

export async function run({ positional, config, root }) {
  const slug = positional[0];
  let recommended = null;

  if (slug) {
    try {
      const { profile } = await loadProfile(config, root, slug);
      const s = suggestTheme(profile);
      recommended = s.theme;
      log.title(`Recommended for ${profile.business.name || slug}: ${s.theme}${s.confident ? '' : ' (low confidence)'}`);
    } catch (err) {
      log.warn(err.message);
    }
  }

  for (const theme of listThemes()) {
    log.blank();
    const star = theme.id === recommended ? color.green(' ★ recommended') : '';
    log.plain(`${color.bold(theme.name)} ${color.grey(`(${theme.id})`)}${star}`);
    log.plain(`  ${color.cyan(theme.tagline)}`);
    log.plain(`  ${theme.description}`);
    log.plain(`  ${color.grey('Suits: ' + theme.bestFor.join(', '))}`);
    log.plain(`  ${color.grey('Layout: ' + Object.entries(theme.sections).map(([k, v]) => `${k}=${v}`).join('  '))}`);
  }
  log.blank();
}
