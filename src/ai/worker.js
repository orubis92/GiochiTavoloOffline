// Web Worker: calcola la mossa del computer senza bloccare l'interfaccia.
import * as tris from '../games/tris/engine.js'
import * as forza4 from '../games/forza4/engine.js'
import * as othello from '../games/othello/engine.js'
import * as dama from '../games/dama/engine.js'
import * as scacchi from '../games/scacchi/engine.js'

const ENGINES = { tris, forza4, othello, dama, scacchi }

self.onmessage = (e) => {
  const { id, game, state, difficulty } = e.data
  try {
    const move = ENGINES[game].bestMove(state, difficulty)
    self.postMessage({ id, move })
  } catch (err) {
    self.postMessage({ id, error: String(err) })
  }
}
