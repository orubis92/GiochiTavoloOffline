import { useMemo, useState } from 'react'
import GameShell, { resultFor } from '../../components/GameShell.jsx'
import { useGame } from '../../hooks/useGame.js'
import * as engine from './engine.js'
import * as coachScacchi from '../../coach/scacchi.js'

const COACH = {
  moveKey: engine.moveKey,
  unit: 130, // soglie più tolleranti: a profondità ridotta le differenze fra mosse d'apertura sono rumore
  describe: (state, m) => coachScacchi.describeMove(state.fen, m),
  explain: (stateBefore, grade, human) => coachScacchi.explain(stateBefore.fen, grade, engine.colorOf(human)),
}

const RULES = [
  'Il bianco muove per primo. Scopo: dare scacco matto al re avversario, cioè attaccarlo senza che possa sfuggire.',
  'Pedone: avanza di una casella (due dalla posizione iniziale), cattura in diagonale. Arrivato in fondo si promuove (di solito a donna).',
  'Cavallo: muove a "L" e salta gli altri pezzi. Alfiere: diagonali. Torre: righe e colonne. Donna: entrambe. Re: una casella in ogni direzione.',
  'Arrocco: re e torre si muovono insieme (il re di due caselle verso la torre) se nessuno dei due ha già mosso, le caselle in mezzo sono libere e il re non è né passa sotto scacco.',
  'En passant: un pedone che avanza di due può essere catturato "al passaggio" dal pedone avversario adiacente, solo nella mossa immediatamente successiva.',
  'Se il tuo re è sotto scacco devi parare subito. Se non hai mosse legali e non sei sotto scacco è stallo: patta.',
  'Tocca un tuo pezzo per vedere dove può andare; tocca la destinazione per muovere.',
]

const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
const FILES = 'abcdefgh'
const PROMO = ['q', 'r', 'b', 'n']

export default function Scacchi({ onHome }) {
  const g = useGame('scacchi', engine, COACH, { moveKind: (p, n) => (n.history[n.history.length - 1]?.includes('x') ? 'capture' : 'move') })
  const { state, status, human, history } = g
  const [sel, setSel] = useState(null)
  const [promo, setPromo] = useState(null) // { from, to }
  const flipped = human === 2

  const chess = useMemo(() => engine.load(state), [state])
  const board = chess.board() // [riga 8 ... riga 1][a ... h]
  const legal = useMemo(() => (g.isHumanTurn ? chess.moves({ verbose: true }) : []), [chess, g.isHumanTurn])
  const targets = sel ? legal.filter((m) => m.from === sel) : []
  const myColor = engine.colorOf(human)
  const kingSq = (() => {
    if (!status.check && !status.over) return null
    const color = chess.turn()
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = board[r][c]
        if (p && p.type === 'k' && p.color === color && chess.inCheck()) return p.square
      }
    return null
  })()

  const onSquare = (sq) => {
    if (!g.isHumanTurn || promo) return
    const p = chess.get(sq)
    if (p && p.color === myColor) {
      setSel(sel === sq ? null : sq)
      return
    }
    const mv = targets.find((m) => m.to === sq)
    if (!mv) return
    if (mv.promotion) {
      setPromo({ from: mv.from, to: mv.to })
      return
    }
    g.humanMove({ from: mv.from, to: mv.to })
    setSel(null)
  }

  const choosePromo = (piece) => {
    g.humanMove({ ...promo, promotion: piece })
    setPromo(null)
    setSel(null)
  }

  let statusText
  if (status.over) statusText = status.reason
  else if (g.isHumanTurn) statusText = status.check ? 'Sei sotto scacco!' : 'Tocca a te'
  else statusText = 'Turno del computer'

  const rows = flipped ? [...board].reverse() : board
  const hintMove = g.coach?.hint?.move
  const lastMoves = history.slice(-6).map((s) => s.history?.[s.history.length - 1]).filter(Boolean)

  return (
    <GameShell
      title="Scacchi"
      onHome={onHome}
      statusText={statusText}
      thinking={g.thinking}
      onNew={() => { setSel(null); setPromo(null); g.newGame() }}
      onUndo={() => { setSel(null); setPromo(null); g.undo() }}
      canUndo={g.canUndo}
      difficulty={g.settings.difficulty}
      onDifficulty={g.setDifficulty}
      sideLabel={{
        label: 'Giochi con',
        value: human,
        options: [{ v: 1, l: 'Bianco (inizi tu)' }, { v: 2, l: 'Nero (inizia il computer)' }],
        onChange: (v) => { setSel(null); setPromo(null); g.newGame({ human: Number(v) }) },
      }}
      result={resultFor(status, human, undefined, history.length)}
      coach={g.coach && { ...g.coach, tips: coachScacchi.TIPS }}
      rules={RULES}
      canHint={g.isHumanTurn}
    >
      <div>
        <div className="board n8">
          {rows.map((row, ri) =>
            (flipped ? [...row].reverse() : row).map((p, ci) => {
              const rank = flipped ? ri + 1 : 8 - ri
              const file = flipped ? 7 - ci : ci
              const sq = FILES[file] + rank
              const dark = (file + rank) % 2 === 0
              const target = targets.find((m) => m.to === sq)
              const isLast = state.last && (state.last.from === sq || state.last.to === sq)
              const cls = ['sq', dark ? 'dark' : 'light', sel === sq ? 'sel' : '', isLast ? 'last' : '', kingSq === sq ? 'check' : '', hintMove?.from === sq ? 'hint-from' : '', hintMove?.to === sq ? 'hint-to' : ''].join(' ')
              return (
                <div key={sq} className={cls} onClick={() => onSquare(sq)}>
                  {p && <span className={`chess-piece ${p.color}`}>{GLYPH[p.type]}&#xFE0E;</span>}
                  {target && <div className={`hint ${target.captured ? 'capture' : ''}`} />}
                </div>
              )
            }),
          )}
        </div>
        {lastMoves.length > 0 && (
          <div className="moves-log">
            Ultime mosse: {lastMoves.join('  ')}
          </div>
        )}
      </div>

      {promo && (
        <div className="overlay">
          <div className="box">
            <h3>Promuovi il pedone</h3>
            <div className="promo">
              {PROMO.map((pc) => (
                <button key={pc} onClick={() => choosePromo(pc)}>
                  <span className={`chess-piece ${myColor}`} style={{ fontSize: '2rem' }}>{GLYPH[pc]}&#xFE0E;</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </GameShell>
  )
}
