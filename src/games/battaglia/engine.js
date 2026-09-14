// Battaglia navale 10x10, flotta classica.
export const N = 10
export const FLEET = [
  { id: 'portaerei', name: 'Portaerei', len: 5 },
  { id: 'corazzata', name: 'Corazzata', len: 4 },
  { id: 'incrociatore', name: 'Incrociatore', len: 3 },
  { id: 'sommergibile', name: 'Sommergibile', len: 3 },
  { id: 'caccia', name: 'Cacciatorpediniere', len: 2 },
]
export const idx = (r, c) => r * N + c
export const rc = (i) => [Math.floor(i / N), i % N]

// Celle occupate da una nave di lunghezza len con prua in (r,c).
export function shipCells(r, c, len, horizontal) {
  const cells = []
  for (let k = 0; k < len; k++) {
    const rr = horizontal ? r : r + k
    const cc = horizontal ? c + k : c
    if (rr >= N || cc >= N) return null
    cells.push(idx(rr, cc))
  }
  return cells
}

// Le navi non possono toccarsi nemmeno in diagonale (regola comune in Italia).
export function canPlace(ships, cells, ignoreId = null) {
  const occupied = new Set()
  for (const s of ships) {
    if (s.id === ignoreId) continue
    for (const i of s.cells) {
      const [r, c] = rc(i)
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr, cc = c + dc
          if (rr >= 0 && rr < N && cc >= 0 && cc < N) occupied.add(idx(rr, cc))
        }
    }
  }
  return cells.every((i) => !occupied.has(i))
}

export function randomFleet() {
  for (let attempt = 0; attempt < 200; attempt++) {
    const ships = []
    let ok = true
    for (const f of FLEET) {
      let placed = false
      for (let t = 0; t < 200 && !placed; t++) {
        const horizontal = Math.random() < 0.5
        const r = Math.floor(Math.random() * N)
        const c = Math.floor(Math.random() * N)
        const cells = shipCells(r, c, f.len, horizontal)
        if (cells && canPlace(ships, cells)) {
          ships.push({ ...f, cells, horizontal, hits: [] })
          placed = true
        }
      }
      if (!placed) {
        ok = false
        break
      }
    }
    if (ok) return ships
  }
  throw new Error('Impossibile posizionare la flotta')
}

export function initialState({ first = 1 } = {}) {
  return {
    phase: 'placing', // 'placing' | 'playing' | 'over'
    turn: first,
    player: { ships: [], shots: Array(N * N).fill(0) }, // shots ricevuti: 0 nulla, 1 acqua, 2 colpito
    computer: { ships: randomFleet(), shots: Array(N * N).fill(0) },
    log: [],
    winner: null,
    lastShot: null,
  }
}

export function allSunk(side) {
  return side.ships.every((s) => s.hits.length === s.len)
}

// Spara sulla parte `side`; restituisce il nuovo side e l'esito.
export function fire(side, i) {
  if (side.shots[i] !== 0) return null
  const shots = side.shots.slice()
  const ships = side.ships.map((s) => ({ ...s, hits: s.hits.slice() }))
  const ship = ships.find((s) => s.cells.includes(i))
  let result = 'miss'
  if (ship) {
    shots[i] = 2
    ship.hits.push(i)
    result = ship.hits.length === ship.len ? 'sunk' : 'hit'
  } else {
    shots[i] = 1
  }
  // quando una nave affonda, segna come acqua le celle attorno (non possono contenere navi)
  if (result === 'sunk') {
    for (const ci of ship.cells) {
      const [r, c] = rc(ci)
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr, cc = c + dc
          if (rr >= 0 && rr < N && cc >= 0 && cc < N && shots[idx(rr, cc)] === 0) shots[idx(rr, cc)] = 1
        }
    }
  }
  return { side: { ships, shots }, result, ship }
}

// ---- IA -------------------------------------------------------------------

// Celle dei colpi a segno su navi non ancora affondate.
function openHits(side) {
  const sunk = new Set(side.ships.filter((s) => s.hits.length === s.len).flatMap((s) => s.cells))
  const out = []
  for (let i = 0; i < N * N; i++) if (side.shots[i] === 2 && !sunk.has(i)) out.push(i)
  return out
}

function remainingLengths(side) {
  return side.ships.filter((s) => s.hits.length !== s.len).map((s) => s.len)
}

// Mappa di probabilità: per ogni nave rimasta, conta tutti i piazzamenti
// compatibili con i colpi noti; i piazzamenti che coprono colpi aperti valgono di più.
function densityMap(side) {
  const shots = side.shots
  const hits = new Set(openHits(side))
  const map = Array(N * N).fill(0)
  for (const len of remainingLengths(side)) {
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        for (const horizontal of [true, false]) {
          const cells = shipCells(r, c, len, horizontal)
          if (!cells) continue
          if (cells.some((i) => shots[i] === 1)) continue
          // non può sovrapporsi a navi già affondate (i loro colpi non sono "aperti")
          if (cells.some((i) => shots[i] === 2 && !hits.has(i))) continue
          const covered = cells.filter((i) => hits.has(i)).length
          const w = covered ? 1 + covered * 20 : 1
          for (const i of cells) if (shots[i] === 0) map[i] += w
        }
      }
    }
  }
  return map
}

export function aiPick(side, difficulty) {
  const free = []
  for (let i = 0; i < N * N; i++) if (side.shots[i] === 0) free.push(i)
  if (free.length === 0) return -1
  const hits = openHits(side)

  if (difficulty === 1) {
    // Facile: colpisce vicino a un colpo a segno solo metà delle volte, altrimenti a caso.
    if (hits.length && Math.random() < 0.55) {
      const adj = neighbours(hits, side.shots)
      if (adj.length) return adj[Math.floor(Math.random() * adj.length)]
    }
    return free[Math.floor(Math.random() * free.length)]
  }

  if (difficulty === 2) {
    // Medio: caccia con parità + inseguimento lineare dei colpi.
    if (hits.length) {
      const lined = lineCandidates(hits, side.shots)
      const pool = lined.length ? lined : neighbours(hits, side.shots)
      if (pool.length) return pool[Math.floor(Math.random() * pool.length)]
    }
    const minLen = Math.min(...remainingLengths(side))
    const parity = free.filter((i) => {
      const [r, c] = rc(i)
      return (r + c) % minLen === 0
    })
    const pool = parity.length ? parity : free
    return pool[Math.floor(Math.random() * pool.length)]
  }

  // Difficile: mappa di probabilità.
  const map = densityMap(side)
  let best = -1
  for (const i of free) if (map[i] > best) best = map[i]
  const top = free.filter((i) => map[i] === best)
  return top[Math.floor(Math.random() * top.length)]
}

function neighbours(hits, shots) {
  const out = new Set()
  for (const h of hits) {
    const [r, c] = rc(h)
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const rr = r + dr, cc = c + dc
      if (rr >= 0 && rr < N && cc >= 0 && cc < N && shots[idx(rr, cc)] === 0) out.add(idx(rr, cc))
    }
  }
  return [...out]
}

// Se ci sono almeno due colpi allineati, spara alle estremità della linea.
function lineCandidates(hits, shots) {
  if (hits.length < 2) return []
  const out = []
  const set = new Set(hits)
  for (const h of hits) {
    const [r, c] = rc(h)
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      if (r + dr >= N || c + dc >= N || !set.has(idx(r + dr, c + dc))) continue
      // estendi in entrambe le direzioni
      for (const sgn of [1, -1]) {
        let rr = r, cc = c
        while (rr >= 0 && rr < N && cc >= 0 && cc < N && set.has(idx(rr, cc))) {
          rr += dr * sgn
          cc += dc * sgn
        }
        if (rr >= 0 && rr < N && cc >= 0 && cc < N && shots[idx(rr, cc)] === 0) out.push(idx(rr, cc))
      }
    }
  }
  return [...new Set(out)]
}
