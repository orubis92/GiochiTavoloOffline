const PREFIX = 'gto:'

export function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function saveJSON(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* spazio esaurito o storage non disponibile: si continua senza salvare */
  }
}

export function removeKey(key) {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    /* ignora */
  }
}
