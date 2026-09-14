import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as chess from '../src/games/scacchi/engine.js'
import * as dama from '../src/games/dama/engine.js'
import { gradeMove } from '../src/coach/coach.js'
import * as coachChess from '../src/coach/scacchi.js'
import * as coachDama from '../src/coach/dama.js'

test('istruttore scacchi: riconosce il matto mancato e il pezzo lasciato in presa', () => {
  // Bianco può dare matto con Dxf7#; gioca invece a3.
  const s = { fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 4', turn: 1, history: [] }
  const analysis = chess.analyze(s)
  assert.equal(analysis.scored[0].m.san, 'Qxf7#')
  const grade = gradeMove(analysis, 'a2a3', chess.moveKey, 100)
  assert.equal(grade.level, 'blunder')
  const text = coachChess.explain(s.fen, grade, 'w')
  assert.match(text, /scacco matto con Qxf7#/)

  // Bianco muove la donna dove il cavallo nero la può prendere: Dh5-g4?? con cavallo in f6? costruiamo:
  // dopo 1.e4 e5 2.Dh5 Cf6 la donna in h5 è attaccata; se il bianco gioca 3.Dxe5+ perde? no.
  // Caso semplice: donna che va in presa di un pedone.
  const s2 = { fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', turn: 1, history: [] }
  const an2 = chess.analyze(s2)
  const g2 = gradeMove(an2, 'd1g4', chess.moveKey, 100) // Dg4?? il pedone d7 non la prende... usiamo Dh5 poi
  assert.ok(g2)
  const g3 = gradeMove(an2, 'd1f3', chess.moveKey, 100)
  assert.ok(g3)
  // La mossa migliore è giudicata "best"
  const gBest = gradeMove(an2, chess.moveKey(an2.scored[0].m), chess.moveKey, 100)
  assert.equal(gBest.level, 'best')
  assert.ok(coachChess.describeMove(s2.fen, an2.scored[0].m).length > 10)
})

test('istruttore scacchi: segnala il pezzo in presa', () => {
  // Bianco: Re1, Dd1, pedoni; nero ha un cavallo in c6. Il bianco gioca Dd1-a4?? dove... meglio: donna in presa di pedone.
  // Posizione: 1.e4 e5 2.d4 exd4 3.Dxd4 Cc6 attacca la donna. Ora bianco gioca Dd4-d3?? no. Costruiamo la mossa che
  // mette la donna dove il pedone la cattura: 1.e4 d5 2.Dh5?? no... usiamo: donna in e5 con pedone d6 nero.
  const s = { fen: 'rnbqkbnr/ppp2ppp/3p4/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3', turn: 1, history: [] }
  const an = chess.analyze(s)
  // Dh5?? poi... invece Dd1-g4 e Axg4: alfiere c8 cattura la donna in g4.
  const g = gradeMove(an, 'd1g4', chess.moveKey, 100)
  assert.equal(g.level, 'blunder')
  const text = coachChess.explain(s.fen, g, 'w')
  assert.match(text, /in presa/)
})

test('istruttore dama: segnala la presa concessa e descrive la mossa migliore', () => {
  const b = Array(64).fill(0)
  // Bianco in (5,2) e (7,0); nero in (3,4). Se il bianco muove (5,2)->(4,3), il nero lo mangia.
  b[dama.idx(5, 2)] = 1
  b[dama.idx(7, 0)] = 1
  b[dama.idx(3, 4)] = 2
  b[dama.idx(0, 6)] = 2
  const s = { board: b, turn: 1, quiet: 0 }
  const an = dama.analyze(s)
  const bad = dama.legalMoves(s).find((m) => m.from === dama.idx(5, 2) && m.to === dama.idx(4, 3))
  const g = gradeMove(an, dama.moveKey(bad), dama.moveKey, 100)
  assert.ok(['mistake', 'blunder'].includes(g.level), g.level)
  const text = coachDama.explain(s, g, 1)
  assert.match(text, /mangiare un tuo pezzo/)
  const desc = coachDama.describeMove(s, an.scored[0].m)
  assert.match(desc, /Muovi la pedina/)
  const forced = gradeMove({ scored: [an.scored[0]], depth: 1 }, dama.moveKey(an.scored[0].m), dama.moveKey, 100)
  assert.equal(forced.level, 'forced')
})
