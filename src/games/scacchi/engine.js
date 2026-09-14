// Scacchi: regole gestite da chess.js, IA negamax con quiescenza.
import { Chess } from 'chess.js'

// Stato serializzabile: fen + storico delle mosse (SAN) per annullare.
export function initialState() {
  const ch = new Chess()
  return { fen: ch.fen(), turn: 1, history: [], last: null }
}

export const colorOf = (player) => (player === 1 ? 'w' : 'b')

export function load(s) {
  return new Chess(s.fen)
}

export function legalMoves(s) {
  return load(s).moves({ verbose: true })
}

export function applyMove(s, m) {
  const ch = load(s)
  const mv = ch.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' })
  return {
    fen: ch.fen(),
    turn: ch.turn() === 'w' ? 1 : 2,
    history: [...s.history, mv.san],
    last: { from: mv.from, to: mv.to },
    check: ch.inCheck(),
  }
}

export function status(s) {
  const ch = load(s)
  if (ch.isCheckmate()) return { over: true, winner: ch.turn() === 'w' ? 2 : 1, reason: 'Scacco matto' }
  if (ch.isStalemate()) return { over: true, winner: null, reason: 'Stallo' }
  if (ch.isThreefoldRepetition()) return { over: true, winner: null, reason: 'Ripetizione di posizione' }
  if (ch.isInsufficientMaterial()) return { over: true, winner: null, reason: 'Materiale insufficiente' }
  if (ch.isDraw()) return { over: true, winner: null, reason: 'Patta (regola delle 50 mosse)' }
  return { over: false, winner: null, check: ch.inCheck() }
}

const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 }

// Tabelle posizionali semplificate (dal punto di vista del bianco, riga 8 in alto).
const PST = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  r: [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0,
  ],
  q: [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
  ],
  k: [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
  ],
  kEnd: [
    -50, -40, -30, -20, -20, -30, -40, -50,
    -30, -20, -10, 0, 0, -10, -20, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -30, 0, 0, 0, 0, -30, -30,
    -50, -30, -30, -30, -30, -30, -30, -50,
  ],
}

// Valutazione dal punto di vista del giocatore di turno.
function evaluateBoard(ch) {
  const board = ch.board()
  let score = 0
  let material = 0
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = board[r][c]
      if (!sq) continue
      if (sq.type !== 'k' && sq.type !== 'p') material += VAL[sq.type]
    }
  }
  const endgame = material <= 1300
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = board[r][c]
      if (!sq) continue
      const i = sq.color === 'w' ? r * 8 + c : (7 - r) * 8 + c
      const table = sq.type === 'k' && endgame ? PST.kEnd : PST[sq.type]
      const v = VAL[sq.type] + table[i]
      score += sq.color === 'w' ? v : -v
    }
  }
  return ch.turn() === 'w' ? score : -score
}

const MATE = 100000

function orderMoves(moves) {
  return moves
    .map((m) => {
      let s = 0
      if (m.captured) s += 10 * VAL[m.captured] - VAL[m.piece]
      if (m.promotion) s += 800
      if (m.san.includes('+')) s += 50
      return { m, s }
    })
    .sort((a, b) => b.s - a.s)
    .map((x) => x.m)
}

export function searchScored(s, cfg) {
  const ch = load(s)
  const moves = ch.moves({ verbose: true })
  if (moves.length === 0) return { scored: [], depth: 0 }
  const deadline = Date.now() + cfg.timeMs
  let nodes = 0
  let timedOut = false

  const quiescence = (alpha, beta, qd) => {
    nodes++
    const stand = evaluateBoard(ch)
    if (stand >= beta) return beta
    if (alpha < stand) alpha = stand
    if (qd === 0) return alpha
    const caps = orderMoves(ch.moves({ verbose: true }).filter((m) => m.captured || m.promotion))
    for (const m of caps) {
      ch.move(m)
      const v = -quiescence(-beta, -alpha, qd - 1)
      ch.undo()
      if (v >= beta) return beta
      if (v > alpha) alpha = v
    }
    return alpha
  }

  const negamax = (depth, alpha, beta, ply) => {
    nodes++
    if ((nodes & 511) === 0 && Date.now() > deadline) timedOut = true
    if (ch.isCheckmate()) return -MATE + ply
    if (ch.isDraw() || ch.isStalemate() || ch.isThreefoldRepetition()) return 0
    if (depth === 0) return cfg.quiesce ? quiescence(alpha, beta, 4) : evaluateBoard(ch)
    const ms = orderMoves(ch.moves({ verbose: true }))
    let best = -Infinity
    for (const m of ms) {
      ch.move(m)
      const v = -negamax(depth - 1, -beta, -alpha, ply + 1)
      ch.undo()
      if (v > best) best = v
      if (best > alpha) alpha = best
      if (alpha >= beta || timedOut) break
    }
    return best
  }

  let scored = []
  let reached = 0
  for (let depth = 1; depth <= cfg.maxDepth; depth++) {
    const results = []
    // prova per prima la mossa migliore dell'iterazione precedente
    const ordered = scored.length ? scored.map((r) => r.m) : orderMoves(moves)
    for (const m of ordered) {
      ch.move(m)
      const v = -negamax(depth - 1, -Infinity, Infinity, 1)
      ch.undo()
      if (timedOut) break
      results.push({ m, v })
    }
    if (timedOut) {
      if (depth === 1 && results.length) scored = results
      break
    }
    scored = results.sort((a, b) => b.v - a.v)
    reached = depth
    if (scored[0].v >= MATE - 100) break
    if (Date.now() > deadline) break
  }
  scored.sort((a, b) => b.v - a.v)
  return { scored, depth: reached }
}

export function bestMove(s, difficulty) {
  const cfg = {
    1: { maxDepth: 1, timeMs: 800, randomness: 0.5, quiesce: false },
    2: { maxDepth: 3, timeMs: 1500, randomness: 0.05, quiesce: true },
    3: { maxDepth: 4, timeMs: 3000, randomness: 0, quiesce: true },
  }[difficulty]
  const { scored } = searchScored(s, cfg)
  if (!scored.length) {
    const moves = legalMoves(s)
    return moves.length ? { from: moves[0].from, to: moves[0].to, promotion: moves[0].promotion } : null
  }
  const top = scored[0].v
  const ties = scored.filter((r) => Math.abs(r.v - top) <= 5)
  let choice = ties[Math.floor(Math.random() * ties.length)].m
  if (cfg.randomness && Math.random() < cfg.randomness) {
    const okish = scored.filter((r) => r.v > top - 150).slice(0, 4)
    choice = okish[Math.floor(Math.random() * okish.length)].m
  }
  return { from: choice.from, to: choice.to, promotion: choice.promotion }
}

// Analisi per la modalità istruttore.
export function analyze(s) {
  return searchScored(s, { maxDepth: 4, timeMs: 2000, quiesce: true })
}

export const MATE_SCORE = MATE
export const moveKey = (m) => `${m.from}${m.to}${m.promotion || ''}`
