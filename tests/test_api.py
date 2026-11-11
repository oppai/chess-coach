import importlib.util
import tempfile
import unittest
from pathlib import Path
from fastapi import FastAPI
from fastapi.testclient import TestClient

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('test_api_module',ROOT/'dashboard'/'plugin_api.py')
api=importlib.util.module_from_spec(spec)
spec.loader.exec_module(api)

class ApiTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.old_dir=api.service.storage.data_dir
        self.old_legacy=api.service.storage.legacy_games
        api.service.storage.data_dir=lambda:Path(self.tmp.name)
        api.service.storage.legacy_games=lambda:{}
        self.old_targets=api.service.tools._mirror_targets
        api.service.tools._mirror_targets=lambda:[Path(self.tmp.name)/'games.json']
        app=FastAPI();app.include_router(api.router)
        self.client=TestClient(app)
    def tearDown(self):
        api.service.storage.data_dir=self.old_dir
        api.service.storage.legacy_games=self.old_legacy
        api.service.tools._mirror_targets=self.old_targets
        self.client.close();self.tmp.cleanup()
    def test_routes_validation_and_persistence(self):
        self.assertEqual(self.client.get('/games').json()['api_version'],2)
        self.assertEqual(self.client.post('/action',json={'action':'new_puzzle','depth':5}).status_code,422)
        self.assertEqual(self.client.post('/action',json={'action':'new_game','unexpected':'value'}).status_code,422)
        game=self.client.post('/action',json={'action':'new_game','odds':'rook','odds_giver':'black','user_color':'white'}).json()['game']
        moved=self.client.post('/action',json={'action':'move','game_id':game['game_id'],'expected_revision':0,'move':'e2e4'}).json()['game']
        self.assertEqual(moved['revision'],1)
        self.assertEqual(self.client.get('/games').json()['games'][0]['fen'],moved['fen'])
    def test_storage_failure_is_not_empty_success(self):
        def broken():raise RuntimeError('unreadable')
        api.service.storage.legacy_games=broken
        self.assertEqual(self.client.get('/games').status_code,503)

if __name__=='__main__':unittest.main()
