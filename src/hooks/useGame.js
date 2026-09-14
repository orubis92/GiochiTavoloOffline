import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAi } from '../ai/useAi.js'
import { loadJSON, saveJSON } from '../storage.js'

const MIN_THINK_MS = 450

// Gestione generica di una partita a turni contro il computer.
// `engine` deve esporre initialState, legalMoves, applyMove, status.
export function useGame(gameId, engine) {
  const { think } = useAi()
  const [settings, setSettings] = useState(() => loadJSON('settings:' + gameId, { difficulty: 2, human: 1 }))
  const [history, setHistory] = useState(() => {
    const saved = loadJSON('game:' + gameId, null)
    if (saved && Array.isArray(saved.history) && saved.history.length) return saved.history
    return [engine.initialState({ first: 1 })]
  })
  const [thinking, setThinking] = useState(false)
  const [passNotice, setPassNotice] = useState(null) // 1 | 2 | null
  const generation = useRef(0)

  const current = history[history.length - 1]
  const status = useMemo(() => engine.status(current), [engine, current])
  const human = settings.human
  const isHumanTurn = current.turn === human && !status.over

  useEffect(() => {
    saveJSON('settings:' + gameId, settings)
  }, [gameId, settings])
  useEffect(() => {
    saveJSON('game:' + gameId, { history, over: status.over })
  }, [gameId, history, status.over])

  const push = useCallback((state) => setHistory((h) => [...h, state]), [])

  // Turno del computer.
  useEffect(() => {
    if (status.over || current.turn === human) return
    const gen = ++generation.current
    const moves = engine.legalMoves(current)
    if (moves.length === 1 && moves[0] === -1) {
      setPassNotice(current.turn)
      const t = setTimeout(() => {
        if (gen !== generation.current) return
        setPassNotice(null)
        push(engine.applyMove(current, -1))
      }, 900)
      return () => clearTimeout(t)
    }
    let cancelled = false
    setThinking(true)
    const started = Date.now()
    think(gameId, current, settings.difficulty)
      .then((move) => {
        const wait = Math.max(0, MIN_THINK_MS - (Date.now() - started))
        return new Promise((r) => setTimeout(() => r(move), wait))
      })
      .then((move) => {
        if (cancelled || gen !== generation.current) return
        setThinking(false)
        if (move === null || move === undefined) return
        push(engine.applyMove(current, move))
      })
      .catch(() => {
        if (!cancelled) setThinking(false)
      })
    return () => {
      cancelled = true
      setThinking(false)
    }
  }, [current, human, status.over, settings.difficulty, engine, gameId, think, push])

  // Passo forzato del giocatore umano (Othello).
  useEffect(() => {
    if (status.over || current.turn !== human) return
    const moves = engine.legalMoves(current)
    if (moves.length === 1 && moves[0] === -1) {
      setPassNotice(human)
      const t = setTimeout(() => {
        setPassNotice(null)
        push(engine.applyMove(current, -1))
      }, 1200)
      return () => clearTimeout(t)
    }
  }, [current, human, status.over, engine, push])

  const humanMove = useCallback(
    (move) => {
      if (!isHumanTurn || thinking) return false
      push(engine.applyMove(current, move))
      return true
    },
    [isHumanTurn, thinking, engine, current, push],
  )

  const newGame = useCallback(
    (overrides = {}) => {
      generation.current++
      setThinking(false)
      setPassNotice(null)
      if (Object.keys(overrides).length) setSettings((s) => ({ ...s, ...overrides }))
      setHistory([engine.initialState({ first: 1 })])
    },
    [engine],
  )

  // Annulla fino all'ultima posizione in cui tocca al giocatore umano.
  const undo = useCallback(() => {
    generation.current++
    setThinking(false)
    setPassNotice(null)
    setHistory((h) => {
      if (h.length <= 1) return h
      let i = h.length - 1
      do i--
      while (i > 0 && h[i].turn !== human)
      return h.slice(0, i + 1)
    })
  }, [human])

  const canUndo = history.length > 1 && (isHumanTurn || status.over || thinking)

  const setDifficulty = useCallback((d) => setSettings((s) => ({ ...s, difficulty: Number(d) })), [])

  return {
    state: current,
    history,
    status,
    settings,
    human,
    isHumanTurn,
    thinking,
    passNotice,
    humanMove,
    newGame,
    undo,
    canUndo,
    setDifficulty,
  }
}
