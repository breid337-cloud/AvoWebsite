import path from 'node:path';
import { readJson, writeText, exists } from '../../util/fs.js';
import { renderBrief } from '../../brief/index.js';
import { normalizeProfile } from '../../profile/normalize.js';
import { log, color, AvoError } from '../../util/log.js';
import { clientDirFor } from '../config.js';

export const usage = `avo brief <client>

Regenerate BRIEF.md — the enrichment prompt for a Claude Code session.`;

export async function run({ positional, config, root }) {
  const slug = positional[0];
  if (!slug) throw new AvoError('Which client?', usage);

  const clientDir = clientDirFor(config, root, slug);
  const rawPath = path.join(clientDir, 'harvest', 'raw.json');
  if (!exists(rawPath)) throw new AvoError(`No harvest found at ${rawPath}`, `Run \`avo harvest <url> --slug ${slug}\` first.`);

  const raw = await readJson(rawPath);
  const draftPath = exists(path.join(clientDir, 'profile.json'))
    ? path.join(clientDir, 'profile.json')
    : path.join(clientDir, 'profile.draft.json');
  const profile = normalizeProfile(await readJson(draftPath));

  const out = path.join(clientDir, 'BRIEF.md');
  await writeText(out, renderBrief(raw, profile, { clientSlug: slug }));
  log.ok(`Wrote ${out}`);
  log.plain(`\nRun ${color.cyan(`/avo-enrich ${slug}`)} in a Claude Code session, or paste BRIEF.md into one.`);
}
