# Dice 33 — a bar game for the Rum Bar 33 site

A one-player dice game (Yahtzee rules) with a monthly leaderboard, built as a
single self-contained page. No build step, no dependencies, no server.

Play: thirteen rounds, three rolls a round, tap dice to keep them, then take a
box on the card. The card shows what every open box would score with the dice
on the table, so nobody has to do arithmetic at the bar. Upper bonus at 63,
50 for five of a kind, 100 for each one after that, joker rules enforced.

## Putting it on the site

Avo copies `clients/<slug>/assets/` straight into the build, so the game ships
as an asset:

```
clients/rumbar33/assets/game/index.html   ->   <site>/assets/game/index.html
```

Then either link to it (a nav item or a CTA — `assets/game/index.html`, a
relative URL, so it works at a domain root or in a subdirectory), or embed it
in a page section:

```html
<iframe src="assets/game/index.html" title="Dice 33"
        style="width:100%;height:1200px;border:0" loading="lazy"></iframe>
```

**Theming.** Every colour, font and radius in the page is a theme token with a
fallback — `var(--primary, #dba53f)`, `var(--font-heading, …)`, and so on —
using the same names `src/themes/tokens.js` emits. Pasted into a page of the
built site it takes that site's palette automatically. In an iframe it cannot
see the host's tokens (separate document), so it wears its own late-night
colours; to re-tint it, edit the dozen fallbacks in the `.dice33` block at the
top of the file.

## Configuring the competition

One `CONFIG` object at the top of the script, or set `window.BAR_DICE_CONFIG`
before the page loads to override it without touching the file:

| key | what it does |
| --- | --- |
| `venue`, `gameName` | wordmark and page title |
| `prize` | the line in the gold strip |
| `minScore` | floor for getting on the board (default 150) |
| `par` | the "house par" shown under an empty board |
| `claim` | how a player claims the drink |
| `rules` | the house-rules list |
| `endpoint` | where a score is posted (see below) |

## Where the scores live

The page keeps the board in `localStorage`, so it is per device and per
browser. That is fine for the game and not enough to award a prize on, so:

- Set `endpoint` to the same URL as the site's enquiry form
  (`site.form.action` — see `docs/contact-forms.md`; Formspree works as-is).
  Each entry is posted as JSON (`venue`, `game`, `month`, `name`, `score`,
  `message`) and lands in the bar's inbox, which is the real record.
- The bar confirms the winner at the counter. A score typed by a browser can
  be edited by anyone who wants to badly enough — the house rules in the page
  say so, and the monthly prize is small enough that this is the right
  trade-off. If it ever needs to be airtight, the game has to post to a real
  endpoint that scores the dice server-side.

Published as a Claude artifact, the page also picks up a shared live board
(the `db` capability) and every player sees the same top ten.

## Not part of the Avo pipeline

Standalone page. It shares no code with `src/` and `avo build` does not read
it — it is only ever copied as a client asset.
