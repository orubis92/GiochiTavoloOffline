// Ricerca negamax con potatura alfa-beta e approfondimento iterativo a tempo.
// Il motore di gioco deve fornire:
//   legalMoves(state) -> Move[]
//   applyMove(state, move) -> State (immutabile)
//   status(state) -> { over: boolean, winner: 1 | 2 | null }
//   evaluate(state, player) -> punteggio dal punto di vista di `player`
//   state.turn -> 1 | 2 (giocatore che deve muovere)
// Opzioni:
//   maxDepth, timeMs, randomness (0..1: probabilità di scegliere una mossa
//   sub-ottimale, usata per i livelli facili), orderMoves(state, moves)

const WIN = 1_000_000

export function search(engine, state, opts = {}) {
  const { maxDepth = 4, timeMs = 1500, randomness = 0, orderMoves } = opts
  const me = state.turn
  const moves = engine.legalMoves(state)
  if (moves.length === 0) return null
  if (moves.length === 1) return moves[0]

  const deadline = Date.now() + timeMs
  let nodes = 0
  let timedOut = false

  const negamax = (s, depth, alpha, beta, color) => {
    nodes++
    if ((nodes & 1023) === 0 && Date.now() > deadline) timedOut = true
    const st = engine.status(s)
    if (st.over) {
      if (st.winner == null) return 0
      // vittoria vista dal giocatore che deve muovere in `s`
      const sign = st.winner === s.turn ? 1 : -1
      return sign * (WIN + depth) // preferisci vittorie rapide
    }
    if (depth === 0) return engine.evaluate(s, s.turn)
    let ms = engine.legalMoves(s)
    if (ms.length === 0) return 0
    if (orderMoves) ms = orderMoves(s, ms)
    let best = -Infinity
    for (const m of ms) {
      const next = engine.applyMove(s, m)
      let v
      if (next.turn === s.turn) {
        // stesso giocatore muove ancora (es. passo obbligato in Othello)
        v = negamax(next, depth - 1, alpha, beta, color)
      } else {
        v = -negamax(next, depth - 1, -beta, -alpha, -color)
      }
      if (v > best) best = v
      if (best > alpha) alpha = best
      if (alpha >= beta || timedOut) break
    }
    return best
  }

  let bestMove = moves[0]
  let scored = []
  for (let depth = 1; depth <= maxDepth; depth++) {
    const results = []
    // Alla radice si usa la finestra completa: servono punteggi esatti per
    // distinguere le mosse davvero equivalenti da quelle tagliate dall'alfa-beta.
    const ordered = scored.length ? scored.map((r) => r.m) : orderMoves ? orderMoves(state, moves) : moves
    for (const m of ordered) {
      const next = engine.applyMove(state, m)
      let v
      if (next.turn === me) v = negamax(next, depth - 1, -Infinity, Infinity, 1)
      else v = -negamax(next, depth - 1, -Infinity, Infinity, -1)
      if (timedOut) break
      results.push({ m, v })
    }
    if (timedOut) {
      if (results.length && depth === 1) scored = results
      break
    }
    scored = results.sort((a, b) => b.v - a.v)
    if (scored.some((r) => r.v >= WIN)) break // vittoria forzata trovata
    if (Date.now() > deadline) break
  }
  if (scored.length === 0) return bestMove

  scored.sort((a, b) => b.v - a.v)
  const top = scored[0].v
  // fra mosse a pari punteggio scegli a caso, così il computer non è prevedibile
  const ties = scored.filter((r) => r.v === top)
  bestMove = ties[Math.floor(Math.random() * ties.length)].m

  if (randomness > 0 && scored.length > 1 && Math.random() < randomness) {
    // livello facile: ogni tanto gioca una mossa non ottimale ma non suicida
    const candidates = scored.filter((r) => r.v > -WIN / 2).slice(0, 3)
    if (candidates.length) bestMove = candidates[Math.floor(Math.random() * candidates.length)].m
  }
  return bestMove
}

export const DIFFICULTY = {
  1: { label: 'Facile' },
  2: { label: 'Medio' },
  3: { label: 'Difficile' },
}
