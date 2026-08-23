export default {
  id: 'harvest',
  name: 'Harvest',
  tagline: 'Appetising and photo-led',
  description:
    'Editorial serif headlines over full-bleed photography, warm charcoal and amber. The layout gets out of the way so the food, room or product does the selling.',
  bestFor: ['Restaurants', 'Cafés & bakeries', 'Bars & breweries', 'Caterers', 'Butchers & delis', 'Farm shops', 'Food trucks'],
  fonts: {
    heading: { stack: "'Playfair Display', 'Iowan Old Style', Georgia, serif", google: 'Playfair Display', googleWeights: [600, 700, 800], weight: 700, strongWeight: 800, leading: 1.06, tracking: '-0.018em', eyebrowTracking: '0.18em' },
    body: { stack: "'Source Sans 3', system-ui, -apple-system, sans-serif", google: 'Source Sans 3', googleWeights: [400, 600], weight: 400, boldWeight: 600, leading: 1.7 },
  },
  scale: { base: 1.0625, ratio: 1.19, fluidRatio: 1.34 },
  radius: { sm: '3px', md: '6px', lg: '10px', pill: '999px' },
  shadow: {
    sm: '0 2px 6px rgba(28, 20, 12, 0.10)',
    md: '0 14px 36px -10px rgba(28, 20, 12, 0.26)',
    lg: '0 36px 80px -24px rgba(28, 20, 12, 0.44)',
  },
  layout: { container: '1200px', headerHeight: '78px' },
  sections: { header: 'standard', hero: 'image', services: 'menu', testimonials: 'quote', gallery: 'masonry', cta: 'band', about: 'split' },
  palettes: {
    light: {
      bg: '#fbf7f0', surface: '#ffffff', surface2: '#f2e9dc',
      text: '#231a12', textMuted: '#6b5a48', border: '#e4d7c4',
      primary: '#9a3412', accent: '#166534',
      inverseBg: '#1c1611', inverseText: '#fbf7f0',
      overlay: 'rgba(20, 14, 9, 0.55)',
    },
    dark: {
      bg: '#171310', surface: '#201a15', surface2: '#2b231c',
      text: '#f7efe4', textMuted: '#c0ab94', border: '#362c23',
      primary: '#f0a04b', accent: '#86c08a',
      inverseBg: '#f7efe4', inverseText: '#171310',
      overlay: 'rgba(12, 9, 6, 0.62)',
    },
  },
  extras: {
    css: `
.eyebrow { text-transform: uppercase; letter-spacing: var(--tracking-eyebrow); font-size: var(--step--1); color: var(--accent); }
.menu-item { display: grid; grid-template-columns: 1fr auto; gap: var(--space-4);
  align-items: baseline; padding: var(--space-5) 0; border-bottom: 1px dashed var(--border); }
.menu-item__dots { border-bottom: 1px dotted var(--border-strong); flex: 1; margin: 0 .5rem; }
.menu-item__price { font-family: var(--font-heading); font-size: var(--step-1); color: var(--primary); white-space: nowrap; }
.hero--image .hero__title { text-shadow: 0 2px 24px rgba(0,0,0,.45); }
`,
  },
};
