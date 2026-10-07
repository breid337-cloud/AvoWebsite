# Handover — Dice 33 for the Rum Bar 33 site

Written 2026-10-07. Everything below is on branch
`claude/yahtzee-scorecard-app-v5j2ck` of `breid337-cloud/AvoWebsite`,
head `4d4cb4e`.

## What exists

| File | What it is |
| --- | --- |
| `apps/rumbar33-dice/index.html` | **The thing you want.** One-player dice game (Yahtzee rules) with a monthly leaderboard, 860 lines, self-contained, no dependencies. |
| `apps/rumbar33-dice/README.md` | Embed snippet, CONFIG table, where scores live. |
| `apps/yahtzee/index.html` | Separate: a multi-player *scorecard* for real dice at a table. Not part of the bar game; ignore it unless you want it too. |

Live copies, if you want to play before wiring anything up:

- Game — https://claude.ai/artifact/3hRcfMDWMJVWQstE9r4Z1G
- Scorecard — https://claude.ai/artifact/DsvGYVhBDgc7piAPvCqXY3

Both are private to your account until you share them.

## Getting the file onto your machine

From your local clone of **this** repo:

```bash
git fetch origin claude/yahtzee-scorecard-app-v5j2ck
git show origin/claude/yahtzee-scorecard-app-v5j2ck:apps/rumbar33-dice/index.html > /tmp/dice33.html
```

Then copy `/tmp/dice33.html` into the Rum Bar 33 site.

## Where it goes in the Rum Bar 33 repo

`processAssets()` (`src/render/assets.js`) copies `<clientDir>/assets/`
verbatim into `dist/assets/`, so the game ships as a client asset. Which
path depends on how that site is laid out:

- **Site is a client folder inside AvoWebsite** → `clients/rumbar33/assets/game/index.html`
- **Site is its own repo with `clientsDir: "."`** (the avosolution-website
  pattern) → `assets/game/index.html` at the repo root

Either way it builds to `<site>/assets/game/index.html`.

Link it with a **relative** URL — `assets/game/index.html` — so the build
still works in a subdirectory or off the filesystem. Two ways in:

1. A nav item or a CTA button pointing at that path.
2. Embedded in a section:

```html
<iframe src="assets/game/index.html" title="Dice 33"
        style="width:100%;height:1200px;border:0" loading="lazy"></iframe>
```

## Configure it

One `CONFIG` object at the top of the `<script>`. Or leave the file alone and
set `window.BAR_DICE_CONFIG = {...}` before it loads.

| key | default | notes |
| --- | --- | --- |
| `venue` | `"Rum Bar 33"` | wordmark + page title |
| `gameName` | `"Dice 33"` | the H1 |
| `prize` | cocktail line | the text in the gold strip |
| `minScore` | `150` | floor to get on the board |
| `par` | `220` | "house par" shown while the board is empty |
| `claim` | screenshot/ask staff | how a player claims the drink |
| `rules` | 4 lines | the house-rules panel |
| `endpoint` | `""` | where a score is POSTed — see below |
| `endpointMethod` | `"POST"` | |

**Set `endpoint` to the same URL as the site's enquiry form** — the
`site.form.action` already in that site's `profile.json` (`docs/contact-forms.md`
covers the providers; Formspree works as-is). Each entry posts JSON:

```json
{"venue":"…","game":"…","month":"2026-10","name":"…","score":412,"message":"… scored 412 …"}
```

## Theming

Every colour, font and radius is a theme token with a fallback —
`var(--primary, #dba53f)`, `var(--font-heading, …)`, `var(--radius, 12px)` —
using the names `src/themes/tokens.js` emits (`--bg`, `--surface`,
`--surface-2`, `--text`, `--text-muted`, `--border`, `--border-strong`,
`--primary`, `--on-primary`, `--primary-soft`, `--accent`, `--danger`,
`--success`, `--radius`, `--radius-sm`, `--font-heading`, `--font-body`).

- **Inlined into a built page** → inherits Rum Bar 33's palette automatically.
- **In an iframe** → separate document, so host tokens do *not* reach it; it
  wears its own dark bar colours. Re-tint by editing the dozen fallbacks in
  the `.dice33` block at the top of the file.

## The honest bit about scores

The board lives in `localStorage`: per device, per browser, and editable by
anyone determined enough. Fine for the game, not enough to award a drink on.
So the design is: the page is the toy, the **endpoint inbox is the record**,
and the house rules on the page say the bar confirms the winner at the
counter. If the promo gets popular enough that people start cheating, the fix
is a real endpoint that scores the dice server-side — the game would post the
roll history instead of a number.

Published as a Claude artifact the page also picks up a shared live board (the
`db` capability, collection `scores`, one doc per viewer keyed by month). That
code is inert on a normal web host — `window.claude` doesn't exist there, the
page falls back to the local board. Leave it or strip it; it costs ~40 lines.

## What I checked, and what I didn't

Checked: plays through a round in Chromium at 1100px and 390px, no console
errors, no horizontal page scroll at either width, scoring and round
advance correct, the shared-board collection reads back clean.

Not checked: a full 13-round game end to end, the submit path against a real
Formspree endpoint, and anything on the Rum Bar 33 site itself — that repo
isn't attached to this session, so none of the integration above has been run.

## Open items

- Wire `endpoint` to the real form action and send one test score.
- Decide the prize wording with the bar; check the house rules against
  whatever licence/promo terms apply locally (the 18+ line is a placeholder,
  not advice).
- A QR code on the table tents pointing at `/assets/game/` would do more for
  participation than anything in the code.
- Optional: a "beat the bartender" seeded par per month instead of the fixed
  220.

## Prompt to paste into the local session

> I'm adding a dice game to the Rum Bar 33 site. The game is a single
> self-contained HTML file I'll drop in at `assets/game/index.html` (copy it
> from my AvoWebsite clone, branch `claude/yahtzee-scorecard-app-v5j2ck`,
> path `apps/rumbar33-dice/index.html`, and read the HANDOVER.md next to it).
> Please: (1) put it at the right asset path for this site's layout, (2) set
> the `CONFIG` block at the top — venue, prize wording, and `endpoint` from
> this site's `site.form.action` in profile.json, (3) add a way in from the
> site: a nav link or a section with the iframe snippet from the README,
> (4) run the build and check the game page loads and the link resolves.
