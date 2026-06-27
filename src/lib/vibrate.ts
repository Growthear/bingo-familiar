const KEY = 'bingo-vibration'

export function isVibrationEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(KEY) !== 'off'
}

export function setVibrationEnabled(enabled: boolean) {
  localStorage.setItem(KEY, enabled ? 'on' : 'off')
}

type Pattern = 'tap' | 'success' | 'win' | 'error'

const PATTERNS: Record<Pattern, number | number[]> = {
  tap: 10,
  success: [40, 30, 80],
  win: [60, 40, 60, 40, 120],
  error: [80, 60, 80],
}

export function vibrate(pattern: Pattern = 'tap') {
  if (!isVibrationEnabled()) return
  if (!navigator.vibrate) return
  navigator.vibrate(PATTERNS[pattern])
}
