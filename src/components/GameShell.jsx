import { useMemo, useState } from 'react'
import { DIFFICULTY } from '../engine/minimax.js'
import { LEVELS } from '../coach/coach.js'
import SoundToggle from './SoundToggle.jsx'

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
  coach, // { enabled, setEnabled, feedback, hint, showHint, analyzing, grades, tips } opzionale
  rules, // array di stringhe: regole mostrate dal pulsante "?"
  canHint = true,
}) {
  const [confirmNew, setConfirmNew] = useState(false)
  const [dismissed, setDismissed] = useState(null)
  const [showRules, setShowRules] = useState(false)
  const showResult = result && dismissed !== result.key
  const tip = useMemo(() => (coach?.tips ? coach.tips[Math.floor(Math.random() * coach.tips.length)] : null), [coach?.tips, coach?.feedback])
  const summary = coach?.grades?.length ? summarize(coach.grades) : null

  return (
    <div className="game">
      <div className="topbar">
        <button className="icon" onClick={onHome} aria-label="Torna alla home">‹</button>
        <h2>{title}</h2>
        <SoundToggle />
        {rules && <button className="icon" onClick={() => setShowRules(true)} aria-label="Regole">?</button>}
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

      {coach && (
        <div className="coach glass">
          <div className="coach-head">
            <label className="switch">
              <input type="checkbox" checked={coach.enabled} onChange={(e) => coach.setEnabled(e.target.checked)} />
              <span>🎓 Istruttore</span>
            </label>
            {coach.enabled && (
              <button className="small" onClick={coach.showHint} disabled={!canHint || coach.analyzing}>
                {coach.analyzing ? 'Analizzo…' : '💡 Suggerimento'}
              </button>
            )}
          </div>
          {coach.enabled && (
            <div className="coach-body">
              {coach.hint ? (
                <p><b>Suggerimento:</b> {coach.hint.text}</p>
              ) : coach.feedback ? (
                <p>
                  <span className={`grade ${LEVELS[coach.feedback.grade.level].cls}`}>
                    {LEVELS[coach.feedback.grade.level].icon} {LEVELS[coach.feedback.grade.level].label}
                  </span>{' '}
                  {coach.feedback.text}
                  {(coach.feedback.grade.level === 'mistake' || coach.feedback.grade.level === 'blunder') && onUndo && canUndo && (
                    <>
                      {' '}
                      <button className="small inline" onClick={onUndo}>↶ Riprova la mossa</button>
                    </>
                  )}
                </p>
              ) : (
                tip && <p><b>Consiglio:</b> {tip}</p>
              )}
            </div>
          )}
        </div>
      )}

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

      {showRules && (
        <div className="overlay" onClick={() => setShowRules(false)}>
          <div className="box rules" onClick={(e) => e.stopPropagation()}>
            <h3>Come si gioca</h3>
            <ul>
              {rules.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
            <button className="primary" onClick={() => setShowRules(false)}>Ho capito</button>
          </div>
        </div>
      )}

      {showResult && (
        <div className="overlay" onClick={() => setDismissed(result.key)}>
          <div className={`box ${result.title.startsWith('Hai vinto') ? 'win' : ''}`} onClick={(e) => e.stopPropagation()}>
            <h3>{result.title}</h3>
            {result.text && <p>{result.text}</p>}
            {summary && coach?.enabled && <p className="summary">Le tue mosse: {summary}</p>}
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

function summarize(grades) {
  const order = ['best', 'good', 'inaccuracy', 'mistake', 'blunder']
  const names = { best: 'migliori', good: 'buone', inaccuracy: 'imprecisioni', mistake: 'errori', blunder: 'errori gravi' }
  const counts = {}
  for (const g of grades) if (g !== 'forced') counts[g] = (counts[g] || 0) + 1
  return order.filter((k) => counts[k]).map((k) => `${counts[k]} ${names[k]}`).join(', ') || 'nessuna valutata'
}
