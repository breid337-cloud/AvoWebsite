#!/usr/bin/env node
/**
 * Rename the Avo product across the AvoSolution profile.
 *
 *   node clients/avosolution/rename-product.mjs "Newname"        # preview
 *   node clients/avosolution/rename-product.mjs "Newname" --write # apply
 *
 * "Avo" is a working name. Every public reference to it lives in exactly one
 * file — clients/avosolution/profile.json — because that profile is the only
 * contract the renderer reads. So renaming the product is a single pass over
 * that file, then a rebuild.
 *
 * Two things this is careful about:
 *
 *  - It matches the whole word `Avo` only. "AvoSolution" is the *company* and
 *    must never be renamed; `\bAvo\b` cannot match inside it, because the "S"
 *    that follows is a word character.
 *  - It renames the `avo` service slug separately and explicitly, since that
 *    is lowercase and drives the /services/avo/ URL. Case-insensitive matching
 *    would also hit this repo's own `avo` CLI name, so it is never used.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROFILE = path.join(HERE, 'profile.json');
const WORD = /\bAvo\b/g;
const OLD_SLUG = 'avo';

const [, , rawName, ...flags] = process.argv;
const write = flags.includes('--write');

if (!rawName || rawName.startsWith('--')) {
  console.error('Usage: node clients/avosolution/rename-product.mjs "New name" [--write]');
  process.exit(1);
}
const name = rawName.trim();
if (/^avosolution$/i.test(name)) {
  console.error('Refusing to rename the product to the company name.');
  process.exit(1);
}
const slug = name.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-');

const source = readFileSync(PROFILE, 'utf8');
const profile = JSON.parse(source);
const changes = [];

/** Walk every string in the profile, recording each hit with its JSON path. */
function walk(node, trail) {
  if (typeof node === 'string') {
    const hits = node.match(WORD);
    if (!hits) return node;
    const next = node.replace(WORD, name);
    changes.push({ path: trail, count: hits.length, before: node, after: next });
    return next;
  }
  if (Array.isArray(node)) return node.map((v, i) => walk(v, `${trail}[${i}]`));
  if (node && typeof node === 'object') {
    return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, walk(v, trail ? `${trail}.${k}` : k)]));
  }
  return node;
}

const renamed = walk(profile, '');

// The service slug is lowercase, so the word match above never sees it.
const service = renamed.services.find((s) => s.slug === OLD_SLUG);
if (service) {
  service.slug = slug;
  changes.push({ path: `services[slug]`, count: 1, before: `/services/${OLD_SLUG}/`, after: `/services/${slug}/`, url: true });
}

if (!changes.length) {
  console.log('No references to "Avo" found. Nothing to do.');
  process.exit(0);
}

const total = changes.reduce((n, c) => n + c.count, 0);
console.log(`${write ? 'Renaming' : 'Would rename'} "Avo" -> "${name}" — ${total} reference(s) in ${changes.length} field(s):\n`);
for (const c of changes) {
  console.log(`  ${c.path}`);
  if (c.url) {
    console.log(`    URL ${c.before}  ->  ${c.after}`);
  } else {
    const show = (s) => (s.length > 96 ? s.slice(0, 93) + '...' : s);
    console.log(`    -  ${show(c.before)}`);
    console.log(`    +  ${show(c.after)}`);
  }
}

if (!write) {
  console.log('\nPreview only. Re-run with --write to apply.');
  process.exit(0);
}

writeFileSync(PROFILE, JSON.stringify(renamed, null, 2) + '\n');
console.log(`\nWrote ${path.relative(process.cwd(), PROFILE)}.`);
console.log('Next: node bin/avo.js check avosolution && node bin/avo.js build avosolution');
