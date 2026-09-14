import { useState } from 'react'
import { isSoundOn, setSoundOn } from '../sound.js'

export default function SoundToggle() {
  const [on, setOn] = useState(isSoundOn())
  return (
    <button
      className="icon"
      onClick={() => { setSoundOn(!on); setOn(!on) }}
      aria-label={on ? 'Disattiva suoni' : 'Attiva suoni'}
      title={on ? 'Suoni attivi' : 'Suoni disattivati'}
    >
      {on ? '🔊' : '🔇'}
    </button>
  )
}
