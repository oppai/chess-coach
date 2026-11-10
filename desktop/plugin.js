// Chess Coach — desktop board pane (display only).
// The board's truth lives in the agent-side chess_* tools; this pane
// renders the position they mirror through the plugin backend
// (ctx.rest '/games'). Moves are made in chat, never here, so the pane
// can never diverge from the referee.

import { host } from '@hermes/plugin-sdk'
import { useEffect, useState } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'

const GLYPHS = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟'
}

let CTX = null

function parseFen(fen) {
  if (!fen) return null
  const rows = String(fen).split(' ')[0].split('/')
  if (rows.length !== 8) return null
  const board = []
  for (const row of rows) {
    const cells = []
    for (const ch of row) {
      if (ch >= '1' && ch <= '8') {
        for (let i = 0; i < Number(ch); i++) cells.push(null)
      } else {
        cells.push(ch)
      }
    }
    if (cells.length !== 8) return null
    board.push(cells)
  }
  return board
}

function statusText(game) {
  const s = game.status || {}
  if (s.is_checkmate) return 'Checkmate · ' + (s.result || '')
  if (s.is_stalemate) return 'Stalemate · draw'
  if (s.is_insufficient_material) return 'Draw · insufficient material'
  if (s.is_game_over) return 'Game over · ' + (s.result || '')
  const turn = s.turn === 'black' ? 'Black' : 'White'
  return turn + ' to move' + (s.is_check ? ' · check!' : '')
}

function movePairs(moves) {
  const out = []
  for (let i = 0; i < moves.length; i += 2) {
    out.push(String(i / 2 + 1) + '. ' + moves[i] + (moves[i + 1] ? ' ' + moves[i + 1] : ''))
  }
  return out
}

function Board({ fen }) {
  const board = parseFen(fen)
  if (!board) {
    return jsx('div', { className: 'text-sm', children: 'No position yet.' })
  }
  const squares = []
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f]
      const dark = (r + f) % 2 === 1
      const isWhitePiece = piece && piece === piece.toUpperCase()
      squares.push(
        jsx(
          'div',
          {
            style: {
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              aspectRatio: '1',
              fontSize: '27px',
              lineHeight: '1',
              backgroundColor: dark
                ? 'color-mix(in srgb, var(--ui-accent) 42%, transparent)'
                : 'color-mix(in srgb, var(--ui-accent) 10%, transparent)',
              color: isWhitePiece ? '#ffffff' : '#1a1a1a',
              textShadow: isWhitePiece
                ? '0 0 2px #000, 0 0 2px #000'
                : '0 0 2px #fff, 0 0 2px #fff'
            },
            children: [
              f === 0
                ? jsx('span', {
                    style: {
                      position: 'absolute', top: '1px', left: '3px',
                      fontSize: '9px', textShadow: 'none',
                      color: 'var(--ui-text-tertiary)'
                    },
                    children: String(8 - r)
                  })
                : null,
              r === 7
                ? jsx('span', {
                    style: {
                      position: 'absolute', bottom: '1px', right: '3px',
                      fontSize: '9px', textShadow: 'none',
                      color: 'var(--ui-text-tertiary)'
                    },
                    children: 'abcdefgh'[f]
                  })
                : null,
              piece ? GLYPHS[piece] || '' : ''
            ]
          },
          'sq-' + r + '-' + f
        )
      )
    }
  }
  return jsx('div', {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(8, 1fr)',
      width: '100%',
      border: '1px solid var(--ui-stroke-secondary)',
      borderRadius: '6px',
      overflow: 'hidden',
      userSelect: 'none'
    },
    children: squares
  })
}

function ChessPane() {
  const [data, setData] = useState(null)
  const [sel, setSel] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const d = await CTX.rest('/games')
        if (alive) {
          setData(d)
          setErr(null)
        }
      } catch (e) {
        if (alive) setErr('Waiting for the chess backend…')
      }
    }
    load()
    const timer = setInterval(load, 2500)
    let off = null
    try {
      off = host.onEvent('plugin.chess-coach.game.updated', () => load())
    } catch (e) {
      off = null
    }
    return () => {
      alive = false
      clearInterval(timer)
      if (off) off()
    }
  }, [])

  const games = (data && data.games) || []
  const game =
    games.find((g) => g.game_id === sel) || games[games.length - 1] || null

  return jsxs('div', {
    className: 'flex h-full flex-col gap-2 p-3',
    children: [
      jsxs('div', {
        className: 'flex items-baseline justify-between',
        children: [
          jsx('div', { className: 'font-medium', children: '♞ Chess Coach' }),
          jsx('div', {
            className: 'text-[0.6875rem]',
            style: { color: 'var(--ui-text-tertiary)' },
            children: game ? statusText(game) : ''
          })
        ]
      }),
      games.length > 1
        ? jsx('div', {
            className: 'flex flex-wrap gap-1',
            children: games.map((g) =>
              jsx(
                'button',
                {
                  type: 'button',
                  onClick: () => setSel(g.game_id),
                  className: 'px-1.5 text-[0.6875rem]',
                  style: {
                    border: '1px solid var(--ui-stroke-secondary)',
                    borderRadius: '999px',
                    color:
                      game && g.game_id === game.game_id
                        ? 'var(--ui-accent)'
                        : 'var(--ui-text-secondary)'
                  },
                  children:
                    (g.name || 'Game') + ' · ' + (g.moves_san || []).length + ' plies'
                },
                'g-' + g.game_id
              )
            )
          })
        : null,
      game
        ? jsx(Board, { fen: game.fen })
        : jsx('div', {
            className: 'text-sm',
            style: { color: 'var(--ui-text-secondary)' },
            children:
              err ||
              'No game yet. Ask Hermes in chat: “Give me a mate-in-1 puzzle” or “Play a game — you give knight odds.” The board will appear here.'
          }),
      game && game.last_move
        ? jsx('div', {
            className: 'text-[0.75rem]',
            style: { color: 'var(--ui-text-secondary)' },
            children: 'Last move: ' + game.last_move
          })
        : null,
      game && (game.moves_san || []).length > 0
        ? jsx('div', {
            className: 'text-[0.75rem]',
            style: {
              color: 'var(--ui-text-secondary)',
              overflowY: 'auto',
              borderTop: '1px solid var(--ui-stroke-secondary)',
              paddingTop: '6px'
            },
            children: movePairs(game.moves_san).join('   ')
          })
        : null
    ]
  })
}

export default {
  id: 'chess-coach',
  name: 'Chess Coach',
  register(ctx) {
    CTX = ctx
    ctx.register({
      id: 'board-pane',
      area: 'panes',
      title: 'Chess board',
      data: { placement: 'right', width: '350px' },
      render: () => jsx(ChessPane, {})
    })
  }
}
