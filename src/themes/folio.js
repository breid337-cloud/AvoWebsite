/**
 * Folio — the web translation of the AvoSolution Document Design System v1.0.
 *
 * The source system is a *document* spec: 1456×819 slides rendered to PDF by
 * headless Chromium. What carries over is its palette, its card language and
 * its restraint. What does not is the fixed slide geometry — every measurement
 * here is fluid, because a web page is not a slide.
 *
 * Two decisions worth knowing about:
 *
 *  - No webfont. The source system specifies Liberation Sans, a metric match
 *    for Arial, chosen so headless Chromium renders decks without licensed
 *    fonts. Keeping it means a site in this theme matches the decks exactly,
 *    makes zero third-party requests, and has no Google Fonts privacy problem.
 *    See docs/themes/folio.md for how to swap in a webfont if you want one.
 *  - `primary` is the palette's `--blue-deep`, not `--blue`. The brighter blue
 *    is only 3.0:1 on white, so it cannot carry link or button text at AA. The
 *    bright blue stays on as `accent`, where it is never a text colour.
 */
export default {
  id: 'folio',
  name: 'Folio',
  tagline: 'Document-grade and quietly technical',
  description:
    'A navy-and-blue system carried over from a print document spec: white cards on a cool grey ground, a diagonal navy gradient for the opening, and no webfont at all. Reads as considered rather than loud.',
  bestFor: ['Software development', 'Consultancies', 'Technical studios', 'B2B SaaS', 'Professional services', 'Agencies'],
  fonts: {
    // No `google` key on either face: the build then emits no font link at all.
    heading: {
      stack: "'Liberation Sans', Helvetica, Arial, sans-serif",
      weight: 700, strongWeight: 700, leading: 1.16, tracking: '-0.009em',
    },
    body: {
      stack: "'Liberation Sans', Helvetica, Arial, sans-serif",
      weight: 400, boldWeight: 700, leading: 1.55,
    },
  },
  scale: { base: 1, ratio: 1.2, fluidRatio: 1.32 },
  radius: { sm: '8px', md: '12px', lg: '16px', pill: '999px' },
  // Deliberately shallow, matching the source system's `0 1px 2px rgba(21,26,46,.04)`
  // on cards. Depth here comes from the border, not the shadow.
  shadow: {
    sm: '0 1px 2px rgba(21, 26, 46, 0.05)',
    md: '0 6px 20px -8px rgba(21, 26, 46, 0.14), 0 1px 3px rgba(21, 26, 46, 0.05)',
    lg: '0 26px 60px -20px rgba(21, 26, 46, 0.28)',
  },
  layout: { container: '1200px', headerHeight: '78px' },
  sections: { header: 'standard', hero: 'gradient', services: 'cards', testimonials: 'quote', gallery: 'grid', cta: 'band', about: 'split', caseStudies: 'split' },
  palettes: {
    light: {
      // --bg from the source system becomes `surface`: on paper it is the slide
      // ground, on the web it is the band behind white cards.
      bg: '#ffffff', surface: '#f5f7fa', surface2: '#e9eef6',
      text: '#151a2e', textMuted: '#4a5568', border: '#e6ebf2',
      primary: '#2b6cb9', accent: '#3b82f6', focus: '#2b6cb9',
      inverseBg: '#1b2145', inverseText: '#eef2f8',
      // #16a34a is 3.07:1 on the surface — it fails AA wherever it is used as
      // text, which it is, in the form success message. #15803d clears it.
      success: '#15803d', danger: '#e5484d',
    },
    dark: {
      // The source system's dark slides sit on --navy, so navy becomes the
      // raised surface here and the page ground goes a step deeper.
      bg: '#0e1230', surface: '#1b2145', surface2: '#252b57',
      text: '#eef2f8', textMuted: '#a8b4cc', border: '#2c3463',
      primary: '#7fa9f5', accent: '#5b9bff', focus: '#7fa9f5',
      inverseBg: '#eef2f8', inverseText: '#151a2e',
      success: '#4ade80', danger: '#ff8085',
    },
  },
  extras: {
    css: `
/* The cover-slide gradient, verbatim from the source system. Unlike the theme
   surfaces this is a fixed dark ground in *both* colour schemes, so its text
   cannot come from the theme tokens — it is set light here instead.
   Pure white is 4.86:1 on the gradient's lightest stop (#2F72C4), which is AA
   at any size. The next tone down (#E6F0FF) is only 4.22:1, so tone is not
   available to separate the eyebrow from the heading; weight, size and
   tracking do that instead. */
.hero--gradient { background: linear-gradient(128deg, #2F72C4 0%, #28558F 42%, #1E2B54 100%); }
.hero--gradient { color: #fff; --text: #fff; --text-muted: #fff; --focus: #fff; }
.hero--gradient .eyebrow, .hero--gradient .hero__subtitle { color: #fff; }
.hero--gradient .btn--ghost { color: #fff; border-color: rgba(255, 255, 255, .55); background: transparent; }
.hero--gradient .btn--ghost:hover { background: rgba(255, 255, 255, .12); border-color: #fff; }

/* Eyebrow labels are the system's most recognisable typographic tic:
   13px, bold, 2.6px tracking, uppercase. */
.eyebrow { letter-spacing: 0.2em; text-transform: uppercase; font-weight: 700; }

/* Cards carry their weight on the border, lifting only slightly on hover. */
.card { transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease; }
.card:hover { transform: translateY(-2px); box-shadow: var(--shadow); border-color: var(--primary-border); }

/* Tables read as reference material, per the system's house rules. */
.prose table { border-collapse: collapse; }
.prose th { text-align: left; font-weight: 700; color: var(--text); }
.prose td, .prose th { border-bottom: 1px solid var(--border); padding: .6em .8em; }

@media (prefers-reduced-motion: reduce) {
  .card, .card:hover { transition: none; transform: none; }
}
`,
  },
};
