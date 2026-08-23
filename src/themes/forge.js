export default {
  id: 'forge',
  name: 'Forge',
  tagline: 'Heavy-duty and unmissable',
  description:
    'High-contrast dark surfaces, condensed uppercase headings and a safety-amber accent. Built for trades where the phone number is the most important thing on the page.',
  bestFor: ['HVAC', 'Plumbing', 'Electrical', 'Roofing', 'Construction', 'Auto repair', 'Towing', 'Welding', 'Excavation'],
  fonts: {
    heading: { stack: "'Barlow Condensed', 'Oswald', 'Arial Narrow', sans-serif", google: 'Barlow Condensed', googleWeights: [600, 700], weight: 700, strongWeight: 700, leading: 1.02, tracking: '0.005em', transform: 'uppercase', eyebrowTracking: '0.14em' },
    body: { stack: "'Barlow', system-ui, -apple-system, sans-serif", google: 'Barlow', googleWeights: [400, 500, 600], weight: 400, boldWeight: 600, leading: 1.62 },
  },
  scale: { base: 1.0625, ratio: 1.2, fluidRatio: 1.36 },
  radius: { sm: '2px', md: '3px', lg: '4px', pill: '3px' },
  shadow: {
    sm: '0 1px 0 rgba(0, 0, 0, 0.5)',
    md: '0 10px 24px rgba(0, 0, 0, 0.45)',
    lg: '0 30px 70px rgba(0, 0, 0, 0.60)',
  },
  layout: { container: '1240px', headerHeight: '80px' },
  borderWidth: '2px',
  sections: { header: 'bar', hero: 'image', services: 'numbered', testimonials: 'quote', gallery: 'grid', cta: 'split', about: 'split' },
  palettes: {
    light: {
      bg: '#f4f5f7', surface: '#ffffff', surface2: '#e7e9ed',
      text: '#14171c', textMuted: '#4d5560', border: '#cfd4dc',
      primary: '#b3400a', accent: '#1f2937',
      inverseBg: '#14171c', inverseText: '#f4f5f7',
      overlay: 'rgba(10, 12, 16, 0.72)',
    },
    dark: {
      bg: '#101317', surface: '#181c22', surface2: '#22272f',
      text: '#f2f4f7', textMuted: '#a4adba', border: '#2c333d',
      primary: '#ff8a1f', accent: '#ffc400',
      inverseBg: '#f2f4f7', inverseText: '#101317',
      overlay: 'rgba(6, 8, 11, 0.78)',
    },
  },
  extras: {
    css: `
.section-title, h1, h2, h3 { text-transform: var(--heading-transform); }
.btn { text-transform: uppercase; letter-spacing: .06em; font-weight: 600; }
.btn--primary { box-shadow: inset 0 -3px 0 rgba(0,0,0,.28); }
.card { border-left: 4px solid var(--primary); }
.hero { position: relative; }
.hero::after { content: ""; position: absolute; inset: auto 0 0 0; height: 6px;
  background: repeating-linear-gradient(135deg, var(--primary) 0 22px, #14171c 22px 44px); }
.service-number { font-family: var(--font-heading); font-size: var(--step-4); color: var(--primary); line-height: 1; }
`,
  },
};
