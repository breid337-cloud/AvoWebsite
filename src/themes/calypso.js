export default {
  id: 'calypso',
  name: 'Calypso',
  tagline: 'Late nights, hot colour, loud music',
  description:
    'A night-time palette of deep aubergine lit with mango, hibiscus and turquoise, set in an expressive optical serif. Built for venues where the atmosphere is the product: full-bleed photography, colour-blocked cards and a hero that leads with the room rather than the menu.',
  bestFor: ['Rum & cocktail bars', 'Live music venues', 'Nightclubs', 'Tiki & tropical bars', 'Speakeasies', 'Wine bars', 'Breweries & taprooms'],
  fonts: {
    heading: { stack: "'Fraunces', 'Iowan Old Style', Georgia, serif", google: 'Fraunces', googleWeights: [600, 700, 900], weight: 700, strongWeight: 900, leading: 1.02, tracking: '-0.025em', eyebrowTracking: '0.22em' },
    body: { stack: "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif", google: 'DM Sans', googleWeights: [400, 500, 700], weight: 400, boldWeight: 700, leading: 1.68 },
  },
  scale: { base: 1.0625, ratio: 1.2, fluidRatio: 1.38 },
  radius: { sm: '10px', md: '18px', lg: '28px', pill: '999px' },
  shadow: {
    sm: '0 2px 8px rgba(10, 4, 16, 0.20)',
    md: '0 18px 44px -14px rgba(10, 4, 16, 0.45)',
    lg: '0 44px 96px -28px rgba(10, 4, 16, 0.65)',
  },
  layout: { container: '1200px', headerHeight: '80px', sectionY: 'clamp(4rem, 10vw, 8rem)' },
  // Dark is the natural default for an evening venue.
  sections: { header: 'standard', hero: 'image', services: 'cards', testimonials: 'quote', gallery: 'masonry', cta: 'band', about: 'split' },
  palettes: {
    light: {
      bg: '#fff7ef', surface: '#ffffff', surface2: '#ffe9d8',
      text: '#2a1220', textMuted: '#6d4457', border: '#f0d8c6',
      primary: '#b03a12', accent: '#0d7a63',
      inverseBg: '#1b0f1c', inverseText: '#fff7ef',
      overlay: 'rgba(20, 8, 20, 0.58)',
    },
    dark: {
      bg: '#160d1b', surface: '#211327', surface2: '#2d1b33',
      text: '#fdf1e6', textMuted: '#cba9bb', border: '#3a2442',
      primary: '#ff9d3d', accent: '#3fd9b0',
      inverseBg: '#fdf1e6', inverseText: '#160d1b',
      overlay: 'rgba(12, 5, 14, 0.62)',
    },
  },
  copy: {
    heroPrimary: 'Find us',
    contactHeading: 'Find us',
    contactHeadingCompact: 'Say hello',
    formSubject: 'What are you asking about?',
    formSubmit: 'Send it over',
    formNote: 'We read everything that comes in and will get back to you.',
    ctaPrimary: 'Get directions',
    areaPrefix: '',
    galleryEyebrow: 'Recent nights',
    galleryHeading: 'Inside the bar',
  },
  extras: {
    css: `
/* Decorative "pop" colours. Deliberately kept off body text — they carry
   borders, badges and glows, so they never need to clear a contrast bar. */
:root {
  --pop-mango: #f2820c; --pop-hibiscus: #d81e63; --pop-lime: #4faa1e;
  --pop-turquoise: #0d9488; --pop-grape: #7c3aed;
  --pop-ink: #1b0f1c;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    --pop-mango: #ffb347; --pop-hibiscus: #ff5c93; --pop-lime: #9ede4c;
    --pop-turquoise: #3fd9b0; --pop-grape: #b794ff;
  }
}
:root[data-theme="dark"] {
  --pop-mango: #ffb347; --pop-hibiscus: #ff5c93; --pop-lime: #9ede4c;
  --pop-turquoise: #3fd9b0; --pop-grape: #b794ff;
}

.hero--image[data-has-media] .hero__title { text-shadow: 0 4px 40px rgba(0,0,0,.5); }
.hero--image .hero__inner { min-height: clamp(28rem, 74vh, 42rem); }

/* No hero photograph yet? Fall back to a lit, colourful room rather than an
   empty band — and pin light text to it so it reads in either mode. */
.hero--image:not([data-has-media]) {
  color: #fdf1e6;
  background:
    radial-gradient(38rem 26rem at 12% 8%, color-mix(in srgb, var(--pop-hibiscus) 55%, transparent), transparent 64%),
    radial-gradient(34rem 24rem at 88% 22%, color-mix(in srgb, var(--pop-grape) 50%, transparent), transparent 62%),
    radial-gradient(40rem 28rem at 62% 96%, color-mix(in srgb, var(--pop-mango) 45%, transparent), transparent 66%),
    radial-gradient(30rem 22rem at 30% 88%, color-mix(in srgb, var(--pop-turquoise) 38%, transparent), transparent 64%),
    #1b0f1c;
}
.hero--image:not([data-has-media]) .hero__title { text-shadow: 0 4px 40px rgba(0,0,0,.45); }
.hero--image:not([data-has-media]) .hero__subtitle { color: rgba(253,241,230,.88); }
.hero--image:not([data-has-media]) .eyebrow { color: #ffd9a3; }
.hero--image:not([data-has-media]) .hero__badges { color: rgba(253,241,230,.85); }
.hero--image:not([data-has-media]) .hero__badges .icon { color: #9ede4c; }
.hero--image:not([data-has-media]) .btn--ghost { color: #fdf1e6; border-color: rgba(253,241,230,.5); }
.hero--image:not([data-has-media]) .btn--ghost:hover { background: rgba(253,241,230,.14); border-color: #fdf1e6; color: #fdf1e6; }

/* A ribbon of colour under the hero — the visual signature of the theme. */
.hero::after {
  content: ""; position: absolute; inset: auto 0 0 0; height: 8px; z-index: 2;
  background: linear-gradient(90deg,
    var(--pop-mango) 0 20%, var(--pop-hibiscus) 20% 40%, var(--pop-grape) 40% 60%,
    var(--pop-turquoise) 60% 80%, var(--pop-lime) 80% 100%);
}

.eyebrow { color: var(--pop-mango); }

/* Cards cycle through the pops so a grid reads as colourful, not monotone. */
.card--service { border-top: 5px solid var(--pop-mango); }
.card--service:nth-child(5n+2) { border-top-color: var(--pop-hibiscus); }
.card--service:nth-child(5n+3) { border-top-color: var(--pop-turquoise); }
.card--service:nth-child(5n+4) { border-top-color: var(--pop-grape); }
.card--service:nth-child(5n+5) { border-top-color: var(--pop-lime); }
.card--service .card__icon { background: color-mix(in srgb, var(--pop-mango) 18%, transparent); color: var(--pop-mango); }
.card--service:nth-child(5n+2) .card__icon { background: color-mix(in srgb, var(--pop-hibiscus) 18%, transparent); color: var(--pop-hibiscus); }
.card--service:nth-child(5n+3) .card__icon { background: color-mix(in srgb, var(--pop-turquoise) 18%, transparent); color: var(--pop-turquoise); }
.card--service:nth-child(5n+4) .card__icon { background: color-mix(in srgb, var(--pop-grape) 18%, transparent); color: var(--pop-grape); }
.card--service:nth-child(5n+5) .card__icon { background: color-mix(in srgb, var(--pop-lime) 18%, transparent); color: var(--pop-lime); }
.card { transition: transform .2s ease, box-shadow .2s ease; }
.card:hover { transform: translateY(-4px); box-shadow: var(--shadow); }

.value-prop__icon { background: color-mix(in srgb, var(--pop-turquoise) 16%, transparent); color: var(--pop-turquoise); }
.stat__value { color: var(--pop-mango); }
.hero__badges .icon { color: var(--pop-lime); }

.btn--primary { border-radius: var(--radius-pill); font-weight: 700; }
.btn--ghost { border-radius: var(--radius-pill); }
.btn--invert, .btn--invert-ghost { border-radius: var(--radius-pill); }

/* Glowing rule above section titles, colour-shifting across the page. */
.section-head .eyebrow::before {
  content: ""; display: inline-block; width: 2.25rem; height: 3px; margin-right: .7rem;
  vertical-align: middle; border-radius: 3px;
  background: linear-gradient(90deg, var(--pop-mango), var(--pop-hibiscus));
}

.testimonial--quote .testimonial__quote { font-style: italic; }
.gallery__img { transition: transform .4s ease, filter .4s ease; }
.gallery__trigger:hover .gallery__img { transform: scale(1.06) rotate(-.6deg); }

.cta { position: relative; overflow: hidden; }
.cta::before {
  content: ""; position: absolute; inset: 0; opacity: .16; pointer-events: none;
  background:
    radial-gradient(28rem 20rem at 12% 20%, var(--pop-hibiscus), transparent 62%),
    radial-gradient(30rem 22rem at 88% 80%, var(--pop-turquoise), transparent 62%);
}
.cta__inner { position: relative; }
.site-footer { border-top: 4px solid transparent;
  border-image: linear-gradient(90deg, var(--pop-mango), var(--pop-hibiscus), var(--pop-grape), var(--pop-turquoise), var(--pop-lime)) 1; }
`,
  },
};
