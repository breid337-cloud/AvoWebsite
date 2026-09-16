# Thirteen Boxes — Yahtzee scorecard

A single-file scorecard for Yahtzee played with real dice. Open
`index.html` in any browser; there is no build step and nothing to install.

- 1–8 players, added and removed while a game is running.
- Player names are editable in the column headers.
- Tap a box to score it: the upper section offers the six possible totals for
  that face, the fixed categories offer their value or a scratch, and the
  sum categories take the total of the five dice.
- Upper total, the 35-point bonus at 63, lower total (including 100 per extra
  Yahtzee) and the grand total are kept for every player, with the leader
  marked and a winner called once all thirteen boxes are filled.
- The card is kept in `localStorage`, so a refresh does not lose the game.
  Undo steps back through the last forty changes.
- Works in light and dark, down to phone width, and prints as a plain card.

It is a standalone page, not part of the Avo pipeline — it shares no code with
`src/` and is not read by `avo build`.
