import { useEffect, useRef, useCallback } from 'react'

// Restituisce una funzione think(game, state, difficulty) -> Promise<move>.
// Il worker è unico per componente e viene terminato allo smontaggio.
export function useAi() {
  const workerRef = useRef(null)
  const pending = useRef(new Map())
  const seq = useRef(0)

  useEffect(() => {
    const w = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })
    w.onmessage = (e) => {
      const { id, move, error } = e.data
      const p = pending.current.get(id)
      if (!p) return
      pending.current.delete(id)
      if (error) p.reject(new Error(error))
      else p.resolve(move)
    }
    workerRef.current = w
    return () => {
      w.terminate()
      pending.current.clear()
    }
  }, [])

  const think = useCallback((game, state, difficulty) => {
    return new Promise((resolve, reject) => {
      const id = ++seq.current
      pending.current.set(id, { resolve, reject })
      workerRef.current.postMessage({ id, game, state, difficulty })
    })
  }, [])

  const cancelAll = useCallback(() => {
    // le risposte in arrivo vengono ignorate
    pending.current.clear()
  }, [])

  return { think, cancelAll }
}
