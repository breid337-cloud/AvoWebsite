#!/usr/bin/env node
/**
 * Download the theme webfonts into src/themes/fonts/ and write the manifest
 * that tokens.js reads.
 *
 *   node tools/vendor-fonts.mjs          # fetch anything missing
 *   node tools/vendor-fonts.mjs --force  # re-fetch everything
 *
 * Run this only when a theme's fonts change. The files are committed, so a
 * build needs no network and produces the same bytes every time.
 *
 * Why self-host at all: loading from Google costs two extra origins and a
 * dependency chain the browser cannot shorten — it has to fetch the stylesheet
 * before it learns the font's URL. Measured on a real build, the first glyph
 * arrived 1049ms in, against 3.0s to first paint. Preconnect does not help,
 * because you cannot preconnect to a request you have not discovered yet.
 *
 * Licensing: every family here is under the SIL Open Font License or Apache
 * 2.0, both of which permit redistribution. The licence text ships alongside.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { THEME_IDS, getTheme } from '../src/themes/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FONT_DIR = join(HERE, '..', 'src', 'themes', 'fonts');
const FORCE = process.argv.includes('--force');

// A recent Chrome, or Google serves the ttf fallback rather than woff2.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/** Latin subset only. Fallback stacks in each theme cover anything outside it. */
const LATIN = /U\+0000-00FF/;

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Every (family, weights) pair any theme asks for, merged. */
function required() {
  const byFamily = new Map();
  for (const id of THEME_IDS) {
    const theme = getTheme(id);
    for (const font of [theme.fonts.heading, theme.fonts.body]) {
      if (!font.google) continue;
      const set = byFamily.get(font.google) ?? new Set();
      for (const w of font.googleWeights ?? [400, 700]) set.add(w);
      byFamily.set(font.google, set);
    }
  }
  return [...byFamily.entries()].map(([family, weights]) => ({
    family, weights: [...weights].sort((a, b) => a - b),
  }));
}

async function cssFor(family, weights) {
  const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}`
    + `:wght@${weights.join(';')}&display=swap`;
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`${family}: HTTP ${res.status}`);
  return res.text();
}

/** Pull the latin @font-face blocks out of Google's stylesheet. */
function latinFaces(css) {
  const faces = [];
  const re = /@font-face\s*\{([\s\S]*?)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const block = m[1];
    const range = /unicode-range:\s*([^;]+);/.exec(block);
    if (!range || !LATIN.test(range[1])) continue;
    const src = /url\((https:\/\/[^)]+\.woff2)\)/.exec(block);
    const weight = /font-weight:\s*([^;]+);/.exec(block);
    const style = /font-style:\s*([^;]+);/.exec(block);
    if (!src) continue;
    faces.push({
      url: src[1],
      weight: (weight?.[1] ?? '400').trim(),
      style: (style?.[1] ?? 'normal').trim(),
      unicodeRange: range[1].trim(),
    });
  }
  return faces;
}

mkdirSync(FONT_DIR, { recursive: true });

const manifest = {};
let downloaded = 0, reused = 0;

for (const { family, weights } of required()) {
  const css = await cssFor(family, weights);
  const faces = latinFaces(css);
  if (!faces.length) throw new Error(`${family}: no latin woff2 found`);

  // Google serves one file per weight, but for a variable font every weight
  // resolves to the same URL. Dedupe so we ship one file, not six copies.
  const byUrl = new Map();
  for (const f of faces) {
    const seen = byUrl.get(f.url);
    if (seen) { seen.weights.push(Number(f.weight)); continue; }
    byUrl.set(f.url, { ...f, weights: [Number(f.weight)] });
  }

  manifest[family] = [];
  let i = 0;
  for (const face of byUrl.values()) {
    const ws = face.weights.filter((w) => !Number.isNaN(w)).sort((a, b) => a - b);
    const variable = ws.length > 1;
    const name = `${slug(family)}${variable ? '' : `-${ws[0] || face.weight}`}`
      + `${face.style === 'italic' ? '-italic' : ''}${byUrl.size > 1 && !variable ? '' : ''}-latin.woff2`;
    const dest = join(FONT_DIR, name);

    if (FORCE || !existsSync(dest)) {
      const res = await fetch(face.url, { headers: { 'user-agent': UA } });
      if (!res.ok) throw new Error(`${family} ${face.weight}: HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.subarray(0, 4).toString() !== 'wOF2') throw new Error(`${name}: not a woff2`);
      writeFileSync(dest, buf);
      downloaded++;
      console.log(`  ${name.padEnd(34)} ${String(Math.round(buf.length / 1024)).padStart(4)}KB  ${family} ${ws.join('/') || face.weight}`);
    } else {
      reused++;
    }

    manifest[family].push({
      file: name,
      style: face.style,
      weight: variable ? `${ws[0]} ${ws[ws.length - 1]}` : String(ws[0] ?? face.weight),
      unicodeRange: face.unicodeRange,
    });
    i++;
  }
}

const out = join(FONT_DIR, 'manifest.js');
writeFileSync(out, `/**
 * Generated by tools/vendor-fonts.mjs — do not edit by hand.
 *
 * Maps each Google family a theme uses to the self-hosted woff2 files that
 * cover it. A weight written as a range ("400 700") means one variable font
 * serves every weight in it.
 */
export const FONT_FILES = ${JSON.stringify(manifest, null, 2)};
`);

console.log(`\n${downloaded} downloaded, ${reused} already present`);
console.log(`manifest: ${out}`);
