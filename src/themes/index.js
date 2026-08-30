import meridian from './meridian.js';
import forge from './forge.js';
import bloom from './bloom.js';
import harvest from './harvest.js';
import beacon from './beacon.js';
import homestead from './homestead.js';
import folio from './folio.js';

export const THEMES = { meridian, forge, bloom, harvest, beacon, homestead, folio };
export const THEME_IDS = Object.keys(THEMES);
export const DEFAULT_THEME = 'meridian';

export function getTheme(id) {
  const key = String(id ?? DEFAULT_THEME).toLowerCase().trim();
  const theme = THEMES[key];
  if (!theme) {
    throw new Error(`Unknown theme "${id}". Available: ${THEME_IDS.join(', ')}`);
  }
  return theme;
}

export const listThemes = () =>
  THEME_IDS.map((id) => {
    const t = THEMES[id];
    return { id, name: t.name, tagline: t.tagline, description: t.description, bestFor: t.bestFor, sections: t.sections };
  });

/**
 * Suggest a theme from the business category / description. Keyword driven and
 * deliberately conservative — it falls back to Meridian rather than guessing.
 */
export function suggestTheme(profile) {
  // Weighted by how strongly each field signals the vertical: an explicit
  // category beats a service name, so a dentist offering "cleanings" does not
  // get classified as a cleaning company.
  const fields = [
    { text: profile?.business?.category, weight: 6 },
    { text: profile?.business?.name, weight: 3 },
    { text: profile?.business?.tagline, weight: 2 },
    { text: profile?.business?.description, weight: 2 },
    { text: (profile?.services ?? []).map((s) => s.name).join(' '), weight: 1 },
  ].filter((f) => f.text);

  const rules = [
    { id: 'forge', re: /hvac|heating|cooling|air condition|plumb|electric|roof|construct|contractor|excavat|concrete|paving|weld|auto repair|mechanic|towing|garage|tire|collision|septic|drain|gutter|siding|fence|masonry|demolition/g },
    { id: 'harvest', re: /restaurant|cafe|coffee|bakery|bake|bar\b|brewery|pub\b|catering|caterer|deli\b|butcher|pizzeria|pizza|diner|bistro|food|grill|winery|taproom/g },
    { id: 'bloom', re: /salon|spa\b|beauty|nail|hair|barber|massage|wellness|yoga|pilates|aesthetic|lash|brow|skincare|florist|flower|boutique|photograph|wedding|event planner|bridal/g },
    { id: 'homestead', re: /landscap|lawn|garden|tree service|house cleaning|home cleaning|office cleaning|commercial cleaning|cleaning service|carpet clean|window clean|maid|janitor|pest|exterminat|pet care|grooming|kennel|veterinar|childcare|daycare|handyman|moving compan|mover|junk removal|pressure wash|snow removal|nursery/g },
    { id: 'beacon', re: /technology|agency|marketing|digital|design studio|startup|web design|seo\b|recruit|staffing|coworking|cyber/g },
    { id: 'folio', re: /software development|software consultancy|bespoke software|consultancy|systems integrat|platform|b2b\b|saas|api\b|data engineer|devops|\bit services\b|technical consult/g },
    { id: 'meridian', re: /law\b|attorney|legal|account|cpa\b|tax\b|bookkeep|insurance|financial|advisor|wealth|dental|dentist|orthodont|medical|doctor|physician|clinic|chiropract|optometr|therapy|counsel|real estate|realtor|notary|architect|engineer|consult/g },
  ];

  const scores = new Map();
  for (const field of fields) {
    const haystack = String(field.text).toLowerCase();
    for (const rule of rules) {
      const hits = (haystack.match(rule.re) ?? []).length;
      if (hits) scores.set(rule.id, (scores.get(rule.id) ?? 0) + hits * field.weight);
    }
  }

  const ranked = [...scores.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);

  return { theme: ranked[0]?.id ?? DEFAULT_THEME, confident: (ranked[0]?.score ?? 0) >= 3, ranked };
}
