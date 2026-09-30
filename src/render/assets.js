import path from 'node:path';
import fsp from 'node:fs/promises';
import { exists, walk, copyDir } from '../util/fs.js';
import { log } from '../util/log.js';

const RESPONSIVE_WIDTHS = [480, 800, 1200, 1800];

/**
 * Copy client assets into the build. If the optional `sharp` dependency is
 * installed we also emit resized WebP variants for srcset; without it the
 * originals are used unchanged and the build still succeeds.
 */
export async function processAssets(clientDir, outDir, { responsive = true } = {}) {
  const srcDir = path.join(clientDir, 'assets');
  const destDir = path.join(outDir, 'assets');
  if (!exists(srcDir)) return { copied: 0, variants: new Map(), sharp: false };

  const copied = await copyDir(srcDir, destDir);
  const variants = new Map();

  const sharp = responsive ? await loadSharp() : null;
  if (!sharp) return { copied, variants, sharp: false };

  const files = (await walk(destDir)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  let made = 0;
  for (const rel of files) {
    const full = path.join(destDir, rel);
    try {
      const image = sharp(full);
      const meta = await image.metadata();
      if (!meta.width) continue;

      // Anything narrower than the smallest breakpoint used to be skipped
      // entirely. There is nothing to resize there, but there is still a format
      // to gain: one client's 300px PNG shipped at 50KB where WebP is 6KB, and
      // twenty of their twenty-six images were under the threshold.
      const widths = RESPONSIVE_WIDTHS.filter((w) => w <= meta.width);
      if (!widths.length) widths.push(meta.width);

      const list = [];
      for (const width of widths) {
        const outRel = rel.replace(/\.(jpe?g|png|webp)$/i, `-${width}.webp`);
        const outFull = path.join(destDir, outRel);
        await sharp(full).resize({ width }).webp({ quality: 78 }).toFile(outFull);
        // A small, already-tight JPEG can come out bigger as WebP. Keep the
        // original rather than shipping a larger file for a modern format.
        if (width === meta.width) {
          const [variant, original] = await Promise.all([fsp.stat(outFull), fsp.stat(full)]);
          if (variant.size >= original.size) {
            await fsp.rm(outFull, { force: true });
            continue;
          }
        }
        list.push({ src: path.posix.join('assets', outRel.split(path.sep).join('/')), width });
        made++;
      }
      if (list.length) variants.set(path.posix.join('assets', rel.split(path.sep).join('/')), list);
    } catch (err) {
      log.debug(`asset resize skipped for ${rel}: ${err.message}`);
    }
  }
  if (made) log.info(`generated ${made} responsive image variant(s)`);
  return { copied, variants, sharp: true };
}

async function loadSharp() {
  try {
    const mod = await import('sharp');
    return mod.default ?? mod;
  } catch {
    log.debug('sharp not installed — skipping responsive image generation');
    return null;
  }
}
