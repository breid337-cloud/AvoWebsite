import { qs, qsa, attr, cleanText } from '../../util/html.js';
import { squash, uniqueBy } from '../../util/text.js';
import { DAYS } from '../../profile/schema.js';
import { to12h } from './jsonld.js';

// Covers North American 3-3-4 and UK groupings (01242 500690, 020 7946 0000,
// +44 1242 500690). Validation happens in looksLikePhone.
const PHONE_RE = /(?:\+\d{1,3}[\s.-]?)?\(?\d{2,5}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/g;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,63}/gi;

// Addresses and emails that belong to the site's toolchain, not the business.
const EMAIL_NOISE = /@(example|sentry|wixpress|sentry\.io|googlemail\.test|domain|email|yourdomain|test)\.|@2x|\.png$|\.jpg$|\.gif$|\.webp$|@sentry|@wix|@squarespace|@shopify|@godaddy/i;

const STREET_SUFFIX = 'street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|circle|cir|highway|hwy|parkway|pkwy|place|pl|way|terrace|ter|trail|trl|route|rte|rt|square|sq|loop|run|pike|expressway|expy';
const UNIT_PREFIX = 'suite|ste|unit|apt|apartment|bldg|building|floor|fl|room|rm|#';

/**
 * Anchored on the trailing "ST 12345", walking backwards through an optional
 * unit segment to the street line. Handles the comma layouts real sites use.
 */
const DIRECTIONAL = 'north|south|east|west|northeast|northwest|southeast|southwest|n|s|e|w|ne|nw|se|sw';

const US_ADDRESS_RE = new RegExp(
  '(\\d{1,6}[\\w.\'-]*(?:\\s+[\\w.\'&-]+){0,6}?\\s+(?:' + STREET_SUFFIX + ')\\.?(?:\\s+(?:' + DIRECTIONAL + ')\\.?)?)' +
    '(?:\\s*,?\\s*((?:' + UNIT_PREFIX + ')\\.?\\s*[\\w-]+))?' +
    '\\s*,\\s*([A-Za-z][A-Za-z .\'-]{1,30}?)' +
    '\\s*,?\\s+([A-Z]{2})\\.?\\s+(\\d{5}(?:-\\d{4})?)\\b',
  'i',
);

/** True when a digit run is plausibly a phone number rather than a date/ID/price. */
function looksLikePhone(raw, context = '') {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return false;
  if (/^0+$/.test(digits)) return false;
  if (/^(19|20)\d{2}[-/]/.test(trimmed)) return false;

  // UK numbers are 10-11 digits starting 0 nationally, or +44 internationally.
  // The NANP area-code rules below would reject every one of them.
  const isUk = /^\+?44/.test(digits) || (digits.startsWith('0') && digits.length >= 10 && digits.length <= 11);
  if (isUk) {
    if (!/^\+?4?4?0?[1237]/.test(digits.replace(/^\+?44/, '0'))) return false;
    return true;
  }
  if (/\b(?:invoice|order|sku|isbn|ein|tax\s*id|account|license|lic)\s*#?\s*:?\s*$/i.test(context.slice(0, context.length - raw.length))) return false;
  if (/^\d{10,}$/.test(raw.trim()) && !/[()\s.-]/.test(raw)) return false; // bare digit blob
  const area = digits.length === 11 && digits.startsWith('1') ? digits.slice(1, 4) : digits.slice(0, 3);
  if (area.startsWith('0') || area.startsWith('1')) return false;
  return true;
}

export function extractPhones(doc) {
  const found = [];

  // tel: links are unambiguous, so they rank first.
  for (const a of qsa(doc, 'a[href^=tel]')) {
    const href = (attr(a, 'href') || '').replace(/^tel:/i, '').trim();
    const label = cleanText(a);
    const value = href || label;
    if (value && looksLikePhone(value)) found.push({ value: squash(label || value), confidence: 'high', source: 'tel: link' });
  }

  const bodyText = cleanText(qs(doc, 'body') ?? doc);
  for (const match of bodyText.matchAll(PHONE_RE)) {
    const start = Math.max(0, match.index - 40);
    const before = bodyText.slice(start, match.index);
    const context = before + match[0];
    if (!looksLikePhone(match[0], context)) continue;
    const isFax = /\bfax\b[\s:.#-]*$/i.test(before);
    found.push({ value: squash(match[0]), confidence: 'medium', source: 'page text', kind: isFax ? 'fax' : 'phone' });
  }

  const ranked = { high: 0, medium: 1, low: 2 };
  const deduped = uniqueBy(
    found.sort((a, b) => ranked[a.confidence] - ranked[b.confidence]),
    (p) => p.value.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, ''),
  );
  return deduped.filter((p) => p.kind !== 'fax');
}

export function extractEmails(doc) {
  const found = [];
  for (const a of qsa(doc, 'a[href^=mailto]')) {
    const value = (attr(a, 'href') || '').replace(/^mailto:/i, '').split('?')[0].trim().toLowerCase();
    if (value.includes('@') && !EMAIL_NOISE.test(value)) found.push({ value, confidence: 'high', source: 'mailto: link' });
  }
  const bodyText = cleanText(qs(doc, 'body') ?? doc);
  for (const match of bodyText.matchAll(EMAIL_RE)) {
    const value = match[0].toLowerCase();
    if (EMAIL_NOISE.test(value)) continue;
    found.push({ value, confidence: 'medium', source: 'page text' });
  }
  return uniqueBy(found, (e) => e.value);
}

export function extractAddress(doc) {
  // Microdata first — it is explicit.
  const streetEl = qs(doc, '[itemprop=streetAddress]');
  if (streetEl) {
    const pick = (prop) => squash(cleanText(qs(doc, `[itemprop=${prop}]`)));
    const address = {
      street: squash(cleanText(streetEl)),
      city: pick('addressLocality'),
      region: pick('addressRegion'),
      postalCode: pick('postalCode'),
      country: pick('addressCountry'),
    };
    if (address.street) return { address, confidence: 'high', source: 'microdata' };
  }

  const candidates = [];
  for (const el of qsa(doc, 'address, .address, #address, .contact-info, .vcard, footer')) {
    const text = cleanText(el);
    if (text && text.length < 400) candidates.push(text);
  }
  candidates.push(cleanText(qs(doc, 'body') ?? doc));

  for (const text of candidates) {
    const m = US_ADDRESS_RE.exec(text);
    if (!m) continue;
    return {
      address: {
        street: squash(m[1]),
        street2: squash(m[2] ?? ''),
        city: squash(m[3]),
        region: m[4].toUpperCase(),
        postalCode: m[5],
        country: 'US',
      },
      confidence: candidates.indexOf(text) < candidates.length - 1 ? 'medium' : 'low',
      source: 'text pattern',
      raw: squash(m[0]),
    };
  }
  return null;
}

/* ── Opening hours ───────────────────────────────────────────────────── */

const DAY_TOKEN = '(mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)';
const TIME_TOKEN = '(\\d{1,2}(?::\\d{2})?\\s*(?:am|pm|a\\.m\\.|p\\.m\\.)?|noon|midnight)';
const HOURS_LINE_RE = new RegExp(
  `${DAY_TOKEN}\\.?\\s*(?:(?:-|–|—|to|thru|through)\\s*${DAY_TOKEN}\\.?)?\\s*[:–—-]?\\s*(?:(closed|by appointment[^,;\\n]*)|${TIME_TOKEN}\\s*(?:-|–|—|to)\\s*${TIME_TOKEN})`,
  'gi',
);

const dayIndex = (token) => {
  const t = token.toLowerCase().slice(0, 3);
  return DAYS.findIndex((d) => d.startsWith(t));
};

function normalizeTime(token) {
  const t = String(token).trim().toLowerCase();
  if (t === 'noon') return '12:00 PM';
  if (t === 'midnight') return '12:00 AM';
  const m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/.exec(t);
  if (!m) return squash(token);
  let hour = Number(m[1]);
  const minute = m[2] ?? '00';
  let period = (m[3] ?? '').replace(/\./g, '').toUpperCase();
  if (!period) {
    // 24-hour input, or an unqualified number we have to guess at.
    if (hour >= 13) return to12h(`${hour}:${minute}`);
    period = hour >= 7 && hour <= 11 ? 'AM' : 'PM';
  }
  if (hour === 0) { hour = 12; period = 'AM'; }
  if (hour > 12) return to12h(`${hour}:${minute}`);
  return `${hour}:${minute} ${period}`;
}

/** Parse opening hours out of free text such as "Mon–Fri: 8am – 5pm | Sat 9-1 | Sun Closed". */
export function extractHours(doc) {
  const zones = [];
  for (const el of qsa(doc, '.hours, #hours, .opening-hours, .business-hours, .hours-of-operation, footer, aside, .contact-info')) {
    zones.push(cleanText(el));
  }
  zones.push(cleanText(qs(doc, 'body') ?? doc));

  for (const text of zones) {
    if (!text || !/\b(mon|tue|wed|thu|fri|sat|sun)/i.test(text)) continue;
    const entries = new Map();
    for (const m of text.matchAll(HOURS_LINE_RE)) {
      const [, startDay, endDay, closedWord, open, close] = m;
      const si = dayIndex(startDay);
      if (si === -1) continue;
      const ei = endDay ? dayIndex(endDay) : si;
      const days = [];
      if (ei === -1 || ei === si) days.push(DAYS[si]);
      else for (let i = si; ; i = (i + 1) % 7) { days.push(DAYS[i]); if (i === ei || days.length > 7) break; }

      for (const day of days) {
        if (entries.has(day)) continue;
        if (closedWord) entries.set(day, { day, closed: true, open: '', close: '', note: /appointment/i.test(closedWord) ? squash(closedWord) : '' });
        else entries.set(day, { day, closed: false, open: normalizeTime(open), close: normalizeTime(close) });
      }
    }
    if (entries.size >= 2) {
      return {
        hours: DAYS.filter((d) => entries.has(d)).map((d) => entries.get(d)),
        confidence: zones.indexOf(text) < zones.length - 1 ? 'medium' : 'low',
        source: 'page text',
      };
    }
  }
  return null;
}

/** Everything contact-related from one document. */
export function extractContact(doc) {
  return {
    phones: extractPhones(doc),
    emails: extractEmails(doc),
    address: extractAddress(doc),
    hours: extractHours(doc),
  };
}
