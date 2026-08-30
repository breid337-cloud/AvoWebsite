// Recolour an 8-bit RGBA PNG silhouette: keep the alpha channel, replace RGB.
// Written by hand because neither sharp nor PIL is available in this environment.
import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunks(buf) {
  const out = [];
  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    out.push({ type, data: buf.subarray(off + 8, off + 8 + len) });
    off += 12 + len;
  }
  return out;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

const paeth = (a, b, c) => {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

export function recolour(srcPath, outPath, hex) {
  const buf = readFileSync(srcPath);
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error('not a PNG');
  const cs = chunks(buf);
  const ihdr = cs.find((c) => c.type === 'IHDR').data;
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const depth = ihdr[8];
  const colorType = ihdr[9];
  if (depth !== 8 || colorType !== 6) throw new Error(`expected 8-bit RGBA, got depth ${depth} type ${colorType}`);
  if (ihdr[12] !== 0) throw new Error('interlaced PNGs not supported');

  const bpp = 4;
  const stride = width * bpp;
  const raw = zlib.inflateSync(Buffer.concat(cs.filter((c) => c.type === 'IDAT').map((c) => c.data)));

  // Undo per-scanline filtering into a flat RGBA buffer.
  const px = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[y * stride + x - bpp] : 0;
      const b = y > 0 ? px[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? px[(y - 1) * stride + x - bpp] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) v += paeth(a, b, c);
      px[y * stride + x] = v & 0xff;
    }
  }

  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), bl = parseInt(hex.slice(5, 7), 16);
  let touched = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue; // fully transparent: leave it alone
    px[i] = r; px[i + 1] = g; px[i + 2] = bl;
    touched++;
  }

  // Re-emit with filter 0 on every scanline; deflate does the rest.
  const out = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    out[y * (stride + 1)] = 0;
    px.copy(out, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const png = Buffer.concat([
    SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(out, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(outPath, png);
  return { width, height, touched, bytes: png.length };
}
