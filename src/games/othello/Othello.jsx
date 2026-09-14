import GameShell, { resultFor } from '../../components/GameShell.jsx'
import { useGame } from '../../hooks/useGame.js'
import * as engine from './engine.js'
import { N, counts } from './engine.js'

export default function Othello({ onHome }) {
  const g = useGame('othello', engine, null, { moveKind: (p, n) => (n.flipped?.length >= 3 ? 'capture' : 'move') })
  const { state, status, human, history } = g
  const legal = g.isHumanTurn ? engine.legalMoves(state).filter((m) => m >= 0) : []
  const [black, white] = counts(state.board)

  let statusText
  if (g.passNotice) statusText = g.passNotice === human ? 'Non hai mosse: passi il turno' : 'Il computer passa il turno'
  else if (status.over) statusText = `Fine: ⚫ ${black} – ⚪ ${white}`
  else statusText = `⚫ ${black} – ⚪ ${white} · ${g.isHumanTurn ? 'Tocca a te' : 'Turno del computer'}`

  const result = resultFor(status, human, undefined, history.length)
  if (result) result.text = `Nero ${black} – Bianco ${white}`

  return (
    <GameShell
      title="Othello"
      onHome={onHome}
      statusText={statusText}
      thinking={g.thinking}
      onNew={() => g.newGame()}
      onUndo={g.undo}
      canUndo={g.canUndo}
      difficulty={g.settings.difficulty}
      onDifficulty={g.setDifficulty}
      sideLabel={{
        label: 'Giochi con',
        value: human,
        options: [{ v: 1, l: 'Nero (inizi tu)' }, { v: 2, l: 'Bianco (inizia il computer)' }],
        onChange: (v) => g.newGame({ human: Number(v) }),
      }}
      result={result}
    >
      <div className="board n8 othello">
        {Array.from({ length: N * N }, (_, i) => {
          const v = state.board[i]
          return (
            <div key={i} className={`sq ${state.last === i ? 'last' : ''}`} onClick={() => legal.includes(i) && g.humanMove(i)}>
              {v !== 0 && <div className={`piece p${v === 1 ? 2 : 1} ${state.flipped?.includes(i) ? 'flip' : ''}`} />}
              {legal.includes(i) && <div className="hint" />}
            </div>
          )
        })}
      </div>
    </GameShell>
  )
}
