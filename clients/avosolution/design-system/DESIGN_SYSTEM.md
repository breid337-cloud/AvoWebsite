# AvoSolution Document Design System
Version 1.0 — August 2026

A portable specification for producing AvoSolution-branded documents (proposals, briefings, decks)
as HTML, rendered to PDF. Give this whole folder to any Claude chat, project, or codebase and say
"use this design system" — everything needed to reproduce the format is in here.

---

## 1. What this is

Every AvoSolution document — investor decks, founding partner proposals, technical briefings — is
built the same way:

- **Canvas:** HTML slides, each exactly **1456×819px** (16:9), one `<section class="slide">` per page
- **Styling:** a single shared stylesheet (`shared.css`) — component classes, not per-document CSS
- **Icons:** monochrome inline SVGs, generated from a small Python icon library (`build.py`) via
  `[[icon-name]]` tokens — never emoji, never colour icons
- **Logos:** pre-extracted PNGs with transparent backgrounds (`assets/logo_white.png`,
  `assets/logo_grey.png`), inlined as base64 data URIs at build time
- **Rendering:** a headless Chromium browser (Playwright) opens the HTML at 1456×819 viewport and
  prints it to PDF with zero margins — one browser "page" = one slide

The output is always **two files**: an `.html` (editable, and itself a valid artifact) and a `.pdf`
(the polished, shareable deliverable).

---

## 2. File manifest

```
design-system/
├── DESIGN_SYSTEM.md      ← this file
├── shared.css            ← the entire stylesheet — every component class
├── build.py              ← icon library + HTML→PDF render script
├── template.html         ← one example of every slide type (start here)
└── assets/
    ├── logo_white.png    ← full-colour-on-dark logo, transparent background
    └── logo_grey.png     ← muted logo for footers on light slides
```

To start a new document: copy `template.html`, strip out the slide types you don't need, fill in
real content, run `build.py`.

---

## 3. Colour palette

| Token | Hex | Use |
|---|---|---|
| `--navy` | `#1B2145` | Dark slide backgrounds, closing/quote slides |
| `--ink` | `#151A2E` | Body headings on light slides |
| `--blue` | `#3B82F6` | Accent — highlighted phrases, links, primary icons |
| `--blue-deep` | `#2B6CB9` | Gradient endpoint (cover/divider slides) |
| `--muted` | `#4A5568` | Body copy on light slides |
| `--soft` | `#64748B` | Secondary/caption text |
| `--faint` | `#A0AEC0` | Footer text, page numbers |
| `--bg` | `#F5F7FA` | Light slide background |
| `--line` | `#E6EBF2` | Card borders, table dividers |
| `--green` / `--green-bg` | `#16A34A` / `#E7F7EE` | Positive states, "good" flow steps |
| `--red` / `--red-bg` | `#E5484D` / `#FDECEC` | Negative states, "bad" flow steps |
| `--amber` / `--amber-bg` | `#B45309` / `#FEF3E2` | Caution/compliance states |

Cover and divider slides use a fixed diagonal gradient:
`linear-gradient(128deg, #2F72C4 0%, #28558F 42%, #1E2B54 100%)` — class `.grad`.

---

## 4. Typography

- **Font stack:** `"Liberation Sans", Helvetica, Arial, sans-serif` (Liberation Sans is a metric
  match for Arial and renders identically in headless Chromium without needing licensed fonts)
- **Headings (`h1.title`):** 44px, bold, `-0.4px` letter-spacing, colour `--ink` (or white on dark
  slides). Highlight the key phrase in a `<span class="hl">` — this turns it `--blue` (or a lighter
  blue on dark backgrounds)
- **Eyebrow labels:** 13px, bold, `2.6px` letter-spacing, uppercase, colour `--blue`. Always
  formatted `NN · SECTION NAME` — sequential across content slides only (dividers and cover/close
  don't count)
- **Lede paragraphs:** 19px, `--muted`, max-width ~1000px so lines don't run the full slide width
- **Body copy in cards/tables:** 13.5–15px depending on component (see `shared.css` for exact
  values per class)

---

## 5. Logo usage

- **Cover slide:** `logo_white.png`, ~82px tall, top-left (`.cover-logo`)
- **Divider slides:** same white logo, smaller, top-right (`.logo-tr`)
- **Footer on every light content slide:** `logo_grey.png` at 17px height + "AvoSolution" text,
  bottom-left (`.foot`)
- **Footer on dark slides:** white logo at reduced opacity (`style="opacity:.35"`)

If you need a different colour variant (e.g. navy), the source logo is a white silhouette on a
transparent background — you can recolour it by taking the alpha channel as a mask and filling
with any solid colour:

```python
from PIL import Image
mask = Image.open('assets/logo_white.png').convert('L')  # use the alpha, not luminance, in practice
im = Image.new('RGBA', mask.size, (27, 33, 69, 0))  # target colour, e.g. navy
im.putalpha(Image.open('assets/logo_white.png').split()[-1])  # copy original alpha channel
im.save('assets/logo_navy.png')
```

---

## 6. Slide types

Every slide is a `<section class="slide">` (or `.slide.dark` / `.slide.grad` for variants). Content
sits inside one or more `<div class="pad">` blocks — `.pad` is absolutely positioned with fixed
left/right margins (110px), and you position it vertically with an inline `top:` style. **This is
the one rule that matters most: to fix vertical overflow or spacing, adjust the `top:` pixel value
on `.pad`, never CSS padding/margin.** All content uses absolute positioning within the fixed
819px slide height, so padding tricks don't do what you'd expect.

| # | Type | Class | When to use |
|---|---|---|---|
| 1 | Cover | `.slide.grad` + `.cover-h` | Once, first slide only |
| 2 | Exec summary | `.slide` + `.eyebrow`/`.title`/`.lede` + `.stat` grid | Opening content slide |
| 3 | Section divider | `.slide.grad` + `.ghost`/`.sec-title` | Once per major section |
| 4 | Card grid | `.card` in a `.grid` | Benefits, features, principles (3 or 6-up) |
| 5 | Table | `.tbl` | Structured comparisons, reference data |
| 6 | Process chain | `.chain`/`.node`/`.bubble`/`.arrow` | Journeys, flows, before/after |
| 7 | Numbered timeline | `.tl`/`.rail`/`.dot`/`.tlcol` | Phased plans, roadmaps |
| 8 | Layered stack | `.layer`/`.lico`/`.tag` | Module/feature lists with a label per row |
| 9 | Pricing cards | `.price` (`.hero` for the emphasised tier) | Pricing/plans |
| 10 | Quote/statement | `.slide.dark` + `.quote` | Section-ending positioning statements |
| 11 | Discussion grid | `.slide.dark` + `.qcard` | Numbered questions/discussion points |
| 12 | Closing/contact | `.slide.dark` + `.quote` + `.contact` | Final slide |

Full working markup for every one of these is in `template.html` — copy directly from there rather
than from this table.

Other components available in `shared.css` not shown above: `.kpi` (single big-number stat),
`.bars`/`.bar` (horizontal bar chart), `.chips`/`.chip` (pill tags), `.swap` (question→answer
card), `.panel` (bordered content block), `.vchain`/`.vstep` (vertical flow, e.g. money flow
diagrams), `.callout` (dark highlight bar for the one key takeaway on a slide).

---

## 7. Icon system

Icons are inline SVG, generated by the `ICO` dictionary in `build.py` — never raster images, never
emoji, never filled colour icons. Style is consistent: `stroke="currentColor"`, `stroke-width:1.7`,
rounded caps/joins, no fill (except where a small dot/detail calls for `fill="currentColor"`).
Because they use `currentColor`, icons inherit whatever colour their container sets (e.g. `.icon.g`
turns both the icon and its background badge green).

**Usage in HTML:** write `[[icon-name]]` anywhere in your slide markup — e.g. `[[calendar]]`,
`[[shield]]`, `[[star]]`. The build script replaces every token before rendering. If a token has no
matching entry in `ICO`, the build **fails loudly** (`UNRESOLVED ICONS`) rather than silently
shipping a blank icon — this is deliberate.

**Current icon set** (see `build.py` for the full list — ~40 icons covering calendar, search,
people, money, security, devices, logistics, communication, etc.)

**Adding a new icon:** add an entry to the `ICO` dict in `build.py` using the same `s(...)` helper
— paste any simple line-art SVG path data (Feather/Lucide-style icons work well as a source) and
give it a short lowercase name. Keep it visually consistent: 24×24 viewBox, ~1.7 stroke width, no
fill unless it's a small solid dot.

---

## 8. House rules (apply without being asked)

- Numbered eyebrow labels (`01 · SECTION NAME`) count content slides only — dividers, cover, and
  close don't get a number
- Every light slide gets the grey-logo + "AvoSolution" footer and a page number, bottom-right
- No emoji, anywhere, ever — icons only
- One accent colour (`--blue`) for emphasis — don't introduce new brand colours per document
- Highlight at most one short phrase per heading with `.hl` — don't over-highlight
- Tables always have a header row; use `.k` on the first `<td>` of each row to bold it as a label
- If a table is long enough to risk crowding the next element, give it its own slide rather than
  cramming a callout underneath it — check with a render, don't assume it fits
- Keep language on customer-facing documents free of internal instructions, self-directed notes,
  or "how to run this meeting" framing — write to the reader, not to yourself

---

## 9. How to render

Requires Python with `playwright` installed (`pip install playwright && playwright install
chromium`).

```bash
cd design-system
python3 build.py my-document.html my-document-final.html my-document.pdf
```

This:
1. Injects `shared.css` into the `{{CSS}}` placeholder in your HTML
2. Resolves every `[[icon-name]]` token to its SVG
3. Inlines both logos as base64 data URIs (`{{W}}` = white, `{{G}}` = grey)
4. Opens the result in headless Chromium at 1456×819 and prints it to PDF with zero margins

**No Python/Playwright available?** Open the built HTML file directly in Chrome, and use
Print → Save as PDF with paper size set to a custom 1456×819px (or 12.73×7.16 inches) and margins
set to "None." The layout is standard CSS/HTML — any modern browser can render it; the script just
automates and batches the process.

---

## 10. Bringing this into a new Claude chat or project

Upload this whole folder (or paste `shared.css` + `build.py` + the logo PNGs into the project's
knowledge). Then just say: *"Use the AvoSolution design system in these files to build [document]."*
Claude will have the actual stylesheet, actual logo assets, actual icon library, and a working
example of every slide type — enough to reproduce the format exactly rather than approximate it
from a description.
