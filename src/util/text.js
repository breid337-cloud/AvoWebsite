/** Collapse all runs of whitespace (including newlines/nbsp) into single spaces. */
export function squash(str = '') {
  return String(str).replace(/[ \s]+/g, ' ').trim();
}

export function slugify(str = '', fallback = 'item') {
  const slug = String(str)
    .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return slug || fallback;
}

export function truncate(str = '', max = 160, suffix = '…') {
  const s = squash(str);
  if (s.length <= max) return s;
  const cut = s.slice(0, max - suffix.length);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\-\s]+$/, '') + suffix;
}

/**
 * Acronyms that must survive title-casing. Small-business sites are full of
 * these, and "Ac Repair" or "Llc" instantly reads as machine-generated.
 */
export const ACRONYMS = new Set([
  // Deliberately excluded: US, IT, CO, IN, OR — they are ordinary English words
  // and would turn "contact us" into "contact US". Inc./Ltd./Co. are also left
  // out because their correct written form is title case, not all caps.
  'HVAC', 'AC', 'A/C', 'LLC', 'PLLC', 'LLP', 'USA', 'UK', 'NY', 'TX', 'FL',
  'BBB', 'ASE', 'EPA', 'OSHA', 'NATE', 'ADA', 'FAQ', 'DIY', 'VIP', 'CEO', 'CFO', 'COO', 'CPA', 'MBA',
  'DDS', 'DMD', 'DVM', 'MD', 'RN', 'LPN', 'PT', 'OT', 'LMT', 'PhD', 'ND', 'DC',
  'TV', 'PC', 'SEO', 'PPC', 'CRM', 'POS', 'GPS',
  'RV', 'ATV', 'UTV', 'SUV', 'CDL', 'DOT', 'MPG', 'MPH', 'PSI', 'BTU', 'SEER', 'HP',
  'PVC', 'HDPE', 'LED', 'UV', 'HEPA', 'GFCI', 'AFCI', 'MERV', 'CFM', 'IAQ', 'R22', 'R410A',
  '24/7', '3D', '2D', 'HD', '4K', 'QR', 'PDF', 'FAQS',
]);

const ACRONYM_LOOKUP = new Map([...ACRONYMS].map((a) => [a.toLowerCase(), a]));

function caseWord(word) {
  // Preserve punctuation around the token (e.g. "(hvac)," -> "(HVAC),").
  const m = /^([^a-z0-9]*)([a-z0-9/&.\u2019'-]*)([^a-z0-9]*)$/i.exec(word);
  if (!m) return word;
  const [, lead, core, tail] = m;
  if (!core) return word;
  const acronym = ACRONYM_LOOKUP.get(core.toLowerCase());
  if (acronym) return lead + acronym + tail;
  // Hyphenated compounds get each part capitalised: "air-conditioning".
  const cased = core
    .split('-')
    .map((part) => {
      const known = ACRONYM_LOOKUP.get(part.toLowerCase());
      if (known) return known;
      return capitalizeName(part);
    })
    .join('-');
  return lead + cased + tail;
}

/** Capitalise a word, respecting O'Brien / McDonald / MacLeod name forms. */
function capitalizeName(part) {
  if (!part) return part;
  const base = part.charAt(0).toUpperCase() + part.slice(1);
  const irish = /^([OD])(['\u2019])([a-z])(.*)$/.exec(base);
  if (irish) return irish[1] + irish[2] + irish[3].toUpperCase() + irish[4];
  const mac = /^(Ma?c)([a-z])(.{2,})$/.exec(base);
  if (mac) return mac[1] + mac[2].toUpperCase() + mac[3];
  return base;
}

/** Restore a known acronym inside a token that carries punctuation. */
function restoreAcronym(word) {
  const m = /^([^a-z0-9]*)([a-z0-9/&]+)(.*)$/i.exec(word);
  if (!m) return word;
  const known = ACRONYM_LOOKUP.get(m[2].toLowerCase());
  return known ? m[1] + known + m[3] : word;
}

export function titleCase(str = '') {
  const small = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'the', 'to', 'up', 'via', 'with']);
  return squash(str)
    .toLowerCase()
    .split(' ')
    .map((word, i, arr) => {
      if (i > 0 && i < arr.length - 1 && small.has(word)) return word;
      return caseWord(word);
    })
    .join(' ');
}

/** Fix ALL-CAPS or all-lowercase headings scraped from dated sites. */
export function humanizeHeading(str = '') {
  const s = squash(str);
  if (!s) return '';
  const letters = s.replace(/[^a-zA-Z]/g, '');
  if (!letters) return s;
  const upperRatio = (s.match(/[A-Z]/g) || []).length / letters.length;
  if (upperRatio > 0.8 && letters.length > 3) return titleCase(s);
  if (upperRatio === 0) {
    const restored = s.split(' ').map(restoreAcronym).join(' ');
    return restored.charAt(0).toUpperCase() + restored.slice(1);
  }
  return s;
}

export function splitSentences(str = '') {
  return squash(str)
    .split(/(?<=[.!?])\s+(?=[A-Z"'“])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function wordCount(str = '') {
  const s = squash(str);
  return s ? s.split(' ').length : 0;
}

/** Escape for use in HTML text nodes and double-quoted attributes. */
export function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Decode the HTML entities that actually show up in scraped copy. */
export function decodeEntities(str = '') {
  const named = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—',
    lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', hellip: '…',
    trade: '™', reg: '®', copy: '©', deg: '°', eacute: 'é', middot: '·', bull: '•', euro: '€', pound: '£', cent: '¢',
  };
  return String(str)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+[0-9]*);/gi, (m, name) => named[name.toLowerCase()] ?? m);
}

function safeCodePoint(code) {
  try {
    return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  } catch {
    return '';
  }
}

/** Turn plain text with blank lines into paragraph markup. */
export function paragraphs(str = '') {
  return String(str)
    .split(/\n{2,}/)
    .map((p) => squash(p))
    .filter(Boolean);
}

export function uniqueBy(items, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = keyFn(item);
    if (key == null || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function pluralize(n, singular, plural = `${singular}s`) {
  return `${n} ${n === 1 ? singular : plural}`;
}
