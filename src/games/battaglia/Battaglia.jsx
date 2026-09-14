import { useEffect, useState } from 'react'
import GameShell from '../../components/GameShell.jsx'
import { loadJSON, saveJSON } from '../../storage.js'
import { N, FLEET, idx, rc, shipCells, canPlace, randomFleet, initialState, fire, allSunk, aiPick } from './engine.js'

const LETTERS = 'ABCDEFGHIJ'

// ---- componenti di rendering (fuori dal componente principale, così non
// vengono rimontati a ogni render) ----
function cellClass(side, i, reveal) {
  const shot = side.shots[i]
  const ship = side.ships.find((x) => x.cells.includes(i))
  const cls = ['c']
  if (ship && ship.hits.length === ship.len) cls.push('sunk')
  else if (shot === 2) cls.push('hit')
  else if (shot === 1) cls.push('miss')
  else if (ship && reveal) cls.push('ship')
  return cls.join(' ')
}

function Grid({ side, reveal, small, onCell, lastI, preview, onHover }) {
  return (
    <div className={`bgrid ${small ? 'small' : ''}`} onMouseLeave={() => onHover && onHover(null)}>
      {Array.from({ length: N * N }, (_, i) => {
        let cls = cellClass(side, i, reveal)
        if (lastI === i) cls += ' last'
        if (preview && preview.cells.includes(i)) cls += preview.ok ? ' ghost' : ' ship invalid'
        return (
          <div
            key={i}
            className={cls}
            onClick={() => onCell && onCell(i)}
            onMouseEnter={() => onHover && onHover(i)}
            aria-label={LETTERS[Math.floor(i / N)] + (i % N + 1)}
          />
        )
      })}
    </div>
  )
}

function FleetStatus({ side }) {
  return (
    <div className="fleet-status">
      {side.ships.map((x) => (
        <span key={x.id} className={x.hits.length === x.len ? 'sunk' : ''}>{x.name} ({x.len})</span>
      ))}
    </div>
  )
}

export default function Battaglia({ onHome }) {
  const [settings, setSettings] = useState(() => loadJSON('settings:battaglia', { difficulty: 2 }))
  const [s, setS] = useState(() => loadJSON('game:battaglia', null) || initialState())
  const [selShip, setSelShip] = useState(FLEET[0].id)
  const [horizontal, setHorizontal] = useState(true)
  const [hover, setHover] = useState(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => saveJSON('settings:battaglia', settings), [settings])
  useEffect(() => saveJSON('game:battaglia', { ...s, over: s.phase === 'over' }), [s])

  const placedIds = new Set(s.player.ships.map((x) => x.id))
  const allPlaced = placedIds.size === FLEET.length

  // ---- posizionamento ----
  const previewCells = (() => {
    if (s.phase !== 'placing' || hover === null || !selShip) return null
    const f = FLEET.find((x) => x.id === selShip)
    const [r, c] = rc(hover)
    const cells = shipCells(r, c, f.len, horizontal)
    return cells ? { cells, ok: canPlace(s.player.ships, cells, selShip) } : null
  })()

  const placeAt = (i) => {
    const existing = s.player.ships.find((x) => x.cells.includes(i))
    if (existing) {
      // tocca una nave piazzata per rimuoverla e riposizionarla
      setS({ ...s, player: { ...s.player, ships: s.player.ships.filter((x) => x.id !== existing.id) } })
      setSelShip(existing.id)
      setHorizontal(existing.horizontal)
      return
    }
    if (!selShip) return
    const f = FLEET.find((x) => x.id === selShip)
    const [r, c] = rc(i)
    const cells = shipCells(r, c, f.len, horizontal)
    if (!cells || !canPlace(s.player.ships, cells, selShip)) {
      setMsg('Posizione non valida: le navi non possono toccarsi')
      return
    }
    setMsg('')
    const ships = [...s.player.ships.filter((x) => x.id !== selShip), { ...f, cells, horizontal, hits: [] }]
    setS({ ...s, player: { ...s.player, ships } })
    const next = FLEET.find((x) => !ships.some((y) => y.id === x.id))
    setSelShip(next ? next.id : null)
  }

  const randomize = () => {
    setS({ ...s, player: { ...s.player, ships: randomFleet() } })
    setSelShip(null)
    setMsg('')
  }

  const start = () => {
    if (!allPlaced) return
    setS({ ...s, phase: 'playing', turn: 1, log: [] })
    setMsg('Spara sulla griglia nemica')
  }

  const newGame = () => {
    setS(initialState())
    setSelShip(FLEET[0].id)
    setMsg('')
    setLastRes({ me: '', pc: '' })
    setBusy(false)
  }

  // ---- gioco ----
  // Esito dell'ultimo colpo di ciascuno, mostrati insieme nella barra di stato.
  const [lastRes, setLastRes] = useState({ me: '', pc: '' })
  const describe = (r, ship) => {
    if (r === 'miss') return 'acqua'
    if (r === 'hit') return 'colpito!'
    return `affondato ${ship.name}!`
  }

  const playerFire = (i) => {
    if (s.phase !== 'playing' || s.turn !== 1 || busy) return
    const res = fire(s.computer, i)
    if (!res) return
    const over = allSunk(res.side)
    setLastRes({ me: describe(res.result, res.ship), pc: '' })
    setMsg('')
    setS({
      ...s,
      computer: res.side,
      turn: 2,
      lastShot: { side: 'computer', i },
      phase: over ? 'over' : 'playing',
      winner: over ? 1 : null,
    })
  }

  useEffect(() => {
    if (s.phase !== 'playing' || s.turn !== 2) return
    setBusy(true)
    const t = setTimeout(() => {
      const i = aiPick(s.player, settings.difficulty)
      const res = fire(s.player, i)
      const over = res ? allSunk(res.side) : false
      setBusy(false)
      if (!res) return
      setLastRes((l) => ({ ...l, pc: describe(res.result, res.ship) }))
      setS((cur) => ({
        ...cur,
        player: res.side,
        turn: 1,
        lastShot: { side: 'player', i },
        phase: over ? 'over' : 'playing',
        winner: over ? 2 : null,
      }))
    }, 700)
    return () => {
      clearTimeout(t)
      setBusy(false)
    }
  }, [s.phase, s.turn, s.player, settings.difficulty])

  let statusText = msg
  if (s.phase === 'placing') statusText = msg || 'Posiziona la tua flotta'
  else if (s.phase === 'over') statusText = s.winner === 1 ? 'Hai affondato tutta la flotta nemica!' : 'La tua flotta è stata affondata'
  else if (!msg) {
    const parts = []
    if (lastRes.me) parts.push(`Tu: ${lastRes.me}`)
    if (lastRes.pc) parts.push(`PC: ${lastRes.pc}`)
    statusText = parts.length ? parts.join(' · ') : s.turn === 1 ? 'Tocca a te' : 'Turno del computer'
  }

  const result = s.phase === 'over' ? { title: s.winner === 1 ? 'Hai vinto!' : 'Ha vinto il computer', key: 'end' } : null

  return (
    <GameShell
      title="Battaglia navale"
      onHome={onHome}
      statusText={statusText}
      thinking={false}
      onNew={newGame}
      difficulty={settings.difficulty}
      onDifficulty={(d) => setSettings({ difficulty: Number(d) })}
      result={result}
      extraActions={
        s.phase === 'placing' ? (
          <>
            <button onClick={() => setHorizontal(!horizontal)}>⟳ {horizontal ? 'Orizzontale' : 'Verticale'}</button>
            <button onClick={randomize}>🎲 Casuale</button>
            <button className="primary" onClick={start} disabled={!allPlaced}>Inizia</button>
          </>
        ) : null
      }
    >
      <div className="battle">
        {s.phase === 'placing' ? (
          <>
            <div className="fleet">
              {FLEET.map((f) => (
                <button
                  key={f.id}
                  className={`${selShip === f.id ? 'sel' : ''} ${placedIds.has(f.id) ? 'done' : ''}`}
                  onClick={() => setSelShip(f.id)}
                >
                  {f.name} ({f.len})
                </button>
              ))}
            </div>
            <Grid side={s.player} reveal onCell={placeAt} preview={previewCells} onHover={setHover} />
            <h3>Tocca una casella per posizionare la nave selezionata; tocca una nave per spostarla.</h3>
          </>
        ) : (
          <div className="grids">
            <div>
              <h3>Griglia nemica</h3>
              <Grid side={s.computer} reveal={s.phase === 'over'} onCell={playerFire} lastI={s.lastShot?.side === 'computer' ? s.lastShot.i : -1} />
              <FleetStatus side={s.computer} />
            </div>
            <div>
              <h3>La tua flotta</h3>
              <Grid side={s.player} reveal small lastI={s.lastShot?.side === 'player' ? s.lastShot.i : -1} />
              <FleetStatus side={s.player} />
            </div>
          </div>
        )}
      </div>
    </GameShell>
  )
}
