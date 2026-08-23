export default {
  id: 'homestead',
  name: 'Homestead',
  tagline: 'Friendly, local, trustworthy',
  description:
    'Warm off-white, forest green and clay, with a sturdy slab-ish serif. Signals a family business that has been on the same street for twenty years.',
  bestFor: ['Landscaping & lawn care', 'Cleaning services', 'Pest control', 'Pet care & grooming', 'Childcare', 'Handyman', 'Moving companies', 'Garden centres'],
  fonts: {
    heading: { stack: "'Bitter', 'Georgia', serif", google: 'Bitter', googleWeights: [600, 700], weight: 700, strongWeight: 700, leading: 1.14, tracking: '-0.014em', eyebrowTracking: '0.12em' },
    body: { stack: "'Source Sans 3', system-ui, -apple-system, sans-serif", google: 'Source Sans 3', googleWeights: [400, 600], weight: 400, boldWeight: 600, leading: 1.7 },
  },
  scale: { base: 1.0625, ratio: 1.17, fluidRatio: 1.28 },
  radius: { sm: '8px', md: '14px', lg: '22px', pill: '999px' },
  shadow: {
    sm: '0 1px 3px rgba(31, 41, 33, 0.08)',
    md: '0 10px 28px -8px rgba(31, 41, 33, 0.18)',
    lg: '0 30px 70px -22px rgba(31, 41, 33, 0.32)',
  },
  layout: { container: '1160px', headerHeight: '78px' },
  sections: { header: 'standard', hero: 'split', services: 'cards', testimonials: 'cards', gallery: 'grid', cta: 'band', about: 'split' },
  palettes: {
    light: {
      bg: '#fbfaf6', surface: '#ffffff', surface2: '#eef1e9',
      text: '#1f2921', textMuted: '#57614f', border: '#dfe3d6',
      primary: '#2f6b3f', accent: '#b45309',
      inverseBg: '#1f2921', inverseText: '#fbfaf6',
    },
    dark: {
      bg: '#141812', surface: '#1c211a', surface2: '#252b22',
      text: '#eef1e9', textMuted: '#b0b8a6', border: '#2f362b',
      primary: '#86c08a', accent: '#e6a34a',
      inverseBg: '#eef1e9', inverseText: '#141812',
    },
  },
  extras: {
    css: `
.eyebrow { text-transform: uppercase; letter-spacing: var(--tracking-eyebrow); font-size: var(--step--1); color: var(--primary); }
.card { border: 1px solid var(--border); }
.trustbar { background: var(--surface-2); }
.badge { border-radius: var(--radius-pill); background: var(--primary-soft);
  color: var(--primary); border: 1px solid var(--primary-border); }
.hero__media img { border-radius: var(--radius-lg); }
`,
  },
};
