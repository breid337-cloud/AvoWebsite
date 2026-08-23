---
name: avo-enrich
description: Turn a harvested Avo client profile into finished website copy. Use when the user asks to enrich, write copy for, or complete a client profile in clients/<slug>/, or runs /avo-enrich. Reads the harvest brief and writes clients/<slug>/profile.json ready for `avo build`.
---

# Enriching an Avo client profile

You are writing the copy for a real small business's new website. It will be
published and sold to them. Treat it as client work, not a demo.

## Inputs

For client slug `<slug>`:

| File | What it is |
| --- | --- |
| `clients/<slug>/BRIEF.md` | The task brief with all harvested source material. **Read this first.** |
| `clients/<slug>/profile.draft.json` | Deterministic draft — the shape your output must match |
| `clients/<slug>/harvest/raw.json` | Full harvest: every page's copy, headings, images, audit |
| `clients/<slug>/harvest/report.md` | Human summary and the case for a rebuild |
| `clients/<slug>/assets/harvested/` | Downloaded images you can reference |

If `BRIEF.md` is missing, run `avo brief <slug>` first. If the client folder
does not exist, run `avo harvest <url> --slug <slug>`.

## Output

Write `clients/<slug>/profile.json`, same shape as the draft. Then run
`avo check <slug>` and fix anything it reports.

## The one rule that matters

**Never invent a verifiable fact.** Rewriting tone, structure and clarity is the
job. Manufacturing evidence is not.

Never invent:

- testimonials, reviews, ratings, review counts, customer names
- licence numbers, certifications, insurance, accreditations, awards
- prices, guarantees, warranties, response times
- years in business, staff numbers, jobs completed
- addresses, phone numbers, service areas, opening hours

Fabricated reviews and credentials are illegal in many jurisdictions and expose
the business you are selling to. If the source does not support a claim, put it
in `_meta.todo` as a question for the owner instead of writing it.

Everything else — headlines, service descriptions, about copy, FAQs derived from
real source answers, meta descriptions — you should rewrite properly and
confidently.

## How to work

1. **Read `BRIEF.md` end to end.** It contains the harvested copy, the gap list
   and the recommended theme.
2. **Read `harvest/raw.json`** if you need detail the brief summarised away —
   particularly `pages[].paragraphs` for the original wording.
3. **Work out what the business actually does** and who for. Set
   `business.category` accurately: it selects the schema.org type and drives
   local SEO.
4. **Write the copy**, section by section, in this order:
   - `content.hero.headline` — the benefit, in ten words or fewer. Never
     "Welcome to…". Name the outcome or the problem solved.
   - `content.hero.subhead` — what they do, for whom, where.
   - `content.valueProps` — three or four, each grounded in source evidence.
   - `services[]` — real names; a 15–30 word `summary`; a `description` array of
     2–4 paragraphs for the service's own page; `features` only where the source
     lists them.
   - `content.about.body` — 2–4 paragraphs keeping every verifiable fact.
   - `faqs` — keep the real questions and answers, tightened up. Add new ones
     only where the source clearly answers them elsewhere.
   - `seo.title` (<60 chars, includes the town) and `seo.description` (140–160).
5. **Write alt text** for every image in `gallery[]` and for
   `content.hero.image`. Describe what is in the picture.
6. **Choose a theme** — the brief recommends one. Set `site.theme`.
7. **Fill `_meta.todo`** with the questions you could not answer.

## Voice

Match the business, not a template. A roofing contractor and a day spa should
not read the same.

- Second person, active voice: "We replace your furnace in a day", not
  "Furnace replacement services are offered".
- Concrete over generic. "NATE-certified technicians, same-day callouts" beats
  "quality service you can trust".
- No filler openers: "In today's fast-paced world", "We pride ourselves on",
  "Welcome to our website", "Your one-stop shop".
- No em-dash-heavy corporate cadence. Short sentences are fine.
- Keep any distinctive real detail from the old site — the founder's name, the
  origin story, the local landmark. That is what makes it theirs.

## Finishing

```bash
avo check <slug>                 # validation + completeness score
avo build <slug>                 # build with the chosen theme
avo build <slug> --all-themes    # one folder per theme, for the client to pick
avo preview <slug>               # local preview with a theme switcher
```

Report back with: the theme you chose and why, the completeness score before and
after, and the `_meta.todo` questions the owner needs to answer.
