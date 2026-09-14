import { useMemo, useState } from 'react'
import GameShell, { resultFor } from '../../components/GameShell.jsx'
import { useGame } from '../../hooks/useGame.js'
import * as engine from './engine.js'
import { N, isDark, owner, isKing, countPieces, moveKey } from './engine.js'
import * as coachDama from '../../coach/dama.js'

const COACH = { moveKey, unit: 100, describe: coachDama.describeMove, explain: coachDama.explain }

const RULES = [
  'Si gioca sulle caselle scure; il bianco muove per primo. La casella d\'angolo alla tua destra è scura.',
  'La pedina muove di una casella in diagonale, solo in avanti.',
  'La presa è obbligatoria: se puoi mangiare, devi farlo. Si mangia saltando il pezzo avversario su una casella libera, anche più volte di seguito.',
  'La pedina mangia solo in avanti e non può mangiare la dama.',
  'Se hai più prese possibili devi scegliere quella che cattura più pezzi; a parità, quella con la dama; poi quella che cattura più dame.',
  'La pedina che arriva sull\'ultima riga diventa dama (e si ferma lì anche se potrebbe continuare a mangiare).',
  'La dama muove e mangia di una casella in diagonale in tutte le direzioni.',
  'Vince chi cattura tutti i pezzi avversari o blocca ogni loro mossa. Dopo 40 mosse senza prese è patta.',
]

export default function Dama({ onHome }) {
  const g = useGame('dama', engine, COACH, { moveKind: (p, n, m) => (m.captures.length ? 'capture' : 'move') })
  const { state, status, human, history } = g
  const [sel, setSel] = useState(null)
  const flipped = human === 2

  const legal = useMemo(() => (g.isHumanTurn ? engine.legalMoves(state) : []), [g.isHumanTurn, state])
  const mustCapture = legal.some((m) => m.captures.length > 0)
  const movablePieces = new Set(legal.map((m) => m.from))
  const targets = sel === null ? [] : legal.filter((m) => m.from === sel)
  const lastPath = state.last?.path || []
  const hintMove = g.coach?.hint?.move
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
      coach={g.coach && { ...g.coach, tips: coachDama.TIPS }}
      rules={RULES}
      canHint={g.isHumanTurn}
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
            hintMove && hintMove.from === i ? 'hint-from' : '',
            hintMove && hintMove.to === i ? 'hint-to' : '',
          ].join(' ')
          return (
            <div key={i} className={cls} onClick={() => onSquare(i)}>
              {v !== 0 && (
                <div className={`piece p${owner(v)} ${isKing(v) ? 'king' : ''} ${movablePieces.has(i) && sel === null ? 'movable' : ''}`} />
              )}
              {target && <div className={`hint ${target.captures.length ? 'capture' : ''}`} />}
            </div>
          )
        })}
      </div>
    </GameShell>
  )
}
