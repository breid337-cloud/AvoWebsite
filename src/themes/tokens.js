import { ensureContrast, contrast, mix, ramp, parseColor, toHex, bestForeground } from '../util/color.js';

/**
 * Compile a theme (plus any brand overrides harvested from the old site) into
 * CSS custom properties.
 *
 * Every colour pair that carries text is run through a contrast check, so a
 * client's brand colour can never produce unreadable output — it gets nudged
 * in lightness until it passes WCAG AA, keeping its hue.
 */
export function compileTokens(theme, { brand = {}, mode = 'light' } = {}) {
  const palette = { ...theme.palettes[mode] };
  const warnings = [];

  // ── Brand overrides ────────────────────────────────────────────────
  const brandPrimary = brand?.colors?.primary;
  if (brandPrimary && parseColor(brandPrimary) && theme.acceptsBrandColor !== false) {
    const original = toHex(parseColor(brandPrimary));
    palette.primary = ensureContrast(original, palette.bg, 4.5);
    if (palette.primary.toLowerCase() !== original.toLowerCase()) {
      warnings.push(`Brand colour ${original} was adjusted to ${palette.primary} to reach 4.5:1 on the ${mode} background.`);
    }
    palette.primaryHover = shiftForHover(palette.primary, mode);
    palette.onPrimary = bestForeground(palette.primary, ['#ffffff', '#0b0b0c']);
    const tones = ramp(palette.primary);
    palette.primarySoft = mode === 'light' ? tones[50] : mix(palette.primary, palette.bg, 0.82);
    palette.primaryBorder = mode === 'light' ? tones[200] : mix(palette.primary, palette.bg, 0.6);
  }

  const brandAccent = brand?.colors?.secondary || brand?.colors?.accent;
  if (brandAccent && parseColor(brandAccent) && theme.acceptsBrandColor !== false) {
    const adjusted = ensureContrast(brandAccent, palette.bg, 3);
    // Only take the brand accent if it is actually distinct from the primary.
    if (contrast(adjusted, palette.primary) > 1.25) {
      palette.accent = adjusted;
      palette.onAccent = bestForeground(adjusted, ['#ffffff', '#0b0b0c']);
    }
  }

  // ── Guarantee readable text everywhere ─────────────────────────────
  palette.text = ensureContrast(palette.text, palette.bg, 7);
  palette.textMuted = ensureContrast(palette.textMuted, palette.bg, 4.5);
  palette.onPrimary = palette.onPrimary ?? bestForeground(palette.primary, ['#ffffff', '#0b0b0c']);
  palette.onAccent = palette.onAccent ?? bestForeground(palette.accent, ['#ffffff', '#0b0b0c']);
  palette.textOnSurface = ensureContrast(palette.text, palette.surface, 7);
  palette.link = ensureContrast(palette.primary, palette.bg, 4.5);
  palette.focus = palette.focus ?? palette.accent;

  const fonts = theme.fonts;
  const scale = buildTypeScale(theme.scale ?? {});

  const vars = {
    /* colour */
    '--bg': palette.bg,
    '--surface': palette.surface,
    '--surface-2': palette.surface2 ?? mix(palette.surface, palette.text, 0.04),
    '--text': palette.text,
    '--text-muted': palette.textMuted,
    '--text-on-surface': palette.textOnSurface,
    '--border': palette.border,
    '--border-strong': mix(palette.border, palette.text, 0.35),
    '--primary': palette.primary,
    '--primary-hover': palette.primaryHover ?? shiftForHover(palette.primary, mode),
    '--primary-soft': palette.primarySoft ?? mix(palette.primary, palette.bg, 0.88),
    '--primary-border': palette.primaryBorder ?? mix(palette.primary, palette.bg, 0.7),
    '--on-primary': palette.onPrimary,
    '--accent': palette.accent,
    '--on-accent': palette.onAccent,
    '--link': palette.link,
    '--focus': palette.focus,
    '--inverse-bg': palette.inverseBg ?? (mode === 'light' ? '#111318' : '#f6f7f9'),
    '--inverse-text': palette.inverseText ?? (mode === 'light' ? '#f6f7f9' : '#111318'),
    '--success': palette.success ?? '#15803d',
    '--danger': palette.danger ?? '#b91c1c',
    '--overlay': palette.overlay ?? 'rgba(8, 10, 14, 0.62)',

    /* type */
    '--font-heading': fonts.heading.stack,
    '--font-body': fonts.body.stack,
    '--fw-heading': String(fonts.heading.weight ?? 700),
    '--fw-heading-strong': String(fonts.heading.strongWeight ?? fonts.heading.weight ?? 800),
    '--fw-body': String(fonts.body.weight ?? 400),
    '--fw-bold': String(fonts.body.boldWeight ?? 600),
    '--tracking-heading': fonts.heading.tracking ?? '-0.02em',
    '--tracking-eyebrow': fonts.heading.eyebrowTracking ?? '0.08em',
    '--leading-heading': String(fonts.heading.leading ?? 1.12),
    '--leading-body': String(fonts.body.leading ?? 1.65),
    '--heading-transform': fonts.heading.transform ?? 'none',
    ...scale,

    /* shape + depth */
    '--radius-sm': theme.radius.sm,
    '--radius': theme.radius.md,
    '--radius-lg': theme.radius.lg,
    '--radius-pill': theme.radius.pill ?? '999px',
    '--shadow-sm': theme.shadow.sm,
    '--shadow': theme.shadow.md,
    '--shadow-lg': theme.shadow.lg,
    '--border-width': theme.borderWidth ?? '1px',

    /* layout */
    '--container': theme.layout?.container ?? '1180px',
    '--container-narrow': theme.layout?.containerNarrow ?? '760px',
    '--gutter': theme.layout?.gutter ?? 'clamp(1.25rem, 4vw, 2.5rem)',
    '--section-y': theme.layout?.sectionY ?? 'clamp(3.5rem, 9vw, 7rem)',
    '--header-h': theme.layout?.headerHeight ?? '72px',
  };

  for (let i = 1; i <= 12; i++) vars[`--space-${i}`] = `${(i <= 6 ? i * 0.25 : 1.5 + (i - 6) * 0.5).toFixed(3).replace(/\.?0+$/, '')}rem`;

  return { vars, palette, warnings };
}

/** Hover states darken on light backgrounds and lighten on dark ones. */
function shiftForHover(color, mode) {
  const target = mode === 'light' ? '#000000' : '#ffffff';
  return mix(color, target, 0.16);
}

/** Fluid modular type scale via clamp(), from --step--2 to --step-6. */
function buildTypeScale({ base = 1, ratio = 1.25, fluidRatio = 1.333, minWidth = 22, maxWidth = 82 } = {}) {
  const steps = {};
  for (let step = -2; step <= 6; step++) {
    const min = base * ratio ** step;
    const max = base * fluidRatio ** step;
    const key = step < 0 ? `--step--${Math.abs(step)}` : `--step-${step}`;
    // Small text must not shrink as the viewport grows, so sub-body steps are
    // fixed rather than fluid.
    if (step <= 0 || Math.abs(max - min) < 0.005) {
      steps[key] = `${round(min)}rem`;
      continue;
    }
    // Linear interpolation between the two viewport anchors.
    const slope = (max - min) / (maxWidth - minWidth);
    const intercept = min - slope * minWidth;
    steps[key] = `clamp(${round(Math.min(min, max))}rem, ${round(intercept)}rem + ${round(slope * 100)}vw, ${round(Math.max(min, max))}rem)`;
  }
  return steps;
}

const round = (n) => Number(n.toFixed(4));

/** Serialise compiled tokens into a :root block (and a .dark override). */
export function tokensToCss(vars, selector = ':root') {
  const body = Object.entries(vars)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');
  return `${selector} {\n${body}\n}`;
}

/** Google Fonts stylesheet URL for whatever the theme actually uses. */
export function googleFontsHref(theme) {
  // Merge weights per family: requesting the same family twice is invalid.
  const byFamily = new Map();
  for (const font of [theme.fonts.heading, theme.fonts.body]) {
    if (!font.google) continue;
    const weights = byFamily.get(font.google) ?? new Set();
    for (const w of font.googleWeights ?? [400, 700]) weights.add(w);
    byFamily.set(font.google, weights);
  }
  if (!byFamily.size) return '';
  const families = [...byFamily.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([family, weights]) => `${family.replace(/ /g, '+')}:wght@${[...weights].sort((a, b) => a - b).join(';')}`);
  return `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join('&')}&display=swap`;
}
