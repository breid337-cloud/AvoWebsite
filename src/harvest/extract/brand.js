import { qsa, attr, rawText } from '../../util/html.js';
import { parseColor, toHex, vibrancy, isNeutral } from '../../util/color.js';
import { squash, uniqueBy } from '../../util/text.js';
import { absolutize } from '../../util/url.js';

const COLOR_RE = /#[0-9a-f]{3,8}\b|rgba?\([^)]{5,40}\)|hsla?\([^)]{5,40}\)/gi;

// Declarations that reveal brand intent, weighted by how much they signal it.
const PROPERTY_WEIGHTS = [
  { re: /(^|[^-])background(-color)?\s*:/i, weight: 3 },
  { re: /border(-\w+)?-color\s*:/i, weight: 1 },
  { re: /(^|[^-])color\s*:/i, weight: 2 },
  { re: /fill\s*:/i, weight: 1 },
];

const BRAND_SELECTOR = /\.(btn|button|cta|primary|brand|accent|header|navbar|nav|hero|banner|footer|highlight)\b|#(header|nav|hero|banner|footer)\b/i;

/** Stylesheet URLs referenced by the document, absolutized. */
export function stylesheetUrls(doc, baseUrl) {
  return uniqueBy(
    qsa(doc, 'link[rel=stylesheet], link[rel*=stylesheet]')
      .map((l) => absolutize(attr(l, 'href'), baseUrl))
      .filter(Boolean),
    (u) => u,
  );
}

/** Inline <style> bodies plus every style="" attribute, concatenated. */
export function inlineCss(doc) {
  const blocks = qsa(doc, 'style').map((s) => rawText(s));
  const attrs = qsa(doc, '[style]').map((el) => `${(attr(el, 'class') || '')} { ${attr(el, 'style')} }`);
  return [...blocks, ...attrs].join('\n');
}

/**
 * Score every colour mentioned in the CSS and return the most brand-like ones.
 * Frequency alone picks greys, so we weight by property, selector and vibrancy.
 */
export function extractColors(cssText, { themeColor = '' } = {}) {
  const scores = new Map();

  const bump = (raw, weight) => {
    const parsed = parseColor(raw);
    if (!parsed || parsed.a === 0) return;
    const hex = toHex(parsed);
    if (hex === '#000000' || hex === '#ffffff') return;
    const entry = scores.get(hex) ?? { hex, score: 0, count: 0 };
    entry.score += weight;
    entry.count++;
    scores.set(hex, entry);
  };

  // Walk declaration-ish chunks so we can see the property and selector context.
  for (const rule of String(cssText).split(/[{}]/)) {
    const isBrandSelector = BRAND_SELECTOR.test(rule);
    for (const declaration of rule.split(';')) {
      const colors = declaration.match(COLOR_RE);
      if (!colors) continue;
      let weight = 1;
      for (const { re, weight: w } of PROPERTY_WEIGHTS) if (re.test(declaration)) weight = Math.max(weight, w);
      if (isBrandSelector) weight *= 2.5;
      for (const color of colors) bump(color, weight);
    }
  }

  if (themeColor) bump(themeColor, 20);

  const ranked = [...scores.values()]
    .map((entry) => ({ ...entry, vibrancy: vibrancy(entry.hex) }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.score * (0.35 + b.vibrancy) - a.score * (0.35 + a.vibrancy));

  const vivid = ranked.filter((c) => !isNeutral(c.hex));
  const primary = vivid[0]?.hex ?? '';
  // Secondary should be visibly different from primary, not a near-duplicate.
  const secondary = vivid.slice(1).find((c) => hueDistance(c.hex, primary) > 25)?.hex ?? vivid[1]?.hex ?? '';
  const accent = vivid.slice(1).find((c) => c.hex !== secondary && hueDistance(c.hex, primary) > 60)?.hex ?? '';

  return {
    primary,
    secondary,
    accent,
    palette: ranked.slice(0, 12).map((c) => ({ hex: c.hex, score: Math.round(c.score), uses: c.count })),
  };
}

function hueDistance(a, b) {
  const ca = parseColor(a);
  const cb = parseColor(b);
  if (!ca || !cb) return 999;
  const hue = (c) => {
    const max = Math.max(c.r, c.g, c.b);
    const min = Math.min(c.r, c.g, c.b);
    if (max === min) return 0;
    const d = max - min;
    let h;
    if (max === c.r) h = ((c.g - c.b) / d + (c.g < c.b ? 6 : 0));
    else if (max === c.g) h = (c.b - c.r) / d + 2;
    else h = (c.r - c.g) / d + 4;
    return h * 60;
  };
  const diff = Math.abs(hue(ca) - hue(cb));
  return Math.min(diff, 360 - diff);
}

const GENERIC_FAMILY = /^(inherit|initial|unset|revert|sans-serif|serif|monospace|cursive|fantasy|system-ui|ui-sans-serif|ui-serif|ui-monospace|-apple-system|blinkmacsystemfont|segoe ui|roboto|helvetica neue|helvetica|arial|apple color emoji|segoe ui emoji|noto sans|noto color emoji|liberation sans|sans|emoji)$/i;

/** Named font families in use, plus anything loaded from Google Fonts. */
export function extractFonts(cssText, doc, baseUrl) {
  const families = new Map();

  for (const m of String(cssText).matchAll(/font(?:-family)?\s*:\s*([^;}"]+)/gi)) {
    const stack = m[1].split(',').map((f) => squash(f).replace(/^["']|["']$/g, ''));
    for (const family of stack) {
      if (!family || GENERIC_FAMILY.test(family) || family.startsWith('var(') || /\d/.test(family[0] ?? '')) continue;
      families.set(family, (families.get(family) ?? 0) + 1);
    }
  }

  const googleFonts = [];
  for (const link of qsa(doc, 'link[href*="fonts.googleapis.com"]')) {
    const href = absolutize(attr(link, 'href'), baseUrl) ?? '';
    for (const m of href.matchAll(/family=([^&:]+)/g)) {
      const name = decodeURIComponent(m[1]).replace(/\+/g, ' ').split(':')[0];
      if (name) { googleFonts.push(name); families.set(name, (families.get(name) ?? 0) + 5); }
    }
  }

  const ranked = [...families.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  return { heading: ranked[0] ?? '', body: ranked[1] ?? ranked[0] ?? '', all: ranked.slice(0, 8), googleFonts: uniqueBy(googleFonts, (f) => f) };
}
