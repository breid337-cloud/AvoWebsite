# Folio

`--theme folio` · *Document-grade and quietly technical*

The web translation of the **AvoSolution Document Design System v1.0**. Use it
when a client should look considered and technical rather than loud: software
and consultancy work, B2B products, professional services.

It is the house theme — the one that makes a site look like it came from the
same studio as the decks. `clients/avosolution/` is the reference build.

```bash
node bin/avo.js build <client> --theme folio
node bin/avo.js preview <client>
```

## What makes it different from the other themes

**No webfont.** Both faces are `'Liberation Sans', Helvetica, Arial,
sans-serif`. Neither declares a `google` key, so `googleFontsHref()` returns
empty and the build emits no font link, no `preconnect`, and no third-party
request at all. Three things follow from that:

- a site in this theme matches the PDF decks exactly, because the source system
  picked Liberation Sans as an Arial metric match for headless Chromium
- there is no Google Fonts privacy question to answer, which matters for UK and
  EU clients
- the first paint has nothing to wait for

If a client wants a webfont, add `google` and `googleWeights` to either face —
see *Adapting it* below.

**A fixed dark hero.** `hero: 'gradient'` is overridden in `extras.css` with
the source system's cover gradient, verbatim:

```css
linear-gradient(128deg, #2F72C4 0%, #28558F 42%, #1E2B54 100%);
```

Unlike every other surface in the theme, this one is dark in **both** colour
schemes, so its text cannot come from the theme tokens. It is set to pure white
explicitly. This is the one place in the theme where a colour is hardcoded, and
it is deliberate — see *The contrast rule* below before changing it.

## Palette

Both palettes come from the source system's token table. `--bg` on paper is the
slide ground; on the web it becomes `surface`, the band that white cards sit on.

| Token | Light | Dark | Source |
| --- | --- | --- | --- |
| `bg` | `#ffffff` | `#0e1230` | page ground (dark goes a step below navy) |
| `surface` | `#f5f7fa` | `#1b2145` | `--bg` / `--navy` |
| `surface2` | `#e9eef6` | `#252b57` | derived |
| `text` | `#151a2e` | `#eef2f8` | `--ink` |
| `textMuted` | `#4a5568` | `#a8b4cc` | `--muted` |
| `border` | `#e6ebf2` | `#2c3463` | `--line` |
| `primary` | `#2b6cb9` | `#7fa9f5` | `--blue-deep` |
| `accent` | `#3b82f6` | `#5b9bff` | `--blue` |
| `inverseBg` | `#1b2145` | `#eef2f8` | `--navy` |

**Why `primary` is `--blue-deep`, not `--blue`.** The source system's accent,
`#3B82F6`, is only 3.0:1 on white. `compileTokens` derives `--link` from
`primary` and `avo doctor` requires links to reach 4.5:1, so the bright blue
cannot carry link or button text. `--blue-deep` (`#2b6cb9`, 4.9:1) takes that
job. The bright blue stays on as `accent`, which in this codebase is only ever
used for star ratings — never as a text colour on a light ground.

## Type and geometry

- One family in both roles; hierarchy comes from size, weight and tracking
- Headings 700, `line-height: 1.16`, `letter-spacing: -0.009em` — the source
  system's 44px/-0.4px, expressed relatively
- Eyebrows are the most recognisable tic: uppercase, 700, `0.2em` tracking
- Scale ratio 1.2, container 1200px (the source system's 1456px canvas minus
  its 110px side pads, rounded)
- Radii 8/12/16px; cards are 12px, close to the source system's 14px
- Shadows are deliberately shallow. Cards carry their weight on the border, not
  a drop shadow — `0 1px 2px rgba(21,26,46,.05)` at rest

Sections: `header=standard hero=gradient services=cards testimonials=quote
gallery=grid cta=band about=split`.

## The contrast rule

`avo doctor` checks seven pairs per theme in both schemes and fails the build
below AA. It does **not** check the hero gradient, because that background is
in `extras.css` rather than the token set. So if you change the gradient, check
it by hand:

```bash
node --input-type=module -e "
import { contrast } from './src/util/color.js';
console.log(contrast('#ffffff', '#2F72C4'));"
```

The lightest stop governs. White on `#2F72C4` is **4.86:1** — AA at any size.
The next tone down, `#E6F0FF`, is only 4.22:1 and fails, which is why the
eyebrow, heading and subhead are all pure white and separate themselves by
weight and tracking rather than by tone. Darken the lightest stop before
introducing any off-white on that gradient.

## Adapting it for another client

Folio takes brand colours like any other theme, so most clients need no code
change at all:

```jsonc
// clients/<slug>/profile.json
"brand": { "colors": { "primary": "#0f766e", "secondary": "#b45309" } },
"site":  { "theme": "folio" }
```

`compileTokens` contrast-corrects `primary` to 4.5:1 against the background and
takes `secondary`/`accent` only if it stays distinct from the corrected
primary. **AvoSolution's own profile deliberately leaves `brand.colors` empty**
— the theme already carries that palette, and setting it again would nudge the
blue into a slightly different hue.

To add a webfont for a client, copy `src/themes/folio.js` to a new id rather
than editing Folio, and give the faces a `google` key:

```js
heading: { stack: "'Söhne', 'Liberation Sans', Arial, sans-serif",
           google: 'Sohne', googleWeights: [600, 700], weight: 700 },
```

Then follow the checklist in `CLAUDE.md` → *Adding a theme*: register it in
`src/themes/index.js`, add a `suggestTheme` rule, and run `node bin/avo.js
doctor`, which fails the build if any pair drops below AA.

## When to reach for something else

- **Beacon** — same sector, more energy. Indigo and Space Grotesk, for
  startups and marketing agencies that want to look new rather than solid.
- **Meridian** — same restraint, no technical edge. For law, accountancy and
  medical, where blue-slate corporate is the expectation.

`suggestTheme` splits them on keywords: "software development", "consultancy",
"bespoke software", "SaaS", "platform" and "IT services" score Folio; "agency",
"marketing", "startup", "web design" score Beacon.
