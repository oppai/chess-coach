"""Desktop operations: legal moves and practice run locally, without an LLM."""
import json
import random
import time

import chess

from . import storage, tools
from .solver import solve, SearchLimit
from .puzzles import PUZZLES


def view(rec):
    result = tools._view(rec)
    board = tools._board_of(rec)
    result['legal_moves'] = [{'uci': m.uci(), 'san': board.san(m), 'from': chess.square_name(m.from_square), 'to': chess.square_name(m.to_square), 'promotion': bool(m.promotion)} for m in board.legal_moves]
    result['last_move'] = rec['moves'][-1] if rec['moves'] else None
    result['last_move_uci'] = board.peek().uci() if board.move_stack else None
    if board.is_checkmate():
        king = board.king(board.turn)
        neighbors = chess.BB_KING_ATTACKS[king]
        own_pieces = board.occupied_co[board.turn]
        if not (neighbors & ~own_pieces):
            result['mate_detail'] = 'blocked'
        elif len(board.checkers()) > 1:
            result['mate_detail'] = 'double_check'
        else:
            result['mate_detail'] = 'no_defense'
    result['created'] = rec.get('created', 0)
    return result


def snapshot():
    with storage.transaction():
        return {'api_version': 2, 'games': [view(r) for r in sorted(storage.load().values(), key=lambda r: r.get('created', 0))]}


def result(raw):
    data = json.loads(raw)
    if 'error' in data:
        raise ValueError(data['error'])
    return data


def action(args):
    with storage.transaction():
        kind = args.get('action')
        if kind == 'new_game':
            made = result(tools.chess_new_game(args))
            rec = storage.load()[made['game_id']]
        elif kind == 'new_puzzle':
            depth = args.get('depth', 1)
            if type(depth) is not int or depth not in (1, 2, 3, 4):
                raise ValueError('invalid_depth')
            candidates = [p for p in PUZZLES if p['depth'] == depth]
            last = args.get('previous_puzzle')
            choices = [p for p in candidates if p['id'] != last] or candidates
            puzzle = random.choice(choices)
            rec = tools._new_record(puzzle['fen'], f'Mate in {depth}')
            rec.update(mode='puzzle', user_color='white' if tools._board_of(rec).turn else 'black', puzzle={'id': puzzle['id'], 'depth': depth})
        else:
            rec = storage.load().get(args.get('game_id'))
            if not rec:
                raise ValueError('game_not_found')
            if args.get('expected_revision') != rec.get('revision', 0):
                return {'error': 'stale_position', 'game': view(rec)}
            board = tools._board_of(rec)
            if kind == 'move':
                if board.is_game_over():
                    raise ValueError('game_over')
                if rec.get('user_color') and rec['user_color'] != ('white' if board.turn else 'black'):
                    raise ValueError('opponent_turn')
                try:
                    move = board.parse_uci(args.get('move', ''))
                except ValueError:
                    raise ValueError('illegal_move')
                if rec.get('mode') == 'puzzle':
                    return puzzle_move(rec, board, move)
                result(tools.chess_make_move({'game_id': rec['id'], 'move': move.uci()}))
            elif kind == 'undo':
                count = len(rec['moves'])
                # Return to the user's previous decision, including the defender's reply.
                plies = 2 if count >= 2 and ('white' if board.turn else 'black') == rec.get('user_color') else 1
                result(tools.chess_undo({'game_id': rec['id'], 'plies': plies}))
            elif kind == 'retry':
                if rec.get('mode') != 'puzzle':
                    raise ValueError('not_a_puzzle')
                rec['moves'] = []
                rec['revision'] = rec.get('revision', 0) + 1
            elif kind == 'hint':
                remaining = rec.get('puzzle', {}).get('depth', 2) - (len(rec['moves']) + 1) // 2
                found = solve(board, max(1, remaining), seconds=2)
                if not found['line_uci']:
                    return {'error': 'no_mate_found', 'game': view(rec)}
                move = board.parse_uci(found['line_uci'][0])
                if board.gives_check(move):
                    idea = 'check'
                elif board.is_capture(move):
                    idea = 'capture'
                else:
                    idea = 'escape_squares'
                return {'hint_idea': idea, 'hint_square': chess.square_name(move.from_square), 'game': view(rec)}
            elif kind == 'pgn':
                return {'pgn': result(tools.chess_pgn({'game_id': rec['id']}))['pgn'], 'game': view(rec)}
            else:
                raise ValueError('unknown_action')
        tools._mirror_and_notify(rec)
        return {'game': view(rec)}


def puzzle_move(rec, board, move):
    remaining = rec['puzzle']['depth'] - (len(rec['moves']) + 1) // 2
    san = board.san(move)
    board.push(move)
    reply = None
    if not board.is_checkmate():
        if remaining <= 1 or board.is_game_over():
            reason = 'defense'
            if board.is_stalemate():
                reason = 'stalemate'
            elif remaining == 1 and not board.is_check():
                reason = 'no_check'
            return {'error': 'try_again', 'mistake': reason, 'game': view(rec)}
        deadline = time.monotonic() + 2
        longest = -1
        for defense in list(board.legal_moves):
            board.push(defense)
            try:
                found = solve(board, remaining - 1, seconds=max(.001, deadline - time.monotonic()))
            finally:
                board.pop()
            if found['mate_in'] is None:
                return {'error': 'try_again', 'game': view(rec)}
            if len(found['line_uci']) > longest:
                longest = len(found['line_uci'])
                reply = defense
    rec['moves'].append(san)
    if reply:
        rec['moves'].append(board.san(reply))
    rec['revision'] = rec.get('revision', 0) + 1
    tools._mirror_and_notify(rec)
    return {'game': view(rec), 'feedback': 'solved' if board.is_checkmate() else 'correct'}
