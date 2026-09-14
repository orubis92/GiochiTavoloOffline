// Effetti sonori sintetizzati con WebAudio (nessun file audio, funziona offline).
import { loadJSON, saveJSON } from './storage.js'

let ctx = null
let enabled = loadJSON('sound', { on: true }).on

export function isSoundOn() {
  return enabled
}
export function setSoundOn(on) {
  enabled = !!on
  saveJSON('sound', { on: enabled })
  if (enabled) play('move')
}

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(ac, { freq = 440, type = 'sine', at = 0, dur = 0.12, gain = 0.25, slide = null }) {
  const o = ac.createOscillator()
  const g = ac.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, ac.currentTime + at)
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, ac.currentTime + at + dur)
  g.gain.setValueAtTime(0.0001, ac.currentTime + at)
  g.gain.exponentialRampToValueAtTime(gain, ac.currentTime + at + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + at + dur)
  o.connect(g).connect(ac.destination)
  o.start(ac.currentTime + at)
  o.stop(ac.currentTime + at + dur + 0.02)
}

function noise(ac, { at = 0, dur = 0.08, gain = 0.2, cutoff = 1200 }) {
  const buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
  const src = ac.createBufferSource()
  src.buffer = buf
  const f = ac.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = cutoff
  const g = ac.createGain()
  g.gain.value = gain
  src.connect(f).connect(g).connect(ac.destination)
  src.start(ac.currentTime + at)
}

const SOUNDS = {
  move: (ac) => {
    noise(ac, { dur: 0.05, gain: 0.35, cutoff: 2500 })
    tone(ac, { freq: 520, type: 'triangle', dur: 0.06, gain: 0.12 })
  },
  capture: (ac) => {
    noise(ac, { dur: 0.09, gain: 0.5, cutoff: 900 })
    tone(ac, { freq: 220, type: 'triangle', dur: 0.14, gain: 0.25, slide: 120 })
  },
  select: (ac) => tone(ac, { freq: 880, type: 'sine', dur: 0.04, gain: 0.08 }),
  error: (ac) => {
    tone(ac, { freq: 200, type: 'square', dur: 0.1, gain: 0.08 })
    tone(ac, { freq: 160, type: 'square', at: 0.1, dur: 0.14, gain: 0.08 })
  },
  hint: (ac) => {
    tone(ac, { freq: 660, dur: 0.08, gain: 0.12 })
    tone(ac, { freq: 990, at: 0.09, dur: 0.12, gain: 0.12 })
  },
  win: (ac) => {
    ;[523, 659, 784, 1047].forEach((f, i) => tone(ac, { freq: f, type: 'triangle', at: i * 0.11, dur: 0.22, gain: 0.2 }))
    tone(ac, { freq: 1319, type: 'triangle', at: 0.46, dur: 0.5, gain: 0.18 })
  },
  lose: (ac) => {
    ;[392, 349, 311, 262].forEach((f, i) => tone(ac, { freq: f, type: 'sawtooth', at: i * 0.16, dur: 0.24, gain: 0.08 }))
  },
  draw: (ac) => {
    tone(ac, { freq: 440, type: 'triangle', dur: 0.2, gain: 0.15 })
    tone(ac, { freq: 440, type: 'triangle', at: 0.25, dur: 0.3, gain: 0.15 })
  },
  splash: (ac) => {
    noise(ac, { dur: 0.25, gain: 0.3, cutoff: 700 })
    tone(ac, { freq: 300, dur: 0.2, gain: 0.08, slide: 90 })
  },
  hit: (ac) => {
    noise(ac, { dur: 0.15, gain: 0.6, cutoff: 500 })
    tone(ac, { freq: 90, type: 'square', dur: 0.25, gain: 0.25, slide: 40 })
  },
  sunk: (ac) => {
    noise(ac, { dur: 0.4, gain: 0.6, cutoff: 400 })
    tone(ac, { freq: 120, type: 'sawtooth', dur: 0.5, gain: 0.2, slide: 35 })
    tone(ac, { freq: 60, type: 'square', at: 0.1, dur: 0.5, gain: 0.2, slide: 30 })
  },
}

export function play(name) {
  if (!enabled) return
  try {
    const ac = getCtx()
    if (!ac) return
    SOUNDS[name]?.(ac)
  } catch {
    /* audio non disponibile */
  }
}

export function vibrate(pattern = 15) {
  if (!enabled) return
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* ignora */
  }
}
