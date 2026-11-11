"""Original/simple training positions. Exact depths checked by tests, not an LLM."""
import chess

_BASE = [
    ('back-rank', 1, '6k1/5ppp/8/8/8/8/8/1R4K1 w - - 0 1'),
    ('smothered', 1, '6rk/6pp/7N/8/8/8/8/K7 w - - 0 1'),
    ('decoy', 2, 'r5k1/5ppp/8/8/8/3Q4/8/3R2K1 w - - 0 1'),
    ('queen-net', 2, '8/8/3Q4/8/8/2K5/k7/8 w - - 0 1'),
    ('king-support', 3, '8/8/8/8/Q7/5K2/3k4/8 w - - 0 1'),
    ('edge-net', 3, '1Q6/8/7k/8/8/5K2/8/8 w - - 0 1'),
    ('queen-maneuver', 4, '7k/8/6Q1/6K1/8/8/8/8 w - - 0 1'),
]
PUZZLES = []
for name, depth, fen in _BASE:
    PUZZLES.append({'id': name, 'depth': depth, 'fen': fen})
    reflected = chess.Board(fen).transform(chess.flip_horizontal)
    PUZZLES.append({'id': name + '-reflected', 'depth': depth, 'fen': reflected.fen()})
