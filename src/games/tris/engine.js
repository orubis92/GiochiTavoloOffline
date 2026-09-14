import { search } from '../../engine/minimax.js'

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]

export function initialState({ first = 1 } = {}) {
  return { board: Array(9).fill(0), turn: first, last: null }
}

export function legalMoves(s) {
  if (status(s).over) return []
  const ms = []
  for (let i = 0; i < 9; i++) if (s.board[i] === 0) ms.push(i)
  return ms
}

export function applyMove(s, i) {
  const board = s.board.slice()
  board[i] = s.turn
  return { board, turn: 3 - s.turn, last: i }
}

export function winningLine(board) {
  for (const l of LINES) {
    const [a, b, c] = l
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return l
  }
  return null
}

export function status(s) {
  const l = winningLine(s.board)
  if (l) return { over: true, winner: s.board[l[0]], line: l }
  if (s.board.every((x) => x !== 0)) return { over: true, winner: null }
  return { over: false, winner: null }
}

export function evaluate() {
  return 0 // il tris si risolve completamente: conta solo vittoria/patta
}

const engine = { legalMoves, applyMove, status, evaluate }

export function bestMove(s, difficulty) {
  const cfg = {
    1: { maxDepth: 1, randomness: 0.6 },
    2: { maxDepth: 3, randomness: 0.25 },
    3: { maxDepth: 9, randomness: 0 },
  }[difficulty]
  return search(engine, s, { ...cfg, timeMs: 1000 })
}
