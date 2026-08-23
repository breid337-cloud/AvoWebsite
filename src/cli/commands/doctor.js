import { log, color, table } from '../../util/log.js';
import { exists } from '../../util/fs.js';
import path from 'node:path';
import { CONFIG_FILE } from '../config.js';
import { THEME_IDS, getTheme } from '../../themes/index.js';
import { compileTokens } from '../../themes/tokens.js';
import { contrast } from '../../util/color.js';

export const usage = `avo doctor

Check the environment and self-test the themes.`;

export async function run({ root, config }) {
  log.title('Environment');
  const [major] = process.versions.node.split('.').map(Number);
  const rows = [
    ['Node', `${process.version} ${major >= 20 ? color.green('ok') : color.red('needs >= 20')}`],
    ['Platform', `${process.platform} ${process.arch}`],
    ['Config', exists(path.join(root, CONFIG_FILE)) ? color.green(CONFIG_FILE) : color.yellow('not found — run `avo init`')],
    ['Clients dir', exists(path.join(root, config.clientsDir)) ? color.green(config.clientsDir) : color.yellow('missing')],
  ];

  for (const [pkg, why] of [['sharp', 'responsive images'], ['basic-ftp', 'FTP deploys'], ['ssh2-sftp-client', 'SFTP deploys'], ['playwright', 'JS-rendered site harvesting']]) {
    let status;
    try { await import(pkg); status = color.green('installed'); }
    catch { status = color.grey(`not installed — optional, needed for ${why}`); }
    rows.push([pkg, status]);
  }
  table(rows);

  log.title('Theme self-test');
  let failures = 0;
  for (const id of THEME_IDS) {
    const theme = getTheme(id);
    const problems = [];
    for (const mode of ['light', 'dark']) {
      const { vars } = compileTokens(theme, { mode });
      const checks = [
        ['body text', vars['--text'], vars['--bg'], 7],
        ['muted text', vars['--text-muted'], vars['--bg'], 4.5],
        ['card text', vars['--text-on-surface'], vars['--surface'], 7],
        ['button label', vars['--on-primary'], vars['--primary'], 4.5],
        ['accent label', vars['--on-accent'], vars['--accent'], 4.5],
        ['links', vars['--link'], vars['--bg'], 4.5],
        ['CTA band', vars['--inverse-text'], vars['--inverse-bg'], 7],
      ];
      for (const [label, fg, bg, min] of checks) {
        const ratio = contrast(fg, bg);
        if (ratio < min) problems.push(`${mode} ${label} ${ratio.toFixed(2)}:1 < ${min}`);
      }
    }
    if (problems.length) { failures++; log.error(`${theme.name}: ${problems.join('; ')}`); }
    else log.ok(`${theme.name.padEnd(10)} contrast passes in light and dark`);
  }

  log.blank();
  if (failures) { log.error(`${failures} theme(s) failed.`); process.exitCode = 1; }
  else log.ok('All themes pass WCAG AA (AAA for body text).');
}
