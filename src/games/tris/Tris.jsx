import GameShell, { resultFor } from '../../components/GameShell.jsx'
import { useGame } from '../../hooks/useGame.js'
import * as engine from './engine.js'

export default function Tris({ onHome }) {
  const g = useGame('tris', engine)
  const { state, status, human, history } = g
  const line = status.line || []
  const sym = (p) => (p === 1 ? 'X' : 'O')

  const statusText = status.over
    ? 'Partita finita'
    : g.isHumanTurn
      ? `Tocca a te (${sym(human)})`
      : 'Turno del computer'

  return (
    <GameShell
      title="Tris"
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
        options: [{ v: 1, l: 'X (inizi tu)' }, { v: 2, l: 'O (inizia il computer)' }],
        onChange: (v) => g.newGame({ human: Number(v) }),
      }}
      result={resultFor(status, human, undefined, history.length)}
    >
      <div className="board n3 tris">
        {state.board.map((v, i) => (
          <button
            key={i}
            className={`sq ${line.includes(i) ? 'win' : ''} ${v === 1 ? 'x' : v === 2 ? 'o' : ''}`}
            onClick={() => v === 0 && g.humanMove(i)}
            disabled={v !== 0 || !g.isHumanTurn}
            style={{ borderRadius: 0, minHeight: 0, padding: 0 }}
          >
            {v ? sym(v) : ''}
          </button>
        ))}
      </div>
    </GameShell>
  )
}
