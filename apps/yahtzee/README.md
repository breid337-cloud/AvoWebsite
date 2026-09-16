# Thirteen Boxes — Yahtzee scorecard

A single-file scorecard for Yahtzee played with real dice. Open
`index.html` in any browser; there is no build step and nothing to install.

- 1–8 players, added and removed while a game is running.
- Player names are editable in the column headers, and each player carries a
  colour through their column, their card and their progress bar.
- A **Max** column beside every row shows the most that box can be worth
  (105 upper, 35 bonus, 235 lower, 375 grand), and a box scored at its
  maximum is underlined.
- Tap a box to score it: the upper section offers the six possible totals for
  that face, the fixed categories offer their value or a scratch, and the
  sum categories take the total of the five dice.
- Upper total, the 35-point bonus at 63, lower total (including 100 per extra
  Yahtzee) and the grand total are kept for every player, with the leader
  marked and a winner called once all thirteen boxes are filled.
- A summary card per player under the card: progress toward the 63-point
  bonus, which boxes are still open, the points still on the table and the
  best possible finish — then a strip showing whose turn is up and where
  everyone stands.
- The card is kept in `localStorage`, so a refresh does not lose the game.
  Undo steps back through the last forty changes, and Print lays the card and
  summaries out on paper.
- Works in light and dark, down to phone width.

It is a standalone page, not part of the Avo pipeline — it shares no code with
`src/` and is not read by `avo build`.
