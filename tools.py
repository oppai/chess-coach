"""Tool handlers — chess board operations backed by python-chess.

The plugin owns board state and rules only: move legality, check /
checkmate / stalemate / draw detection, mate search, material count and
PGN export. What to *do* with the board (lessons, games, tests) is the
agent's job, guided by the bundled chess-coach skill.

Game state is stored through Hermes' plugin state (ctx.state) when bound
by register(); an in-memory store is used as a fallback for testing.
Handlers always return a JSON string, including on error.
"""

import json
import time
import uuid

import chess
import chess.pgn
import io

# ---------------------------------------------------------------- state

_state_get = None
_state_set = None
_memory = {"games": {}}


def bind_state(getter, setter):
    """Bind Hermes ctx.state accessors (called from register())."""
    global _state_get, _state_set
    _state_get = getter
    _state_set = setter


def _load_games():
    if _state_get is not None:
        games = _state_get()
        if isinstance(games, dict):
            return games
    return _memory["games"]


def _save_games(games):
    _memory["games"] = games
    if _state_set is not None:
        _state_set(games)


def _get_game(game_id):
    games = _load_games()
    rec = games.get(game_id)
    if rec is None:
        return None, _err(f"Unknown game_id: {game_id!r}. Start one with chess_new_game or chess_set_position.")
    return rec, None


def _err(message):
    return json.dumps({"error": message}, ensure_ascii=False)


def _board_of(rec):
    board = chess.Board(rec["start_fen"])
    for san in rec["moves"]:
        board.push_san(san)
    return board


def _status(board):
    """Objective game status for a python-chess board."""
    status = {
        "turn": "white" if board.turn == chess.WHITE else "black",
        "move_number": board.fullmove_number,
        "is_check": board.is_check(),
        "is_checkmate": board.is_checkmate(),
        "is_stalemate": board.is_stalemate(),
        "is_insufficient_material": board.is_insufficient_material(),
        "is_game_over": board.is_game_over(),
        "can_claim_draw": board.can_claim_draw(),
        "result": board.result(),
    }
    if board.is_checkmate():
        status["outcome"] = "checkmate"
    elif board.is_stalemate():
        status["outcome"] = "stalemate_draw"
    elif board.is_insufficient_material():
        status["outcome"] = "draw_insufficient_material"
    elif board.is_game_over():
        status["outcome"] = "draw"
    elif board.is_check():
        status["outcome"] = "check"
    else:
        status["outcome"] = "in_progress"
    return status


def _view(rec):
    board = _board_of(rec)
    return {
        "game_id": rec["id"],
        "name": rec.get("name", ""),
        "fen": board.fen(),
        "board_ascii": str(board),
        "board_unicode": board.unicode(borders=True),
        "moves_san": list(rec["moves"]),
        "status": _status(board),
    }


def _new_record(start_fen, name):
    games = _load_games()
    game_id = uuid.uuid4().hex[:8]
    rec = {
        "id": game_id,
        "name": name or "",
        "start_fen": start_fen,
        "moves": [],
        "created": int(time.time()),
    }
    games[game_id] = rec
    _save_games(games)
    return rec


_LAST_MIRROR_ERROR = None


def _mirror_targets():
    """Candidate locations for games.json, most-preferred first."""
    import os
    from pathlib import Path

    targets = []
    try:
        from plugins.plugin_storage import plugin_data_dir

        targets.append(plugin_data_dir("chess-coach") / "games.json")
    except Exception:
        pass
    home = os.environ.get("HERMES_HOME")
    if home:
        targets.append(Path(home) / "plugin-data" / "chess-coach" / "games.json")
    targets.append(Path.home() / ".hermes" / "plugin-data" / "chess-coach" / "games.json")
    return targets


def _mirror_and_notify(rec=None):
    """Best-effort desktop support; never allowed to break a tool call.

    1. Mirror the full game list to games.json, where
       dashboard/plugin_api.py serves it to the desktop board pane.
       Several target locations are tried; the first success wins.
    2. Broadcast a game.updated event so an open pane refreshes at once
       (the pane also polls as a fallback).

    Failures are remembered in _LAST_MIRROR_ERROR and surfaced through
    chess_list_games, instead of vanishing silently.
    """
    global _LAST_MIRROR_ERROR
    try:
        games = _load_games()
        views = []
        for g in games.values():
            v = _view(g)
            v["last_move"] = g["moves"][-1] if g["moves"] else None
            v["created"] = g.get("created")
            board = _board_of(g)
            v["legal_moves"] = [
                {
                    "uci": m.uci(),
                    "san": board.san(m),
                    "from": chess.square_name(m.from_square),
                    "to": chess.square_name(m.to_square),
                    "promotion": m.promotion is not None,
                }
                for m in board.legal_moves
            ]
            views.append(v)
        views.sort(key=lambda v: v.get("created") or 0)
        text = json.dumps({"updated": int(time.time()), "games": views},
                          ensure_ascii=False)
        errors = []
        written = False
        for target in _mirror_targets():
            try:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(text, encoding="utf-8")
                written = True
                break
            except Exception as exc:  # try the next location
                errors.append(f"{target}: {exc!r}")
        _LAST_MIRROR_ERROR = None if written else "; ".join(errors) or "no targets"
    except Exception as exc:
        _LAST_MIRROR_ERROR = f"mirror build failed: {exc!r}"
    try:
        from hermes_cli.plugin_events import broadcast_plugin_event
        payload = {}
        if rec is not None:
            payload = {"game_id": rec["id"], "fen": _board_of(rec).fen()}
        broadcast_plugin_event("chess-coach", "game.updated", payload)
    except Exception:
        pass


# ---------------------------------------------------------------- tools

_ODDS_SQUARES = {
    # (odds piece, odds giver color) -> square to clear
    ("pawn", chess.WHITE): chess.F2,
    ("pawn", chess.BLACK): chess.F7,
    ("knight", chess.WHITE): chess.B1,
    ("knight", chess.BLACK): chess.B8,
    ("rook", chess.WHITE): chess.A1,
    ("rook", chess.BLACK): chess.A8,
    ("queen", chess.WHITE): chess.D1,
    ("queen", chess.BLACK): chess.D8,
}


def chess_new_game(args, **kwargs):
    odds = (args.get("odds") or "none").lower()
    giver = (args.get("odds_giver") or "black").lower()
    board = chess.Board()
    if odds != "none":
        if odds not in ("pawn", "knight", "rook", "queen"):
            return _err(f"Unknown odds: {odds!r} (use none|pawn|knight|rook|queen)")
        color = chess.WHITE if giver == "white" else chess.BLACK
        square = _ODDS_SQUARES[(odds, color)]
        board.remove_piece_at(square)
        board.turn = chess.WHITE
    rec = _new_record(board.fen(), args.get("name") or "")
    view = _view(rec)
    view["odds"] = {"piece": odds, "giver": giver} if odds != "none" else None
    _mirror_and_notify(rec)
    return json.dumps(view, ensure_ascii=False)


def chess_set_position(args, **kwargs):
    fen = (args.get("fen") or "").strip()
    try:
        board = chess.Board(fen)
        if not board.is_valid():
            return _err(f"FEN describes an invalid position: {fen!r}")
    except ValueError as exc:
        return _err(f"Invalid FEN: {exc}")
    rec = _new_record(board.fen(), args.get("name") or "")
    _mirror_and_notify(rec)
    return json.dumps(_view(rec), ensure_ascii=False)


def chess_board(args, **kwargs):
    rec, err = _get_game(args.get("game_id", ""))
    if err:
        return err
    return json.dumps(_view(rec), ensure_ascii=False)


def chess_list_games(args, **kwargs):
    games = _load_games()
    out = []
    for rec in games.values():
        board = _board_of(rec)
        out.append({
            "game_id": rec["id"],
            "name": rec.get("name", ""),
            "turn": "white" if board.turn == chess.WHITE else "black",
            "plies": len(rec["moves"]),
            "is_game_over": board.is_game_over(),
            "created": rec.get("created"),
        })
    return json.dumps({"games": out, "mirror_error": _LAST_MIRROR_ERROR},
                      ensure_ascii=False)


def chess_legal_moves(args, **kwargs):
    rec, err = _get_game(args.get("game_id", ""))
    if err:
        return err
    board = _board_of(rec)
    square = (args.get("square") or "").strip().lower()
    moves = []
    for move in board.legal_moves:
        if square:
            try:
                if move.from_square != chess.parse_square(square):
                    continue
            except ValueError:
                return _err(f"Invalid square: {square!r}")
        moves.append({"san": board.san(move), "uci": move.uci()})
    return json.dumps({
        "game_id": rec["id"],
        "turn": "white" if board.turn == chess.WHITE else "black",
        "count": len(moves),
        "moves": moves,
    }, ensure_ascii=False)


def chess_make_move(args, **kwargs):
    rec, err = _get_game(args.get("game_id", ""))
    if err:
        return err
    raw = (args.get("move") or "").strip()
    if not raw:
        return _err("No move provided")
    board = _board_of(rec)
    if board.is_game_over():
        return _err("This game is already over: " + board.result())
    move = None
    try:
        move = board.parse_san(raw)
    except (ValueError, chess.InvalidMoveError, chess.IllegalMoveError, chess.AmbiguousMoveError):
        try:
            candidate = chess.Move.from_uci(raw.lower())
            if candidate in board.legal_moves:
                move = candidate
        except ValueError:
            move = None
    if move is None:
        return _err(f"Illegal move: {raw!r}. Use chess_legal_moves to see the legal options.")
    san = board.san(move)
    captured = board.piece_at(move.to_square)
    board.push(move)
    rec["moves"].append(san)
    games = _load_games()
    games[rec["id"]] = rec
    _save_games(games)
    view = _view(rec)
    view["played"] = {
        "san": san,
        "uci": move.uci(),
        "captured": chess.piece_name(captured.piece_type) if captured else None,
        "gave_check": board.is_check(),
        "is_checkmate": board.is_checkmate(),
    }
    _mirror_and_notify(rec)
    return json.dumps(view, ensure_ascii=False)


def chess_review_position(args, **kwargs):
    """Read-only look at an earlier position; the stored game is untouched."""
    rec, err = _get_game(args.get("game_id", ""))
    if err:
        return err
    total = len(rec["moves"])
    at = args.get("at_ply")
    if at is None:
        ply = total
    else:
        try:
            at = int(at)
        except (TypeError, ValueError):
            return _err("at_ply must be an integer")
        ply = total + at if at < 0 else at
    if ply < 0 or ply > total:
        return _err(f"at_ply out of range: this game has {total} half-moves (0..{total})")
    board = chess.Board(rec["start_fen"])
    for san in rec["moves"][:ply]:
        board.push_san(san)
    return json.dumps({
        "game_id": rec["id"],
        "ply": ply,
        "total_plies": total,
        "fen": board.fen(),
        "board_ascii": str(board),
        "board_unicode": board.unicode(borders=True),
        "status": _status(board),
        "move_that_led_here": rec["moves"][ply - 1] if ply > 0 else None,
        "next_move_played": rec["moves"][ply] if ply < total else None,
        "note": "Read-only view; the live game still stands at its latest position.",
    }, ensure_ascii=False)


def chess_undo(args, **kwargs):
    rec, err = _get_game(args.get("game_id", ""))
    if err:
        return err
    try:
        plies = int(args.get("plies") or 1)
    except (TypeError, ValueError):
        return _err("plies must be an integer")
    if plies < 1:
        return _err("plies must be >= 1")
    if plies > len(rec["moves"]):
        return _err(f"Cannot undo {plies} plies; only {len(rec['moves'])} played")
    rec["moves"] = rec["moves"][:-plies]
    games = _load_games()
    games[rec["id"]] = rec
    _save_games(games)
    _mirror_and_notify(rec)
    return json.dumps(_view(rec), ensure_ascii=False)


def _find_mate(board, max_moves):
    """Exhaustive mate search for the side to move. Returns SAN line or None."""
    if max_moves < 1 or board.is_game_over():
        return None
    for move in board.legal_moves:
        san = board.san(move)
        board.push(move)
        if board.is_checkmate():
            board.pop()
            return [san]
        if max_moves >= 2:
            # Mate in 2: every defender reply must allow a mate in 1.
            all_replies_mated = True
            worst_line = None
            for reply in board.legal_moves:
                rsan = board.san(reply)
                board.push(reply)
                sub = _find_mate(board, 1)
                board.pop()
                if sub is None:
                    all_replies_mated = False
                    break
                worst_line = [rsan] + sub
            if all_replies_mated and worst_line is not None:
                line = [san] + worst_line
                board.pop()
                return line
        board.pop()
    return None


def chess_solve_mate(args, **kwargs):
    rec, err = _get_game(args.get("game_id", ""))
    if err:
        return err
    try:
        max_moves = int(args.get("max_moves") or 2)
    except (TypeError, ValueError):
        max_moves = 2
    if max_moves not in (1, 2):
        return _err("max_moves must be 1 or 2")
    board = _board_of(rec)
    line = _find_mate(board, max_moves)
    if line is None:
        return json.dumps({"game_id": rec["id"], "mate_in": None,
                           "searched_up_to": max_moves}, ensure_ascii=False)
    return json.dumps({"game_id": rec["id"],
                       "mate_in": (len(line) + 1) // 2,
                       "line_san": line}, ensure_ascii=False)


_VALUES = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3,
           chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0}
_START_COUNT = {chess.PAWN: 8, chess.KNIGHT: 2, chess.BISHOP: 2,
                chess.ROOK: 2, chess.QUEEN: 1}


def chess_material(args, **kwargs):
    rec, err = _get_game(args.get("game_id", ""))
    if err:
        return err
    board = _board_of(rec)
    totals = {True: 0, False: 0}
    captured = {True: [], False: []}  # pieces each side has LOST
    for piece_type, value in _VALUES.items():
        if piece_type == chess.KING:
            continue
        for color in (chess.WHITE, chess.BLACK):
            present = len(board.pieces(piece_type, color))
            totals[color] += present * value
            missing = _START_COUNT[piece_type] - present
            captured[color].extend([chess.piece_name(piece_type)] * max(missing, 0))
    return json.dumps({
        "game_id": rec["id"],
        "material": {"white": totals[True], "black": totals[False],
                     "balance_white_minus_black": totals[True] - totals[False]},
        "pieces_lost": {"white": captured[True], "black": captured[False]},
        "note": "Material count only (P=1,N=3,B=3,R=5,Q=9); not a position evaluation.",
    }, ensure_ascii=False)


def chess_pgn(args, **kwargs):
    rec, err = _get_game(args.get("game_id", ""))
    if err:
        return err
    board = _board_of(rec)
    game = chess.pgn.Game()
    game.headers["Event"] = rec.get("name") or "Hermes chess-coach game"
    game.headers["Site"] = "Hermes Agent (chess-coach plugin)"
    if rec["start_fen"] != chess.STARTING_FEN:
        game.headers["SetUp"] = "1"
        game.headers["FEN"] = rec["start_fen"]
        game.setup(chess.Board(rec["start_fen"]))
    node = game
    replay = chess.Board(rec["start_fen"])
    for san in rec["moves"]:
        node = node.add_variation(replay.parse_san(san))
        replay.push_san(san)
    game.headers["Result"] = board.result()
    exporter = chess.pgn.StringExporter(headers=True, variations=False, comments=False)
    game.accept(exporter)
    return json.dumps({"game_id": rec["id"], "pgn": str(exporter)}, ensure_ascii=False)
