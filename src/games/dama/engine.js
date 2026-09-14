// Dama italiana.
// Pezzi: 1 = pedina giocatore 1 (bianco, in basso, muove verso l'alto)
//        2 = pedina giocatore 2 (nero, in alto, muove verso il basso)
//        11 / 12 = dame (re) dei rispettivi giocatori.
// Caselle giocabili: le scure, ossia (riga + colonna) pari, con la casella
// d'angolo alla destra di ogni giocatore scura (regola italiana).
import { search } from '../../engine/minimax.js'

export const N = 8
export const idx = (r, c) => r * N + c
export const isDark = (r, c) => (r + c) % 2 === 0
export const owner = (v) => (v === 0 ? 0 : v % 10)
export const isKing = (v) => v > 10
const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N

export function initialState({ first = 1 } = {}) {
  const board = Array(N * N).fill(0)
  for (let r = 0; r < 3; r++) for (let c = 0; c < N; c++) if (isDark(r, c)) board[idx(r, c)] = 2
  for (let r = 5; r < N; r++) for (let c = 0; c < N; c++) if (isDark(r, c)) board[idx(r, c)] = 1
  return { board, turn: first, last: null, quiet: 0 }
}

const forwardDir = (p) => (p === 1 ? -1 : 1)
const lastRow = (p) => (p === 1 ? 0 : N - 1)

// Restituisce tutte le sequenze di presa a partire da (r,c) per il pezzo v.
function captureSequences(board, r, c, v) {
  const p = owner(v)
  const king = isKing(v)
  const dirs = king
    ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
    : [[forwardDir(p), -1], [forwardDir(p), 1]]
  const results = []

  const dfs = (rr, cc, taken, path, kingsTaken, kingOrder) => {
    let extended = false
    for (const [dr, dc] of dirs) {
      const mr = rr + dr, mc = cc + dc, tr = rr + 2 * dr, tc = cc + 2 * dc
      if (!inside(tr, tc)) continue
      const mid = idx(mr, mc), to = idx(tr, tc)
      const mv = board[mid]
      if (mv === 0 || owner(mv) === p) continue
      if (!king && isKing(mv)) continue // la pedina non può prendere la dama
      if (taken.includes(mid)) continue
      if (board[to] !== 0 && to !== path[0]) continue
      extended = true
      const nk = kingsTaken + (isKing(mv) ? 1 : 0)
      const order = kingOrder < 0 && isKing(mv) ? taken.length : kingOrder
      // la pedina che arriva in ultima riga si ferma (viene promossa)
      if (!king && tr === lastRow(p)) {
        results.push({ path: [...path, to], captures: [...taken, mid], kings: nk, kingOrder: order })
        continue
      }
      dfs(tr, tc, [...taken, mid], [...path, to], nk, order)
    }
    if (!extended && taken.length) {
      results.push({ path, captures: taken, kings: kingsTaken, kingOrder })
    }
  }
  dfs(r, c, [], [idx(r, c)], 0, -1)
  return results
}

export function legalMoves(s) {
  if (s.quiet >= 80) return []
  const { board, turn } = s
  const captures = []
  const simple = []
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const v = board[idx(r, c)]
      if (v === 0 || owner(v) !== turn) continue
      const seqs = captureSequences(board, r, c, v)
      for (const q of seqs) {
        captures.push({ from: idx(r, c), to: q.path[q.path.length - 1], path: q.path, captures: q.captures, byKing: isKing(v), kings: q.kings, kingOrder: q.kingOrder })
      }
      if (captures.length === 0) {
        const dirs = isKing(v) ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : [[forwardDir(turn), -1], [forwardDir(turn), 1]]
        for (const [dr, dc] of dirs) {
          const tr = r + dr, tc = c + dc
          if (inside(tr, tc) && board[idx(tr, tc)] === 0) {
            simple.push({ from: idx(r, c), to: idx(tr, tc), path: [idx(r, c), idx(tr, tc)], captures: [] })
          }
        }
      }
    }
  }
  if (captures.length === 0) return simple
  // Regole di priorità della dama italiana.
  const maxN = Math.max(...captures.map((m) => m.captures.length))
  let best = captures.filter((m) => m.captures.length === maxN)
  if (best.some((m) => m.byKing) && best.some((m) => !m.byKing)) best = best.filter((m) => m.byKing)
  const maxK = Math.max(...best.map((m) => m.kings))
  best = best.filter((m) => m.kings === maxK)
  if (maxK > 0) {
    const minOrder = Math.min(...best.map((m) => m.kingOrder))
    best = best.filter((m) => m.kingOrder === minOrder)
  }
  return best
}

export function applyMove(s, m) {
  const board = s.board.slice()
  let v = board[m.from]
  board[m.from] = 0
  for (const t of m.captures) board[t] = 0
  const toR = Math.floor(m.to / N)
  let promoted = false
  if (!isKing(v) && toR === lastRow(s.turn)) {
    v += 10
    promoted = true
  }
  board[m.to] = v
  const quiet = m.captures.length || promoted ? 0 : s.quiet + 1
  return { board, turn: 3 - s.turn, last: m, quiet }
}

export function countPieces(board) {
  const c = { 1: 0, 2: 0, k1: 0, k2: 0 }
  for (const v of board) {
    if (!v) continue
    c[owner(v)]++
    if (isKing(v)) c['k' + owner(v)]++
  }
  return c
}

export function status(s) {
  const c = countPieces(s.board)
  if (c[1] === 0) return { over: true, winner: 2 }
  if (c[2] === 0) return { over: true, winner: 1 }
  if (s.quiet >= 80) return { over: true, winner: null, reason: 'quiet' }
  if (legalMoves(s).length === 0) return { over: true, winner: 3 - s.turn, reason: 'blocked' }
  return { over: false, winner: null }
}

export function evaluate(s, player) {
  const b = s.board
  let score = 0
  for (let i = 0; i < N * N; i++) {
    const v = b[i]
    if (!v) continue
    const p = owner(v)
    const r = Math.floor(i / N)
    let val = isKing(v) ? 300 : 100
    if (!isKing(v)) {
      // avanzamento: più vicino alla promozione = meglio; ultima fila propria = solida
      const adv = p === 1 ? N - 1 - r : r
      val += adv * 4
      if (adv === 0) val += 6
    }
    // pezzi sui bordi sono più sicuri
    const c = i % N
    if (c === 0 || c === N - 1) val += 3
    score += p === player ? val : -val
  }
  return score
}

const engine = { legalMoves, applyMove, status, evaluate }

export function bestMove(s, difficulty) {
  const cfg = {
    1: { maxDepth: 2, randomness: 0.4 },
    2: { maxDepth: 5, randomness: 0.05 },
    3: { maxDepth: 10, randomness: 0 },
  }[difficulty]
  return search(engine, s, { ...cfg, timeMs: 2500 })
}
