import { useEffect, useState } from 'react'
import { GAMES } from './games/index.js'
import { loadJSON } from './storage.js'
import Dama from './games/dama/Dama.jsx'
import Scacchi from './games/scacchi/Scacchi.jsx'
import Battaglia from './games/battaglia/Battaglia.jsx'
import Othello from './games/othello/Othello.jsx'
import Forza4 from './games/forza4/Forza4.jsx'
import Tris from './games/tris/Tris.jsx'

const SCREENS = { dama: Dama, scacchi: Scacchi, battaglia: Battaglia, othello: Othello, forza4: Forza4, tris: Tris }

function currentGameFromHash() {
  const id = location.hash.replace('#', '')
  return SCREENS[id] ? id : null
}

export default function App() {
  const [game, setGame] = useState(currentGameFromHash)

  // Il tasto "indietro" del telefono riporta alla home.
  useEffect(() => {
    const onHash = () => setGame(currentGameFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const open = (id) => {
    location.hash = id
  }
  const home = () => {
    if (location.hash) history.back()
    else setGame(null)
  }

  if (game) {
    const Screen = SCREENS[game]
    return <Screen onHome={home} />
  }
  return <Home onOpen={open} />
}

function Home({ onOpen }) {
  return (
    <div className="home">
      <h1>Giochi da Tavolo</h1>
      <p className="sub">Sei giochi classici contro il computer, senza connessione.</p>
      <div className="grid">
        {GAMES.map((g) => {
          const saved = loadJSON('game:' + g.id, null)
          const inProgress = saved && !saved.over
          return (
            <button key={g.id} className="card" onClick={() => onOpen(g.id)}>
              {inProgress && <span className="badge">in corso</span>}
              <span className="icon" aria-hidden>{g.icon}</span>
              <span className="name">{g.name}</span>
              <span className="desc">{g.desc}</span>
            </button>
          )
        })}
      </div>
      <footer>Le partite vengono salvate automaticamente sul dispositivo.</footer>
    </div>
  )
}
