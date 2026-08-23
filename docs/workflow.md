# Running a rebuild, end to end

A worked example using the fixture site in `test/fixtures/oldsite/`, which is a
deliberately dated FrontPage-era HVAC site.

## 0. Serve the fixture

```bash
node -e "import('./src/preview/static-server.js').then(async m => {
  const s = m.createStaticServer('test/fixtures/oldsite');
  await m.listen(s, 8781);
  console.log('http://localhost:8781');
})"
```

## 1. Harvest

```bash
avo harvest http://localhost:8781/ --slug brannigan --pages 10
```

```
✓ Harvested 6 page(s) into clients/brannigan

  Business         Brannigan Heating & Air Conditioning
  Phone            (217) 555-0142
  Services         6
  Testimonials     4
  FAQs             4
  Images           5
  Old platform     Microsoft FrontPage
  Rebuild flags    8
  Completeness     ████████████████░░░░ 82% complete
  Suggested theme  forge
```

Read `clients/brannigan/harvest/report.md`. The "case for a rebuild" section is
written to be shown to the owner:

> - Mobile friendly: **no**
> - Secure (HTTPS) throughout: **no**
> - Structured data for Google: **no**
> - 2 table(s) used for page layout — a pre-2010 technique
> - Uses deprecated `<font>`/`<center>`/`<marquee>` tags

## 2. Enrich

```
/avo-enrich brannigan
```

Rewrites the copy into `clients/brannigan/profile.json`. Compare:

| | Before (harvested) | After (enriched) |
| --- | --- | --- |
| Hero | "Welcome to Brannigan Heating & Air" | "Heat back on tonight, not next week" |
| Score | 82% | 100% |
| Questions for the owner | — | 8, in `_meta.todo` |

## 3. Check

```bash
avo check brannigan
```

Blocks the build on missing essentials, warns on quality problems (headline
length, "Welcome to…" openers, missing alt text, thin service descriptions,
SEO description length), and lists the `_meta.todo` questions.

## 4. Build every theme

```bash
avo build brannigan --all-themes
```

```
  Meridian   12 pages · 337.3 KB
  Forge      12 pages · 305.9 KB
  Bloom      12 pages · 336.4 KB
  Harvest    12 pages · 297.4 KB
  Beacon     12 pages · 309.0 KB
  Homestead  12 pages · 337.5 KB
```

## 5. Preview and pitch

```bash
avo preview brannigan --compare
```

Switch themes live from the bar at the bottom while the owner watches, and use
the "old site" link for the before/after.

## 6. Deploy

```bash
avo deploy brannigan --target zip                 # hand over a zip
avo deploy brannigan --target ftp                 # straight to shared hosting
avo deploy brannigan --target ftp --dry-run       # check first
```

## Before going live

- [ ] `site.domain` set, so `sitemap.xml` and OpenGraph URLs are absolute
- [ ] `site.form.action` set to a real endpoint — otherwise the form falls back
      to `mailto:` and the build warns you
- [ ] `_meta.todo` questions answered by the owner
- [ ] Image rights confirmed
- [ ] Owner has read and signed off the copy
- [ ] `avo check` clean
