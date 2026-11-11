import importlib.util
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

import chess

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('coach_test', ROOT / '__init__.py', submodule_search_locations=[str(ROOT)])
package = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = package
spec.loader.exec_module(package)
from coach_test import tools, service, storage
from coach_test.solver import solve, SearchLimit
from coach_test.puzzles import PUZZLES


class CoreTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.old_dir = storage.data_dir
        storage.data_dir = lambda: Path(self.temp.name)
        self.old_legacy = storage.legacy_games
        storage.legacy_games = lambda: {}
        tools.bind_state(lambda: {}, lambda _: None)
        self.old_targets = tools._mirror_targets
        tools._mirror_targets = lambda: [Path(self.temp.name) / 'games.json']

    def tearDown(self):
        storage.data_dir = self.old_dir
        storage.legacy_games = self.old_legacy
        tools._mirror_targets = self.old_targets
        self.temp.cleanup()

    def act(self, action, game=None, **args):
        return service.action({'action': action, **({'game_id':game['game_id'], 'expected_revision':game['revision']} if game else {}), **args})

    def test_all_puzzles_have_exact_depth(self):
        for puzzle in PUZZLES:
            with self.subTest(puzzle=puzzle['id']):
                board = chess.Board(puzzle['fen'])
                self.assertTrue(board.is_valid())
                found = solve(board, puzzle['depth'], seconds=10, max_nodes=600000)
                self.assertEqual(found['mate_in'], puzzle['depth'])

    def test_complete_each_depth_without_llm(self):
        for depth in range(1,5):
            game = self.act('new_puzzle',depth=depth)['game']
            for _ in range(depth):
                found=solve(chess.Board(game['fen']),depth,seconds=10)
                response=self.act('move',game,move=found['line_uci'][0])
                self.assertNotIn('error',response)
                game=response['game']
                if game['status']['is_checkmate']:break
            self.assertTrue(game['status']['is_checkmate'])
            reset=self.act('retry',game)['game']
            self.assertEqual(reset['fen'],reset['start_fen'])
            self.assertEqual(reset['moves_san'],[])

    def test_odds_moves_sync_and_stale_rejection(self):
        game=self.act('new_game',odds='knight',odds_giver='black',user_color='white')['game']
        self.assertIsNone(chess.Board(game['fen']).piece_at(chess.B8))
        moved=self.act('move',game,move='e2e4')['game']
        stale=self.act('move',game,move='d2d4')
        self.assertEqual(stale['error'],'stale_position')
        self.assertEqual(json.loads(tools.chess_board({'game_id':game['game_id']}))['fen'],moved['fen'])
        reply=json.loads(tools.chess_make_move({'game_id':game['game_id'],'move':'e7e5','expected_revision':moved['revision']}))
        self.assertNotIn('error',reply)
        undone=self.act('undo',reply)['game']
        self.assertEqual(undone['fen'],game['fen'])
        self.assertEqual(len(service.snapshot()['games']),1)

    def test_illegal_and_opponent_moves_preserve_state(self):
        game=self.act('new_game',user_color='black')['game']
        with self.assertRaisesRegex(ValueError,'opponent_turn'):
            self.act('move',game,move='e2e4')
        self.assertEqual(service.snapshot()['games'][0]['fen'],game['fen'])

    def test_pgn_and_underpromotion(self):
        raw=tools.chess_set_position({'fen':'7k/P7/8/8/8/8/8/K7 w - - 0 1'})
        game=json.loads(raw)
        moved=self.act('move',game,move='a7a8n')['game']
        self.assertEqual(chess.Board(moved['fen']).piece_at(chess.A8).symbol(),'N')
        self.assertIn('a8=N',self.act('pgn',moved)['pgn'])

    def test_search_limit_does_not_corrupt_board(self):
        board=chess.Board()
        before=board.fen()
        with self.assertRaises(SearchLimit):solve(board,4,max_nodes=2)
        self.assertEqual(board.fen(),before)

    def test_concurrent_moves_only_one_wins(self):
        from concurrent.futures import ThreadPoolExecutor
        game=self.act('new_game',user_color='white')['game']
        with ThreadPoolExecutor(max_workers=2) as pool:
            responses=list(pool.map(lambda move:self.act('move',game,move=move),['e2e4','d2d4']))
        self.assertEqual(sum('error' not in r for r in responses),1)
        self.assertEqual(sum(r.get('error')=='stale_position' for r in responses),1)
        saved=service.snapshot()['games'][0]
        self.assertEqual(saved['revision'],1)
        self.assertEqual(len(saved['moves_san']),1)

    def test_wrong_puzzle_move_is_not_saved(self):
        game=self.act('new_puzzle',depth=1)['game']
        board=chess.Board(game['fen'])
        wrong=next(m for m in board.legal_moves if not self.mates(board,m))
        response=self.act('move',game,move=wrong.uci())
        self.assertEqual(response['error'],'try_again')
        self.assertEqual(response['game']['fen'],game['fen'])
        self.assertEqual(response['game']['revision'],0)

    @staticmethod
    def mates(board,move):
        copy=board.copy();copy.push(move)
        return copy.is_checkmate()

    def test_castling_and_en_passant(self):
        for fen,move,square,piece in [
            ('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1','e1g1',chess.F1,'R'),
            ('7k/8/8/3pP3/8/8/8/K7 w - d6 0 1','e5d6',chess.D6,'P')
        ]:
            game=json.loads(tools.chess_set_position({'fen':fen}))
            moved=self.act('move',game,move=move)['game']
            board=chess.Board(moved['fen'])
            self.assertEqual(board.piece_at(square).symbol(),piece)
            if move=='e5d6':self.assertIsNone(board.piece_at(chess.D5))

    def test_legacy_migrates_once(self):
        legacy={'legacy':{'id':'legacy','start_fen':chess.STARTING_FEN,'moves':['e4'],'name':'Legacy','created':1}}
        storage.legacy_games=lambda:legacy
        games=service.snapshot()['games']
        self.assertEqual(games[0]['moves_san'],['e4'])
        storage.legacy_games=lambda:{}
        self.assertEqual(len(service.snapshot()['games']),1)

if __name__=='__main__':unittest.main()
