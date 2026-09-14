// Spiegazioni in italiano per l'istruttore di scacchi.
import { Chess } from 'chess.js'
import { MATE_SCORE } from '../games/scacchi/engine.js'

const NAME = { p: 'pedone', n: 'cavallo', b: 'alfiere', r: 'torre', q: 'donna', k: 're' }
const ART = { p: 'il', n: 'il', b: "l'", r: 'la', q: 'la', k: 'il' }
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 }

const piece = (t, sq) => `${ART[t]}${ART[t].endsWith("'") ? '' : ' '}${NAME[t]}${sq ? ' in ' + sq : ''}`
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

// Pezzi del colore `color` che possono essere catturati con guadagno o gratis.
function hangingPieces(ch, color) {
  const out = []
  const opp = color === 'w' ? 'b' : 'w'
  for (const row of ch.board()) {
    for (const sq of row) {
      if (!sq || sq.color !== color || sq.type === 'k') continue
      const attackers = ch.attackers(sq.square, opp)
      if (!attackers.length) continue
      const defenders = ch.attackers(sq.square, color)
      const cheapest = Math.min(...attackers.map((a) => VAL[ch.get(a).type]))
      if (defenders.length === 0 || cheapest < VAL[sq.type]) {
        out.push({ ...sq, attackerSq: attackers.find((a) => VAL[ch.get(a).type] === cheapest) })
      }
    }
  }
  return out
}

// Descrive cosa fa una mossa (usato per i suggerimenti).
export function describeMove(fen, m) {
  const ch = new Chess(fen)
  const parts = []
  if (m.flags.includes('k') || m.flags.includes('q')) {
    parts.push('Arrocca: il re va al sicuro e la torre entra in gioco')
  } else {
    let verb = `Muovi ${piece(m.piece)} da ${m.from} a ${m.to}`
    if (m.captured) verb = `Cattura ${piece(m.captured, m.to)} con ${piece(m.piece)} da ${m.from}`
    if (m.promotion) verb += ` e promuovi a ${NAME[m.promotion]}`
    parts.push(verb)
  }
  const after = new Chess(fen)
  after.move({ from: m.from, to: m.to, promotion: m.promotion })
  if (after.isCheckmate()) parts.push('è scacco matto!')
  else if (after.inCheck()) parts.push('dà scacco')

  const reasons = []
  const moveNo = ch.moveNumber()
  const central = ['d4', 'e4', 'd5', 'e5']
  if (moveNo <= 10 && (m.piece === 'n' || m.piece === 'b') && /[18]/.test(m.from[1])) reasons.push('sviluppa un pezzo')
  if (moveNo <= 10 && m.piece === 'p' && central.includes(m.to)) reasons.push('occupa il centro')
  // il pezzo era in presa e ora è al sicuro?
  const before = hangingPieces(ch, ch.turn())
  const wasHanging = before.find((h) => h.square === m.from)
  if (wasHanging && !m.captured) reasons.push('mette al sicuro un pezzo attaccato')
  // la mossa crea una minaccia?
  const oppHanging = hangingPieces(after, after.turn())
  const newThreat = oppHanging.find((h) => after.attackers(h.square, ch.turn()).includes(m.to))
  if (newThreat && !after.inCheck()) reasons.push(`attacca ${piece(newThreat.type, newThreat.square)}`)
  if (reasons.length) parts.push(reasons.join(', '))
  return parts.join(' — ')
}

// Commento alla mossa giocata dal giocatore.
export function explain(fenBefore, grade, humanColor) {
  const { level, best, played, loss } = grade
  const ch = new Chess(fenBefore)
  const after = new Chess(fenBefore)
  after.move({ from: played.m.from, to: played.m.to, promotion: played.m.promotion })
  const notes = []

  if (level === 'forced') return 'Era l\'unica mossa possibile.'

  // errori gravi: matto mancato, matto concesso, pezzo lasciato in presa
  if (best.v >= MATE_SCORE - 100 && played.v < MATE_SCORE - 100) {
    notes.push(`C'era lo scacco matto con ${best.m.san}.`)
  }
  if (played.v <= -MATE_SCORE + 100) {
    notes.push("Questa mossa permette all'avversario di dare scacco matto.")
  }
  const hangBefore = new Set(hangingPieces(ch, humanColor).map((h) => h.square))
  const hangAfter = hangingPieces(after, humanColor).filter((h) => !hangBefore.has(h.square) || h.square === played.m.to)
  if (level !== 'best' && level !== 'good' && hangAfter.length) {
    const h = hangAfter.sort((a, b) => VAL[b.type] - VAL[a.type])[0]
    const att = after.get(h.attackerSq)
    notes.push(`Lasci ${piece(h.type, h.square)} in presa: ${piece(att.type, h.attackerSq)} può catturarlo.`)
  }
  if (level !== 'best' && best.m.captured && !played.m.captured && VAL[best.m.captured] >= 3) {
    notes.push(`Potevi catturare ${piece(best.m.captured, best.m.to)} con ${best.m.san}.`)
  }
  // il pezzo mosso era in presa? (elogio)
  if ((level === 'best' || level === 'good') && hangBefore.has(played.m.from) && !hangingPieces(after, humanColor).some((h) => h.square === played.m.to)) {
    notes.push('Hai messo al sicuro un pezzo che era attaccato.')
  }
  if (played.m.captured && (level === 'best' || level === 'good')) notes.push(`Buona cattura: ${piece(played.m.captured)}.`)
  if (played.m.flags.includes('k') || played.m.flags.includes('q')) notes.push('Arrocco: il re è più protetto e la torre è attiva.')

  // principi di apertura
  const moveNo = ch.moveNumber()
  if (moveNo <= 8) {
    if (played.m.piece === 'q' && moveNo <= 5 && level !== 'best') notes.push('In apertura conviene non muovere subito la donna: può essere attaccata con guadagno di tempo.')
    if (played.m.piece === 'p' && /[ah]/.test(played.m.from[0]) && level !== 'best') notes.push('I pedoni di bordo in apertura contano poco: meglio sviluppare cavalli e alfieri verso il centro.')
    if ((played.m.piece === 'n' || played.m.piece === 'b') && /[18]/.test(played.m.from[1]) && (level === 'best' || level === 'good')) notes.push('Sviluppo di un pezzo: bene.')
  }

  if (!notes.length) {
    if (level === 'best') notes.push('È la mossa che avrebbe scelto anche il motore.')
    else if (level === 'good') notes.push('Mossa solida.')
    else notes.push(`Meglio era ${best.m.san}: ${describeMove(fenBefore, best.m).split(' — ').slice(1).join(', ') || 'migliora la posizione'}.`)
  } else if (level !== 'best' && level !== 'good' && !notes.some((n) => n.includes(best.m.san))) {
    notes.push(`Meglio era ${best.m.san}.`)
  }
  if (level === 'inaccuracy' || level === 'mistake' || level === 'blunder') {
    const pawns = Math.round(loss / 100 * 10) / 10
    if (pawns >= 1 && loss < MATE_SCORE / 2) notes.push(`(circa ${pawns} pedon${pawns === 1 ? 'e' : 'i'} di svantaggio in più)`)
  }
  return notes.join(' ')
}

export const TIPS = [
  'Controlla il centro con i pedoni e e d.',
  'Sviluppa cavalli e alfieri prima di muovere la donna.',
  'Arrocca presto per mettere il re al sicuro.',
  'Prima di muovere chiediti: cosa minaccia l\'avversario?',
  'Un pezzo attaccato da uno di valore inferiore va spostato o difeso.',
  'Valori indicativi: pedone 1, cavallo e alfiere 3, torre 5, donna 9.',
]
