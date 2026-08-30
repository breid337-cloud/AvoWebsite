# AvoSolution — session notes

Working notes for the AvoSolution site. Committed deliberately: sessions run in
ephemeral containers, so anything not in git is lost between them. Start here.

## What this is

AvoSolution's own website, built with this repo's pipeline. Unlike `brannigan`
(a fixture-driven worked example), this is a real site with no old site to
harvest — created with `avo new avosolution` and filled in by hand.

## Confirmed facts

| | |
| --- | --- |
| Trading name | **AvoSolution** (one word, capital A and S) — confirmed by the logo pack |
| Strapline | "Innovate in style" — from the logo lockup |
| Category | "Software development and consultancy" — AvoSolution's own line on its client-facing deck |
| Email | ask@avosolution.co.uk |
| Market | UK |
| Streams | Web design; bespoke application development; commerce; service management and customer engagement |

## Source material

- `design-system/` — the AvoSolution Document Design System v1.0, vendored here.
  It is a **document/deck** spec (fixed 1456×819 slides rendered to PDF via
  Playwright), not a web spec. Its palette, logo rules and house style transfer
  to the site; its absolutely-positioned slide layout does not.
- `assets/brand/` — web masters derived from the supplied logo pack.
  `logo-navy.svg` is the pack's black SVG refilled to `#1B2145`;
  `logo-white.svg` is the pack's white SVG as supplied. Favicons are the pack's.

### Confidential material — do not publish

Three internal documents were supplied for context and are **not** committed:
an investor deck, a founding partner proposal, and a customer journey deck.
All three are marked CONFIDENTIAL. None of their content appears on the site —
no pricing, ROI modelling, market sizing, roadmap, customer names or competitor
names. They informed only the category line and the service-management copy.

The owner's standing instruction: **no customer names on the website.**

Approved for public mention (owner, 30 Aug 2026): the **founding partner
programme** — its existence only. Pricing, ROI modelling and the partner list
stay confidential and are not published.

## The product name is provisional

**Avo is a working name.** It is named on the site — its own page at
`/services/avo/`, plus mentions in the about copy — but the real name is still
to be decided.

Every public reference lives in one file, `profile.json`, because that profile
is the only contract the renderer reads. To rename:

```bash
node clients/avosolution/rename-product.mjs "New name"          # preview
node clients/avosolution/rename-product.mjs "New name" --write  # apply
node bin/avo.js build avosolution
```

It matches the whole word `Avo` only, so **AvoSolution** (the company) is never
touched, and it renames the `avo` service slug separately since that drives the
URL. Do not do this with a plain find-and-replace: this repo's own CLI is also
called `avo`, and a case-insensitive pass would wreck it.

## Theme

`folio` — see [docs/themes/folio.md](../../docs/themes/folio.md). Built from the
design system's own tokens, so the site matches the decks. It ships **no
webfont**, which also removes the Google Fonts privacy question.

`brand.colors` is deliberately left empty: the theme already carries the
palette, and setting it again would contrast-nudge the blue into another hue.

## Open decisions

See `_meta.todo` in `profile.json` — it is the live list. The ones that matter
most: the real product name, whether the founding partner programme can be
public, and a form endpoint before launch.

## Colour note

The design system doc specifies `--navy #1B2145`, but the colour logo artwork is
filled `#272f51`. The folio theme and `logo-navy.svg` both use `#1B2145` for
internal consistency. Unresolved — see `_meta.todo`.

## Commands

```bash
node bin/avo.js check avosolution
node bin/avo.js build avosolution --all-themes
node bin/avo.js preview avosolution --compare
```
