export default {
  id: 'bloom',
  name: 'Bloom',
  tagline: 'Soft, warm and personal',
  description:
    'Cream backgrounds, an elegant serif and sage-and-rose accents. Designed for businesses where the feeling of the place matters as much as the service list.',
  bestFor: ['Salons', 'Spas', 'Wellness & massage', 'Yoga studios', 'Florists', 'Boutiques', 'Photographers', 'Event planners'],
  fonts: {
    heading: { stack: "'Cormorant Garamond', 'Iowan Old Style', Georgia, serif", google: 'Cormorant Garamond', googleWeights: [500, 600, 700], weight: 600, strongWeight: 700, leading: 1.10, tracking: '-0.012em', eyebrowTracking: '0.2em' },
    body: { stack: "'Karla', system-ui, -apple-system, sans-serif", google: 'Karla', googleWeights: [400, 500, 700], weight: 400, boldWeight: 700, leading: 1.75 },
  },
  scale: { base: 1.0625, ratio: 1.18, fluidRatio: 1.32 },
  radius: { sm: '10px', md: '18px', lg: '30px', pill: '999px' },
  shadow: {
    sm: '0 2px 8px rgba(92, 74, 66, 0.07)',
    md: '0 16px 40px -12px rgba(92, 74, 66, 0.16)',
    lg: '0 40px 90px -30px rgba(92, 74, 66, 0.28)',
  },
  layout: { container: '1140px', headerHeight: '84px', sectionY: 'clamp(4rem, 10vw, 8.5rem)' },
  sections: { header: 'centered', hero: 'centered', services: 'cards', testimonials: 'quote', gallery: 'masonry', cta: 'boxed', about: 'split' },
  palettes: {
    light: {
      bg: '#fdfaf6', surface: '#ffffff', surface2: '#f5efe7',
      text: '#3a3128', textMuted: '#6e6154', border: '#e8ded1',
      primary: '#7d6a52', accent: '#a8624f',
      inverseBg: '#3a3128', inverseText: '#fdfaf6',
    },
    dark: {
      bg: '#211d1a', surface: '#2a2522', surface2: '#332c28',
      text: '#f5efe7', textMuted: '#bdb0a2', border: '#3d3630',
      primary: '#d7bb95', accent: '#e0937c',
      inverseBg: '#f5efe7', inverseText: '#211d1a',
    },
  },
  extras: {
    css: `
.eyebrow { text-transform: uppercase; letter-spacing: var(--tracking-eyebrow); font-size: var(--step--1); }
h1, h2 { font-style: normal; }
.hero__title em, .section-title em { font-style: italic; color: var(--accent); }
.card { border: 1px solid var(--border); }
.btn--primary { border-radius: var(--radius-pill); }
.testimonial__quote::before { content: "\\201C"; font-family: var(--font-heading);
  font-size: 4rem; line-height: 0; color: var(--accent); opacity: .45; display: block; height: 1.6rem; }
`,
  },
};
