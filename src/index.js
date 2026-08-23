/** Library entry point — everything the CLI uses is importable directly. */
export { harvestSite, buildDraftProfile, saveHarvest } from './harvest/index.js';
export { renderHarvestReport } from './harvest/report.js';
export { renderBrief } from './brief/index.js';
export { buildSite, buildAllThemes } from './render/index.js';
export { startPreview } from './preview/index.js';
export { deploy, DEPLOY_TARGETS } from './deploy/index.js';
export { THEMES, THEME_IDS, getTheme, listThemes, suggestTheme } from './themes/index.js';
export { compileTokens, buildStylesheet } from './themes/tokens.js';
export { emptyProfile, PROFILE_VERSION, FIELDS } from './profile/schema.js';
export { normalizeProfile, formatPhone, telHref } from './profile/normalize.js';
export { validateProfile, scoreProfile, describeScore } from './profile/validate.js';
export { planPages } from './shell/pages.js';
