import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

export const exists = (p) => fs.existsSync(p);

export async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
  return dir;
}

export async function readJson(file, fallback = undefined) {
  try {
    return JSON.parse(await fsp.readFile(file, 'utf8'));
  } catch (err) {
    if (fallback !== undefined && err.code === 'ENOENT') return fallback;
    if (err instanceof SyntaxError) {
      throw new Error(`${file} is not valid JSON: ${err.message}`);
    }
    throw err;
  }
}

export async function writeJson(file, data) {
  await ensureDir(path.dirname(file));
  await fsp.writeFile(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
  return file;
}

export async function writeText(file, text) {
  await ensureDir(path.dirname(file));
  await fsp.writeFile(file, text, 'utf8');
  return file;
}

export async function readText(file, fallback = undefined) {
  try {
    return await fsp.readFile(file, 'utf8');
  } catch (err) {
    if (fallback !== undefined && err.code === 'ENOENT') return fallback;
    throw err;
  }
}

export async function rimraf(target) {
  await fsp.rm(target, { recursive: true, force: true });
}

export async function copyDir(src, dest) {
  if (!exists(src)) return 0;
  await ensureDir(dest);
  let count = 0;
  for (const entry of await fsp.readdir(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) count += await copyDir(from, to);
    else { await fsp.copyFile(from, to); count++; }
  }
  return count;
}

/** Recursively list files, returning paths relative to `root`. */
export async function walk(root, dir = root, out = []) {
  if (!exists(dir)) return out;
  for (const entry of await fsp.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(root, full, out);
    else out.push(path.relative(root, full));
  }
  return out;
}

export async function dirSize(dir) {
  let bytes = 0;
  for (const rel of await walk(dir)) {
    bytes += (await fsp.stat(path.join(dir, rel))).size;
  }
  return bytes;
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
