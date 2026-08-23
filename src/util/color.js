const NAMED = {
  black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', blue: '#0000ff',
  navy: '#000080', teal: '#008080', olive: '#808000', maroon: '#800000', purple: '#800080',
  gray: '#808080', grey: '#808080', silver: '#c0c0c0', orange: '#ffa500', gold: '#ffd700',
  yellow: '#ffff00', lime: '#00ff00', aqua: '#00ffff', cyan: '#00ffff', fuchsia: '#ff00ff',
  magenta: '#ff00ff', pink: '#ffc0cb', brown: '#a52a2a', beige: '#f5f5dc', ivory: '#fffff0',
  crimson: '#dc143c', indigo: '#4b0082', khaki: '#f0e68c', salmon: '#fa8072', tan: '#d2b48c',
  turquoise: '#40e0d0', violet: '#ee82ee', wheat: '#f5deb3', darkblue: '#00008b',
  darkgreen: '#006400', darkred: '#8b0000', lightblue: '#add8e6', lightgreen: '#90ee90',
  transparent: null,
};

/** Parse hex / rgb() / rgba() / hsl() / common named colours into {r,g,b,a} (0-255, alpha 0-1). */
export function parseColor(input) {
  if (!input) return null;
  let str = String(input).trim().toLowerCase();
  if (Object.hasOwn(NAMED, str)) {
    if (NAMED[str] === null) return null;
    str = NAMED[str];
  }

  let m = str.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    const hex = m[1];
    if (hex.length === 3 || hex.length === 4) {
      const [r, g, b, a] = hex.split('').map((ch) => parseInt(ch + ch, 16));
      return { r, g, b, a: hex.length === 4 ? a / 255 : 1 };
    }
    if (hex.length === 6 || hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
      };
    }
    return null;
  }

  m = str.match(/^rgba?\(\s*([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(/[,/\s]+/).filter(Boolean).map(Number);
    if (parts.length < 3 || parts.slice(0, 3).some(Number.isNaN)) return null;
    return { r: clamp255(parts[0]), g: clamp255(parts[1]), b: clamp255(parts[2]), a: parts[3] ?? 1 };
  }

  m = str.match(/^hsla?\(\s*([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(/[,/\s]+/).filter(Boolean);
    const h = parseFloat(parts[0]);
    const s = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;
    if ([h, s, l].some(Number.isNaN)) return null;
    const rgb = hslToRgb(h, s, l);
    return { ...rgb, a: parts[3] !== undefined ? parseFloat(parts[3]) : 1 };
  }

  return null;
}

const clamp255 = (n) => Math.max(0, Math.min(255, Math.round(n)));
const clamp01 = (n) => Math.max(0, Math.min(1, n));

export function toHex({ r, g, b }) {
  return '#' + [r, g, b].map((v) => clamp255(v).toString(16).padStart(2, '0')).join('');
}

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}

export function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = clamp01(s);
  l = clamp01(l);
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const seg = Math.floor(h / 60) % 6;
  const table = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][seg];
  return { r: clamp255((table[0] + m) * 255), g: clamp255((table[1] + m) * 255), b: clamp255((table[2] + m) * 255) };
}

/** WCAG 2.1 relative luminance. */
export function luminance(color) {
  const rgb = typeof color === 'string' ? parseColor(color) : color;
  if (!rgb) return 0;
  const channel = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/** WCAG contrast ratio between two colours, 1..21. */
export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export const meetsAA = (fg, bg, large = false) => contrast(fg, bg) >= (large ? 3 : 4.5);
export const meetsAAA = (fg, bg, large = false) => contrast(fg, bg) >= (large ? 4.5 : 7);

/** Pick whichever of the supplied candidates has the highest contrast on `bg`. */
export function bestForeground(bg, candidates = ['#ffffff', '#111111']) {
  let best = candidates[0];
  let bestRatio = 0;
  for (const cand of candidates) {
    const ratio = contrast(cand, bg);
    if (ratio > bestRatio) { bestRatio = ratio; best = cand; }
  }
  return best;
}

export function adjustLightness(color, delta) {
  const rgb = typeof color === 'string' ? parseColor(color) : color;
  if (!rgb) return null;
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return toHex(hslToRgb(h, s, clamp01(l + delta)));
}

export const lighten = (color, amount = 0.1) => adjustLightness(color, amount);
export const darken = (color, amount = 0.1) => adjustLightness(color, -amount);

export function setLightness(color, l) {
  const rgb = typeof color === 'string' ? parseColor(color) : color;
  if (!rgb) return null;
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return toHex(hslToRgb(hsl.h, hsl.s, clamp01(l)));
}

export function saturate(color, amount) {
  const rgb = typeof color === 'string' ? parseColor(color) : color;
  if (!rgb) return null;
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return toHex(hslToRgb(h, clamp01(s + amount), l));
}

export function mix(a, b, weight = 0.5) {
  const ca = typeof a === 'string' ? parseColor(a) : a;
  const cb = typeof b === 'string' ? parseColor(b) : b;
  if (!ca || !cb) return null;
  const w = clamp01(weight);
  return toHex({
    r: ca.r * (1 - w) + cb.r * w,
    g: ca.g * (1 - w) + cb.g * w,
    b: ca.b * (1 - w) + cb.b * w,
  });
}

/** Nudge `fg` lighter/darker until it clears `ratio` against `bg`, preserving hue. */
export function ensureContrast(fg, bg, ratio = 4.5) {
  const rgb = parseColor(fg);
  if (!rgb) return bestForeground(bg);
  if (contrast(fg, bg) >= ratio) return toHex(rgb);
  const { h, s } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const bgIsDark = luminance(bg) < 0.5;
  // Walk lightness toward whichever end of the scale increases separation.
  for (let step = 0; step <= 100; step++) {
    const l = bgIsDark ? Math.min(1, 0.5 + step / 100) : Math.max(0, 0.5 - step / 100);
    const candidate = toHex(hslToRgb(h, s, l));
    if (contrast(candidate, bg) >= ratio) return candidate;
  }
  return bestForeground(bg);
}

/** Build a 50..900 tonal ramp from a single brand colour. */
export function ramp(base) {
  const rgb = parseColor(base);
  if (!rgb) return null;
  const { h, s } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const stops = { 50: 0.97, 100: 0.94, 200: 0.86, 300: 0.76, 400: 0.64, 500: 0.52, 600: 0.44, 700: 0.36, 800: 0.27, 900: 0.18 };
  const out = {};
  for (const [stop, l] of Object.entries(stops)) {
    // Desaturate the extremes slightly so tints don't look neon.
    const sAdj = clamp01(s * (l > 0.9 || l < 0.22 ? 0.75 : 1));
    out[stop] = toHex(hslToRgb(h, sAdj, l));
  }
  return out;
}

/** How "brand-like" a colour is: saturated and mid-lightness scores high, greys score 0. */
export function vibrancy(color) {
  const rgb = typeof color === 'string' ? parseColor(color) : color;
  if (!rgb) return 0;
  const { s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  if (s < 0.12) return 0;
  const lightnessPenalty = 1 - Math.abs(l - 0.5) * 1.6;
  return Math.max(0, s * Math.max(0, lightnessPenalty));
}

export const isNeutral = (color) => vibrancy(color) < 0.08;
