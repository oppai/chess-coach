# Chess Coach

Play on the board. Learn in chat.

A Hermes Agent plugin with a native Desktop board, instant local practice, and an optional conversational opponent. English is the default; switch to 日本語 in the panel. The language selection is remembered on this device.

[日本語ガイド](README.ja.md)

## What you can do

- **Mate practice, 1–4 moves:** 14 verified starting positions (7 patterns plus mirrored variants). The plugin checks your move and plays a defending reply locally. An incorrect attempt leaves the position unchanged. Hints point to a piece without revealing its destination.
- **Play Hermes:** choose White or Black and equal material, pawn, knight, rook, or queen odds. The handicap removes a piece from Hermes’s side.
- Click a piece and a highlighted destination. Select any legal promotion piece. Flip the board, undo a turn, retry a puzzle, and resume previous games.
- Inspect SAN move history and copy PGN from the panel. Ask for a position review when you want a conversational explanation.

### When the LLM is used

Puzzle creation, moves, validation, defending replies, hints, takebacks, retries, and PGN display do **not** call the LLM. Your game move is saved and rendered before Hermes is asked for its reply. A normal game sends one request when the opponent must move; reviews and game hints send a request only when clicked. A failed opponent request can be retried with **Ask Hermes to move**. There is no automatic repeated prompting.

## Install / update

Put this folder at `~/.hermes/plugins/chess-coach`, then enable it:

```sh
hermes plugins enable chess-coach
```

Enable Chess Coach in Desktop **Capabilities → Plugins**. After an update, restart the Hermes gateway and run **Reload desktop plugins** from the command palette. The Python dependency is `chess>=1.10,<2`; the Desktop API uses the gateway’s FastAPI runtime. There is no external chess engine or separate frontend build.

## Data and compatibility

Games are stored in a profile-scoped SQLite database, `plugin-data/chess-coach/coach.sqlite3`. Desktop actions and agent tools use the same transactions. Revisions reject stale UI actions; agent move requests include the revision too. Legacy `ctx.state` games are imported once, retaining IDs, starting positions and move histories. The original legacy file is left intact. `games.json` remains a compatibility mirror, not the authoritative store.

No telemetry or external network service is used by the chess backend. Conversational actions go through the active Hermes chat and its configured provider. Local practice remains available when that provider is busy or rate limited, provided the Hermes gateway is running.

## Tools

The existing eleven tools remain available: `chess_new_game`, `chess_set_position`, `chess_board`, `chess_list_games`, `chess_legal_moves`, `chess_make_move`, `chess_undo`, `chess_review_position`, `chess_solve_mate`, `chess_material`, and `chess_pgn`.

`chess_solve_mate` accepts 1–4 attacker moves. It uses bounded exact search: a search limit returns **inconclusive**, never a false “no mate.” Arbitrary complex positions can exceed that limit. The bundled catalog is verified by regression tests. Hermes provides conversational coaching; there is no numerical engine evaluation, formal rating, or automatic blunder detection. Structured opening lessons and strategic coaching are future extensions.

## Development and checks

```sh
python -m unittest discover -s tests -v
node --check desktop/plugin.js
npm install
npm test
```

Python tests require `chess`, `fastapi`, and `httpx`. JavaScript tests use React, Testing Library and jsdom in a mocked host; they assert English/Japanese behavior, local puzzle operations with zero chat submissions, and one opponent notification for a game move. See [MAC-TEST.md](MAC-TEST.md) for the native smoke checks.

## License and artwork

Plugin code: MIT. Existing piece artwork: Cburnett chess pieces by Colin M. L. Burnett, via lichess, offered under CC BY-SA 3.0 / GFDL / BSD. The SVG artwork has been retained; see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
