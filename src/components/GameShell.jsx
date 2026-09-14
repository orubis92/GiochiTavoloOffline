import { useState } from 'react'
import { DIFFICULTY } from '../engine/minimax.js'

// Cornice comune: barra superiore, stato, plancia, azioni, fine partita.
export default function GameShell({
  title,
  onHome,
  statusText,
  thinking,
  children,
  onNew,
  onUndo,
  canUndo,
  difficulty,
  onDifficulty,
  sideLabel, // { label, value, options: [{v,l}], onChange } opzionale (es. colore)
  result, // { title, text } quando la partita è finita
  extraActions,
}) {
  const [confirmNew, setConfirmNew] = useState(false)
  const [dismissed, setDismissed] = useState(null)
  const showResult = result && dismissed !== result.key

  return (
    <div className="game">
      <div className="topbar">
        <button className="back" onClick={onHome} aria-label="Torna alla home">‹ Home</button>
        <h2>{title}</h2>
        <select value={difficulty} onChange={(e) => onDifficulty(e.target.value)} aria-label="Difficoltà">
          {Object.entries(DIFFICULTY).map(([v, d]) => (
            <option key={v} value={v}>{d.label}</option>
          ))}
        </select>
      </div>

      <div className="statusbar">
        {thinking ? <span className="thinking">Il computer sta pensando…</span> : <span>{statusText}</span>}
      </div>

      <div className="board-wrap">{children}</div>

      {sideLabel && (
        <div className="settings">
          <label>
            {sideLabel.label}
            <select value={sideLabel.value} onChange={(e) => sideLabel.onChange(e.target.value)}>
              {sideLabel.options.map((o) => (
                <option key={o.v} value={o.v}>{o.l}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="actions">
        {onUndo && <button onClick={onUndo} disabled={!canUndo}>↶ Annulla</button>}
        {extraActions}
        <button className="danger" onClick={() => (result ? onNew() : setConfirmNew(true))}>Nuova partita</button>
      </div>

      {confirmNew && (
        <div className="overlay" onClick={() => setConfirmNew(false)}>
          <div className="box" onClick={(e) => e.stopPropagation()}>
            <h3>Ricominciare?</h3>
            <p>La partita in corso andrà persa.</p>
            <button className="primary" onClick={() => { setConfirmNew(false); onNew() }}>Sì, nuova partita</button>
            <button onClick={() => setConfirmNew(false)}>Continua a giocare</button>
          </div>
        </div>
      )}

      {showResult && (
        <div className="overlay" onClick={() => setDismissed(result.key)}>
          <div className="box" onClick={(e) => e.stopPropagation()}>
            <h3>{result.title}</h3>
            {result.text && <p>{result.text}</p>}
            <button className="primary" onClick={onNew}>Nuova partita</button>
            <button onClick={() => setDismissed(result.key)}>Guarda la plancia</button>
          </div>
        </div>
      )}
    </div>
  )
}

export function resultFor(status, human, names = { win: 'Hai vinto!', lose: 'Ha vinto il computer', draw: 'Patta' }, key) {
  if (!status.over) return null
  const title = status.winner == null ? names.draw : status.winner === human ? names.win : names.lose
  return { title, text: status.reason || '', key }
}
