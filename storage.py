"""One transactional store shared by agent tools and the desktop API.

Legacy ctx.state games are imported once, without changing the original file.
SQLite serializes read/modify/write across threads and processes.
"""
import contextvars
import json
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

_current = contextvars.ContextVar('chess_transaction', default=None)


def data_dir():
    try:
        from plugins.plugin_storage import plugin_data_dir
        return plugin_data_dir('chess-coach')
    except ImportError:
        return Path(os.environ.get('HERMES_HOME', Path.home() / '.hermes')) / 'plugin-data' / 'chess-coach'


def legacy_games():
    try:
        from hermes_cli.plugins_state import PluginState
    except ImportError:
        return {}
    return PluginState('chess-coach').get('games', default={})


@contextmanager
def transaction(legacy=None):
    existing = _current.get()
    if existing is not None:
        yield
        return
    root = data_dir()
    root.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(root / 'coach.sqlite3', timeout=10)
    token = None
    try:
        conn.execute('CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY, games TEXT NOT NULL)')
        conn.execute('BEGIN IMMEDIATE')
        row = conn.execute('SELECT games FROM state WHERE id=1').fetchone()
        games = json.loads(row[0]) if row else (legacy() if legacy else legacy_games())
        if not isinstance(games, dict):
            raise ValueError('Invalid stored games')
        token = _current.set({'games': games})
        yield
        encoded = json.dumps(_current.get()['games'], ensure_ascii=False)
        conn.execute('INSERT OR REPLACE INTO state VALUES (1, ?)', (encoded,))
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        if token is not None:
            _current.reset(token)
        conn.close()


def load():
    if _current.get() is None:
        raise RuntimeError('Chess state requires a transaction')
    return _current.get()['games']


def save(games):
    _current.get()['games'] = games
