export default {
  id: 'beacon',
  name: 'Beacon',
  tagline: 'Modern, technical, confident',
  description:
    'Crisp geometric type, deep indigo gradients and generous radii. The look clients mean when they say "make it look like a proper tech company".',
  bestFor: ['Agencies', 'Software & IT services', 'Startups', 'Marketing firms', 'Coworking', 'Recruiters', 'Training providers'],
  fonts: {
    heading: { stack: "'Space Grotesk', 'Inter', system-ui, sans-serif", google: 'Space Grotesk', googleWeights: [500, 600, 700], weight: 600, strongWeight: 700, leading: 1.08, tracking: '-0.03em', eyebrowTracking: '0.1em' },
    body: { stack: "'Inter', system-ui, -apple-system, sans-serif", google: 'Inter', googleWeights: [400, 500, 600], weight: 400, boldWeight: 600, leading: 1.66 },
  },
  scale: { base: 1.0625, ratio: 1.18, fluidRatio: 1.32 },
  radius: { sm: '8px', md: '14px', lg: '24px', pill: '999px' },
  shadow: {
    sm: '0 1px 3px rgba(15, 12, 41, 0.08)',
    md: '0 12px 32px -8px rgba(59, 39, 168, 0.22)',
    lg: '0 40px 90px -28px rgba(59, 39, 168, 0.40)',
  },
  layout: { container: '1200px', headerHeight: '76px' },
  sections: { header: 'standard', hero: 'gradient', services: 'features', testimonials: 'cards', gallery: 'grid', cta: 'boxed', about: 'split' },
  palettes: {
    light: {
      bg: '#ffffff', surface: '#f7f7fd', surface2: '#eeeefb',
      text: '#0d0b1f', textMuted: '#565175', border: '#e2e0f2',
      primary: '#5b34e8', accent: '#0891b2',
      inverseBg: '#120f2e', inverseText: '#f3f2ff',
    },
    dark: {
      bg: '#0a0818', surface: '#121029', surface2: '#1b1838',
      text: '#f0eeff', textMuted: '#a8a2cc', border: '#272248',
      primary: '#a78bfa', accent: '#22d3ee',
      inverseBg: '#f0eeff', inverseText: '#0a0818',
    },
  },
  extras: {
    css: `
.hero--gradient { background:
  radial-gradient(60rem 34rem at 78% -14%, color-mix(in srgb, var(--primary) 26%, transparent), transparent 62%),
  radial-gradient(46rem 30rem at 8% 4%, color-mix(in srgb, var(--accent) 20%, transparent), transparent 60%),
  var(--bg); }
.card { background: var(--surface); border: 1px solid var(--border); }
.card:hover { border-color: color-mix(in srgb, var(--primary) 45%, var(--border)); }
.feature__icon { display: grid; place-items: center; width: 3rem; height: 3rem;
  border-radius: var(--radius); background: var(--primary-soft); color: var(--primary); }
.btn--primary { background-image: linear-gradient(180deg, color-mix(in srgb, var(--primary) 88%, #fff) 0%, var(--primary) 100%); }
`,
  },
};
