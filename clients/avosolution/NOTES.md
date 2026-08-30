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

## Open decisions

See `_meta.todo` in `profile.json` — it is the live list. The two that shape the
site most:

1. Whether the **Avo** product is named publicly, with a product page and a
   founding-partner call to action, or kept off the public site for now.
   Currently described generically and not named.
2. Whether to keep the tinted stock `beacon` theme or add a bespoke `avo` theme
   built from the design system's own tokens. Currently beacon, tinted via
   `brand.colors`.

## Colour note

The design system doc specifies `--navy #1B2145`, but the colour logo artwork is
filled `#272f51`. The site and `logo-navy.svg` both use `#1B2145` for internal
consistency. Unresolved — see `_meta.todo`.

## Commands

```bash
node bin/avo.js check avosolution
node bin/avo.js build avosolution --all-themes
node bin/avo.js preview avosolution --compare
```
