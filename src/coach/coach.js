// Modalità istruttore: valuta la mossa fatta dal giocatore rispetto all'analisi
// del motore e produce spiegazioni in italiano.

export const LEVELS = {
  best: { icon: '★', label: 'Mossa migliore', cls: 'best' },
  good: { icon: '✓', label: 'Buona mossa', cls: 'good' },
  inaccuracy: { icon: '~', label: 'Imprecisione', cls: 'inaccuracy' },
  mistake: { icon: '!', label: 'Errore', cls: 'mistake' },
  blunder: { icon: '!!', label: 'Errore grave', cls: 'blunder' },
  forced: { icon: '→', label: 'Mossa obbligata', cls: 'good' },
}

// Classifica in base alla perdita di valutazione rispetto alla mossa migliore.
// `unit` è il valore di un pezzo semplice (pedone / pedina) nella scala del motore.
export function classify(loss, unit) {
  if (loss <= unit * 0.15) return 'best'
  if (loss <= unit * 0.5) return 'good'
  if (loss <= unit * 1.2) return 'inaccuracy'
  if (loss <= unit * 3) return 'mistake'
  return 'blunder'
}

// Trova la mossa del giocatore nell'analisi e calcola la perdita.
export function gradeMove(analysis, key, moveKey, unit) {
  if (!analysis || !analysis.scored.length) return null
  const { scored } = analysis
  if (scored.length === 1) return { level: 'forced', loss: 0, best: scored[0], played: scored[0], rank: 1 }
  const top = scored[0]
  const idx = scored.findIndex((r) => moveKey(r.m) === key)
  if (idx < 0) return null
  const played = scored[idx]
  const loss = top.v - played.v
  return { level: classify(loss, unit), loss, best: top, played, rank: idx + 1, total: scored.length }
}
