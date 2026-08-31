import { compileTokens, tokensToCss } from '../themes/tokens.js';

/**
 * Base stylesheet. Every value comes from theme tokens, so the same rules
 * produce six visually distinct sites. Mobile-first; no framework.
 */
export const BASE_CSS = `
/* ── Reset ─────────────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; }
* { margin: 0; }
html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; }
}
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  font-size: var(--step-0);
  font-weight: var(--fw-body);
  line-height: var(--leading-body);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  overflow-wrap: break-word;
}
img, picture, svg, video { display: block; max-width: 100%; height: auto; }
input, button, textarea, select { font: inherit; color: inherit; }
button { background: none; border: 0; cursor: pointer; }
a { color: var(--link); text-decoration-thickness: 1px; text-underline-offset: .18em; }
a:hover { text-decoration-thickness: 2px; }
:where(h1, h2, h3, h4, h5, h6) {
  font-family: var(--font-heading);
  font-weight: var(--fw-heading);
  line-height: var(--leading-heading);
  letter-spacing: var(--tracking-heading);
  text-wrap: balance;
}
p { text-wrap: pretty; }
:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; border-radius: 2px; }
:target { scroll-margin-top: calc(var(--header-h) + 1rem); }
[hidden] { display: none !important; }

/* Grid and flex children default to min-width:auto, which refuses to shrink
   below the longest word. Without this a long business name or email address
   pushes the whole page wider than a phone screen. */
.hero__inner > *, .about__grid > *, .contact__grid > *, .prose-layout > *,
.site-footer__inner > *, .cta__inner > *, .service-row > *, .value-prop > *,
.contact-list li > *, .menu-item > *, .card, .feature, .stat { min-width: 0; }
/* …but fixed-size markers and icons must keep their intrinsic width. */
.service-number, .value-prop__icon, .contact-list__icon, .feature__icon,
.card__icon, .testimonial__mark { flex: none; min-width: max-content; }
.contact-list__value, .footer__list a, .footer__list address { overflow-wrap: anywhere; }
.page-header__title, .section-title, .notfound__title { overflow-wrap: break-word; }

/* ── Layout ────────────────────────────────────────────────────────── */
.container { width: 100%; max-width: var(--container); margin-inline: auto; padding-inline: var(--gutter); }
.container--narrow { max-width: var(--container-narrow); }
.section { padding-block: var(--section-y); }
.section + .section { padding-top: 0; }
.section.tone--surface { background: var(--surface); padding-block: var(--section-y); }
.section.tone--surface + .section { padding-top: var(--section-y); }
.visually-hidden {
  position: absolute !important; width: 1px; height: 1px; padding: 0; overflow: hidden;
  clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0;
}
.skip-link {
  position: absolute; left: var(--space-4); top: -6rem; z-index: 100;
  background: var(--primary); color: var(--on-primary);
  padding: var(--space-4) var(--space-6); border-radius: var(--radius);
  transition: top .18s ease;
}
.skip-link:focus { top: var(--space-4); }

.section-head { max-width: 62ch; margin-bottom: var(--space-9); }
.section-head--center { margin-inline: auto; text-align: center; }
.section-title { font-size: var(--step-4); font-weight: var(--fw-heading-strong); }
.section-intro { margin-top: var(--space-5); color: var(--text-muted); font-size: var(--step-1); }
.eyebrow {
  font-size: var(--step--1); font-weight: var(--fw-bold); letter-spacing: var(--tracking-eyebrow);
  text-transform: uppercase; color: var(--primary); margin-bottom: var(--space-4);
}
.section-foot { margin-top: var(--space-8); }

/* ── Buttons ───────────────────────────────────────────────────────── */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: .5em;
  padding: .82em 1.5em; border-radius: var(--radius);
  font-weight: var(--fw-bold); font-size: var(--step-0); line-height: 1.2;
  text-decoration: none; cursor: pointer; text-align: center;
  border: var(--border-width) solid transparent;
  transition: background-color .16s ease, color .16s ease, border-color .16s ease, transform .12s ease, box-shadow .16s ease;
}
.btn:hover { text-decoration: none; transform: translateY(-1px); }
.btn:active { transform: translateY(0); }
.btn__icon { width: 1.1em; height: 1.1em; flex: none; }
.btn--primary { background: var(--primary); color: var(--on-primary); border-color: var(--primary); }
.btn--primary:hover { background: var(--primary-hover); border-color: var(--primary-hover); color: var(--on-primary); }
.btn--ghost { background: transparent; color: var(--text); border-color: var(--border-strong); }
.btn--ghost:hover { border-color: var(--primary); color: var(--primary); background: var(--primary-soft); }
.btn--invert { background: var(--bg); color: var(--text); border-color: var(--bg); }
.btn--invert:hover { background: var(--surface); color: var(--primary); }
.btn--invert-ghost { background: transparent; color: var(--inverse-text); border-color: color-mix(in srgb, var(--inverse-text) 45%, transparent); }
.btn--invert-ghost:hover { background: color-mix(in srgb, var(--inverse-text) 12%, transparent); color: var(--inverse-text); }
.btn--block { display: flex; width: 100%; }

/* ── Header ────────────────────────────────────────────────────────── */
.site-header {
  position: sticky; top: 0; z-index: 50;
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: saturate(180%) blur(12px);
  border-bottom: 1px solid transparent;
  transition: border-color .2s ease, box-shadow .2s ease;
}
.site-header.is-stuck { border-bottom-color: var(--border); box-shadow: var(--shadow-sm); }
.site-header__inner { display: flex; align-items: center; gap: var(--space-6); min-height: var(--header-h); }
.brand { display: inline-flex; align-items: center; text-decoration: none; color: inherit; flex: none; }
.logo__img { max-height: 48px; width: auto; }
.wordmark { display: inline-flex; align-items: center; gap: .6rem; font-family: var(--font-heading); font-weight: var(--fw-heading-strong); font-size: var(--step-1); letter-spacing: -.01em; }
.wordmark__mark {
  display: grid; place-items: center; width: 2.25em; height: 2.25em; flex: none;
  background: var(--primary); color: var(--on-primary); border-radius: var(--radius-sm); font-size: .62em;
}
.wordmark__text { white-space: nowrap; }
.nav { display: none; margin-inline-start: auto; }
.nav__list { display: flex; gap: var(--space-7); list-style: none; padding: 0; }
.nav__link { text-decoration: none; color: var(--text); font-weight: 500; padding-block: .5rem; position: relative; }
.nav__link:hover { color: var(--primary); }
.nav__link.is-current { color: var(--primary); }
.nav__link.is-current::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--primary); border-radius: 2px; }
.header__actions { display: flex; align-items: center; gap: var(--space-4); margin-inline-start: auto; }
.nav ~ .header__actions { margin-inline-start: 0; }
.header__phone { display: none; align-items: center; gap: .45rem; text-decoration: none; color: var(--text); font-weight: var(--fw-bold); white-space: nowrap; }
.header__phone:hover { color: var(--primary); }
.header__phone .icon { width: 1.1em; height: 1.1em; color: var(--primary); }
.header__cta { display: none; }
.header__topbar { background: var(--inverse-bg); color: var(--inverse-text); font-size: var(--step--1); }
.header__topbar-inner { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); min-height: 2.5rem; flex-wrap: wrap; }
.header__topbar a { color: inherit; text-decoration: none; display: inline-flex; align-items: center; gap: .35rem; font-weight: var(--fw-bold); }
.header__topbar a:hover { text-decoration: underline; }
.header__topbar .icon { width: 1em; height: 1em; }
.header__topbar-actions { display: flex; gap: var(--space-6); align-items: center; }
.header__tagline { margin: 0; opacity: .85; }
.header__hours-hint { display: inline-flex; align-items: center; gap: .35rem; }
.nav-toggle { display: inline-grid; place-items: center; width: 2.75rem; height: 2.75rem; border-radius: var(--radius-sm); color: var(--text); border: 1px solid var(--border); }
.nav-toggle .icon { width: 1.5rem; height: 1.5rem; }
.nav-toggle__close { display: none; }
.nav-toggle[aria-expanded="true"] .nav-toggle__open { display: none; }
.nav-toggle[aria-expanded="true"] .nav-toggle__close { display: block; }

.mobile-nav {
  position: fixed; inset: var(--header-h) 0 0; z-index: 45;
  background: var(--bg); padding: var(--space-7) var(--gutter) var(--space-10);
  overflow-y: auto; border-top: 1px solid var(--border);
}
.mobile-nav__list { list-style: none; padding: 0; display: grid; gap: var(--space-2); }
.mobile-nav__link {
  display: block; padding: var(--space-5) var(--space-4); border-radius: var(--radius);
  text-decoration: none; color: var(--text); font-family: var(--font-heading);
  font-size: var(--step-2); font-weight: var(--fw-heading);
}
.mobile-nav__link:hover, .mobile-nav__link.is-current { background: var(--primary-soft); color: var(--primary); }
.mobile-nav__actions { display: grid; gap: var(--space-4); margin-top: var(--space-8); }
body.nav-open { overflow: hidden; }

/* ── Hero ──────────────────────────────────────────────────────────── */
.hero { padding-block: clamp(3rem, 8vw, 6.5rem); position: relative; overflow: hidden; }
.hero__inner { display: grid; gap: var(--space-9); align-items: center; }
.hero__title { font-size: var(--step-5); font-weight: var(--fw-heading-strong); overflow-wrap: break-word; hyphens: auto; }
.hero__subtitle { margin-top: var(--space-6); font-size: var(--step-1); color: var(--text-muted); max-width: 56ch; }
.hero__actions { display: flex; flex-wrap: wrap; gap: var(--space-4); margin-top: var(--space-8); }
.hero__badges { display: flex; flex-wrap: wrap; gap: var(--space-4) var(--space-7); list-style: none; padding: 0; margin-top: var(--space-8); color: var(--text-muted); font-size: var(--step--1); }
.hero__badges li { display: inline-flex; align-items: center; gap: .45rem; }
.hero__badges .icon { width: 1.15em; height: 1.15em; color: var(--primary); flex: none; }
.hero__media img, .hero__img { border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); width: 100%; object-fit: cover; }
.hero__media--empty { display: none; }
.hero--centered .hero__inner, .hero--gradient .hero__inner { justify-items: center; text-align: center; }
.hero--centered .hero__subtitle, .hero--gradient .hero__subtitle { margin-inline: auto; }
.hero--centered .hero__actions, .hero--gradient .hero__actions { justify-content: center; }
.hero--image { color: #fff; }
.hero--image .hero__bg { position: absolute; inset: 0; z-index: 0; }
.hero--image .hero__bg::after { content: ""; position: absolute; inset: 0; background: var(--overlay); }
.hero--image .hero__img { width: 100%; height: 100%; object-fit: cover; border-radius: 0; box-shadow: none; }
.hero--image .hero__inner { position: relative; z-index: 1; min-height: clamp(24rem, 58vh, 34rem); align-content: center; }
.hero--image .hero__subtitle { color: rgba(255,255,255,.9); }
.hero--image .eyebrow { color: #fff; opacity: .9; }
.hero--image .btn--ghost { color: #fff; border-color: rgba(255,255,255,.55); }
.hero--image .btn--ghost:hover { background: rgba(255,255,255,.14); border-color: #fff; color: #fff; }

/* ── Trust bar ─────────────────────────────────────────────────────── */
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr)); gap: var(--space-7); list-style: none; padding: 0; text-align: center; }
.stat { display: grid; gap: .25rem; }
.stat__value { font-family: var(--font-heading); font-size: var(--step-4); font-weight: var(--fw-heading-strong); color: var(--primary); line-height: 1; }
.stat__label { color: var(--text-muted); font-size: var(--step--1); }
/* The plain-English gloss under a deliberately technical label. */
.stat__note { color: var(--text-muted); font-size: var(--step--2); line-height: 1.45; max-width: 26ch; }
.value-props { display: grid; gap: var(--space-7); list-style: none; padding: 0; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); }
.stats + .value-props { margin-top: var(--space-10); }
/* Inside a service page these read as a list rather than a row of columns. */
.value-props--stacked { grid-template-columns: 1fr; gap: var(--space-6); margin-bottom: var(--space-8); }
/* Inside a service page the stats break up a long read, so they align with
   the text column rather than centring across the page. */
.service-detail__stats { margin: var(--space-8) 0; padding: var(--space-7) 0; border-block: 1px solid var(--border); text-align: start; gap: var(--space-6); }
.value-prop { display: flex; gap: var(--space-5); }
.value-prop__icon { flex: none; display: grid; place-items: center; width: 2.75rem; height: 2.75rem; border-radius: var(--radius); background: var(--primary-soft); color: var(--primary); }
.value-prop__icon .icon { width: 1.4rem; height: 1.4rem; }
.value-prop__title { font-size: var(--step-1); margin-bottom: .35rem; }
.value-prop__text { color: var(--text-muted); font-size: var(--step-0); }

/* ── Cards & grids ─────────────────────────────────────────────────── */
.card-grid { display: grid; gap: var(--space-7); list-style: none; padding: 0; grid-template-columns: repeat(auto-fill, minmax(min(100%, 17rem), 1fr)); }
.card-grid--testimonials { grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr)); }
.card {
  position: relative; display: flex; flex-direction: column; overflow: hidden;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
  color: var(--text-on-surface);
}
.card__media { aspect-ratio: 16 / 10; overflow: hidden; background: var(--surface-2); }
.card__media--portrait { aspect-ratio: 1 / 1; }
.card__img { width: 100%; height: 100%; object-fit: cover; transition: transform .3s ease; }
.card:hover .card__img { transform: scale(1.04); }
.card__icon { display: grid; place-items: center; width: 3rem; height: 3rem; margin: var(--space-7) var(--space-7) 0; border-radius: var(--radius); background: var(--primary-soft); color: var(--primary); }
.card__icon .icon { width: 1.5rem; height: 1.5rem; }
.card__body { padding: var(--space-7); display: grid; gap: var(--space-4); align-content: start; }
.card__title { font-size: var(--step-2); }
.card__title a { color: inherit; text-decoration: none; }
.card__title a:hover { color: var(--primary); }
.card__text { color: var(--text-muted); }
.card__role { color: var(--primary); font-weight: var(--fw-bold); font-size: var(--step--1); }
.card__price { font-weight: var(--fw-bold); color: var(--primary); }
.card__contact { display: flex; gap: var(--space-4); }
.card__contact a { display: grid; place-items: center; width: 2.25rem; height: 2.25rem; border-radius: var(--radius-pill); background: var(--surface-2); color: var(--text); }
.card__contact a:hover { background: var(--primary); color: var(--on-primary); }
.card__contact .icon { width: 1.1rem; height: 1.1rem; }
.stretched::after { content: ""; position: absolute; inset: 0; }

.tick-list { list-style: none; padding: 0; display: grid; gap: var(--space-3); }
.tick-list li { display: flex; gap: .55rem; align-items: flex-start; color: var(--text-muted); font-size: var(--step--1); }
.tick-list .icon { width: 1.1em; height: 1.1em; color: var(--primary); flex: none; margin-top: .18em; }
.tick-list--lg li { font-size: var(--step-0); }

/* ── Services variants ─────────────────────────────────────────────── */
.service-list { list-style: none; padding: 0; display: grid; gap: 0; }
.service-row { display: flex; gap: var(--space-6); align-items: flex-start; padding-block: var(--space-7); border-top: 1px solid var(--border); }
.service-row:last-child { border-bottom: 1px solid var(--border); }
.service-row__title { font-size: var(--step-2); }
.service-row__title a { color: inherit; text-decoration: none; }
.service-row__title a:hover { color: var(--primary); }
.service-row__body { display: grid; gap: var(--space-3); }
.service-row__body p { color: var(--text-muted); }
.service-row__price { color: var(--primary); font-weight: var(--fw-bold); }
.service-row__arrow { width: 1.4rem; height: 1.4rem; margin-inline-start: auto; color: var(--text-muted); flex: none; }
.feature-grid { display: grid; gap: var(--space-8); list-style: none; padding: 0; grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); }
.feature { display: grid; gap: var(--space-4); justify-items: start; }
.feature__icon { display: grid; place-items: center; width: 3rem; height: 3rem; border-radius: var(--radius); background: var(--primary-soft); color: var(--primary); }
.feature__icon .icon { width: 1.5rem; height: 1.5rem; }
.feature__title { font-size: var(--step-1); }
.feature__title a { color: inherit; text-decoration: none; }
.feature__title a:hover { color: var(--primary); }
.feature__text { color: var(--text-muted); font-size: var(--step-0); }
.menu-list { display: grid; }
.menu-item__name { font-size: var(--step-2); }
.menu-item__name a { color: inherit; text-decoration: none; }
.menu-item__desc { color: var(--text-muted); margin-top: .35rem; }

/* ── About ─────────────────────────────────────────────────────────── */
.about__grid { display: grid; gap: var(--space-9); align-items: center; }
.about__copy > p { color: var(--text-muted); }
.about__copy > p + p { margin-top: var(--space-5); }
.about__copy .tick-list { margin-top: var(--space-7); }
.about__media img { width: 100%; }
.rounded { border-radius: var(--radius-lg); box-shadow: var(--shadow); }

/* ── Gallery ───────────────────────────────────────────────────────── */
.gallery__grid { display: grid; gap: var(--space-5); grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr)); }
.gallery__item { margin: 0; }
.gallery__trigger { display: block; width: 100%; padding: 0; border-radius: var(--radius); overflow: hidden; background: var(--surface-2); }
.gallery__img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; transition: transform .3s ease, filter .3s ease; }
.gallery__trigger:hover .gallery__img { transform: scale(1.05); filter: brightness(1.04); }
.gallery figcaption { margin-top: var(--space-3); font-size: var(--step--1); color: var(--text-muted); }
.gallery--masonry .gallery__grid { grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr)); grid-auto-rows: 12rem; }
.gallery--masonry .gallery__item:nth-child(4n+1) { grid-row: span 2; }
.gallery--masonry .gallery__trigger, .gallery--masonry .gallery__img { height: 100%; }
.gallery--masonry .gallery__img { aspect-ratio: auto; }

/* A <dialog> is display:none until opened. Setting display on the bare class
   would override that and leave the overlay covering the whole page. */
.lightbox { position: fixed; inset: 0; z-index: 90; padding: var(--space-6); background: rgba(6,8,12,.9); border: 0; max-width: none; max-height: none; width: 100%; height: 100%; }
.lightbox[open] { display: grid; place-items: center; }
.lightbox::backdrop { background: rgba(6,8,12,.9); }
.lightbox img { max-width: min(96vw, 1400px); max-height: 82vh; width: auto; border-radius: var(--radius); }
.lightbox__caption { color: #fff; text-align: center; margin-top: var(--space-5); font-size: var(--step--1); }
.lightbox__close { position: absolute; top: var(--space-5); right: var(--space-5); width: 3rem; height: 3rem; display: grid; place-items: center; color: #fff; background: rgba(255,255,255,.14); border-radius: var(--radius-pill); }
.lightbox__close .icon { width: 1.5rem; height: 1.5rem; }

/* ── Case studies ──────────────────────────────────────────────────── */
.case-studies__list { display: grid; gap: var(--space-8); }
.case-study { display: grid; gap: var(--space-6); padding: var(--space-8); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); }
.case-study__body { display: grid; gap: var(--space-4); min-width: 0; }
.case-study__title { margin: 0; }
.case-study__summary { font-size: var(--step-1); color: var(--text-muted); }
.case-study__body h4 { margin: var(--space-3) 0 0; font-size: var(--step-0); }
.case-study__body p { margin: 0; }
.case-study__media img { width: 100%; }
/* The table is the point of a case study, so it stays readable on a phone: */
/* it scrolls in its own box rather than widening the page. */
/* The headline figures. The "before" is deliberately quiet and the "after"
   loud, so the direction of travel reads without needing the label. */
.case-study__deltas { grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr)); gap: var(--space-6); margin: var(--space-7) 0; text-align: start; }
.stat--delta .stat__value { display: flex; align-items: baseline; flex-wrap: wrap; gap: .3rem; font-size: var(--step-3); }
.stat--delta .stat__before { font-size: var(--step-0); font-weight: 400; color: var(--text-muted); text-decoration: line-through; }
.stat--delta .stat__arrow { font-size: var(--step-0); color: var(--text-muted); }
.stat--delta .stat__after { color: var(--primary); }
/* Label above the figures, as a caption does. The icon is decorative — the
   label already says what the measure is. */
.stat--delta .stat__label { display: flex; align-items: center; gap: .4rem; font-size: var(--step--2); text-transform: uppercase; letter-spacing: .07em; }
.stat--delta .stat__label .icon { width: 1.1rem; height: 1.1rem; color: var(--primary); flex: none; }
/* The percentage is the line that sells: a 1 becoming a 39 is a fact, and
   +3,800% is the same fact doing some work. */
.stat__change { font-weight: var(--fw-bold); color: var(--success, var(--primary)); font-size: var(--step--1); }
.case-study__metrics { width: 100%; border-collapse: collapse; font-size: var(--step--1); display: block; overflow-x: auto; }
.case-study__metrics th, .case-study__metrics td { padding: var(--space-3) var(--space-4); text-align: left; border-bottom: 1px solid var(--border); white-space: nowrap; }
.case-study__metrics thead th { font-size: var(--step--2); text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); }
.case-study__metrics tbody th { font-weight: 600; white-space: normal; }
.case-study__metrics td { font-variant-numeric: tabular-nums; }
.case-study__metrics tbody tr td:last-child { color: var(--primary); font-weight: 600; }
/* On a narrow screen the three columns scrolled sideways, and since the
   after column was the one off-screen a phone showed only the before
   figures — exactly backwards. Below 40rem each row stacks and labels its
   own cells, so both numbers are always visible. */
@media (max-width: 40rem) {
  .case-study__metrics { display: table; overflow-x: visible; }
  .case-study__metrics thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  .case-study__metrics tbody, .case-study__metrics tr, .case-study__metrics th, .case-study__metrics td { display: block; }
  .case-study__metrics tr { padding-block: var(--space-5); border-bottom: 1px solid var(--border); }
  .case-study__metrics th, .case-study__metrics td { padding: 0; border: 0; white-space: normal; }
  .case-study__metrics tbody th { margin-bottom: var(--space-3); }
  .case-study__metrics td { display: flex; gap: var(--space-4); align-items: baseline; }
  .case-study__metrics td::before { content: attr(data-label); flex: 0 0 3.5rem; font-size: var(--step--2); text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); }
}

.case-study__quote { margin: 0; padding-left: var(--space-5); border-left: 3px solid var(--primary); }
.case-study__quote p { font-size: var(--step-1); }
.case-study__quote footer { margin-top: var(--space-3); font-size: var(--step--1); color: var(--text-muted); }
.case-study__links { display: flex; flex-wrap: wrap; gap: var(--space-3); font-size: var(--step--1); }
@media (min-width: 60rem) {
  .case-studies--split .case-study { grid-template-columns: minmax(0, 22rem) minmax(0, 1fr); align-items: start; }
}

/* ── Testimonials ──────────────────────────────────────────────────── */
.testimonial { padding: var(--space-8); display: grid; gap: var(--space-5); align-content: start; }
.testimonial__mark { color: var(--primary); opacity: .3; }
.testimonial__mark .icon { width: 2.25rem; height: 2.25rem; }
.testimonial__quote { font-size: var(--step-1); line-height: 1.55; color: var(--text-on-surface); }
.testimonial__by { display: grid; gap: .15rem; }
.testimonial__by cite { font-style: normal; font-weight: var(--fw-bold); }
.testimonial__meta, .testimonial__source { color: var(--text-muted); font-size: var(--step--1); }
.rating { display: flex; gap: .15rem; }
.star { width: 1.05rem; height: 1.05rem; color: var(--border-strong); }
.star--on { color: var(--accent); }
.quote-stack { display: grid; gap: var(--space-9); max-width: 52rem; margin-inline: auto; text-align: center; }
.testimonial--quote { padding: 0; justify-items: center; }
.testimonial--quote .testimonial__quote { font-family: var(--font-heading); font-size: var(--step-3); line-height: 1.35; }
.testimonial--quote .rating { justify-content: center; }

/* ── FAQ ───────────────────────────────────────────────────────────── */
.faq__list { display: grid; max-width: 52rem; }
.faq__item { border-top: 1px solid var(--border); }
.faq__item:last-child { border-bottom: 1px solid var(--border); }
.faq__q {
  display: flex; align-items: center; justify-content: space-between; gap: var(--space-5);
  padding-block: var(--space-6); cursor: pointer; list-style: none;
  font-family: var(--font-heading); font-size: var(--step-1); font-weight: var(--fw-heading);
}
.faq__q::-webkit-details-marker { display: none; }
.faq__q:hover { color: var(--primary); }
.faq__chevron { width: 1.35rem; height: 1.35rem; flex: none; transition: transform .2s ease; color: var(--primary); }
.faq__item[open] .faq__chevron { transform: rotate(180deg); }
.faq__a { padding-bottom: var(--space-6); color: var(--text-muted); max-width: 70ch; }

/* ── CTA ───────────────────────────────────────────────────────────── */
.cta { background: var(--inverse-bg); color: var(--inverse-text); padding-block: var(--section-y); }
.cta.section + .section { padding-top: var(--section-y); }
/* The adjacent-section rule above collapses top padding so flowing sections
   don't double up, but it outranks .cta's own padding-block, and a filled band
   paints its own background — collapsing leaves the heading flush against a
   visible edge. The boxed variant is transparent, so it keeps the collapse. */
.section + .cta:not(.cta--boxed) { padding-top: var(--section-y); }
.cta__inner { display: grid; gap: var(--space-7); }
.cta__title { font-size: var(--step-4); color: var(--inverse-text); }
.cta__text { color: color-mix(in srgb, var(--inverse-text) 78%, transparent); margin-top: var(--space-4); font-size: var(--step-1); }
.cta__actions { display: flex; flex-wrap: wrap; gap: var(--space-4); }
.cta--boxed { background: transparent; color: var(--text); }
.cta--boxed .cta__box { background: var(--inverse-bg); color: var(--inverse-text); border-radius: var(--radius-lg); padding: clamp(2rem, 5vw, 3.5rem); }
.cta--boxed .cta__title { color: var(--inverse-text); }

/* ── Page header / breadcrumb / 404 ────────────────────────────────── */
.page-header { background: var(--surface); border-bottom: 1px solid var(--border); padding-block: clamp(2.5rem, 6vw, 4.5rem); }
.page-header__title { font-size: var(--step-5); font-weight: var(--fw-heading-strong); }
.page-header__intro { margin-top: var(--space-5); color: var(--text-muted); font-size: var(--step-1); max-width: 62ch; }
.breadcrumb { margin-bottom: var(--space-5); font-size: var(--step--1); }
.breadcrumb ol { display: flex; flex-wrap: wrap; gap: .5rem; list-style: none; padding: 0; color: var(--text-muted); }
.breadcrumb li + li::before { content: "/"; margin-inline-end: .5rem; opacity: .5; }
.breadcrumb a { color: var(--text-muted); }
.notfound { text-align: center; }
.notfound__title { font-size: var(--step-5); }
.notfound__text { margin-top: var(--space-5); color: var(--text-muted); }
.notfound .hero__actions { justify-content: center; }

/* ── Service detail ────────────────────────────────────────────────── */
.prose-layout { display: grid; gap: var(--space-9); }
.prose { max-width: 68ch; display: grid; gap: var(--space-5); }
.prose h2 { font-size: var(--step-2); margin-top: var(--space-6); }
.prose p { color: var(--text-muted); }
.sticky-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-7); display: grid; gap: var(--space-5); }
.sticky-card__title { font-size: var(--step-2); }
.sticky-card__price { font-size: var(--step-3); font-weight: var(--fw-heading-strong); color: var(--primary); font-family: var(--font-heading); }
.sticky-card__price span { display: block; font-size: var(--step--1); color: var(--text-muted); font-family: var(--font-body); font-weight: var(--fw-body); }
.sticky-card p { color: var(--text-muted); }
.service-detail__media { margin-top: var(--space-9); }

/* ── Contact ───────────────────────────────────────────────────────── */
.contact__grid { display: grid; gap: var(--space-9); align-items: start; }
.contact-list { list-style: none; padding: 0; display: grid; gap: var(--space-6); }
.contact-list li { display: flex; gap: var(--space-5); }
.contact-list__icon { flex: none; display: grid; place-items: center; width: 2.75rem; height: 2.75rem; border-radius: var(--radius); background: var(--primary-soft); color: var(--primary); }
.contact-list__icon .icon { width: 1.3rem; height: 1.3rem; }
.contact-list__label { display: block; font-size: var(--step--1); color: var(--text-muted); text-transform: uppercase; letter-spacing: .06em; }
.contact-list__value { font-size: var(--step-1); font-weight: var(--fw-bold); font-style: normal; color: var(--text); text-decoration: none; }
a.contact-list__value:hover { color: var(--primary); }
.contact-list__link { font-size: var(--step--1); display: inline-block; margin-top: .25rem; }
.hours { border-collapse: collapse; width: 100%; max-width: 20rem; font-size: var(--step--1); }
.hours th { text-align: start; font-weight: var(--fw-body); color: var(--text-muted); padding: .2rem 1.5rem .2rem 0; }
.hours td { text-align: end; padding: .2rem 0; }
.hours tr.is-closed td { color: var(--text-muted); }
.hours--inline { margin-top: .35rem; }
.contact__map { margin-top: var(--space-7); }
.contact__map-link { display: inline-flex; align-items: center; gap: .4rem; font-weight: var(--fw-bold); }
.contact__map-link .icon { width: 1.1em; height: 1.1em; }

.contact-form { display: grid; gap: var(--space-5); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: clamp(1.5rem, 4vw, 2.5rem); }
.field { display: grid; gap: .4rem; }
.field-row { display: grid; gap: var(--space-5); }
.field label { font-weight: var(--fw-bold); font-size: var(--step--1); }
.field input, .field textarea, .field select {
  width: 100%; padding: .75rem .9rem; border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong); background: var(--bg); color: var(--text);
  transition: border-color .15s ease, box-shadow .15s ease;
}
.field input:focus, .field textarea:focus, .field select:focus {
  outline: none; border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 22%, transparent);
}
.field textarea { resize: vertical; min-height: 8rem; }
.field input[aria-invalid="true"], .field textarea[aria-invalid="true"] { border-color: var(--danger); }
.field__error { color: var(--danger); font-size: var(--step--1); }
.contact-form__foot { display: grid; gap: var(--space-4); margin-top: var(--space-2); }
.contact-form__note { color: var(--text-muted); font-size: var(--step--1); }
.form-status { padding: var(--space-5); border-radius: var(--radius); font-size: var(--step--1); }
.form-status.is-ok { background: color-mix(in srgb, var(--success) 14%, transparent); color: var(--success); }
.form-status.is-error { background: color-mix(in srgb, var(--danger) 12%, transparent); color: var(--danger); }

/* ── Footer ────────────────────────────────────────────────────────── */
.site-footer { background: var(--surface); border-top: 1px solid var(--border); padding-block: var(--space-11) var(--space-8); margin-top: var(--section-y); }
.site-footer__inner { display: grid; gap: var(--space-9); grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr)); }
.footer__col--brand { display: grid; gap: var(--space-5); align-content: start; }
.footer__tagline { color: var(--text-muted); font-size: var(--step--1); max-width: 32ch; }
.footer__heading { font-size: var(--step-0); text-transform: uppercase; letter-spacing: .07em; color: var(--text-muted); font-weight: var(--fw-bold); margin-bottom: var(--space-5); font-family: var(--font-body); }
.footer__list { list-style: none; padding: 0; display: grid; gap: var(--space-4); }
.footer__list li { display: flex; gap: .6rem; align-items: flex-start; }
.footer__list .icon { width: 1.1em; height: 1.1em; color: var(--primary); flex: none; margin-top: .3em; }
.footer__list a { color: var(--text); text-decoration: none; }
.footer__list a:hover { color: var(--primary); text-decoration: underline; }
.footer__list address { font-style: normal; }
.footer__list--plain li { display: block; }
.footer__note { color: var(--text-muted); font-size: var(--step--2); margin-top: var(--space-4); }
.social { display: flex; gap: var(--space-3); list-style: none; padding: 0; }
.social a { display: grid; place-items: center; width: 2.5rem; height: 2.5rem; border-radius: var(--radius-pill); background: var(--surface-2); color: var(--text); }
.social a:hover { background: var(--primary); color: var(--on-primary); }
.social .icon { width: 1.15rem; height: 1.15rem; }
.site-footer__legal { margin-top: var(--space-10); padding-top: var(--space-7); border-top: 1px solid var(--border); display: grid; gap: var(--space-3); color: var(--text-muted); font-size: var(--step--1); }

/* ── Motion ────────────────────────────────────────────────────────── */
[data-reveal] { transform: translateY(14px); transition: transform .5s ease; }
[data-reveal].is-visible { transform: none; }
@media (prefers-reduced-motion: reduce) { [data-reveal] { transform: none; transition: none; } }

/* ── Breakpoints ───────────────────────────────────────────────────── */
@media (min-width: 40em) {
  .field-row { grid-template-columns: 1fr 1fr; }
  .cta__inner--split, .cta--band .cta__inner { grid-template-columns: 1fr auto; align-items: center; }
  .site-footer__legal { grid-template-columns: 1fr auto; align-items: center; }
}
@media (min-width: 52em) {
  .header__phone { display: inline-flex; }
  .hero--split .hero__inner { grid-template-columns: 1.05fr .95fr; }
  .about__grid { grid-template-columns: 1.05fr .95fr; }
  .about__grid--single { grid-template-columns: 1fr; }
  .contact__grid { grid-template-columns: .85fr 1.15fr; }
  .prose-layout { grid-template-columns: 1.6fr .8fr; }
  .prose-aside { position: sticky; top: calc(var(--header-h) + 1.5rem); }
}
@media (min-width: 64em) {
  .nav { display: block; }
  .nav-toggle { display: none; }
  .header__cta { display: inline-flex; }
  .mobile-nav { display: none !important; }
  .hero__media--empty { display: block; }
}
@media print {
  .site-header, .mobile-nav, .cta, .contact-form, .nav-toggle, .skip-link { display: none !important; }
  body { color: #000; background: #fff; }
  a[href^="http"]::after { content: " (" attr(href) ")"; font-size: .8em; }
}
`;

/** Assemble the full stylesheet: tokens, base rules, theme extras, dark mode. */
export function buildStylesheet(theme, { brand = {}, mode = 'light', darkMode = 'auto' } = {}) {
  const light = compileTokens(theme, { brand, mode: mode === 'dark' ? 'dark' : 'light' });
  const parts = [
    `/* ${theme.name} — generated by Avo. Do not edit by hand. */`,
    tokensToCss(light.vars),
  ];

  const warnings = [...light.warnings];

  // The opposite mode, offered either automatically or via the manual toggle.
  if (darkMode !== 'off') {
    const other = compileTokens(theme, { brand, mode: mode === 'dark' ? 'light' : 'dark' });
    warnings.push(...other.warnings);
    const otherName = mode === 'dark' ? 'light' : 'dark';
    if (darkMode === 'auto') {
      parts.push(`@media (prefers-color-scheme: ${otherName}) {\n${tokensToCss(other.vars, '  :root:not([data-theme])')}\n}`);
    }
    parts.push(tokensToCss(other.vars, `:root[data-theme="${otherName}"]`));
    parts.push(tokensToCss(light.vars, `:root[data-theme="${mode === 'dark' ? 'dark' : 'light'}"]`));
  }

  parts.push(logoSwapCss({ mode, darkMode }));
  parts.push(BASE_CSS.trim());
  if (theme.extras?.css) parts.push(`/* ${theme.name} theme details */\n${theme.extras.css.trim()}`);

  return { css: parts.join('\n\n') + '\n', warnings: [...new Set(warnings)] };
}

/**
 * Show the logo master that suits the current background. Mirrors the token
 * selectors above exactly, so the swap follows both `prefers-color-scheme` and
 * the manual `[data-theme]` toggle.
 */
function logoSwapCss({ mode = 'light', darkMode = 'auto' } = {}) {
  const baseName = mode === 'dark' ? 'dark' : 'light';
  const otherName = baseName === 'dark' ? 'light' : 'dark';
  const show = (n) => `.logo__img--${n} { display: inline-block; }`;
  const hide = (n) => `.logo__img--${n} { display: none; }`;
  const swap = (prefix) => `${prefix} ${show(otherName)}\n${prefix} ${hide(baseName)}`;

  const out = [`/* Logo masters: ${baseName} background by default */`, hide(otherName)];
  if (darkMode !== 'off') {
    if (darkMode === 'auto') {
      out.push(`@media (prefers-color-scheme: ${otherName}) {\n  ${swap(':root:not([data-theme])').replace(/\n/g, '\n  ')}\n}`);
    }
    out.push(swap(`:root[data-theme="${otherName}"]`));
    out.push(`:root[data-theme="${baseName}"] ${show(baseName)}\n:root[data-theme="${baseName}"] ${hide(otherName)}`);
  }
  return out.join('\n');
}

/** Crude but effective minifier: safe for the CSS we generate ourselves. */
export function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .replace(/\s+/g, ' ')
    .trim();
}
