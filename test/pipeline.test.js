import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import fsp from 'node:fs/promises';
import { parseHtml, qs, qsa, attr, rawText, cleanText } from '../src/util/html.js';
import { normalizeProfile } from '../src/profile/normalize.js';
import { validateProfile, scoreProfile } from '../src/profile/validate.js';
import { buildSite } from '../src/render/index.js';
import { THEME_IDS, getTheme, suggestTheme } from '../src/themes/index.js';
import { compileTokens, fontFaceCss, fontFilesFor } from '../src/themes/tokens.js';
import { contrast } from '../src/util/color.js';
import { relativeUrl, planPages } from '../src/shell/pages.js';
import { Robots } from '../src/harvest/fetcher.js';
import { extractContact, extractAddress } from '../src/harvest/extract/contact.js';
import { collectJsonLd, jsonLdToProfile } from '../src/harvest/extract/jsonld.js';
import { extractServices, extractFaqs, extractTestimonials } from '../src/harvest/extract/content.js';
import { extractImages } from '../src/harvest/extract/media.js';
import { walk } from '../src/util/fs.js';
import { image, brandLogo } from '../src/shell/components.js';
import { schemaType } from '../src/render/seo.js';

const sampleProfile = () => normalizeProfile({
  business: { name: 'Test Trades Co', category: 'HVAC contractor', description: 'We fix things.', serviceArea: ['Springfield'] },
  contact: {
    phone: '2175550142', email: 'a@b.com',
    address: { street: '1 Main St', city: 'Springfield', region: 'IL', postalCode: '62701' },
    hours: [{ day: 'monday', open: '8:00 AM', close: '5:00 PM' }, { day: 'sunday', closed: true }],
  },
  content: {
    hero: { headline: 'Heat back on the same day', subhead: 'Fast HVAC repair.', primaryCta: { label: 'Get a quote', href: 'contact/' } },
    about: { body: ['We have been doing this a while.', 'Second paragraph here.'] },
    valueProps: [{ icon: 'clock', title: 'Fast', text: 'Same day.' }],
  },
  services: [
    { name: 'AC Repair', summary: 'We repair air conditioners quickly and properly.' },
    { name: 'Furnace Install', summary: 'We install furnaces sized for your home.' },
  ],
  gallery: [{ src: 'a.jpg', alt: 'One' }, { src: 'b.jpg', alt: 'Two' }, { src: 'c.jpg', alt: 'Three' }],
  testimonials: [{ quote: 'They were excellent and turned up exactly when they said they would.', author: 'Bob' }],
  faqs: [{ question: 'Emergency service?', answer: 'Yes, around the clock.' }],
  team: [{ name: 'Ed', role: 'Owner' }],
  site: { domain: 'https://example.com', theme: 'forge' },
});

test('normalizer coerces messy input into a valid profile', () => {
  const p = normalizeProfile({
    business: { name: '  Joe\'s   HVAC ', serviceArea: ['Springfield', 'springfield'] },
    contact: { phone: '555.867.5309', emails: ['A@B.com', 'a@b.com'] },
    services: [{ name: 'AC REPAIR' }, { title: 'Furnace' }],
    brand: { colors: { primary: 'rgb(37,99,235)' } },
  });
  assert.equal(p.business.name, "Joe's HVAC");
  assert.deepEqual(p.business.serviceArea, ['Springfield'], 'dedupes case-insensitively');
  assert.deepEqual(p.contact.emails, ['a@b.com']);
  assert.equal(p.services[0].slug, 'ac-repair');
  assert.equal(p.services[0].name, 'AC Repair');
  assert.equal(p.brand.colors.primary, '#2563eb');
});

test('validator blocks a build without a name, headline or contact route', () => {
  const empty = normalizeProfile({});
  const r = validateProfile(empty);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('business.name')));
  assert.ok(r.errors.some((e) => e.includes('hero.headline')));
  assert.ok(r.errors.some((e) => e.includes('make contact')));
});

test('completeness score rises as the profile fills in', () => {
  assert.ok(scoreProfile(normalizeProfile({})).percent < 10);
  assert.ok(scoreProfile(sampleProfile()).percent > 70);
});

test('robots.txt is honoured, longest match wins', () => {
  const r = Robots.parse('User-agent: *\nDisallow: /admin/\nAllow: /admin/public/\nDisallow: /*.pdf$');
  assert.equal(r.isAllowed('https://e.com/about'), true);
  assert.equal(r.isAllowed('https://e.com/admin/x'), false);
  assert.equal(r.isAllowed('https://e.com/admin/public/x'), true);
  assert.equal(r.isAllowed('https://e.com/a.pdf'), false);
  assert.equal(Robots.parse('').isAllowed('https://e.com/anything'), true);
});

test('contact extraction: tel: links rank first, fax excluded, hours parsed', () => {
  const doc = parseHtml(`<body><a href="tel:+12175550142">(217) 555-0142</a>
    <a href="mailto:x@y.com">mail</a>
    <p>Serving since 1987. Fax: 217 555 0143.</p>
    <div class="hours">Mon - Fri: 7:00am - 5:30pm<br>Saturday: 8am - 12pm<br>Sunday: Closed</div></body>`);
  const c = extractContact(doc);
  assert.equal(c.phones[0].confidence, 'high');
  assert.ok(!c.phones.some((p) => p.value.includes('0143')), 'fax number excluded');
  assert.equal(c.emails[0].value, 'x@y.com');
  assert.equal(c.hours.hours.length, 7);
  assert.equal(c.hours.hours.find((h) => h.day === 'sunday').closed, true);
  assert.equal(c.hours.hours.find((h) => h.day === 'monday').open, '7:00 AM');
});

test('JSON-LD LocalBusiness maps onto the profile', () => {
  const json = { '@type': 'HVACBusiness', name: 'X', telephone: '555', address: { '@type': 'PostalAddress', addressLocality: 'Springfield' }, openingHoursSpecification: [{ dayOfWeek: ['Monday'], opens: '08:00', closes: '17:00' }] };
  const doc = parseHtml(`<script type="application/ld+json">${JSON.stringify(json)}</script>`);
  const patch = jsonLdToProfile(collectJsonLd(doc));
  assert.equal(patch.business.name, 'X');
  assert.equal(patch.contact.address.city, 'Springfield');
  assert.equal(patch.contact.hours[0].open, '8:00 AM');
});

test('content extraction finds repeated card structures', () => {
  const doc = parseHtml(`<main><h2>Our Services</h2><div class="services">
    <div class="s"><h3>One</h3><p>First service description here.</p></div>
    <div class="s"><h3>Two</h3><p>Second service description here.</p></div>
    <div class="s"><h3>Three</h3><p>Third service description here.</p></div></div>
    <h3>Do you offer emergency service?</h3><p>Yes we do, at all hours.</p>
    <blockquote>They did a genuinely excellent job on our system.<cite>- Ann</cite></blockquote></main>`);
  assert.equal(extractServices(doc).length, 3);
  assert.equal(extractFaqs(doc).length, 1);
  assert.equal(extractTestimonials(doc)[0].author, 'Ann');
});

test('mailto: links are never mistaken for services', () => {
  const doc = parseHtml('<main><a href="mailto:service@x.com">service@x.com</a></main>');
  assert.equal(extractServices(doc).length, 0);
});

test('relative URLs resolve from any page depth', () => {
  assert.equal(relativeUrl('', 'about/'), 'about/');
  assert.equal(relativeUrl('about/', ''), '../');
  assert.equal(relativeUrl('services/ac/', 'contact/'), '../../contact/');
  assert.equal(relativeUrl('404.html', ''), './');
});

test('page plan skips sections with no content', () => {
  const thin = normalizeProfile({ business: { name: 'X' }, contact: { phone: '5551234567' }, content: { hero: { headline: 'Hi there' } } });
  const pages = planPages(thin);
  assert.ok(pages.some((p) => p.slug === 'home'));
  assert.ok(pages.some((p) => p.slug === 'contact'));
  assert.ok(!pages.some((p) => p.slug === 'gallery'), 'no gallery page without images');
  assert.ok(!pages.some((p) => p.parent === 'services'), 'no service pages without services');
});

test('every theme passes WCAG in both modes', () => {
  for (const id of THEME_IDS) {
    for (const mode of ['light', 'dark']) {
      const { vars } = compileTokens(getTheme(id), { mode });
      const checks = [
        ['text/bg', vars['--text'], vars['--bg'], 7],
        ['muted/bg', vars['--text-muted'], vars['--bg'], 4.5],
        ['onPrimary/primary', vars['--on-primary'], vars['--primary'], 4.5],
        ['onAccent/accent', vars['--on-accent'], vars['--accent'], 4.5],
        ['inverse', vars['--inverse-text'], vars['--inverse-bg'], 7],
      ];
      for (const [label, fg, bg, min] of checks) {
        assert.ok(contrast(fg, bg) >= min, `${id} ${mode} ${label}: ${contrast(fg, bg).toFixed(2)} < ${min}`);
      }
    }
  }
});

test('an unreadable brand colour is corrected rather than accepted', () => {
  const { vars, warnings } = compileTokens(getTheme('meridian'), { brand: { colors: { primary: '#ffe600' } }, mode: 'light' });
  assert.ok(contrast(vars['--primary'], vars['--bg']) >= 4.5);
  assert.ok(warnings.length > 0, 'the adjustment is reported');
});

test('every image carries an alt attribute, decorative ones included', () => {
  // A decorative image says so with alt="". No alt at all is a different thing
  // entirely — a screen reader reads out the filename. attrs() drops empty
  // strings, so brandLogo's deliberate empty alt used to vanish on the way to
  // the markup and nothing caught it.
  assert.match(image('/a.png', ''), /\salt=""/, 'empty alt is written, not dropped');
  assert.match(image('/a.png', undefined), /\salt=""/, 'a missing alt still produces one');
  assert.match(image('/a.png', 'A carved stone'), /\salt="A carved stone"/);

  const logo = brandLogo(
    { brand: { logo: '/light.svg', logoDark: '/dark.svg' }, business: { name: 'Acme' } },
    (s) => s,
  );
  const imgs = qsa(parseHtml(logo), 'img');
  assert.equal(imgs.length, 2, 'both light and dark masters are emitted');
  for (const img of imgs) {
    assert.notEqual(attr(img, 'alt'), null, 'every logo copy has an alt attribute');
  }
  assert.equal(attr(imgs[0], 'alt'), 'Acme logo', 'the first carries the accessible name');
  assert.equal(attr(imgs[1], 'alt'), '', 'the second is explicitly decorative');
});

test('schema type never claims a trade the business is not in', () => {
  // A cleaning company was being marked up as a HousePainter, and a
  // photographer as a Photograph (which is the picture, not the business).
  // Every type returned must be a schema.org LocalBusiness subtype or the
  // LocalBusiness/ProfessionalService fallbacks — never a CreativeWork, and
  // never a sibling trade picked because it looked close enough.
  assert.equal(schemaType('Cleaning service'), 'HomeAndConstructionBusiness');
  assert.equal(schemaType('Domestic cleaning'), 'HomeAndConstructionBusiness');
  assert.notEqual(schemaType('Cleaning service'), 'HousePainter');
  assert.equal(schemaType('Photographer'), 'ProfessionalService');
  assert.notEqual(schemaType('Photographer'), 'Photograph');
  assert.equal(schemaType('House painter'), 'HousePainter', 'the painter type belongs to painters');
  assert.equal(schemaType('Painter and decorator'), 'HousePainter');
  // 'spa' matched inside 'spares', so a printer spare-parts distributor
  // was marked up as a day spa.
  assert.equal(schemaType('Spare parts distribution and repair'), 'LocalBusiness');
  assert.notEqual(schemaType('Printer spares distributor'), 'DaySpa');
  assert.equal(schemaType('Day spa'), 'DaySpa', 'real spas keep their type');
  assert.equal(schemaType('Massage therapy'), 'DaySpa');
  assert.equal(schemaType(''), 'LocalBusiness');
});

test('theme suggestion weights category above service names', () => {
  assert.equal(suggestTheme({ business: { category: 'family dentist' }, services: [{ name: 'Cleanings' }] }).theme, 'meridian');
  assert.equal(suggestTheme({ business: { category: 'HVAC contractor' } }).theme, 'forge');
});

test('a full build produces valid, self-consistent output', async () => {
  const outDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'avo-build-'));
  try {
    const result = await buildSite(sampleProfile(), { themeId: 'forge', outDir, siteUrl: 'https://example.com', minify: false });
    assert.ok(result.pages.length >= 5);

    const files = await walk(outDir);
    for (const expected of ['index.html', 'styles.css', 'site.js', 'favicon.svg', 'sitemap.xml', 'robots.txt', 'site.webmanifest']) {
      assert.ok(files.includes(expected), `missing ${expected}`);
    }

    const home = parseHtml(await fsp.readFile(path.join(outDir, 'index.html'), 'utf8'));
    assert.equal(qsa(home, 'h1').length, 1, 'exactly one h1');
    assert.equal(attr(qs(home, 'html'), 'lang'), 'en');
    assert.ok(qs(home, 'main'), 'has a main landmark');
    assert.ok(qs(home, 'meta[name=viewport]'), 'has a viewport meta');
    assert.ok(cleanText(qs(home, 'title')).length > 0);

    const ld = JSON.parse(rawText(qs(home, 'script[type="application/ld+json"]')));
    const biz = ld['@graph'].find((n) => n['@type'] === 'HVACBusiness');
    assert.ok(biz, 'LocalBusiness node present with the mapped type');
    assert.equal(biz.address.addressLocality, 'Springfield');
    assert.ok(biz.openingHoursSpecification.length >= 1);

    for (const img of qsa(home, 'img')) {
      assert.notEqual(attr(img, 'alt'), null, 'every image has alt text');
    }
    for (const field of qsa(home, 'input, textarea, select')) {
      const type = (attr(field, 'type') || '').toLowerCase();
      if (['hidden', 'submit'].includes(type)) continue;
      const id = attr(field, 'id');
      const labelled = id && qsa(home, `label[for=${id}]`).length > 0;
      assert.ok(labelled || field.parent?.tag === 'label', `unlabelled field ${attr(field, 'name')}`);
    }

    const sitemap = await fsp.readFile(path.join(outDir, 'sitemap.xml'), 'utf8');
    assert.ok(sitemap.includes('https://example.com/'));
    assert.ok(!sitemap.includes('404.html'), '404 excluded from the sitemap');
  } finally {
    await fsp.rm(outDir, { recursive: true, force: true });
  }
});

test('every section that shows an image serves the responsive variants', async () => {
  // Only the hero used to pass its variants through, so cards, the gallery,
  // the about section and team photos loaded the full original. On the first
  // real site that meant two 400KB JPEGs on the home page while 22KB WebP
  // versions sat unused beside them.
  let sharp;
  try { sharp = (await import('sharp')).default; } catch { return; } // optional dep: skip, don't fail
  const clientDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'avo-client-'));
  const outDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'avo-variants-'));
  try {
    await fsp.mkdir(path.join(clientDir, 'assets'), { recursive: true });
    for (const name of ['hero', 'svc', 'about', 'gal', 'team', 'logo']) {
      await sharp({ create: { width: 1200, height: 800, channels: 3, background: '#888' } })
        .jpeg().toFile(path.join(clientDir, 'assets', `${name}.jpg`));
    }
    const profile = sampleProfile();
    profile.brand.logo = 'assets/logo.jpg';
    profile.content.hero.image = 'assets/hero.jpg';
    profile.content.about.image = 'assets/about.jpg';
    profile.services[0].image = 'assets/svc.jpg';
    profile.gallery = [{ src: 'assets/gal.jpg', alt: 'One' }, { src: 'assets/gal.jpg', alt: 'Two' }, { src: 'assets/gal.jpg', alt: 'Three' }];
    profile.team = [{ name: 'Ed', role: 'Owner', photo: 'assets/team.jpg' }];
    await buildSite(profile, { themeId: 'forge', outDir, siteUrl: 'https://example.com', minify: false, clientDir });

    const home = parseHtml(await fsp.readFile(path.join(outDir, 'index.html'), 'utf8'));
    const withoutSrcset = qsa(home, 'img')
      .filter((img) => /assets\/(hero|svc|about|gal|team|logo)\.jpg/.test(attr(img, 'src') || ''))
      .filter((img) => !attr(img, 'srcset'))
      .map((img) => attr(img, 'src'));
    assert.deepEqual(withoutSrcset, [], 'every content image carries a srcset');

    const detail = parseHtml(await fsp.readFile(path.join(outDir, 'services', 'ac-repair', 'index.html'), 'utf8'));
    const detailImg = qsa(detail, 'img').find((img) => /svc\.jpg/.test(attr(img, 'src') || ''));
    assert.ok(detailImg && attr(detailImg, 'srcset'), 'the service detail image carries a srcset too');

    // The header logo is eager and fetchpriority=high, so it is the first
    // request on every page. A harvested logo is routinely a multi-megapixel
    // JPEG: one client's was 773KB for a mark displayed 220px wide.
    const logos = qsa(home, 'img.logo__img');
    assert.ok(logos.length >= 2, 'header and footer both render the logo');
    assert.ok(attr(logos[0], 'srcset'), 'the header logo carries a srcset');
    assert.equal(attr(logos[0], 'loading'), 'eager');
    assert.ok(attr(logos.at(-1), 'srcset'), 'so does the footer logo');
  } finally {
    await fsp.rm(outDir, { recursive: true, force: true });
    await fsp.rm(clientDir, { recursive: true, force: true });
  }
});

test('every theme self-hosts its fonts and reaches no third-party origin', async () => {
  // Loading fonts from Google cost two extra origins and a chain the browser
  // cannot shorten — it must fetch the stylesheet before it learns the font
  // URL. On a real build that put first paint at 3.0s; self-hosted it is 1.4s.
  // A theme that quietly went back to Google would undo that invisibly.
  for (const id of THEME_IDS) {
    const theme = getTheme(id);
    const families = new Set(
      [theme.fonts.heading, theme.fonts.body].filter((f) => f.google).map((f) => f.google),
    );
    const css = fontFaceCss(theme);
    const files = fontFilesFor(theme);

    if (!families.size) {
      assert.equal(css, '', `${id} ships no webfont, so it should emit no @font-face`);
      assert.deepEqual(files, [], `${id} should need no font files`);
      continue;
    }
    assert.ok(css.includes('@font-face'), `${id} declares fonts but emits no @font-face`);
    assert.ok(files.length > 0, `${id} emits @font-face but copies no files`);
    assert.ok(!/fonts\.(googleapis|gstatic)/.test(css), `${id} still points at Google`);
    for (const family of families) {
      assert.ok(css.includes(`font-family: '${family}'`), `${id} is missing a face for ${family}`);
    }
    // Declared and copied must agree, or a page renders in the fallback stack.
    const referenced = [...css.matchAll(/url\('fonts\/([^']+)'\)/g)].map((m) => m[1]);
    assert.deepEqual([...new Set(referenced)].sort(), [...new Set(files)].sort(),
      `${id} references different files from the ones it copies`);
  }
});

test('a built site loads no third-party font, and the files are really there', async () => {
  const outDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'avo-fonts-'));
  try {
    await buildSite(sampleProfile(), { themeId: 'forge', outDir, siteUrl: 'https://example.com', minify: false });
    const css = await fsp.readFile(path.join(outDir, 'styles.css'), 'utf8');
    const html = await fsp.readFile(path.join(outDir, 'index.html'), 'utf8');

    assert.ok(!/fonts\.googleapis|fonts\.gstatic/.test(html), 'no Google font link in the markup');
    assert.ok(!/fonts\.googleapis|fonts\.gstatic/.test(css), 'no Google font import in the stylesheet');
    assert.ok(css.includes('@font-face'), 'the stylesheet declares its own faces');

    const files = await walk(outDir);
    for (const m of css.matchAll(/url\('fonts\/([^']+)'\)/g)) {
      assert.ok(files.includes(path.join('fonts', m[1])), `${m[1]} declared but not copied into the build`);
    }
  } finally {
    await fsp.rm(outDir, { recursive: true, force: true });
  }
});

test('srcset candidates resolve from the page that uses them', async () => {
  // A variant path is stored relative to the site root. Handed over raw it put
  // "assets/…" into a srcset on /gallery/, which resolves to
  // /gallery/assets/… — and because a matching srcset candidate beats src, the
  // image broke even though src itself was correct. It only showed on nested
  // pages, which is why it survived a homepage check.
  let sharp;
  try { sharp = (await import('sharp')).default; } catch { return; }
  const clientDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'avo-srcset-client-'));
  const outDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'avo-srcset-'));
  try {
    await fsp.mkdir(path.join(clientDir, 'assets'), { recursive: true });
    await sharp({ create: { width: 1200, height: 800, channels: 3, background: '#777' } })
      .jpeg().toFile(path.join(clientDir, 'assets', 'shot.jpg'));
    const profile = sampleProfile();
    profile.gallery = [1, 2, 3].map((n) => ({ src: 'assets/shot.jpg', alt: `Photo ${n}` }));
    await buildSite(profile, { themeId: 'forge', outDir, siteUrl: 'https://example.com', minify: false, clientDir });

    const html = await fsp.readFile(path.join(outDir, 'gallery', 'index.html'), 'utf8');
    const sets = [...html.matchAll(/srcset="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(sets.length > 0, 'the gallery page serves a srcset');
    const files = await walk(outDir);
    for (const set of sets) {
      for (const candidate of set.split(',')) {
        const url = candidate.trim().split(/\s+/)[0];
        assert.ok(url.startsWith('../'), `srcset "${url}" is not resolved for a nested page`);
        const onDisk = url.replace(/^\.\.\//, '').split('/').join(path.sep);
        assert.ok(files.includes(onDisk), `srcset points at ${url}, which is not in the build`);
      }
    }
  } finally {
    await fsp.rm(outDir, { recursive: true, force: true });
    await fsp.rm(clientDir, { recursive: true, force: true });
  }
});

test('no page repeats its own h1 as an h2', async () => {
  // Eight of twelve pages did. `config.heading ?? 'Our work'` cannot express
  // "no heading" — null is exactly what ?? falls through on — so a section kept
  // printing the title the page header had already used as the h1.
  const outDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'avo-headings-'));
  try {
    // The sample must reach every page type, or the check passes by not
    // building the page that is broken — which is exactly how the case studies
    // page kept its duplicate heading after the first three were fixed.
    // Re-normalised, because the renderer's contract is that it only ever sees
    // a normalised profile — bolting raw objects onto an already-normalised one
    // produces shapes that cannot occur in a real build.
    const profile = normalizeProfile({
      ...sampleProfile(),
      gallery: [1, 2, 3].map((n) => ({ src: `p${n}.jpg`, alt: `Photo ${n}` })),
      caseStudies: [{
        slug: 'a-rebuild', client: 'Someone', summary: 'What changed and by how much.',
        before: ['It was slow.'], after: ['It is not.'],
        metrics: [{ label: 'Speed', before: '61', after: '97' }],
      }],
      legal: [{
        slug: 'privacy', title: 'Privacy policy',
        sections: [{ heading: 'Who we are', body: ['A paragraph.'] }],
      }],
    });
    await buildSite(profile, { themeId: 'forge', outDir, siteUrl: 'https://example.com', minify: false });

    const built = (await walk(outDir)).filter((f) => f.endsWith('.html'));
    for (const expected of ['gallery', 'services', 'work', 'privacy']) {
      assert.ok(built.some((f) => f.includes(expected)), `the sample should build a ${expected} page`);
    }

    const text = (el) => cleanText(el);
    for (const rel of await walk(outDir)) {
      if (!rel.endsWith('.html')) continue;
      const doc = parseHtml(await fsp.readFile(path.join(outDir, rel), 'utf8'));
      const h1 = qsa(doc, 'h1').map(text);
      const repeated = qsa(doc, 'h2').map(text).filter((t) => t && h1.includes(t));
      assert.deepEqual(repeated, [], `${rel} repeats its h1 as an h2`);

      // Removing the duplicate heading left the cards beneath it at h3 with no
      // h2 above them, so the outline jumped h1 to h3 and the page lost two
      // points of accessibility. Fixing one heading bug made the other.
      const levels = [];
      (function walk(node) {
        for (const child of node.children ?? []) {
          if (/^h[1-6]$/.test(child.tag ?? '')) levels.push(Number(child.tag[1]));
          walk(child);
        }
      })(qs(doc, 'main') ?? doc);
      for (let i = 1; i < levels.length; i++) {
        assert.ok(
          levels[i] <= levels[i - 1] + 1,
          `${rel} skips a heading level: h${levels[i - 1]} straight to h${levels[i]}`,
        );
      }
    }
  } finally {
    await fsp.rm(outDir, { recursive: true, force: true });
  }
});

test('a service can override its sticky card strapline and CTA', async () => {
  const outDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'avo-strapline-'));
  try {
    const profile = sampleProfile();
    profile.business.tagline = 'Comfort, sorted.';
    profile.services[0].strapline = 'Cold air, same day.';
    profile.services[0].cta = { label: 'Book a callout' };
    await buildSite(profile, { themeId: 'forge', outDir, siteUrl: 'https://example.com', minify: false });

    const cardText = async (slug) => {
      const html = await fsp.readFile(path.join(outDir, 'services', slug, 'index.html'), 'utf8');
      return qsa(qs(parseHtml(html), '.sticky-card'), 'p').map(cleanText);
    };
    assert.ok((await cardText('ac-repair')).includes('Cold air, same day.'));
    assert.ok((await cardText('furnace-install')).includes('Comfort, sorted.'), 'falls back to the company tagline');

    const buttonText = async (slug) => {
      const html = await fsp.readFile(path.join(outDir, 'services', slug, 'index.html'), 'utf8');
      return cleanText(qs(qs(parseHtml(html), '.sticky-card'), 'a'));
    };
    assert.equal(await buttonText('ac-repair'), 'Book a callout');
    assert.equal(await buttonText('furnace-install'), 'Request a quote', 'falls back to the default label');
  } finally {
    await fsp.rm(outDir, { recursive: true, force: true });
  }
});

test('all six themes build without error', async () => {
  const profile = sampleProfile();
  for (const id of THEME_IDS) {
    const outDir = await fsp.mkdtemp(path.join(os.tmpdir(), `avo-${id}-`));
    try {
      const r = await buildSite(profile, { themeId: id, outDir, minify: true });
      assert.ok(r.files > 5, `${id} produced files`);
    } finally {
      await fsp.rm(outDir, { recursive: true, force: true });
    }
  }
});

test('cookie consent withholds the analytics tag until it is granted', async () => {
  const build = async (site) => {
    const outDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'avo-consent-'));
    const profile = normalizeProfile({ ...sampleProfile(), site: { ...sampleProfile().site, ...site } });
    await buildSite(profile, { themeId: 'forge', outDir, siteUrl: 'https://example.com', minify: false });
    const html = await fsp.readFile(path.join(outDir, 'index.html'), 'utf8');
    await fsp.rm(outDir, { recursive: true, force: true });
    return html;
  };

  // GA4 + consent on: the tag must be absent from the markup entirely, because a
  // banner that only announces already-set cookies would not comply.
  const gated = await build({ analytics: { plausible: '', ga4: 'G-TEST123' } });
  assert.ok(!gated.includes('googletagmanager.com'), 'gtag.js must not ship before consent');
  assert.ok(gated.includes('id="avo-consent"'), 'the measurement id should ship as inert JSON');
  assert.ok(gated.includes('id="avo-consent-banner"'), 'banner missing');
  assert.ok(gated.includes('data-consent="accept"') && gated.includes('data-consent="decline"'), 'both choices must be offered');
  assert.ok(gated.includes('data-consent="manage"'), 'withdrawing must be as easy as consenting');

  // Explicitly disabled: the owner has taken responsibility, so the tag ships inline.
  const ungated = await build({ analytics: { plausible: '', ga4: 'G-TEST123' }, consent: { enabled: false, policyUrl: '' } });
  assert.ok(ungated.includes('googletagmanager.com'), 'tag should ship when consent is disabled');
  assert.ok(!ungated.includes('id="avo-consent-banner"'), 'no banner when consent is disabled');

  // Plausible is cookieless, so it needs no banner and is never withheld.
  const plausible = await build({ analytics: { plausible: 'example.com', ga4: '' } });
  assert.ok(plausible.includes('plausible.io'), 'plausible should load unconditionally');
  assert.ok(!plausible.includes('id="avo-consent-banner"'), 'cookieless analytics needs no banner');

  // Nothing configured: no banner, no tags.
  const none = await build({ analytics: { plausible: '', ga4: '' } });
  assert.ok(!none.includes('id="avo-consent-banner"'), 'no analytics means no banner');
});

test('the consent banner links to the policy correctly from any page depth', async () => {
  const outDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'avo-policy-'));
  try {
    const base = sampleProfile();
    const profile = normalizeProfile({
      ...base,
      site: { ...base.site, analytics: { plausible: '', ga4: 'G-TEST123' }, consent: { enabled: true, policyUrl: 'privacy/' } },
      legal: [{ slug: 'privacy', title: 'Privacy policy', sections: [{ heading: 'Who we are', body: ['Us.'] }] }],
    });
    await buildSite(profile, { themeId: 'forge', outDir, siteUrl: 'https://example.com', minify: false });

    const files = await walk(outDir);
    assert.ok(files.includes(path.join('privacy', 'index.html')), 'legal page not built');

    const grab = async (rel) => {
      const html = await fsp.readFile(path.join(outDir, rel), 'utf8');
      return attr(qs(parseHtml(html), 'a.consent__link'), 'href');
    };
    // A bare "privacy/" on a nested page would resolve under that page.
    assert.equal(await grab('index.html'), 'privacy/');
    const nested = await grab(path.join('services', 'index.html'));
    assert.ok(nested.startsWith('../'), `nested banner link should climb out, got ${nested}`);

    // An absolute URL is left exactly as given.
    const outDir2 = await fsp.mkdtemp(path.join(os.tmpdir(), 'avo-policy-abs-'));
    const abs = normalizeProfile({
      ...base,
      site: { ...base.site, analytics: { plausible: '', ga4: 'G-T' }, consent: { enabled: true, policyUrl: 'https://example.org/privacy' } },
    });
    await buildSite(abs, { themeId: 'forge', outDir: outDir2, siteUrl: 'https://example.com', minify: false });
    const absHtml = await fsp.readFile(path.join(outDir2, 'index.html'), 'utf8');
    assert.equal(attr(qs(parseHtml(absHtml), 'a.consent__link'), 'href'), 'https://example.org/privacy');
    await fsp.rm(outDir2, { recursive: true, force: true });
  } finally {
    await fsp.rm(outDir, { recursive: true, force: true });
  }
});

test('a service page renders its steps and price tiers, and nothing when it has none', async () => {
  // steps[] and plans[] are optional. A service that declares neither must not
  // sprout an empty "How it goes" heading with no list under it.
  const profile = normalizeProfile({
    ...JSON.parse(JSON.stringify(sampleProfile())),
    services: [
      {
        name: 'AC Repair',
        summary: 'We repair air conditioners quickly and properly.',
        steps: [
          { title: 'We look at it', text: 'Same day where we can.' },
          { title: 'We quote it', text: 'In writing, before any work starts.' },
          { title: 'We fix it' },
        ],
        plans: [
          { name: 'Callout', price: 'From $89', period: 'per visit', summary: 'Diagnosis, then the quote.' },
          { name: 'Cover', price: '$19', period: 'a month', summary: 'Two services a year.', featured: true },
        ],
      },
      { name: 'Furnace Install', summary: 'We install furnaces sized for your home.' },
    ],
  });

  const outDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'avo-steps-'));
  try {
    await buildSite(profile, { themeId: 'forge', outDir, siteUrl: 'https://example.com', minify: false });

    const withBoth = parseHtml(await fsp.readFile(path.join(outDir, 'services', 'ac-repair', 'index.html'), 'utf8'));
    const steps = qsa(withBoth, 'ol.steps > li.step');
    assert.equal(steps.length, 3, 'every step rendered, in one ordered list');
    assert.equal(cleanText(qs(steps[0], '.step__title')), 'We look at it');
    assert.equal(qs(steps[2], '.step__text'), null, 'a step with no body text gets no empty paragraph');

    const plans = qsa(withBoth, 'ul.plans > li.plan');
    assert.equal(plans.length, 2);
    assert.equal(qsa(withBoth, '.plan--featured').length, 1, 'exactly one tier is highlighted');
    assert.ok(cleanText(qs(plans[0], '.plan__price')).includes('From $89'), 'the price stays the string it was given');

    const withNeither = parseHtml(await fsp.readFile(path.join(outDir, 'services', 'furnace-install', 'index.html'), 'utf8'));
    assert.equal(qs(withNeither, '.steps'), null);
    assert.equal(qs(withNeither, '.plans'), null);
    const headings = qsa(withNeither, 'h2').map((h) => cleanText(h));
    assert.ok(!headings.includes('How it goes'), 'no heading without a list under it');
    assert.ok(!headings.includes('What it costs'));
  } finally {
    await fsp.rm(outDir, { recursive: true, force: true });
  }
});

test('a lazy-loaded image is harvested from data-src, not skipped for its placeholder', () => {
  // W3 Total Cache and most WordPress lazy loaders put an inline SVG data: URI
  // in src and the real file in data-src. Reading src first and then rejecting
  // it for being a data: URI dropped every image on the page — a whole site
  // harvested with no photographs and no logo.
  const placeholder = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3C%2Fsvg%3E';
  const doc = parseHtml(`<body>
    <img class="lazy" src="${placeholder}" data-src="/wp-content/uploads/logo.jpg" alt="Acme" id="logo" width="300" height="120">
    <img src="${placeholder}" data-srcset="/uploads/wide-400.jpg 400w, /uploads/wide-1200.jpg 1200w" alt="Workshop">
    <img src="/uploads/plain.jpg" alt="Plain">
  </body>`);

  const images = extractImages(doc, 'https://example.com/');
  const urls = images.map((i) => i.url);
  assert.equal(images.length, 3, 'every image survives its placeholder');
  assert.ok(urls.includes('https://example.com/wp-content/uploads/logo.jpg'));
  assert.ok(urls.includes('https://example.com/uploads/wide-1200.jpg'), 'widest data-srcset candidate wins');
  assert.ok(urls.includes('https://example.com/uploads/plain.jpg'), 'a plain src still works');
  assert.ok(!urls.some((u) => u.startsWith('data:')), 'no placeholder is kept as an image');
  assert.equal(images.find((i) => i.url.endsWith('logo.jpg'))?.role, 'logo');
});

test('a UK address is read from its postcode, and a US one still wins where it applies', () => {
  // There is no state code to anchor on in the UK, so the postcode does the
  // work. Unicomp's address sat on every page of the site and harvested as
  // nothing, which left the local SEO markup empty.
  const uk = extractAddress(parseHtml(
    '<body><footer>Call us Address Bourne Enterprise Centre, Wrotham Rd, Borough Green, Sevenoaks TN15 8DG</footer></body>',
  ));
  assert.equal(uk.address.postalCode, 'TN15 8DG');
  assert.equal(uk.address.city, 'Sevenoaks');
  assert.equal(uk.address.street, 'Bourne Enterprise Centre, Wrotham Rd, Borough Green');
  assert.equal(uk.address.country, 'GB');

  const us = extractAddress(parseHtml('<body><address>1 Main St, Springfield, IL 62701</address></body>'));
  assert.equal(us.address.country, 'US');
  assert.equal(us.address.region, 'IL');

  // Lowercase runs in cache-busting query strings look like postcodes; they
  // are not, and matching them used to invent an address out of a URL.
  assert.equal(extractAddress(parseHtml('<body><p>?ver=bd3d6ba style=e433be</p></body>')), null);
});

test('an image below the smallest breakpoint still gets a modern format', async () => {
  // Variants were skipped entirely under 640px wide, which conflates "needs
  // resizing" with "would benefit from WebP". Twenty of one client's twenty-six
  // images were under the threshold, including a 300px PNG shipping at 50KB.
  let sharp;
  try { sharp = (await import('sharp')).default; } catch { return; } // optional dep
  const clientDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'avo-small-'));
  const outDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'avo-small-out-'));
  try {
    await fsp.mkdir(path.join(clientDir, 'assets'), { recursive: true });
    // A 300px true-colour gradient: the photographic case, where PNG stores
    // every pixel and WebP does not. Random noise would be the wrong test —
    // nothing compresses it, so the size guard would correctly drop the
    // variant and the test would fail for a reason it is not about.
    const w = 300;
    const hgt = 275;
    const px = Buffer.alloc(w * hgt * 3);
    for (let y = 0; y < hgt; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 3;
        px[i] = (x * 255) / w;
        px[i + 1] = (y * 255) / hgt;
        px[i + 2] = ((x + y) * 255) / (w + hgt);
      }
    }
    await sharp(px, { raw: { width: w, height: hgt, channels: 3 } })
      .png().toFile(path.join(clientDir, 'assets', 'small.png'));

    const profile = normalizeProfile({
      ...sampleProfile(),
      gallery: [1, 2, 3].map(() => ({ src: 'assets/small.png', alt: 'A small picture' })),
    });
    profile.gallery = [{ src: 'assets/small.png', alt: 'A small picture' }];
    profile.content.hero.image = 'assets/small.png';
    await buildSite(profile, { themeId: 'forge', outDir, siteUrl: 'https://example.com', minify: false, clientDir });

    const built = await walk(path.join(outDir, 'assets'));
    const webp = built.find((f) => /small-\d+\.webp$/.test(f));
    assert.ok(webp, 'a WebP variant exists for an image narrower than 480px');

    const original = await fsp.stat(path.join(outDir, 'assets', 'small.png'));
    const variant = await fsp.stat(path.join(outDir, 'assets', webp));
    assert.ok(variant.size < original.size, 'the variant is smaller than what it replaces');

    const home = parseHtml(await fsp.readFile(path.join(outDir, 'index.html'), 'utf8'));
    const img = qsa(home, 'img').find((i) => /small\.png/.test(attr(i, 'src') || ''));
    assert.ok(attr(img, 'srcset')?.includes('.webp'), 'and the page offers it');
  } finally {
    await fsp.rm(outDir, { recursive: true, force: true });
    await fsp.rm(clientDir, { recursive: true, force: true });
  }
});
