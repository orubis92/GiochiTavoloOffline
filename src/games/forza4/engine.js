import { search } from '../../engine/minimax.js'

export const ROWS = 6
export const COLS = 7
const idx = (r, c) => r * COLS + c

export function initialState({ first = 1 } = {}) {
  return { board: Array(ROWS * COLS).fill(0), turn: first, last: null, count: 0 }
}

export function legalMoves(s) {
  if (s.winner !== undefined && s.winner !== null) return []
  const ms = []
  for (let c = 0; c < COLS; c++) if (s.board[idx(0, c)] === 0) ms.push(c)
  return ms
}

export function dropRow(board, c) {
  for (let r = ROWS - 1; r >= 0; r--) if (board[idx(r, c)] === 0) return r
  return -1
}

export function applyMove(s, c) {
  const board = s.board.slice()
  const r = dropRow(board, c)
  board[idx(r, c)] = s.turn
  const line = lineThrough(board, r, c)
  return {
    board,
    turn: 3 - s.turn,
    last: idx(r, c),
    count: s.count + 1,
    winner: line ? s.turn : null,
    line,
  }
}

const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]]

function lineThrough(board, r, c) {
  const p = board[idx(r, c)]
  for (const [dr, dc] of DIRS) {
    const cells = [idx(r, c)]
    for (const sgn of [1, -1]) {
      let rr = r + dr * sgn, cc = c + dc * sgn
      while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && board[idx(rr, cc)] === p) {
        cells.push(idx(rr, cc))
        rr += dr * sgn
        cc += dc * sgn
      }
    }
    if (cells.length >= 4) return cells
  }
  return null
}

export function status(s) {
  if (s.winner) return { over: true, winner: s.winner, line: s.line }
  if (s.count >= ROWS * COLS) return { over: true, winner: null }
  return { over: false, winner: null }
}

// Valutazione: conta le finestre di 4 celle con pezzi di un solo colore.
export function evaluate(s, player) {
  const b = s.board
  let score = 0
  const scoreWindow = (cells) => {
    let mine = 0, theirs = 0
    for (const i of cells) {
      if (b[i] === player) mine++
      else if (b[i] !== 0) theirs++
    }
    if (mine && theirs) return 0
    if (mine === 3) return 50
    if (mine === 2) return 5
    if (theirs === 3) return -60
    if (theirs === 2) return -5
    return 0
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (c + 3 < COLS) score += scoreWindow([idx(r, c), idx(r, c + 1), idx(r, c + 2), idx(r, c + 3)])
      if (r + 3 < ROWS) score += scoreWindow([idx(r, c), idx(r + 1, c), idx(r + 2, c), idx(r + 3, c)])
      if (r + 3 < ROWS && c + 3 < COLS)
        score += scoreWindow([idx(r, c), idx(r + 1, c + 1), idx(r + 2, c + 2), idx(r + 3, c + 3)])
      if (r + 3 < ROWS && c - 3 >= 0)
        score += scoreWindow([idx(r, c), idx(r + 1, c - 1), idx(r + 2, c - 2), idx(r + 3, c - 3)])
    }
  }
  // preferenza per la colonna centrale
  for (let r = 0; r < ROWS; r++) {
    if (b[idx(r, 3)] === player) score += 3
    else if (b[idx(r, 3)] !== 0) score -= 3
  }
  return score
}

const ORDER = [3, 2, 4, 1, 5, 0, 6]
const orderMoves = (s, ms) => ORDER.filter((c) => ms.includes(c))

const engine = { legalMoves, applyMove, status, evaluate }

export function bestMove(s, difficulty) {
  const cfg = {
    1: { maxDepth: 2, randomness: 0.4 },
    2: { maxDepth: 5, randomness: 0.1 },
    3: { maxDepth: 9, randomness: 0 },
  }[difficulty]
  return search(engine, s, { ...cfg, timeMs: 2500, orderMoves })
}
