const KEY = 'bingo-voice'
let unlocked = false

export function isVoiceEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(KEY) !== 'off'
}

export function setVoiceEnabled(enabled: boolean) {
  localStorage.setItem(KEY, enabled ? 'on' : 'off')
  if (!enabled && typeof window !== 'undefined') window.speechSynthesis?.cancel()
}

// iOS requires a user gesture to unlock speechSynthesis.
// Call this once on any user interaction (tap, click).
export function unlockVoice() {
  if (unlocked || typeof window === 'undefined' || !window.speechSynthesis) return
  const utter = new SpeechSynthesisUtterance('')
  utter.volume = 0
  window.speechSynthesis.speak(utter)
  unlocked = true
}

export function speakNumber(number: number) {
  if (!isVoiceEnabled()) return
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  // iOS fix: resume if paused (can happen after inactivity)
  if (window.speechSynthesis.paused) window.speechSynthesis.resume()
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(`número ${number}`)
  utter.lang = 'es-AR'
  utter.rate = 0.85
  utter.pitch = 1
  window.speechSynthesis.speak(utter)
}
