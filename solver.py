"""Bounded, exact AND/OR mate search. A timeout never means 'no mate'."""
import time


class SearchLimit(Exception):
    pass


def solve(board, max_moves, seconds=3, max_nodes=150000):
    attacker = board.turn
    deadline = time.monotonic() + seconds
    nodes = 0
    cache = {}

    def visit(remaining):
        nonlocal nodes
        nodes += 1
        if nodes > max_nodes or time.monotonic() >= deadline:
            raise SearchLimit('Mate search budget exceeded')
        if board.is_checkmate():
            return [] if board.turn != attacker else None
        if remaining <= 0 or board.is_game_over():
            return None
        # Include draw-sensitive state; do not cache repetition-dependent nodes.
        key = (board.fen(), remaining)
        if not board.is_repetition(2) and key in cache:
            return cache[key]
        attacking = board.turn == attacker
        moves = list(board.legal_moves)
        moves.sort(key=lambda m: (board.gives_check(m), board.is_capture(m)), reverse=True)
        result = None
        for move in moves:
            board.push(move)
            try:
                child = visit(remaining - 1)
            finally:
                board.pop()
            if attacking and child is not None:
                result = [move.uci()] + child
                break
            if not attacking:
                if child is None:
                    result = None
                    break
                line = [move.uci()] + child
                if result is None or len(line) > len(result):
                    result = line
        if not board.is_repetition(2):
            cache[key] = result
        return result

    for depth in range(1, max_moves + 1):
        line = visit(2 * depth - 1)
        if line is not None:
            copy = board.copy()
            san = []
            for uci in line:
                move = copy.parse_uci(uci)
                san.append(copy.san(move))
                copy.push(move)
            return {'mate_in': depth, 'line_uci': line, 'line_san': san, 'nodes': nodes}
    return {'mate_in': None, 'line_uci': [], 'line_san': [], 'nodes': nodes}
