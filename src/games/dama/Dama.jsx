import { useMemo, useState } from 'react'
import GameShell, { resultFor } from '../../components/GameShell.jsx'
import { useGame } from '../../hooks/useGame.js'
import * as engine from './engine.js'
import { N, isDark, owner, isKing, countPieces } from './engine.js'

export default function Dama({ onHome }) {
  const g = useGame('dama', engine)
  const { state, status, human, history } = g
  const [sel, setSel] = useState(null)
  const flipped = human === 2

  const legal = useMemo(() => (g.isHumanTurn ? engine.legalMoves(state) : []), [g.isHumanTurn, state])
  const mustCapture = legal.some((m) => m.captures.length > 0)
  const movablePieces = new Set(legal.map((m) => m.from))
  const targets = sel === null ? [] : legal.filter((m) => m.from === sel)
  const lastPath = state.last?.path || []
  const counts = countPieces(state.board)

  const onSquare = (i) => {
    if (!g.isHumanTurn) return
    const v = state.board[i]
    if (v && owner(v) === human) {
      setSel(movablePieces.has(i) ? i : null)
      return
    }
    const mv = targets.find((m) => m.to === i)
    if (mv) {
      g.humanMove(mv)
      setSel(null)
    }
  }

  let statusText
  if (status.over) statusText = 'Partita finita'
  else if (g.isHumanTurn) statusText = mustCapture ? 'Tocca a te: presa obbligatoria!' : 'Tocca a te'
  else statusText = 'Turno del computer'

  const result = resultFor(status, human, undefined, history.length)
  if (result && status.reason === 'blocked') result.text = 'Nessuna mossa disponibile'
  if (result && status.reason === 'quiet') result.text = 'Troppe mosse senza prese'

  const order = Array.from({ length: N * N }, (_, k) => (flipped ? N * N - 1 - k : k))

  return (
    <GameShell
      title="Dama"
      onHome={onHome}
      statusText={`${statusText} · ⚪ ${counts[1]} – ⚫ ${counts[2]}`}
      thinking={g.thinking}
      onNew={() => { setSel(null); g.newGame() }}
      onUndo={() => { setSel(null); g.undo() }}
      canUndo={g.canUndo}
      difficulty={g.settings.difficulty}
      onDifficulty={g.setDifficulty}
      sideLabel={{
        label: 'Giochi con',
        value: human,
        options: [{ v: 1, l: 'Bianco (inizi tu)' }, { v: 2, l: 'Nero (inizia il computer)' }],
        onChange: (v) => { setSel(null); g.newGame({ human: Number(v) }) },
      }}
      result={result}
    >
      <div className="board n8">
        {order.map((i) => {
          const r = Math.floor(i / N), c = i % N
          const v = state.board[i]
          const target = targets.find((m) => m.to === i)
          const cls = [
            'sq',
            isDark(r, c) ? 'dark' : 'light',
            sel === i ? 'sel' : '',
            lastPath.includes(i) ? 'last' : '',
          ].join(' ')
          return (
            <div key={i} className={cls} onClick={() => onSquare(i)}>
              {v !== 0 && (
                <div
                  className={`piece p${owner(v)} ${isKing(v) ? 'king' : ''}`}
                  style={movablePieces.has(i) && sel === null ? { outline: '3px solid var(--accent)' } : undefined}
                />
              )}
              {target && <div className={`hint ${target.captures.length ? 'capture' : ''}`} />}
            </div>
          )
        })}
      </div>
    </GameShell>
  )
}
