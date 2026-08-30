# Profile field reference

Shape of `clients/<slug>/profile.json`. Every key exists in
`profile.draft.json` already — this explains what each one drives.

## business

| Field | Drives |
| --- | --- |
| `name` | Header wordmark, footer, every page title, schema.org `name` |
| `legalName` | Footer copyright line only |
| `tagline` | Header sub-line, hero eyebrow, footer |
| `category` | **schema.org type** and theme suggestion. Be specific: "HVAC contractor", not "services" |
| `description` | Meta description fallback, about intro |
| `founded` | "Serving since ____" and the years-in-business stat |
| `serviceArea[]` | Footer "Serving …", schema.org `areaServed`. Big local-SEO win |
| `licenses[]` | Footer line. Only from the source |
| `priceRange` | schema.org `priceRange` (`$`, `$$`, `$$$`) |

## contact

`phone`, `email`, `address.{street,street2,city,region,postalCode,country}`,
`geo.{lat,lng}`, `bookingUrl`, `mapsUrl`, `hoursNote`.

`hours[]` — one entry per day:
```json
{ "day": "monday", "open": "8:00 AM", "close": "5:30 PM", "closed": false }
```
Closed days: `{ "day": "sunday", "closed": true }`. Add `note` for
"By appointment". Powers the footer table, schema.org hours and the "Open now"
badge.

## brand

`logo`, `logoDark`, `favicon` — paths relative to the client folder, e.g.
`assets/harvested/logo-01-logo.gif`.

`colors.{primary,secondary,accent}` — hex. Leave blank to use the theme's own
palette. Anything you set is contrast-checked and nudged until it passes WCAG AA,
so a pale brand yellow will come out darker than supplied.

`fonts.{heading,body}` — informational; themes pick their own typefaces.

## content

```jsonc
"hero": {
  "headline": "Heat back on the same day, guaranteed in writing",
  "subhead":  "Family-run HVAC repair and installation across Springfield since 1987.",
  "image":    "assets/harvested/hero-02-hero.jpg",
  "imageAlt": "Technician servicing a furnace in a Springfield basement",
  "primaryCta":   { "label": "Get a free estimate", "href": "contact/" },
  "secondaryCta": { "label": "See our services",    "href": "services/" },
  "badges": ["NATE certified", "24/7 emergency callouts"]
}
```

`about.{heading,body[],image,highlights[]}` — `body` is an array of paragraphs.

`valueProps[]` — `{ icon, title, text }`. Icons: `checkCircle`, `shield`,
`clock`, `award`, `users`, `wrench`, `sparkle`, `star`, `calendar`, `phone`,
`pin`.

`stats[]` — `{ value: "38", label: "Years in business" }`. Source-backed only.

`closingCta` — `{ heading, text, primaryCta }` for the band above the footer.

## services[]

```jsonc
{
  "slug": "ac-repair",
  "name": "Air conditioning repair",
  "summary": "Same-day diagnosis and repair for every major brand, with common parts stocked on the van.",
  "strapline": "Cold air, same day.",
  "description": ["Paragraph one…", "Paragraph two…"],
  "features": ["Same-day callouts", "All major brands"],
  "price": "From $89 diagnostic",
  "image": "assets/harvested/gallery-03-gallery1.jpg",
  "featured": true
}
```

Two or more services with a `summary` or `description` triggers individual
service pages at `/services/<slug>/`.

`strapline` is optional and appears in the sticky card beside the service
copy. Omit it and the card falls back to `business.tagline`. Set it when a
service sells on a different promise from the business as a whole — a product
line, say, where the company strapline would read as boilerplate.

## testimonials[]

`{ quote, author, role, location, rating, source, date }`. **Verbatim from the
source.** Tidy obvious typos; never rewrite the substance, never invent one.

## gallery[] / team[] / faqs[]

- `gallery[]` — `{ src, alt, caption, category }`. Alt text is required for
  accessibility and it is checked by `avo check`.
- `team[]` — `{ name, role, bio, photo, email, phone }`.
- `faqs[]` — `{ question, answer }`. Emits FAQPage structured data.

## site

| Field | Notes |
| --- | --- |
| `theme` | `meridian`, `forge`, `bloom`, `harvest`, `beacon`, `homestead` |
| `mode` | `light` or `dark` — the default; visitors can still get the other via `prefers-color-scheme` |
| `domain` | Final URL. Required for `sitemap.xml` and absolute OpenGraph URLs |
| `form.provider` | `formspree`, `netlify`, `custom-ajax`, `custom`, or `none` |
| `form.action` | The endpoint. Without it the form degrades to `mailto:` |
| `analytics.plausible` | Domain string |
| `analytics.ga4` | Measurement ID |

## _meta

- `enriched` — set to `true` when you are done.
- `todo[]` — questions for the business owner. This is a deliverable, not a
  scratchpad: it becomes the kick-off call agenda.
- `gaps[]` — things that could not be harvested automatically.
