// Spiegazioni in italiano per l'istruttore di dama.
import { N, isKing, legalMoves, applyMove } from '../games/dama/engine.js'
import { WIN_SCORE } from '../engine/minimax.js'

export const sqName = (i) => 'abcdefgh'[i % N] + (N - Math.floor(i / N))
const lastRowOf = (p) => (p === 1 ? 0 : N - 1)

function maxCaptureReply(state) {
  const ms = legalMoves(state)
  return ms.reduce((m, x) => Math.max(m, x.captures.length), 0)
}

export function describeMove(state, m) {
  const v = state.board[m.from]
  const name = isKing(v) ? 'la dama' : 'la pedina'
  const parts = []
  if (m.captures.length) {
    parts.push(`Con ${name} da ${sqName(m.from)} mangia ${m.captures.length === 1 ? 'un pezzo' : m.captures.length + ' pezzi'} arrivando in ${sqName(m.to)}`)
  } else {
    parts.push(`Muovi ${name} da ${sqName(m.from)} a ${sqName(m.to)}`)
  }
  const reasons = []
  if (!isKing(v) && Math.floor(m.to / N) === lastRowOf(state.turn)) reasons.push('va a dama')
  const after = applyMove(state, m)
  const reply = maxCaptureReply(after)
  if (reply === 0 && !m.captures.length) {
    // era minacciata?
    const threatened = legalMoves({ ...state, turn: 3 - state.turn }).some((x) => x.captures.includes(m.from))
    if (threatened) reasons.push('toglie il pezzo da una presa')
  }
  if (reply > 0 && m.captures.length === 0) reasons.push(`offre un pezzo che verrà ripreso con vantaggio`)
  if (reasons.length) parts.push(reasons.join(', '))
  return parts.join(' — ')
}

export function explain(stateBefore, grade, human) {
  const { level, best, played, loss } = grade
  const notes = []
  if (level === 'forced') {
    return played.m.captures.length ? 'Presa obbligatoria: era l\'unica mossa consentita.' : 'Era l\'unica mossa possibile.'
  }
  const after = applyMove(stateBefore, played.m)
  const reply = maxCaptureReply(after)
  const bestAfter = applyMove(stateBefore, best.m)
  const bestReply = maxCaptureReply(bestAfter)

  if (played.v <= -WIN_SCORE / 2) notes.push('Dopo questa mossa la partita è persa contro un gioco corretto.')
  if (best.v >= WIN_SCORE / 2 && played.v < WIN_SCORE / 2) notes.push(`Avevi una vittoria forzata partendo da ${sqName(best.m.from)}–${sqName(best.m.to)}.`)

  if (level !== 'best' && level !== 'good') {
    if (reply > 0) {
      notes.push(
        reply === 1
          ? `Ora l'avversario può mangiare un tuo pezzo${bestReply === 0 ? ', mentre con la mossa migliore non avrebbe prese' : ''}.`
          : `Ora l'avversario ha una presa multipla: perdi ${reply} pezzi in un colpo solo.`,
      )
    }
    const playedKing = !isKing(stateBefore.board[played.m.from]) && Math.floor(played.m.to / N) === lastRowOf(human)
    const bestKing = !isKing(stateBefore.board[best.m.from]) && Math.floor(best.m.to / N) === lastRowOf(human)
    if (bestKing && !playedKing) notes.push(`Potevi andare a dama con ${sqName(best.m.from)}–${sqName(best.m.to)}.`)
    if (!notes.length) notes.push(`Meglio era ${sqName(best.m.from)}–${sqName(best.m.to)}: ${describeMove(stateBefore, best.m).split(' — ').slice(1).join(', ') || 'tiene la posizione più solida'}.`)
    else if (!notes.some((n) => n.includes(sqName(best.m.from)))) notes.push(`Meglio era ${sqName(best.m.from)}–${sqName(best.m.to)}.`)
  } else {
    if (played.m.captures.length > 1) notes.push(`Ottima presa multipla: ${played.m.captures.length} pezzi.`)
    else if (played.m.captures.length === 1 && reply === 0) notes.push('Mangi senza lasciare prese all\'avversario.')
    const playedKing = !isKing(stateBefore.board[played.m.from]) && Math.floor(played.m.to / N) === lastRowOf(human)
    if (playedKing) notes.push('Sei andato a dama: ora questo pezzo muove e mangia in tutte le direzioni.')
    if (reply > 0 && played.m.captures.length === 0) notes.push('Sacrifichi un pezzo, ma la ripresa ti restituisce il vantaggio.')
    if (!notes.length) notes.push(level === 'best' ? 'È la mossa che avrebbe scelto anche il motore.' : 'Mossa solida.')
  }
  if ((level === 'inaccuracy' || level === 'mistake' || level === 'blunder') && loss < WIN_SCORE / 2) {
    const pieces = Math.round((loss / 100) * 10) / 10
    if (pieces >= 1) notes.push(`(circa ${pieces} pedin${pieces === 1 ? 'a' : 'e'} di svantaggio in più)`)
  }
  return notes.join(' ')
}

export const TIPS = [
  'La presa è obbligatoria: prima di muovere controlla se il tuo pezzo può essere mangiato dopo.',
  'La pedina mangia solo in avanti e non può mangiare la dama.',
  'Se devi mangiare, devi scegliere la presa che cattura più pezzi.',
  'Tieni le pedine unite: una pedina isolata è facile da catturare.',
  'Le pedine sui bordi non possono essere mangiate.',
  'Andare a dama vale molto: la dama muove e mangia in tutte le direzioni.',
]
