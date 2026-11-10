# Chess Coach — a Hermes Agent plugin

A chess board that your agent can actually trust, plus a coaching skill
that turns it into lessons.

The plugin registers eleven `chess_*` tools that own the board — game
state, legal moves, check / checkmate / stalemate / draw detection, an
exhaustive mate-in-1/2 search, material counting and PGN export — all
computed with [python-chess](https://python-chess.readthedocs.io/).
The agent never has to guess whether a move is legal or a position is
mate: it asks the board.

What the agent does with the board is up to the agent (guided by the
bundled `chess-coach` skill):

- **Checkmate practice** — set up verified mate-in-1 / mate-in-2
  positions; the user finds the mate, the board verifies it.
- **Handicap games** — play against the agent with pawn, knight, rook
  or queen odds.
- **Strategy & opening guidance** — walk through openings on a live
  board, ideas first, with the real legal moves on the table.
- **Skill evaluation** — a short tactics + endgame test with an honest,
  evidence-based level estimate and a practice focus.

## Install

Copy this directory to `~/.hermes/plugins/chess-coach/` (or install it
from the plugin catalog once listed), then:

```bash
hermes plugins enable chess-coach
```

The only Python dependency is `python-chess` (`chess>=1.10,<2`),
declared in `plugin.yaml`; Hermes asks for dependency consent and
installs it on enable. No chess engine binary is required — the mate
search is exhaustive legal-move search, fine for mate-in-1/2 training
positions.

Try it:

- "Teach me a checkmate pattern — give me a mate in 1 to solve."
- "Play a game with me. You give knight odds."
- "Explain the Italian Game on a live board, move by move."
- "Test my chess level."

## Tools

| Tool | What it does |
| --- | --- |
| `chess_new_game` | Start a game, optionally with handicap odds (pawn / knight / rook / queen). |
| `chess_set_position` | Create a game from any valid FEN (puzzles, drills, user positions). |
| `chess_board` | ASCII board, FEN, move history, objective status. |
| `chess_list_games` | List stored games. |
| `chess_legal_moves` | All legal moves (SAN + UCI), optionally for one square. |
| `chess_make_move` | Play a SAN/UCI move with full legality validation; reports check/mate/draw. |
| `chess_undo` | Take back plies (retry-friendly lessons). |
| `chess_review_position` | Read-only look at an earlier position, without rewinding the live game. |
| `chess_solve_mate` | Exhaustive forced-mate search up to mate in 2. |
| `chess_material` | Material count, balance and captured pieces. |
| `chess_pgn` | Export the game as PGN. |

## Disclosures

- **No network access.** The plugin makes no network calls and has no
  telemetry. It never fetches games or anything else from the internet.
- **Local state only.** Game records (start FEN + SAN move list) are
  stored in Hermes' plugin state for the active profile
  (`ctx.state`), so lessons can resume across sessions. Nothing leaves
  the machine except what the agent itself says in chat.
- **No credentials, no engine, no shell.** No env vars, no API keys, no
  subprocesses, no bundled binaries. The single dependency is the
  well-known `python-chess` library, pinned with an upper bound.
- **Deterministic core.** Every rules answer (legality, check, mate,
  draw, material) is computed, so the agent's coaching is grounded in
  the real position.

## Limitations

- The mate search covers mate in 1 and mate in 2; it is a training
  verifier, not an analysis engine. There is no Stockfish integration
  in this version.
- Skill evaluation is a coaching estimate based on the built-in test,
  not an official rating.

## License

MIT
