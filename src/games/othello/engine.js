import { search } from '../../engine/minimax.js'

export const N = 8
const idx = (r, c) => r * N + c
const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]

// Giocatore 1 = nero (muove per primo, come da regolamento), 2 = bianco.
export function initialState({ first = 1 } = {}) {
  const board = Array(N * N).fill(0)
  board[idx(3, 3)] = 2
  board[idx(4, 4)] = 2
  board[idx(3, 4)] = 1
  board[idx(4, 3)] = 1
  return { board, turn: first, last: null, passes: 0, flipped: [] }
}

function flipsFor(board, i, p) {
  if (board[i] !== 0) return []
  const r0 = Math.floor(i / N), c0 = i % N
  const out = []
  for (const [dr, dc] of DIRS) {
    const run = []
    let r = r0 + dr, c = c0 + dc
    while (r >= 0 && r < N && c >= 0 && c < N) {
      const v = board[idx(r, c)]
      if (v === 3 - p) run.push(idx(r, c))
      else {
        if (v === p && run.length) out.push(...run)
        break
      }
      r += dr
      c += dc
    }
  }
  return out
}

export function movesFor(board, p) {
  const ms = []
  for (let i = 0; i < N * N; i++) if (board[i] === 0 && flipsFor(board, i, p).length) ms.push(i)
  return ms
}

// Se il giocatore di turno non può muovere ma l'avversario sì, l'unica
// "mossa" è il passo (-1).
export function legalMoves(s) {
  if (status(s).over) return []
  const ms = movesFor(s.board, s.turn)
  if (ms.length === 0) return [-1]
  return ms
}

export function applyMove(s, i) {
  if (i === -1) return { ...s, turn: 3 - s.turn, passes: s.passes + 1, last: null, flipped: [] }
  const board = s.board.slice()
  const flips = flipsFor(board, i, s.turn)
  board[i] = s.turn
  for (const f of flips) board[f] = s.turn
  return { board, turn: 3 - s.turn, last: i, passes: 0, flipped: flips }
}

export function counts(board) {
  let a = 0, b = 0
  for (const v of board) {
    if (v === 1) a++
    else if (v === 2) b++
  }
  return [a, b]
}

export function status(s) {
  const [a, b] = counts(s.board)
  const full = a + b === N * N
  const noMoves = movesFor(s.board, 1).length === 0 && movesFor(s.board, 2).length === 0
  if (full || noMoves || a === 0 || b === 0 || s.passes >= 2) {
    return { over: true, winner: a === b ? null : a > b ? 1 : 2 }
  }
  return { over: false, winner: null }
}

// Pesi posizionali classici: angoli preziosi, caselle X/C pericolose.
const W = [
  120, -20, 20, 5, 5, 20, -20, 120,
  -20, -40, -5, -5, -5, -5, -40, -20,
  20, -5, 15, 3, 3, 15, -5, 20,
  5, -5, 3, 3, 3, 3, -5, 5,
  5, -5, 3, 3, 3, 3, -5, 5,
  20, -5, 15, 3, 3, 15, -5, 20,
  -20, -40, -5, -5, -5, -5, -40, -20,
  120, -20, 20, 5, 5, 20, -20, 120,
]

export function evaluate(s, player) {
  const b = s.board
  const [a, w] = counts(b)
  const total = a + w
  const opp = 3 - player
  let pos = 0
  for (let i = 0; i < N * N; i++) {
    if (b[i] === player) pos += W[i]
    else if (b[i] === opp) pos -= W[i]
  }
  const mob = movesFor(b, player).length - movesFor(b, opp).length
  const mine = player === 1 ? a : w
  const theirs = player === 1 ? w : a
  if (total > 52) return (mine - theirs) * 10 + pos / 4 // finale: contano i pezzi
  return pos + mob * 8 - (mine - theirs) * 2 // apertura/mediogioco: pochi pezzi è meglio
}

const orderMoves = (s, ms) => ms.slice().sort((x, y) => (x < 0 ? 0 : W[x]) - (y < 0 ? 0 : W[y])).reverse()

const engine = { legalMoves, applyMove, status, evaluate }

export function bestMove(s, difficulty) {
  const cfg = {
    1: { maxDepth: 1, randomness: 0.5 },
    2: { maxDepth: 3, randomness: 0.1 },
    3: { maxDepth: 6, randomness: 0 },
  }[difficulty]
  return search(engine, s, { ...cfg, timeMs: 2500, orderMoves })
}
