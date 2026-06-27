const KEY = 'bingo-voice'

export function isVoiceEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(KEY) !== 'off'
}

export function setVoiceEnabled(enabled: boolean) {
  localStorage.setItem(KEY, enabled ? 'on' : 'off')
  if (!enabled && typeof window !== 'undefined') window.speechSynthesis?.cancel()
}

export function speakNumber(number: number) {
  if (!isVoiceEnabled()) return
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(`número ${number}`)
  utter.lang = 'es-AR'
  utter.rate = 0.85
  utter.pitch = 1
  window.speechSynthesis.speak(utter)
}
