# Avo — notes for Claude Code sessions

A CLI + library that rebuilds small-business websites: harvest an existing site,
enrich the copy, generate a static site in one of six themes, deploy it.

## Commands

```bash
node bin/avo.js doctor          # environment + theme contrast self-test
npm test                        # unit + integration tests (node:test)
node bin/avo.js <cmd> --help    # per-command help
```

## Architecture, in dependency order

```
util/          HTML parser, selector engine, colour maths, text, URL, fs, log
profile/       schema.js is the data contract; normalize → validate → score
harvest/       fetcher (robots-aware) → crawler → extract/* → index.js → report
themes/        6 theme data modules + tokens.js (the token → CSS compiler)
shell/         pages.js (page plan) + sections/* (markup) + components/icons
render/        css.js, js.js, html.js, seo.js, assets.js → index.js (buildSite)
preview/  deploy/  cli/
```

Data flows one way: **raw HTML → `raw.json` → `profile.json` → `dist/`**.
`profile.json` is the only contract between harvesting and rendering; nothing in
`render/` may read harvest output directly.

## Rules that matter

- **No required runtime dependencies.** The HTML parser, colour maths, static
  server and minifiers are hand-rolled in `src/util` and `src/render`. Optional
  deps (`sharp`, `basic-ftp`, `ssh2-sftp-client`, `playwright`) are always
  lazily imported and must degrade gracefully with a clear message.
- **Never invent business facts.** The enrichment step rewrites tone and
  structure only. See `.claude/skills/avo-enrich/SKILL.md`.
- **Accessibility is not optional.** Every theme must pass WCAG AA (AAA body
  text) in light and dark — `avo doctor` and the test suite both enforce it.
  Brand colours from a client are contrast-corrected, never trusted.
- **Output must be portable.** Relative URLs only, so a build works at a domain
  root, in a subdirectory, or off the filesystem.

## Adding a theme

1. Copy `src/themes/meridian.js`, change `id`, palettes, fonts, `sections`.
2. Register it in `src/themes/index.js` (`THEMES`) and add a `suggestTheme` rule.
3. `node bin/avo.js doctor` — it will fail the build if any contrast pair drops
   below AA.
4. Section variants named in `sections` must exist in the relevant renderer, or
   the section silently falls back to `cards`.

## Adding a profile field

1. Add it to `emptyProfile()` in `src/profile/schema.js`.
2. Coerce it in `normalizeProfile()` — never trust input shape.
3. Add a `FIELDS` entry if it should count toward the completeness score.
4. Document it in `.claude/skills/avo-enrich/reference.md`.

## Testing changes to output

`test/pipeline.test.js` builds real sites and asserts on the parsed HTML. For
visual and responsive checks, Chromium lives at
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`; the useful assertion is
`document.documentElement.scrollWidth - clientWidth === 0` across
320/390/768/1440 in both colour schemes.

Grid and flex children need `min-width: 0` — without it a long business name or
email address makes the page scroll sideways on a phone. That class of bug has
bitten this codebase before.

## The fixture

`test/fixtures/oldsite/` is a deliberately dated FrontPage-era HVAC site (layout
tables, `<font>` tags, no viewport meta). Serve it and harvest it to exercise the
whole pipeline offline:

```bash
node -e "import('./src/preview/static-server.js').then(async m => {
  const s = m.createStaticServer('test/fixtures/oldsite'); await m.listen(s, 8781);
  console.log('http://localhost:8781'); })" &
node bin/avo.js harvest http://localhost:8781/ --slug brannigan --pages 10
```

`clients/brannigan/` is the committed worked example — harvest output, the
enriched `profile.json`, and the brief.
