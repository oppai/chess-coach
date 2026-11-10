"""Tool schemas — what the LLM reads to decide when to call each tool."""

CHESS_NEW_GAME = {
    "name": "chess_new_game",
    "description": (
        "Start a new chess game and return its game_id and starting board. "
        "Optionally apply handicap odds: one side gives odds by removing a "
        "piece (knight = b1/g1 knight, rook = a1/a8 rook, queen, or the "
        "f-pawn) before the game starts. Use this to begin a game the user "
        "plays against the agent, or to set up a practice game."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "name": {
                "type": "string",
                "description": "Optional label for the game (e.g. 'lesson-1').",
            },
            "odds": {
                "type": "string",
                "enum": ["none", "pawn", "knight", "rook", "queen"],
                "description": "Handicap piece removed from the odds-giver's side. Default 'none'.",
            },
            "odds_giver": {
                "type": "string",
                "enum": ["white", "black"],
                "description": "Which side gives the odds (loses the piece). Default 'black' (the stronger player usually gives odds; set to 'white' when the agent gives odds to the user).",
            },
        },
        "required": [],
    },
}

CHESS_SET_POSITION = {
    "name": "chess_set_position",
    "description": (
        "Create a game from an arbitrary FEN position. Use this for "
        "checkmate practice, tactics puzzles and endgame drills: set the "
        "puzzle position, then let the user (or the agent) try to find the "
        "mate or the best move, verifying each attempt with chess_make_move "
        "and chess_solve_mate."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "fen": {
                "type": "string",
                "description": "A valid FEN string for the position to set up.",
            },
            "name": {
                "type": "string",
                "description": "Optional label (e.g. 'mate-in-1 #3').",
            },
        },
        "required": ["fen"],
    },
}

CHESS_BOARD = {
    "name": "chess_board",
    "description": (
        "Show the current state of a game: ASCII board, FEN, side to move, "
        "move history in SAN, and status (check / checkmate / stalemate / "
        "draw conditions / game over result). Call this whenever you need "
        "ground truth about the position instead of remembering it."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "game_id": {"type": "string", "description": "The game_id returned by chess_new_game or chess_set_position."},
        },
        "required": ["game_id"],
    },
}

CHESS_LEGAL_MOVES = {
    "name": "chess_legal_moves",
    "description": (
        "List every legal move in the current position (SAN and UCI), "
        "optionally only the moves of the piece on one square. Use this to "
        "check whether a contemplated move is legal, to enumerate candidate "
        "moves, and to pick the agent's own moves from real options only."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "game_id": {"type": "string", "description": "The game_id."},
            "square": {
                "type": "string",
                "description": "Optional square like 'g1' to list only moves of that piece.",
            },
        },
        "required": ["game_id"],
    },
}

CHESS_MAKE_MOVE = {
    "name": "chess_make_move",
    "description": (
        "Play a move in a game. Accepts SAN ('Nf3', 'exd5', 'O-O', 'e8=Q') "
        "or UCI ('g1f3', 'e7e8q'). The move is validated against the real "
        "legal move list: illegal moves are rejected with an error and the "
        "board does not change. Returns the new board state including check "
        "/ checkmate / stalemate / draw status, so a mating move is reported "
        "as checkmate with the game result."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "game_id": {"type": "string", "description": "The game_id."},
            "move": {"type": "string", "description": "The move in SAN or UCI notation."},
        },
        "required": ["game_id", "move"],
    },
}

CHESS_UNDO = {
    "name": "chess_undo",
    "description": (
        "Take back moves in a game (default 1 ply = one half-move; use 2 to "
        "retract a full round of user move + agent reply). Use for lessons "
        "and 'let me try that again' practice."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "game_id": {"type": "string", "description": "The game_id."},
            "plies": {"type": "integer", "description": "How many half-moves to take back. Default 1."},
        },
        "required": ["game_id"],
    },
}

CHESS_SOLVE_MATE = {
    "name": "chess_solve_mate",
    "description": (
        "Search the current position for a forced checkmate in 1 or 2 moves "
        "for the side to move, by exhaustive legal-move search (no engine "
        "needed). Returns the mating line in SAN if one exists, or "
        "mate_in: null. Use it to verify checkmate-practice answers and to "
        "confirm a puzzle position really is a mate before presenting it."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "game_id": {"type": "string", "description": "The game_id."},
            "max_moves": {
                "type": "integer",
                "enum": [1, 2],
                "description": "Search depth in full moves: 1 or 2. Default 2.",
            },
        },
        "required": ["game_id"],
    },
}

CHESS_MATERIAL = {
    "name": "chess_material",
    "description": (
        "Count material for both sides (standard values P=1, N=3, B=3, "
        "R=5, Q=9) and report the balance plus captured pieces. A simple, "
        "objective signal for coaching comments and skill evaluation; it is "
        "not a position evaluation."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "game_id": {"type": "string", "description": "The game_id."},
        },
        "required": ["game_id"],
    },
}

CHESS_PGN = {
    "name": "chess_pgn",
    "description": (
        "Export a game as PGN text (headers plus SAN move list and result). "
        "Use it to give the user a record of a finished game or lesson."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "game_id": {"type": "string", "description": "The game_id."},
        },
        "required": ["game_id"],
    },
}

CHESS_REVIEW_POSITION = {
    "name": "chess_review_position",
    "description": (
        "Look at an earlier position of a game WITHOUT changing the game: "
        "returns the board, FEN and status as they were after the given "
        "number of half-moves, plus the moves played just before and just "
        "after that point. Use it for reflection ('that was a good move — "
        "let's look at that position again') while the live game continues "
        "from its current position. To analyse the old position (mate "
        "search, what-if lines), feed the returned FEN to "
        "chess_set_position to get a scratch board."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "game_id": {"type": "string", "description": "The game_id."},
            "at_ply": {
                "type": "integer",
                "description": "Half-moves from the start: 0 = the starting position, 5 = after 5 half-moves. Negative counts back from the current position (-1 = just before the last move). Omit for the current position.",
            },
        },
        "required": ["game_id"],
    },
}

CHESS_LIST_GAMES = {
    "name": "chess_list_games",
    "description": (
        "List the games currently stored by the plugin (game_id, label, "
        "side to move, number of moves, whether finished). Use it to find a "
        "game the user wants to resume."
    ),
    "parameters": {"type": "object", "properties": {}, "required": []},
}
