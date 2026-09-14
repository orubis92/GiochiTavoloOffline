import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAi } from '../ai/useAi.js'
import { loadJSON, saveJSON } from '../storage.js'
import { gradeMove } from '../coach/coach.js'
import { play, vibrate } from '../sound.js'

const MIN_THINK_MS = 450

// Gestione generica di una partita a turni contro il computer.
// `engine` deve esporre initialState, legalMoves, applyMove, status.
// `coachDef` (opzionale) attiva la modalità istruttore:
//   { moveKey(move), unit, describe(state, move), explain(stateBefore, grade, human) }
// `opts.moveKind(prev, next, move)` -> 'move' | 'capture' per gli effetti sonori.
export function useGame(gameId, engine, coachDef = null, opts = {}) {
  const { think, analyze } = useAi()
  const [settings, setSettings] = useState(() => loadJSON('settings:' + gameId, { difficulty: 2, human: 1, coach: true }))
  const [history, setHistory] = useState(() => {
    const saved = loadJSON('game:' + gameId, null)
    if (saved && Array.isArray(saved.history) && saved.history.length) return saved.history
    return [engine.initialState({ first: 1 })]
  })
  const [grades, setGrades] = useState(() => loadJSON('game:' + gameId, null)?.grades || [])
  const [feedback, setFeedback] = useState(null)
  const [hint, setHint] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const analysisRef = useRef({ state: null, promise: null })
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
    saveJSON('game:' + gameId, { history, over: status.over, grades })
  }, [gameId, history, status.over, grades])

  const coachOn = !!coachDef && settings.coach !== false

  // Analisi della posizione a ogni turno del giocatore (per suggerimenti e giudizi).
  useEffect(() => {
    if (!coachOn || !isHumanTurn) return
    if (analysisRef.current.state === current) return
    setHint(null)
    setAnalyzing(true)
    const promise = analyze(gameId, current).catch(() => null)
    analysisRef.current = { state: current, promise }
    promise.then(() => {
      if (analysisRef.current.promise === promise) setAnalyzing(false)
    })
  }, [coachOn, isHumanTurn, current, analyze, gameId])

  const push = useCallback((state) => setHistory((h) => [...h, state]), [])
  const moveKindRef = useRef(opts.moveKind)
  moveKindRef.current = opts.moveKind
  const commit = useCallback(
    (prev, move, byHuman) => {
      const next = engine.applyMove(prev, move)
      const kind = moveKindRef.current ? moveKindRef.current(prev, next, move) : 'move'
      play(kind)
      if (kind === 'capture') vibrate(byHuman ? 20 : [10, 40, 20])
      push(next)
      return next
    },
    [engine, push],
  )

  // Suono di fine partita (non al caricamento di una partita già finita).
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (!status.over) return
    const t = setTimeout(() => play(status.winner == null ? 'draw' : status.winner === human ? 'win' : 'lose'), 250)
    return () => clearTimeout(t)
  }, [status.over, status.winner, human])

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
        commit(current, move, false)
      })
      .catch(() => {
        if (!cancelled) setThinking(false)
      })
    return () => {
      cancelled = true
      setThinking(false)
    }
  }, [current, human, status.over, settings.difficulty, engine, gameId, think, push, commit])

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
      const stateBefore = current
      commit(current, move, true)
      setHint(null)
      if (coachOn && analysisRef.current.state === stateBefore && analysisRef.current.promise) {
        const key = coachDef.moveKey(move)
        analysisRef.current.promise.then((res) => {
          const grade = gradeMove(res, key, coachDef.moveKey, coachDef.unit)
          if (!grade) return
          const text = coachDef.explain(stateBefore, grade, human)
          setFeedback({ grade, text, stateBefore })
          setGrades((g) => [...g, grade.level])
        })
      }
      return true
    },
    [isHumanTurn, thinking, current, commit, coachOn, coachDef, human],
  )

  const showHint = useCallback(async () => {
    if (!coachOn || !isHumanTurn || !analysisRef.current.promise) return
    const res = await analysisRef.current.promise
    if (!res || !res.scored.length || analysisRef.current.state !== current) return
    const best = res.scored[0].m
    play('hint')
    setHint({ move: best, text: coachDef.describe(current, best) })
  }, [coachOn, isHumanTurn, current, coachDef])

  const setCoach = useCallback((on) => setSettings((s) => ({ ...s, coach: !!on })), [])

  const newGame = useCallback(
    (overrides = {}) => {
      generation.current++
      setThinking(false)
      setPassNotice(null)
      if (Object.keys(overrides).length) setSettings((s) => ({ ...s, ...overrides }))
      setHistory([engine.initialState({ first: 1 })])
      setGrades([])
      setFeedback(null)
      setHint(null)
    },
    [engine],
  )

  // Annulla fino all'ultima posizione in cui tocca al giocatore umano.
  const undo = useCallback(() => {
    generation.current++
    setThinking(false)
    setPassNotice(null)
    setFeedback(null)
    setHint(null)
    setGrades((g) => g.slice(0, -1))
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
    coach: coachDef
      ? { enabled: coachOn, setEnabled: setCoach, feedback, hint, showHint, analyzing, grades }
      : null,
  }
}
