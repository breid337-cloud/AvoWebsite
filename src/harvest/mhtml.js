import { Buffer } from 'node:buffer';

/**
 * Minimal MHTML (multipart/related) reader.
 *
 * Browsers' "Save as single file" produces one of these: the HTML plus every
 * stylesheet and image the page used. It is the most reliable way to harvest a
 * site that blocks crawlers, sits behind auth, or renders its content with
 * JavaScript — the client just saves the page and sends it over.
 */
export function parseMhtml(buffer) {
  const raw = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const headerEnd = findHeaderEnd(raw, 0);
  const rootHeaders = parseHeaders(raw.subarray(0, headerEnd).toString('utf8'));

  const boundary = /boundary="?([^";\r\n]+)"?/i.exec(rootHeaders['content-type'] ?? '')?.[1];
  if (!boundary) throw new Error('Not an MHTML archive: no multipart boundary found.');

  const marker = Buffer.from(`--${boundary}`);
  const parts = [];
  let index = raw.indexOf(marker);
  if (index === -1) throw new Error('Not an MHTML archive: boundary never appears in the body.');

  while (index !== -1) {
    const bodyStart = index + marker.length;
    // "--" immediately after the boundary marks the final part.
    if (raw.subarray(bodyStart, bodyStart + 2).toString('ascii') === '--') break;
    const next = raw.indexOf(marker, bodyStart);
    const chunkEnd = next === -1 ? raw.length : next;
    const chunk = raw.subarray(bodyStart, chunkEnd);

    const hEnd = findHeaderEnd(chunk, 0);
    if (hEnd > 0) {
      const headers = parseHeaders(chunk.subarray(0, hEnd).toString('utf8'));
      const body = chunk.subarray(hEnd);
      parts.push({
        contentType: (headers['content-type'] ?? '').split(';')[0].trim().toLowerCase(),
        location: headers['content-location'] ?? '',
        contentId: (headers['content-id'] ?? '').replace(/^<|>$/g, ''),
        encoding: (headers['content-transfer-encoding'] ?? 'binary').trim().toLowerCase(),
        data: decodeBody(body, headers['content-transfer-encoding']),
      });
    }
    index = next;
  }

  const html = parts.find((p) => p.contentType === 'text/html');
  return {
    url: rootHeaders['snapshot-content-location'] || html?.location || '',
    subject: rootHeaders.subject ?? '',
    savedAt: rootHeaders.date ?? '',
    html: html ? html.data.toString('utf8') : '',
    parts,
    stylesheets: parts.filter((p) => p.contentType === 'text/css').map((p) => p.data.toString('utf8')),
    images: parts.filter((p) => p.contentType.startsWith('image/')),
  };
}

/** Header block ends at the first blank line (CRLF CRLF or LF LF). */
function findHeaderEnd(buf, from) {
  const crlf = buf.indexOf('\r\n\r\n', from);
  const lf = buf.indexOf('\n\n', from);
  if (crlf !== -1 && (lf === -1 || crlf < lf)) return crlf + 4;
  if (lf !== -1) return lf + 2;
  return 0;
}

function parseHeaders(text) {
  const headers = {};
  // Unfold continuation lines before splitting.
  for (const line of text.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    headers[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
  }
  return headers;
}

function decodeBody(body, encoding) {
  const enc = (encoding ?? 'binary').trim().toLowerCase();
  if (enc === 'base64') {
    return Buffer.from(body.toString('ascii').replace(/\s+/g, ''), 'base64');
  }
  if (enc === 'quoted-printable') {
    return decodeQuotedPrintable(body.toString('binary'));
  }
  // 8bit / 7bit / binary: strip the single leading newline the boundary leaves.
  return body.subarray(body[0] === 0x0d && body[1] === 0x0a ? 2 : body[0] === 0x0a ? 1 : 0);
}

function decodeQuotedPrintable(text) {
  const out = [];
  const src = text.replace(/=\r?\n/g, '');
  for (let i = 0; i < src.length; i++) {
    if (src[i] === '=' && /^[0-9a-f]{2}$/i.test(src.slice(i + 1, i + 3))) {
      out.push(parseInt(src.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      out.push(src.charCodeAt(i) & 0xff);
    }
  }
  return Buffer.from(out);
}

const EXT_BY_TYPE = {
  'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/gif': '.gif',
  'image/webp': '.webp', 'image/avif': '.avif', 'image/svg+xml': '.svg', 'image/x-icon': '.ico',
};

export const extensionFor = (contentType) => EXT_BY_TYPE[contentType] ?? '';
