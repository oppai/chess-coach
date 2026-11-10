"""Backend for the chess-coach desktop board pane.

Serves the game state that the agent-side tools mirror into the plugin
data directory (games.json) after every change. Read-only: all moves go
through the chess_* tools, so the pane can never diverge from the
referee's board.

Mounted by Hermes under /api/plugins/chess-coach/ when the plugin is in
the plugins.enabled allow-list.
"""

import json
import os
from pathlib import Path

from fastapi import APIRouter

router = APIRouter()


def _data_file() -> Path:
    try:
        from plugins.plugin_storage import plugin_data_dir

        return plugin_data_dir("chess-coach") / "games.json"
    except Exception:
        home = Path(os.environ.get("HERMES_HOME", str(Path.home() / ".hermes")))
        return home / "plugin-data" / "chess-coach" / "games.json"


@router.get("/games")
async def games():
    try:
        return json.loads(_data_file().read_text(encoding="utf-8"))
    except Exception:
        return {"updated": None, "games": []}
