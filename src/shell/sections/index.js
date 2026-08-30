import { renderHeader } from './header.js';
import { renderHero } from './hero.js';
import { renderTrustbar } from './trustbar.js';
import { renderServices, renderServiceDetail } from './services.js';
import { renderAbout } from './about.js';
import { renderGallery } from './gallery.js';
import { renderCaseStudies } from './case-studies.js';
import { renderTestimonials } from './testimonials.js';
import { renderTeam } from './team.js';
import { renderFaq } from './faq.js';
import { renderCta } from './cta.js';
import { renderContact } from './contact.js';
import { renderPageHeader, renderNotFound } from './misc.js';
import { renderFooter } from './footer.js';

export const SECTIONS = {
  header: renderHeader,
  hero: renderHero,
  trustbar: renderTrustbar,
  services: renderServices,
  serviceDetail: renderServiceDetail,
  about: renderAbout,
  gallery: renderGallery,
  caseStudies: renderCaseStudies,
  testimonials: renderTestimonials,
  team: renderTeam,
  faq: renderFaq,
  cta: renderCta,
  contact: renderContact,
  pageHeader: renderPageHeader,
  notFound: renderNotFound,
  footer: renderFooter,
};

/** Render one section spec; unknown types are skipped rather than fatal. */
export function renderSection(ctx, spec) {
  const fn = SECTIONS[spec.type];
  if (!fn) return '';
  return fn(ctx, spec) || '';
}
