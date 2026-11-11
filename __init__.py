"""chess-coach — board tools for chess lessons, games and tests.

The plugin owns the board (state, legality, check/mate/draw detection,
mate search, material, PGN). The agent owns the coaching: it composes
checkmate practice, handicap games, strategy guidance and skill tests
on top of these tools, guided by the bundled chess-coach skill.
"""

import logging
from pathlib import Path

from . import schemas, tools

logger = logging.getLogger(__name__)

_TOOLSET = "chess"


def register(ctx):
    # Supply legacy state for one-time migration. Both desktop and agent
    # now use the profile-scoped SQLite referee store.
    tools.bind_state(
        lambda: ctx.state.get("games", default={}),
        lambda games: ctx.state.set("games", games),
    )

    ctx.register_tool(name="chess_new_game", toolset=_TOOLSET,
                      schema=schemas.CHESS_NEW_GAME, handler=tools.chess_new_game)
    ctx.register_tool(name="chess_set_position", toolset=_TOOLSET,
                      schema=schemas.CHESS_SET_POSITION, handler=tools.chess_set_position)
    ctx.register_tool(name="chess_board", toolset=_TOOLSET,
                      schema=schemas.CHESS_BOARD, handler=tools.chess_board)
    ctx.register_tool(name="chess_list_games", toolset=_TOOLSET,
                      schema=schemas.CHESS_LIST_GAMES, handler=tools.chess_list_games)
    ctx.register_tool(name="chess_legal_moves", toolset=_TOOLSET,
                      schema=schemas.CHESS_LEGAL_MOVES, handler=tools.chess_legal_moves)
    ctx.register_tool(name="chess_make_move", toolset=_TOOLSET,
                      schema=schemas.CHESS_MAKE_MOVE, handler=tools.chess_make_move)
    ctx.register_tool(name="chess_undo", toolset=_TOOLSET,
                      schema=schemas.CHESS_UNDO, handler=tools.chess_undo)
    ctx.register_tool(name="chess_review_position", toolset=_TOOLSET,
                      schema=schemas.CHESS_REVIEW_POSITION, handler=tools.chess_review_position)
    ctx.register_tool(name="chess_solve_mate", toolset=_TOOLSET,
                      schema=schemas.CHESS_SOLVE_MATE, handler=tools.chess_solve_mate)
    ctx.register_tool(name="chess_material", toolset=_TOOLSET,
                      schema=schemas.CHESS_MATERIAL, handler=tools.chess_material)
    ctx.register_tool(name="chess_pgn", toolset=_TOOLSET,
                      schema=schemas.CHESS_PGN, handler=tools.chess_pgn)

    skills_dir = Path(__file__).parent / "skills"
    if skills_dir.is_dir():
        for child in sorted(skills_dir.iterdir()):
            skill_md = child / "SKILL.md"
            if child.is_dir() and skill_md.exists():
                ctx.register_skill(child.name, skill_md)

    logger.info("chess-coach: registered 11 chess tools")
