// Chess Coach — desktop board pane.
// The board's truth lives in the agent-side chess_* tools; this pane
// renders the position they mirror through the plugin backend
// (ctx.rest '/games'). Clicking a move does not touch the board
// directly: it asks the agent in chat to play the move through
// chess_make_move, so every move is validated by the referee and the
// pane can never diverge.

import { host} from '@hermes/plugin-sdk'
import { useEffect, useState} from 'react'
import { jsx, jsxs} from 'react/jsx-runtime'

const GLYPHS = {
K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟'
}
const FILES = 'abcdefgh'

let CTX = null

function parseFen(fen) {
if (!fen) return null
const rows = String(fen).split(' ')[0].split('/')
if (rows.length!== 8) return null
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
if (cells.length!== 8) return null
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
const turn = s.turn === 'black'? 'Black': 'White'
return turn + ' to move' + (s.is_check? ' · check!': '')
}

function movePairs(moves) {
const out = []
for (let i = 0; i < moves.length; i += 2) {
out.push(String(i / 2 + 1) + '. ' + moves[i] + (moves[i + 1]? ' ' + moves[i + 1]: ''))
}
return out
}

function Board({ game, sel, targets, onSquare}) {
const board = parseFen(game.fen)
if (!board) {
return jsx('div', { className: 'text-sm', children: 'No position yet.'})
}
const turn = (game.status && game.status.turn) || 'white'
const over =!!(game.status && game.status.is_game_over)
const squares = []
for (let r = 0; r < 8; r++) {
for (let f = 0; f < 8; f++) {
const piece = board[r][f]
const name = FILES[f] + String(8 - r)
const dark = (r + f) % 2 === 1
const isWhitePiece = piece && piece === piece.toUpperCase()
const ownPiece =
piece &&!over && (turn === 'white') === isWhitePiece
const isSel = sel === name
const target = targets.find((t) => t.to === name)
squares.push(
jsx(
'div',
{
onClick: () => onSquare(name, piece),
style: {
position: 'relative',
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
aspectRatio: '1',
backgroundColor: dark
? 'color-mix(in srgb, var(--ui-accent) 42%, transparent)'
: 'color-mix(in srgb, var(--ui-accent) 10%, transparent)',
boxShadow: isSel
? 'inset 0 0 0 3px var(--ui-accent)'
: target
? 'inset 0 0 0 2px color-mix(in srgb, var(--ui-accent) 65%, transparent)'
: 'none',
cursor: ownPiece || target? 'pointer': 'default',
userSelect: 'none'
},
children: [
f === 0
? jsx('span', {
style: {
position: 'absolute', top: '2px', left: '4px',
fontSize: 'max(11px, 1.9cqw)', lineHeight: '1',
color: 'var(--ui-text-secondary)',
pointerEvents: 'none'
},
children: String(8 - r)
})
: null,
r === 7
? jsx('span', {
style: {
position: 'absolute', bottom: '2px', right: '4px',
fontSize: 'max(11px, 1.9cqw)', lineHeight: '1',
color: 'var(--ui-text-secondary)',
pointerEvents: 'none'
},
children: FILES[f]
})
: null,
target &&!piece
? jsx('span', {
style: {
position: 'absolute',
width: '26%', height: '26%', borderRadius: '50%',
backgroundColor:
'color-mix(in srgb, var(--ui-accent) 55%, transparent)',
pointerEvents: 'none'
},
children: ''
})
: null,
piece
? jsx('span', {
style: {
fontSize: '9.6cqw',
lineHeight: '1',
color: isWhitePiece? '#ffffff': '#14181d',
textShadow: isWhitePiece
? '0 0 3px #000, 0 0 3px #000, 0 1px 2px #000'
: '0 0 3px #fff, 0 0 3px #fff, 0 1px 2px #fff',
pointerEvents: 'none'
},
children: GLYPHS[piece] || ''
})
: null
]
},
'sq-' + name
)
)
}
}
return jsx('div', {
style: {
display: 'grid',
gridTemplateColumns: 'repeat(8, 1fr)',
width: '100%',
containerType: 'inline-size',
border: '1px solid var(--ui-stroke-secondary)',
borderRadius: '6px',
overflow: 'hidden'
},
children: squares
})
}

function ChessPane() {
const [data, setData] = useState(null)
const [selGame, setSelGame] = useState(null)
const [selSq, setSelSq] = useState(null)
const [note, setNote] = useState(null)
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
games.find((g) => g.game_id === selGame) || games[games.length - 1] || null

// Reset the piece selection whenever the position changes.
const fen = game? game.fen: null
useEffect(() => {
setSelSq(null)
}, [fen])

const legal = (game && game.legal_moves) || []
const targets = selSq? legal.filter((m) => m.from === selSq): []

const onSquare = (name, piece) => {
if (!game || (game.status && game.status.is_game_over)) return
const turn = (game.status && game.status.turn) || 'white'
// Completing a move: a target square was clicked.
if (selSq) {
const hit = targets.find((t) => t.to === name)
if (hit) {
const promo = targets.filter((t) => t.to === name && t.promotion)
const chosen =
promo.find((t) => t.uci.endsWith('q')) || promo[0] || hit
const text =
'game_id「' + game.game_id + '」に ' + chosen.uci +
' と指して（chess_make_move を使って）。指したら盤面と一言コメントを返して。'
try {
host.composer.submit(null, text)
setNote('送信しました: ' + chosen.san + '（エージェントが指します）')
} catch (e) {
setNote('送信できませんでした。チャットで直接指してください。')
}
setSelSq(null)
return
}
}
// Selecting one of the side-to-move's pieces.
if (piece) {
const isWhitePiece = piece === piece.toUpperCase()
if ((turn === 'white') === isWhitePiece) {
setSelSq(selSq === name? null: name)
return
}
}
setSelSq(null)
}

return jsxs('div', {
className: 'flex h-full flex-col gap-2 p-3',
children: [
jsxs('div', {
className: 'flex items-baseline justify-between',
children: [
jsx('div', { className: 'font-medium', children: '♞ Chess Coach'}),
jsx('div', {
className: 'text-[0.75rem]',
style: { color: 'var(--ui-text-tertiary)'},
children: game? statusText(game): ''
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
onClick: () => {
setSelGame(g.game_id)
setSelSq(null)
},
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
? jsx(Board, { game, sel: selSq, targets, onSquare})
: jsx('div', {
className: 'text-sm',
style: { color: 'var(--ui-text-secondary)'},
children:
err ||
'No game yet. Ask Hermes in chat: “Give me a mate-in-1 puzzle” or “Play a game — you give knight odds.” The board will appear here.'
}),
game
? jsx('div', {
className: 'text-[0.75rem]',
style: { color: 'var(--ui-text-tertiary)'},
children: note
? note
: '駒をクリック → 移動先をクリックで、チャット経由で指せます。'
})
: null,
game && game.last_move
? jsx('div', {
className: 'text-[0.75rem]',
style: { color: 'var(--ui-text-secondary)'},
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
children: movePairs(game.moves_san).join(' ')
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
data: { placement: 'right', width: '350px'},
render: () => jsx(ChessPane, {})
})
}
}
