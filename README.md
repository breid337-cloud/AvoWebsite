# Avo — small-business website rebuilder

Point it at a tired small-business website. It reads everything the site knows —
copy, services, contact details, opening hours, photos, brand colours, social
links — turns that into a structured business profile, and generates a modern,
responsive, accessible **static site** you can host anywhere and sell to the
business.

```
  old site ──▶  harvest  ──▶  profile.json  ──▶  build  ──▶  dist/  ──▶  deploy
                  │              ▲                  │
             raw.json       Claude Code        7 themes
             report.md      writes the copy
             BRIEF.md
```

## Why static

The generated site is plain HTML, CSS and JavaScript with relative links. No
build step, no Node runtime, no database. It works on cPanel shared hosting over
FTP, on Netlify, on Cloudflare Pages, on S3, or opened straight off a USB stick.
That keeps your hosting cost near zero and makes the handover to the client
trivial — which matters when you are selling these.

## Install

```bash
git clone <this repo> && cd AvoWebsite
node bin/avo.js doctor          # check the environment
npm link                        # optional: puts `avo` on your PATH
```

Node 20+. **No required dependencies.** Optional extras:

| Package | Enables |
| --- | --- |
| `sharp` | Responsive WebP image variants (`srcset`) |
| `basic-ftp` | `--target ftp` |
| `ssh2-sftp-client` | `--target sftp` |
| `playwright` | Harvesting sites that render their content with JavaScript |

## The workflow

### 1. Harvest the old site

```bash
avo harvest https://their-old-site.com --slug their-business
```

Crawls same-origin pages (respecting `robots.txt` and any crawl-delay it asks
for), seeded from `sitemap.xml` and ordered so home, about, services and contact
come first. From every page it extracts:

- **JSON-LD / schema.org** — the richest source when present: name, address,
  geo, phone, opening hours, `sameAs` links, reviews, FAQs
- **Contact details** — phones (`tel:` links ranked above text matches, fax
  numbers filtered out), emails, postal addresses, opening hours parsed from
  free text like `Mon – Fri: 8am – 5.30pm | Sat 9–1 | Sun Closed`
- **Content** — services, testimonials, FAQs, team members, found by detecting
  repeated card structures rather than relying on any one CMS's markup
- **Brand** — primary/secondary colours scored out of the stylesheets by
  property and selector weight, plus the real font stack
- **Media** — logo and hero detection, gallery images, tracking pixels and
  spacer GIFs discarded
- **An audit of the old site** — platform, mobile-friendliness, HTTPS, missing
  alt text, layout tables, Flash, missing structured data

Written to `clients/<slug>/`:

| File | What it is |
| --- | --- |
| `harvest/raw.json` | Everything found, per page |
| `harvest/report.md` | Human summary — **including the case for a rebuild, written to show the owner** |
| `profile.draft.json` | A buildable profile using the old copy verbatim |
| `BRIEF.md` | The enrichment brief for a Claude Code session |
| `assets/harvested/` | Downloaded images |

Social profiles are checked for public OpenGraph data. Facebook and Instagram
serve a login wall to anonymous requests — when that happens it is **reported as
blocked**, never guessed at, and the brief tells you exactly what to collect by
hand.

### 2. Write the copy (Claude Code)

The draft is the old site's words. This step turns them into marketing copy.

```
/avo-enrich their-business
```

The bundled [`avo-enrich`](.claude/skills/avo-enrich/SKILL.md) skill reads
`BRIEF.md` and writes `clients/<slug>/profile.json`.

It is under a hard rule: **never invent a verifiable fact.** No fabricated
testimonials, licence numbers, certifications, prices, guarantees, response
times or years in business. Fabricated reviews and credentials are illegal in
many jurisdictions and the exposure lands on the business you sold the site to.
Anything unverifiable goes into `_meta.todo` as a question for the owner — that
list becomes your kick-off call agenda.

Headlines, service descriptions, about copy and meta descriptions get rewritten
freely. That is the whole point of the step.

No Claude Code? Edit `profile.json` by hand — it is plain JSON, documented in
[`reference.md`](.claude/skills/avo-enrich/reference.md).

### 3. Build

```bash
avo check their-business                 # validate + completeness score
avo build their-business --theme forge
avo build their-business --all-themes    # one folder per theme to choose from
```

Output in `clients/<slug>/dist/<theme>/`:

- Semantic, accessible HTML — landmarks, skip link, one `<h1>` per page,
  labelled form fields, keyboard-operable accordion and lightbox
- One stylesheet generated from the theme's design tokens
- ~6 KB of vanilla JavaScript: mobile drawer, sticky header, lightbox, form
  validation, scroll reveal, "open now" badge
- `LocalBusiness` JSON-LD with hours, geo, services, aggregate rating;
  `FAQPage` and `BreadcrumbList` where they apply
- `sitemap.xml`, `robots.txt`, `site.webmanifest`, a generated SVG favicon
- Per-service pages at `/services/<slug>/` when there is enough content

Pages are only generated where content exists, so a thin client gets a coherent
small site rather than empty sections.

### 4. Preview and pitch

```bash
avo preview their-business --compare
```

Local server with a floating bar to switch themes live, flip light/dark, and
open the old site side by side. Built for showing a business owner the
difference.

### 5. Deploy

```bash
avo deploy their-business --target ftp
avo deploy their-business --target zip     # for a host with only a file manager
```

Targets: `folder`, `zip`, `rsync`, `ftp`, `sftp`, `netlify`.

Credentials go in `avo.secrets.json` (gitignored):

```json
{
  "deploy": {
    "their-business": {
      "target": "ftp",
      "host": "ftp.example.com",
      "user": "…",
      "password": "…",
      "remoteDir": "/public_html"
    }
  }
}
```

## Themes

Six, differing in layout and structure as well as colour — each defines its own
hero, services, testimonial, gallery and CTA variants.

| Theme | Character | Suits |
| --- | --- | --- |
| **Meridian** | Clean, credible, corporate | Law, accountancy, medical, dental, insurance, consultants |
| **Forge** | Heavy-duty, high contrast, condensed caps | HVAC, plumbing, electrical, roofing, construction, auto |
| **Bloom** | Soft cream, elegant serif, sage and rose | Salons, spas, wellness, florists, photographers |
| **Harvest** | Editorial serif over full-bleed photography | Restaurants, cafés, bakeries, bars, caterers |
| **Beacon** | Geometric, indigo gradients, generous radii | Agencies, software, startups, marketing |
| **Homestead** | Warm off-white, forest green, sturdy serif | Landscaping, cleaning, pest control, pet care, childcare |
| **Folio** | Navy and blue, white cards, no webfont at all | Software development, consultancies, B2B SaaS, professional services |

Folio is the house theme, carried over from the AvoSolution document design
system — [docs/themes/folio.md](docs/themes/folio.md) covers its palette, its
one hardcoded colour, and how to reuse it on another client.

```bash
avo themes                    # descriptions and layout variants
avo themes their-business     # which one suits this client
```

`avo harvest` suggests a theme from the business category, weighted so a
dentist offering "cleanings" is not classified as a cleaning company.

### Brand colours are contrast-checked, not trusted

A client's brand colour is applied and then **nudged in lightness, keeping its
hue, until it passes WCAG AA** against the background it sits on. A pale brand
yellow comes out darker for text use, and the build tells you it did that. Every
theme passes AA (AAA for body text) in both light and dark mode —
`avo doctor` verifies this.

## Verification

```bash
npm test                      # unit tests
avo doctor                    # environment + theme contrast self-test
```

The generated output has been checked with headless Chromium across
7 themes × 4 viewports (320/390/768/1440) × light and dark × 7 page types —
336 renders with no horizontal overflow and no JavaScript errors.

## Layout

```
bin/avo.js               CLI entry
src/
  cli/                   Commands, argument parsing, config
  harvest/               Fetcher (robots-aware), crawler, extractors, report
  profile/               Schema, normalizer, validator, completeness scoring
  themes/                Six themes + the design-token compiler
  shell/                 Page plan, sections, components, icons
  render/                HTML, CSS, JS, SEO, assets, build orchestrator
  preview/               Static server + theme switcher
  deploy/                folder, zip, rsync, ftp, sftp, netlify
  util/                  HTML parser, colour maths, text, URL, fs, logging
clients/<slug>/          Per-client working directory (gitignored)
test/fixtures/oldsite/   A deliberately dated site to test the harvester
```

No runtime dependencies: the HTML parser, selector engine, colour maths, static
server and CSS/JS minifiers are all in `src/util` and `src/render`.

## Legal and practical notes

- The crawler identifies itself, honours `robots.txt` and any crawl-delay, and
  rate-limits itself. `--ignore-robots` exists for sites you have permission to
  crawl; using it elsewhere is on you.
- Harvesting a site copies its content. You have the right to rebuild a site
  **for the business that owns it**. Get that engagement in writing before you
  publish anything.
- Photographs on the old site may be stock images the business licensed, or may
  not be licensed at all. Confirm rights before reusing them, or replace them.
- Check the generated copy before it goes live. It is good, but a business owner
  signing off on claims about their own company should read them first.

## Known limitations

- **JavaScript-rendered sites** (heavy React/Wix builds) return little to the
  plain fetcher. Install `playwright` for those.
- **Facebook and Instagram** are login-walled to anonymous requests. Nothing is
  invented — the gap is reported and handed to you as a manual step.
- **Address parsing is US-format** (`street, city, ST 12345`). Other formats
  fall back to whatever JSON-LD or microdata the site provides.
- **No CMS.** Clients cannot edit the site themselves; you rebuild and redeploy.
  That is a deliberate trade for zero hosting cost and zero maintenance.

## Development

```bash
npm test              # unit + integration (node:test, no browser needed)
npm run test:visual   # headless Chromium: responsive, a11y and JS-error sweep
npm run doctor        # environment + theme contrast self-test
```

`npm test` and the CLI itself need nothing installed. `npm run test:visual`
needs the one devDependency (`playwright`); it renders every theme across four
viewports in both colour schemes and fails on horizontal overflow, JavaScript
errors, missing or duplicated `<h1>`, or content left hidden by the scroll-reveal.
