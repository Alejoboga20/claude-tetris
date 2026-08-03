# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Classic Tetris implemented in vanilla JavaScript (ES6+), HTML5 Canvas, and CSS. No dependencies, no `package.json`, no build step, no bundler, no test suite.

## Running

Open `index.html` directly, or serve statically:

```bash
open index.html            # macOS, just opens the file
python3 -m http.server 8000
npx serve .
```

There is no lint, build, or test command — the whole project is `index.html` + `style.css` + `game.js`.

## Architecture

Three files, no modules — everything is global scope in `game.js`, loaded via a single `<script src="game.js">` tag.

- **`index.html`** — DOM shell: `<canvas id="board">` (300×600, the play field) and `<canvas id="next-canvas">` (120×120, next-piece preview), plus the score/lines/level panel and the pause/game-over overlay.
- **`style.css`** — dark/retro arcade look.
- **`game.js`** — all game logic (~300 lines), structured around this flow:

```
init() → createBoard() + randomPiece() + spawn() → requestAnimationFrame(loop)

loop(timestamp):
  accumulate dt → when dt >= dropInterval, advance piece down or lockPiece()
  draw() (grid + board + ghost piece + current piece)
  requestAnimationFrame(loop)

keydown → move / rotate / soft-drop / hard-drop / pause
```

Key mechanics, all in `game.js`:

- **Board model**: `ROWS × COLS` matrix; each cell is `0` (empty) or a color index `1–7` identifying the locked piece.
- **Pieces**: square matrices in `PIECES`. Rotation (`rotateCW`) is transpose + row reversal, not a lookup table.
- **Collision** (`collide`): checks piece cells against board bounds and already-locked cells.
- **Wall kicks** (`tryRotate`): on rotation collision, retries at x offsets `[0, -1, 1, -2, 2]` before giving up on the rotation.
- **Line clear** (`clearLines`): scans bottom-up, splices full rows out and unshifts empty rows at top.
- **Scoring**: `LINE_SCORES = [0, 100, 300, 500, 800]` × current level; hard drop = 2 pts/cell dropped, soft drop = 1 pt/row.
- **Level/speed**: level = `floor(lines / 10) + 1`; `dropInterval = max(100, 1000 - (level - 1) * 90)` ms.
- **Ghost piece** (`ghostY`): projects current piece straight down to its landing row, drawn at `globalAlpha = 0.2`.
- Game over is triggered in `spawn()` when a freshly spawned piece already collides.

## Tuning constants (top of `game.js`)

`COLS`, `ROWS`, `BLOCK` (cell px size), `COLORS`, `LINE_SCORES`, `dropInterval`. If `COLS`/`ROWS`/`BLOCK` change, also update `width`/`height` of `<canvas id="board">` in `index.html` to match (`COLS × BLOCK`, `ROWS × BLOCK`).

## Language note

README and in-game UI text (labels, buttons, overlay text) are in Spanish. Keep new user-facing strings consistent with that unless told otherwise.
