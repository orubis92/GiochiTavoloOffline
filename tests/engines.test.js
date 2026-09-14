import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as tris from '../src/games/tris/engine.js'
import * as f4 from '../src/games/forza4/engine.js'
import * as oth from '../src/games/othello/engine.js'
import * as dama from '../src/games/dama/engine.js'
import * as chess from '../src/games/scacchi/engine.js'
import * as bn from '../src/games/battaglia/engine.js'

function playOut(eng, s, maxPlies = 400) {
  let plies = 0
  while (!eng.status(s).over && plies < maxPlies) {
    const m = eng.bestMove(s, 2)
    assert.ok(m !== null && m !== undefined, 'mossa nulla con partita in corso')
    s = eng.applyMove(s, m)
    plies++
  }
  return { s, plies }
}

test('tris: il livello difficile non perde mai contro mosse casuali', () => {
  for (let g = 0; g < 30; g++) {
    let s = tris.initialState({ first: 1 })
    while (!tris.status(s).over) {
      let m
      if (s.turn === 1) {
        const ms = tris.legalMoves(s)
        m = ms[Math.floor(Math.random() * ms.length)]
      } else m = tris.bestMove(s, 3)
      s = tris.applyMove(s, m)
    }
    assert.notEqual(tris.status(s).winner, 1)
  }
})

test('tris: blocca la vittoria immediata', () => {
  // X in 0 e 1, O deve giocare in 2
  const s = { board: [1, 1, 0, 0, 2, 0, 0, 0, 0], turn: 2, last: null }
  assert.equal(tris.bestMove(s, 3), 2)
})

test('forza 4: vince quando può e blocca minacce', () => {
  let s = f4.initialState()
  for (const c of [0, 1, 0, 1, 0, 1]) s = f4.applyMove(s, c)
  // tocca a P1 con tre in colonna 0: deve vincere
  assert.equal(f4.bestMove(s, 3), 0)
  let s2 = f4.initialState()
  for (const c of [0, 1, 0, 1, 0]) s2 = f4.applyMove(s2, c)
  assert.equal(f4.bestMove(s2, 3), 0, 'deve bloccare')
  const { s: end } = playOut(f4, f4.initialState())
  assert.ok(f4.status(end).over)
})

test('othello: mosse iniziali corrette e partita completa', () => {
  const s = oth.initialState()
  assert.deepEqual(oth.legalMoves(s).sort((a, b) => a - b), [19, 26, 37, 44])
  const { s: end } = playOut(oth, s)
  const st = oth.status(end)
  assert.ok(st.over)
  const [a, b] = oth.counts(end.board)
  assert.ok(a + b <= 64)
})

test('dama: disposizione iniziale e mosse di apertura', () => {
  const s = dama.initialState()
  const c = dama.countPieces(s.board)
  assert.equal(c[1], 12)
  assert.equal(c[2], 12)
  // casella in basso a destra scura e occupata dal bianco
  assert.equal(s.board[dama.idx(7, 7)], 1)
  assert.equal(s.board[dama.idx(7, 0)], 0)
  const ms = dama.legalMoves(s)
  assert.equal(ms.length, 7)
  assert.ok(ms.every((m) => m.captures.length === 0))
})

test('dama: presa obbligatoria, pedina non prende dama, priorità quantità', () => {
  const b = Array(64).fill(0)
  // bianco in (5,4); nero in (4,3) e (4,5). Presa obbligatoria a sinistra o destra.
  b[dama.idx(5, 4)] = 1
  b[dama.idx(4, 3)] = 2
  b[dama.idx(4, 5)] = 2
  // dietro (4,5) un altro nero in (2,7)? no: doppia presa via (3,6) -> serve nero in (2,5)? costruiamo:
  // dopo la presa in (3,6), un nero in (2,5) con (1,4) libera consente la seconda presa.
  b[dama.idx(2, 5)] = 2
  let s = { board: b, turn: 1, quiet: 0 }
  let ms = dama.legalMoves(s)
  assert.equal(ms.length, 1, 'deve restare solo la presa doppia')
  assert.equal(ms[0].captures.length, 2)
  // la pedina non può prendere una dama
  const b2 = Array(64).fill(0)
  b2[dama.idx(5, 4)] = 1
  b2[dama.idx(4, 3)] = 12
  s = { board: b2, turn: 1, quiet: 0 }
  ms = dama.legalMoves(s)
  assert.ok(ms.every((m) => m.captures.length === 0))
  // la dama invece può prendere la dama
  const b3 = Array(64).fill(0)
  b3[dama.idx(5, 4)] = 11
  b3[dama.idx(4, 3)] = 12
  s = { board: b3, turn: 1, quiet: 0 }
  ms = dama.legalMoves(s)
  assert.equal(ms.length, 1)
  assert.equal(ms[0].to, dama.idx(3, 2))
})

test('dama: promozione ferma la presa e partita completa fra IA', () => {
  const b = Array(64).fill(0)
  b[dama.idx(2, 3)] = 1
  b[dama.idx(1, 2)] = 2
  b[dama.idx(1, 6)] = 2 // altro pezzo nero lontano
  b[dama.idx(7, 7)] = 2
  const s = { board: b, turn: 1, quiet: 0 }
  const ms = dama.legalMoves(s)
  assert.equal(ms.length, 1)
  const n = dama.applyMove(s, ms[0])
  assert.equal(n.board[dama.idx(0, 1)], 11)
  const { s: end, plies } = playOut(dama, dama.initialState(), 300)
  assert.ok(dama.status(end).over || plies === 300)
})

test('scacchi: IA trova il matto in uno', () => {
  // Matto del barbiere: bianco Dh5xf7#
  const s = { fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 4', turn: 1, history: [] }
  const m = chess.bestMove(s, 2)
  assert.equal(m.from + m.to, 'h5f7')
  const n = chess.applyMove(s, m)
  assert.equal(chess.status(n).winner, 1)
})

test('scacchi: partita fra IA facile termina o supera 60 semimosse senza errori', () => {
  let s = chess.initialState()
  let plies = 0
  while (!chess.status(s).over && plies < 60) {
    const m = chess.bestMove(s, 1)
    s = chess.applyMove(s, m)
    plies++
  }
  assert.ok(plies > 0)
})

test('battaglia navale: flotta valida e IA difficile affonda tutto', () => {
  const ships = bn.randomFleet()
  assert.equal(ships.length, 5)
  for (const s of ships) assert.ok(bn.canPlace(ships, s.cells, s.id))
  let side = { ships, shots: Array(100).fill(0) }
  let shots = 0
  while (!bn.allSunk(side) && shots < 100) {
    const i = bn.aiPick(side, 3)
    const r = bn.fire(side, i)
    assert.ok(r, 'sparo su cella già colpita')
    side = r.side
    shots++
  }
  assert.ok(bn.allSunk(side))
  assert.ok(shots < 100)
})
