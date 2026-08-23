export default {
  id: 'meridian',
  name: 'Meridian',
  tagline: 'Clean, credible, corporate',
  description:
    'A calm professional look built on generous whitespace and a restrained blue-slate palette. Reads as competent and established without feeling cold.',
  bestFor: ['Law firms', 'Accountants', 'Medical & dental', 'Insurance', 'Consultants', 'Financial services', 'B2B services'],
  fonts: {
    heading: { stack: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif", google: 'Inter', googleWeights: [600, 700, 800], weight: 700, strongWeight: 800, leading: 1.14, tracking: '-0.021em' },
    body: { stack: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif", google: 'Inter', googleWeights: [400, 500, 600], weight: 400, boldWeight: 600, leading: 1.68 },
  },
  scale: { base: 1, ratio: 1.18, fluidRatio: 1.3 },
  radius: { sm: '6px', md: '10px', lg: '16px', pill: '999px' },
  shadow: {
    sm: '0 1px 2px rgba(16, 24, 40, 0.06)',
    md: '0 8px 24px -6px rgba(16, 24, 40, 0.10), 0 2px 6px rgba(16, 24, 40, 0.05)',
    lg: '0 28px 64px -16px rgba(16, 24, 40, 0.20)',
  },
  layout: { container: '1180px', headerHeight: '76px' },
  sections: { header: 'standard', hero: 'split', services: 'cards', testimonials: 'cards', gallery: 'grid', cta: 'band', about: 'split' },
  palettes: {
    light: {
      bg: '#ffffff', surface: '#f7f9fc', surface2: '#eef2f8',
      text: '#0f172a', textMuted: '#516079', border: '#dfe5ee',
      primary: '#1d4ed8', accent: '#0d9488',
      inverseBg: '#0f1b33', inverseText: '#eef2f8',
    },
    dark: {
      bg: '#0b1220', surface: '#121b2d', surface2: '#1a2437',
      text: '#eaf0fa', textMuted: '#9fb0ca', border: '#25324a',
      primary: '#7aa2ff', accent: '#2dd4bf',
      inverseBg: '#eef2f8', inverseText: '#0f1b33',
    },
  },
  extras: {
    css: `
.hero { border-bottom: 1px solid var(--border); }
.card { transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
.card:hover { transform: translateY(-3px); box-shadow: var(--shadow); border-color: var(--primary-border); }
.eyebrow { color: var(--primary); }
`,
  },
};
