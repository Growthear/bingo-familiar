const KEY = 'bingo-sounds'

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(KEY) !== 'off'
}

export function setSoundEnabled(enabled: boolean) {
  localStorage.setItem(KEY, enabled ? 'on' : 'off')
}

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function note(
  freq: number,
  start: number,
  duration: number,
  gain = 0.25,
  type: OscillatorType = 'sine'
) {
  const c = getCtx()
  if (!c) return
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.connect(g)
  g.connect(c.destination)
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  g.gain.setValueAtTime(0, start)
  g.gain.linearRampToValueAtTime(gain, start + 0.01)
  g.gain.exponentialRampToValueAtTime(0.001, start + duration)
  osc.start(start)
  osc.stop(start + duration + 0.05)
}

export type SoundType = 'tap' | 'number' | 'success' | 'win' | 'error'

export function playSound(type: SoundType) {
  if (!isSoundEnabled()) return
  const c = getCtx()
  if (!c) return
  const now = c.currentTime

  switch (type) {
    case 'tap':
      // Tick suave al marcar un número
      note(880, now, 0.06, 0.15, 'sine')
      break

    case 'number':
      // Chime cuando sale un número
      note(660, now, 0.15, 0.2, 'sine')
      note(880, now + 0.08, 0.12, 0.12, 'sine')
      break

    case 'success':
      // Fanfarria corta para terno / línea (C-E-G)
      note(523.25, now,        0.18, 0.3)   // C5
      note(659.25, now + 0.12, 0.18, 0.3)   // E5
      note(783.99, now + 0.24, 0.28, 0.35)  // G5
      break

    case 'win':
      // Fanfarria grande para bingo (C-E-G-C arpeggio + acorde final)
      note(523.25, now,        0.15, 0.35)  // C5
      note(659.25, now + 0.12, 0.15, 0.35)  // E5
      note(783.99, now + 0.24, 0.15, 0.35)  // G5
      note(1046.5, now + 0.36, 0.5,  0.4)   // C6
      // Acorde de fondo
      note(523.25, now + 0.36, 0.5, 0.15)
      note(659.25, now + 0.36, 0.5, 0.15)
      note(783.99, now + 0.36, 0.5, 0.15)
      break

    case 'error':
      // Dos tonos descendentes
      note(400, now,       0.15, 0.25, 'sawtooth')
      note(300, now + 0.15, 0.2, 0.2, 'sawtooth')
      break
  }
}
