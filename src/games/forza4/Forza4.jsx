import { useState } from 'react'
import GameShell, { resultFor } from '../../components/GameShell.jsx'
import { useGame } from '../../hooks/useGame.js'
import * as engine from './engine.js'
import { ROWS, COLS, dropRow } from './engine.js'

export default function Forza4({ onHome }) {
  const g = useGame('forza4', engine)
  const { state, status, human, history } = g
  const [hoverCol, setHoverCol] = useState(null)
  const line = status.line || []
  const legal = g.isHumanTurn ? engine.legalMoves(state) : []
  const ghost = hoverCol !== null && legal.includes(hoverCol) ? dropRow(state.board, hoverCol) * COLS + hoverCol : -1

  const statusText = status.over
    ? 'Partita finita'
    : g.isHumanTurn
      ? 'Tocca a te: scegli una colonna'
      : 'Turno del computer'

  return (
    <GameShell
      title="Forza 4"
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
        options: [{ v: 1, l: 'Rosso (inizi tu)' }, { v: 2, l: 'Giallo (inizia il computer)' }],
        onChange: (v) => g.newGame({ human: Number(v) }),
      }}
      result={resultFor(status, human, undefined, history.length)}
    >
      <div className="board forza4" onMouseLeave={() => setHoverCol(null)}>
        {Array.from({ length: ROWS * COLS }, (_, i) => {
          const v = state.board[i]
          const c = i % COLS
          return (
            <div
              key={i}
              className={`cell ${line.includes(i) ? 'win' : ''} ${ghost === i ? 'ghost' : ''}`}
              onMouseEnter={() => setHoverCol(c)}
              onClick={() => legal.includes(c) && g.humanMove(c)}
            >
              {v !== 0 && <div className={`disc p${v} ${state.last === i ? 'last' : ''}`} />}
            </div>
          )
        })}
      </div>
    </GameShell>
  )
}
