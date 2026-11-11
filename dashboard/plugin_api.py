"""Authenticated, plugin-scoped API. Every mutation uses the referee's store."""
import importlib.util
import sys
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

# Hermes loads dashboard modules as standalone files. Load our own package
# explicitly so its relative imports work without touching sys.path.
_root = Path(__file__).resolve().parents[1]
_package = '_hermes_chess_coach_api'
if _package not in sys.modules:
    spec = importlib.util.spec_from_file_location(_package, _root / '__init__.py', submodule_search_locations=[str(_root)])
    module = importlib.util.module_from_spec(spec)
    sys.modules[_package] = module
    spec.loader.exec_module(module)
service = importlib.import_module(_package + '.service')
router = APIRouter()


class Action(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    action: str = Field(max_length=32)
    game_id: str | None = Field(default=None, max_length=64)
    expected_revision: int | None = Field(default=None, ge=0)
    move: str | None = Field(default=None, max_length=5)
    depth: int = Field(default=1, ge=1, le=4)
    odds: str = Field(default='none', pattern='^(none|pawn|knight|rook|queen)$')
    odds_giver: str = Field(default='black', pattern='^(white|black)$')
    user_color: str = Field(default='white', pattern='^(white|black)$')
    name: str = Field(default='', max_length=120)
    previous_puzzle: str | None = Field(default=None, max_length=64)


@router.get('/games')
def games():
    try:
        return service.snapshot()
    except Exception as exc:
        raise HTTPException(503, 'Chess storage is unavailable') from exc


@router.post('/action')
def action(body: Action):
    try:
        return service.action(body.model_dump(exclude_none=True))
    except service.SearchLimit:
        return {'error': 'search_limit'}
    except ValueError as exc:
        return {'error': str(exc)}
    except Exception as exc:
        raise HTTPException(503, 'Chess storage is unavailable') from exc
