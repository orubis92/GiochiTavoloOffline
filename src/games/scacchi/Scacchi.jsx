import { useMemo, useState } from 'react'
import GameShell, { resultFor } from '../../components/GameShell.jsx'
import { useGame } from '../../hooks/useGame.js'
import * as engine from './engine.js'

const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
const FILES = 'abcdefgh'
const PROMO = ['q', 'r', 'b', 'n']

export default function Scacchi({ onHome }) {
  const g = useGame('scacchi', engine)
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
              const cls = ['sq', dark ? 'dark' : 'light', sel === sq ? 'sel' : '', isLast ? 'last' : '', kingSq === sq ? 'check' : ''].join(' ')
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
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem', marginTop: 8 }}>
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
